/**
 * accessControl.js
 *
 * Rotas para convites de acesso e gerenciamento de assinaturas.
 * Apenas administradores podem emitir convites. Usuários autenticados
 * podem resgatar convites e iniciar assinaturas.
 */

const express = require('express');
const admin = require('firebase-admin');
const crypto = require('crypto');

const { verifyAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();

const MAX_INVITE_DURATION_DAYS = 30;
const DEFAULT_TRIAL_DAYS = parseInt(process.env.ACCESS_TRIAL_DAYS || '14', 10);
const SUBSCRIPTION_PLANS = {
  monthly: {
    price: 29.9,
    durationDays: 30,
    label: 'Plano Mensal'
  },
  quarterly: {
    price: 79.9,
    durationDays: 90,
    label: 'Plano Trimestral'
  },
  untilExam: {
    price: 149.9,
    durationDays: null, // Calculado dinamicamente
    label: 'Plano Até a Prova'
  }
};

function isFirebaseReady() {
  if (global.firebaseMockMode) {
    return false;
  }

  return admin.apps && admin.apps.length > 0;
}

function getFirestore() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase Admin SDK não inicializado. Execute em produção ou configure credenciais.');
  }
  return admin.firestore();
}

function getInMemoryStore() {
  if (!global.__ACCESS_CONTROL_INVITES__) {
    global.__ACCESS_CONTROL_INVITES__ = [];
  }
  return global.__ACCESS_CONTROL_INVITES__;
}

function getCollection(name) {
  return getFirestore().collection(name);
}

function generateInviteCode(length = 10) {
  const bytes = crypto.randomBytes(length);
  return bytes.toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, length);
}

function clampDurationDays(days, fallback = MAX_INVITE_DURATION_DAYS) {
  if (!days || Number.isNaN(days)) return fallback;
  return Math.min(Math.max(1, parseInt(days, 10)), MAX_INVITE_DURATION_DAYS);
}

function buildTimestampFromNow(days) {
  const millis = days * 24 * 60 * 60 * 1000;
  return admin.firestore.Timestamp.fromDate(new Date(Date.now() + millis));
}

function getExamDurationDays() {
  const examDateEnv = process.env.ACCESS_EXAM_DATE;
  if (!examDateEnv) {
    return MAX_INVITE_DURATION_DAYS;
  }

  const examDate = new Date(examDateEnv);
  if (Number.isNaN(examDate.getTime())) {
    return MAX_INVITE_DURATION_DAYS;
  }

  const diffMillis = examDate.getTime() - Date.now();
  if (diffMillis <= 0) {
    return MAX_INVITE_DURATION_DAYS;
  }

  const days = Math.ceil(diffMillis / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
}

function normalizeAccessPayload({
  status,
  source,
  expiresAt,
  inviteCode = null,
  plan = null
}) {
  const FieldValue = admin.firestore.FieldValue;

  return {
    accessStatus: status,
    accessSource: source,
    accessExpiresAt: expiresAt,
    accessUpdatedAt: FieldValue.serverTimestamp(),
    accessInviteCode: inviteCode,
    subscriptionPlan: plan,
    plano: status === 'paid' ? plan || 'pago' : status,
    planoExpiraEm: expiresAt,
    trialExpiraEm: status === 'trial' ? expiresAt : null
  };
}

router.use((req, res, next) => {
  req.accessControlMockMode = !isFirebaseReady();
  next();
});

/**
 * Cria um convite de acesso - somente administradores.
 */
router.post('/invites', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const {
      durationDays = MAX_INVITE_DURATION_DAYS,
      note = null,
      code: requestedCode = null
    } = req.body || {};

    const duration = clampDurationDays(durationDays);
    const normalizedRequestedCode = requestedCode
      ? requestedCode.trim().toUpperCase()
      : null;

    if (req.accessControlMockMode) {
      const store = getInMemoryStore();
      let code = normalizedRequestedCode || generateInviteCode(10);

      if (store.some(invite => invite.code === code)) {
        if (normalizedRequestedCode) {
          return res.status(409).json({
            error: 'conflict',
            message: 'Já existe um convite com este código. Escolha outro.'
          });
        }
        do {
          code = generateInviteCode(10);
        } while (store.some(invite => invite.code === code));
      }

      const nowIso = new Date().toISOString();
      store.push({
        code,
        status: 'active',
        durationDays: duration,
        issuerUid: req.user.uid,
        issuerEmail: req.user.email || null,
        issuedAt: nowIso,
        note: note || null,
        redeemedByUid: null,
        redeemedAt: null,
        updatedAt: nowIso,
        mock: true
      });

      return res.json({
        success: true,
        code,
        durationDays: duration,
        status: 'active',
        mockMode: true
      });
    }

    const invitesCollection = getCollection('accessInvites');

    let code = normalizedRequestedCode || generateInviteCode(10);

    // Garante unicidade
    let existing = await invitesCollection.doc(code).get();
    if (existing.exists) {
      if (normalizedRequestedCode) {
        return res.status(409).json({
          error: 'conflict',
          message: 'Já existe um convite com este código. Escolha outro.'
        });
      }

      do {
        code = generateInviteCode(10);
        existing = await invitesCollection.doc(code).get();
      } while (existing.exists);
    }

    const docRef = invitesCollection.doc(code);
    const FieldValue = admin.firestore.FieldValue;

    await docRef.set({
      code,
      issuerUid: req.user.uid,
      issuerEmail: req.user.email || null,
      issuedAt: FieldValue.serverTimestamp(),
      durationDays: duration,
      note: note || null,
      status: 'active',
      redeemedByUid: null,
      redeemedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      code,
      durationDays: duration,
      status: 'active',
      mockMode: false
    });
  } catch (error) {
    console.error('[ACCESS] Erro ao criar convite:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível criar o convite',
      details: error.message
    });
  }
});

/**
 * Lista convites de acesso emitidos - somente administradores.
 */
router.get('/invites', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;

    if (req.accessControlMockMode) {
      const store = getInMemoryStore();
      const filtered = store.filter(invite => {
        if (status === 'all' || !status) return true;
        return invite.status === status;
      }).slice(0, Math.min(parseInt(limit, 10) || 50, 100));

      return res.json({
        success: true,
        invites: filtered,
        mockMode: true
      });
    }

    const invitesCollection = getCollection('accessInvites');
    let queryRef = invitesCollection.orderBy('issuedAt', 'desc').limit(Math.min(parseInt(limit, 10) || 50, 100));

    if (status && status !== 'all') {
      queryRef = invitesCollection.where('status', '==', status).orderBy('issuedAt', 'desc').limit(Math.min(parseInt(limit, 10) || 50, 100));
    }

    const snapshot = await queryRef.get();

    const invites = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        code: data.code,
        status: data.status,
        durationDays: data.durationDays,
        issuerUid: data.issuerUid || null,
        issuerEmail: data.issuerEmail || null,
        issuedAt: data.issuedAt ? data.issuedAt.toDate().toISOString() : null,
        note: data.note || null,
        redeemedByUid: data.redeemedByUid || null,
        redeemedAt: data.redeemedAt ? data.redeemedAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
      };
    });

    res.json({
      success: true,
      invites,
      mockMode: false
    });
  } catch (error) {
    console.error('[ACCESS] Erro ao listar convites:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível listar os convites.',
      details: error.message
    });
  }
});

/**
 * Resgata um convite de acesso - usuário autenticado.
 * Concede 30 dias de acesso a partir do resgate.
 */
router.post('/invites/redeem', verifyAuth, async (req, res) => {
  const { code } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Informe um código de convite válido.'
    });
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    if (req.accessControlMockMode) {
      const store = getInMemoryStore();
      const invite = store.find(item => item.code === normalizedCode);

      if (!invite) {
        throw new Error('invite_not_found');
      }

      if (invite.status !== 'active') {
        throw new Error('invite_not_active');
      }

      if (invite.redeemedByUid && invite.redeemedByUid !== req.user.uid) {
        throw new Error('invite_already_used');
      }

      invite.status = 'redeemed';
      invite.redeemedByUid = req.user.uid;
      invite.redeemedAt = new Date().toISOString();
      invite.updatedAt = invite.redeemedAt;

      return res.json({
        success: true,
        accessStatus: 'invited',
        accessExpiresAt: null,
        durationDays: invite.durationDays,
        invite: {
          code: invite.code,
          issuedBy: invite.issuerEmail || invite.issuerUid || 'admin'
        },
        mockMode: true,
        message: 'Convite resgatado em modo mock. Configure Firebase para aplicar acesso real.'
      });
    }

    const firestore = getFirestore();
    const invitesCollection = firestore.collection('accessInvites');
    const usersCollection = firestore.collection('usuarios');

    const inviteRef = invitesCollection.doc(normalizedCode);
    const userRef = usersCollection.doc(req.user.uid);

    const result = await firestore.runTransaction(async (transaction) => {
      const inviteSnap = await transaction.get(inviteRef);

      if (!inviteSnap.exists) {
        throw new Error('invite_not_found');
      }

      const inviteData = inviteSnap.data();

      if (inviteData.status !== 'active') {
        throw new Error('invite_not_active');
      }

      if (inviteData.redeemedByUid && inviteData.redeemedByUid !== req.user.uid) {
        throw new Error('invite_already_used');
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('user_not_found');
      }

      const duration = clampDurationDays(inviteData.durationDays, MAX_INVITE_DURATION_DAYS);
      const expiresAt = buildTimestampFromNow(duration);
      const FieldValue = admin.firestore.FieldValue;

      transaction.update(inviteRef, {
        status: 'redeemed',
        redeemedByUid: req.user.uid,
        redeemedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.set(
        userRef,
        normalizeAccessPayload({
          status: 'invited',
          source: 'invite',
          expiresAt,
          inviteCode: normalizedCode,
          plan: null
        }),
        { merge: true }
      );

      return {
        expiresAt,
        durationDays: duration,
        invite: {
          code: normalizedCode,
          issuedBy: inviteData.issuerEmail || inviteData.issuerUid || 'admin'
        }
      };
    });

    res.json({
      success: true,
      accessStatus: 'invited',
      accessExpiresAt: result.expiresAt.toDate().toISOString(),
      durationDays: result.durationDays,
      invite: result.invite
    });
  } catch (error) {
    if (error.message === 'invite_not_found') {
      return res.status(404).json({
        error: 'invite_not_found',
        message: 'Convite não encontrado.'
      });
    }

    if (error.message === 'invite_not_active') {
      return res.status(409).json({
        error: 'invite_not_active',
        message: 'Este convite não está ativo no momento.'
      });
    }

    if (error.message === 'invite_already_used') {
      return res.status(409).json({
        error: 'invite_already_used',
        message: 'Este convite já foi utilizado por outro usuário.'
      });
    }

    if (error.message === 'user_not_found') {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Não foi possível localizar seu cadastro. Faça login novamente.'
      });
    }

    console.error('[ACCESS] Erro ao resgatar convite:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível resgatar o convite.',
      details: error.message
    });
  }
});

/**
 * Inicia processo de assinatura - cria registro pendente e retorna URL simulada.
 * Integração com gateway deve substituir esta rota no futuro.
 */
router.post('/payments/checkout', verifyAuth, async (req, res) => {
  const { plan } = req.body || {};

  if (!plan || !SUBSCRIPTION_PLANS[plan]) {
    return res.status(400).json({
      error: 'invalid_plan',
      message: 'Plano inválido. Utilize monthly, quarterly ou untilExam.'
    });
  }

  try {
    const firestore = getFirestore();
    const subscriptionsRef = firestore.collection('subscriptions');
    const planConfig = { ...SUBSCRIPTION_PLANS[plan] };

    if (plan === 'untilExam') {
      planConfig.durationDays = getExamDurationDays();
    }

    const FieldValue = admin.firestore.FieldValue;
    const subscriptionDoc = await subscriptionsRef.add({
      userUid: req.user.uid,
      plan,
      durationDays: planConfig.durationDays,
      price: planConfig.price,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      subscriptionId: subscriptionDoc.id,
      plan,
      durationDays: planConfig.durationDays,
      price: planConfig.price,
      checkoutUrl: `${process.env.FRONTEND_URL || 'https://www.revalidaflow.com.br'}/pagamento?subscription=${subscriptionDoc.id}`
    });
  } catch (error) {
    console.error('[ACCESS] Erro ao iniciar assinatura:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível iniciar a assinatura.',
      details: error.message
    });
  }
});

/**
 * Ativa assinatura - deve ser chamado por webhook/automações de pagamento.
 */
router.post('/payments/activate', verifyAuth, requireAdmin, async (req, res) => {
  const { subscriptionId, userUid } = req.body || {};

  if (!subscriptionId || !userUid) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'subscriptionId e userUid são obrigatórios.'
    });
  }

  try {
    const firestore = getFirestore();
    const subscriptionsRef = firestore.collection('subscriptions').doc(subscriptionId);
    const usersRef = firestore.collection('usuarios').doc(userUid);

    await firestore.runTransaction(async (transaction) => {
      const subscriptionSnap = await transaction.get(subscriptionsRef);
      if (!subscriptionSnap.exists) {
        throw new Error('subscription_not_found');
      }

      const subscription = subscriptionSnap.data();
      if (subscription.status === 'active') {
        throw new Error('subscription_already_active');
      }

      const duration = subscription.durationDays || MAX_INVITE_DURATION_DAYS;
      const expiresAt = buildTimestampFromNow(duration);
      const FieldValue = admin.firestore.FieldValue;

      transaction.update(subscriptionsRef, {
        status: 'active',
        activatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.set(
        usersRef,
        normalizeAccessPayload({
          status: 'paid',
          source: `subscription:${subscription.plan}`,
          expiresAt,
          plan: subscription.plan
        }),
        { merge: true }
      );
    });

    res.json({
      success: true,
      message: 'Assinatura ativada com sucesso.'
    });
  } catch (error) {
    if (error.message === 'subscription_not_found') {
      return res.status(404).json({
        error: 'subscription_not_found',
        message: 'Assinatura não encontrada.'
      });
    }

    if (error.message === 'subscription_already_active') {
      return res.status(409).json({
        error: 'subscription_already_active',
        message: 'Assinatura já está ativa.'
      });
    }

    console.error('[ACCESS] Erro ao ativar assinatura:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível ativar a assinatura.',
      details: error.message
    });
  }
});

/**
 * Backfill opcional para definir expiração de trials existentes.
 */
router.post('/trials/backfill', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const firestore = getFirestore();
    const usersCollection = firestore.collection('usuarios');

    const snapshot = await usersCollection
      .where('accessStatus', 'in', [null, 'trial'])
      .limit(500)
      .get();

    const batch = firestore.batch();
    const expiresAt = buildTimestampFromNow(DEFAULT_TRIAL_DAYS);

    snapshot.docs.forEach((docSnap) => {
      batch.set(
        docSnap.ref,
        normalizeAccessPayload({
          status: 'trial',
          source: 'backfill',
          expiresAt,
          inviteCode: docSnap.data().accessInviteCode || null,
          plan: null
        }),
        { merge: true }
      );
    });

    if (snapshot.size > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      updated: snapshot.size
    });
  } catch (error) {
    console.error('[ACCESS] Erro ao executar backfill de trials:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Não foi possível atualizar os trials.',
      details: error.message
    });
  }
});

module.exports = router;
