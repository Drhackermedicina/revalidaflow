import { currentUser, waitForAuth } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { updateDocumentWithRetry, getDocumentWithRetry, checkFirestoreConnectivity } from '@/services/firestoreService'

let isAuthInitialized = false // Flag para garantir que a espera ocorra apenas uma vez

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...routes,
    // Remova a rota '/dashboard' duplicada se não for usar!
    {
      path: '/station/:id/simulate',
      name: 'station-simulate', // <-- nome correto da rota
      component: () => import('@/pages/SimulationView.vue')
    },
    {
      path: '/app/station-edit/:id?',
      name: 'StationEdit',
      component: () => import('@/pages/EditStationView.vue'),
      meta: {
        requiresAuth: true,
        layout: 'default',
      },
    },
  ],
})

// Guarda de Navegação Global (Async)
router.beforeEach(async (to, from, next) => {
  const urlParams = new URLSearchParams(window.location.search);
  const useSimulatedUser = urlParams.get('sim_user') === 'true';

  // Se estivermos em modo DEV e usando o usuário simulado, pulamos todas as verificações.
  if (import.meta.env.DEV && useSimulatedUser) {
    console.log('[beforeEach] Acesso permitido para usuário simulado.');
    next();
    return;
  }

  // Lógica original para produção ou para você (usuário real) em DEV
  await waitForAuth();
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!currentUser.value) {
      next('/login')
      return
    }
    const userDoc = await getDocumentWithRetry(doc(db, 'usuarios', currentUser.value.uid), 'verificação de usuário')
    const user = userDoc.data()
    // Checagem de cadastro completo: documento existe e campos obrigatórios preenchidos
    if (
      !userDoc.exists() ||
      !user?.aceitouTermos ||
      !user?.cpf ||
      !user?.nome ||
      !user?.sobrenome ||
      !user?.cidade ||
      !user?.paisOrigem
    ) {
      // Redirecione para /register se cadastro incompleto
      next('/register')
      return
    }
    // Bloqueio de acesso se trial expirou ou plano vencido
    // TEMPORARIAMENTE DESABILITADO - rota /pagamento não existe ainda
    /*
    const agora = new Date()
    if (
      user.plano === 'trial' &&
      new Date(user.trialExpiraEm) < agora
    ) {
      next('/pagamento')
      return
    }
    if (
      user.plano !== 'trial' &&
      user.planoExpiraEm &&
      new Date(user.planoExpiraEm) < agora
    ) {
      next('/pagamento')
      return
    }
    */
  }
  next()
})

// Atualiza status do usuário conforme a rota
router.afterEach(async (to, from) => {
  const urlParams = new URLSearchParams(window.location.search);
  const useSimulatedUser = urlParams.get('sim_user') === 'true';

  // Se estivermos em modo DEV e usando o usuário simulado, não fazemos a atualização no DB.
  if (import.meta.env.DEV && useSimulatedUser) {
    console.log('[afterEach] Atualização de status pulada para usuário simulado.');
    return;
  }

  // Lógica original para produção ou para você (usuário real) em DEV
  await waitForAuth();

  // Verificações adicionais para garantir que não tentemos operar em um DB nulo ou sem usuário.
  if (!db || !currentUser.value?.uid) {
    return;
  }

  // Verificar conectividade antes de tentar atualizar
  const connectivity = checkFirestoreConnectivity();
  if (!connectivity.available) {
    console.warn(`⚠️ Pulando atualização de status: ${connectivity.reason}`);
    return;
  }

  try {
    const ref = doc(db, 'usuarios', currentUser.value.uid);
    const statusData = to.name === 'simulation-view' || to.name === 'station-simulation' || to.path.includes('/simulate')
      ? { status: 'treinando' }
      : { status: 'disponivel' };

    await updateDocumentWithRetry(ref, statusData, 'atualização de status do usuário');
  } catch (error) {
    console.error(`❌ Falha definitiva ao atualizar status do usuário ${currentUser.value?.uid}:`, error);
  }
})

window.addEventListener('beforeunload', () => {
  if (currentUser.value?.uid && db) {
    const connectivity = checkFirestoreConnectivity();
    if (connectivity.available) {
      const ref = doc(db, 'usuarios', currentUser.value.uid);
      // Não pode usar await aqui, pois beforeunload não espera Promises
      // Usar método direto para operação síncrona de finalização
      updateDoc(ref, { status: 'offline' }).catch(error => {
        console.warn('⚠️ Erro ao definir status offline no beforeunload:', error);
      });
    }
  }
})

export default function (app) {
  app.use(router)
}

export { router }

