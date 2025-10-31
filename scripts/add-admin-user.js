/**
 * Script para adicionar um novo usuário como administrador
 * 
 * Uso: node scripts/add-admin-user.js <UID>
 * 
 * Exemplo: node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2
 * 
 * Requisitos:
 * - Configurar backend/.env com credenciais do Firebase Admin
 * - OU colocar serviceAccountKey.json em backend/
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

let db;

// Inicializar Firebase Admin
try {
  // Tentar usar variáveis de ambiente primeiro
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_PRIVATE_KEY && 
      process.env.FIREBASE_CLIENT_EMAIL) {
    
    const normalizedPrivateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: normalizedPrivateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    console.log('✅ Firebase Admin inicializado via variáveis de ambiente');
  } 
  // Tentar usar arquivo de credenciais
  else {
    const serviceAccountPath = path.join(__dirname, '../backend', 'serviceAccountKey.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Credenciais não encontradas!');
      console.error('');
      console.error('Configure uma das opções:');
      console.error('1. Arquivo: backend/serviceAccountKey.json');
      console.error('2. Variáveis no backend/.env:');
      console.error('   FIREBASE_PROJECT_ID');
      console.error('   FIREBASE_PRIVATE_KEY');
      console.error('   FIREBASE_CLIENT_EMAIL');
      console.error('   FIREBASE_STORAGE_BUCKET');
      console.error('');
      process.exit(1);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✅ Firebase Admin inicializado via arquivo de credenciais');
  }
  
  db = admin.firestore();
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
  process.exit(1);
}

// Permissões padrão para admin
const DEFAULT_ADMIN_PERMISSIONS = {
  canDeleteMessages: true,
  canManageUsers: true,
  canEditStations: true,
  canViewAnalytics: true,
  canManageRoles: true,
  canAccessAdminPanel: true
};

async function addAdminUser(uid) {
  try {
    console.log(`\n📝 Adicionando usuário ${uid} como administrador...`);

    // Verificar se o documento já existe
    const userRef = db.collection('usuarios').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log('⚠️  Usuário já existe no Firestore');
      const userData = userDoc.data();
      console.log(`   Role atual: ${userData.role || 'não definido'}`);
      
      // Atualizar para admin
      await userRef.update({
        role: 'admin',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        roleUpdatedAt: new Date(),
        roleUpdatedBy: 'system-script'
      });
      
      console.log('✅ Role atualizado para admin com sucesso!');
    } else {
      console.log('   Criando novo documento de usuário...');
      
      // Criar documento completo
      await userRef.set({
        role: 'admin',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        createdAt: new Date(),
        updatedAt: new Date(),
        roleUpdatedAt: new Date(),
        roleUpdatedBy: 'system-script',
        status: 'offline',
        // Campos opcionais com valores padrão
        estacoesConcluidas: [],
        historicoEstacoes: [],
        historicoSimulacoes: [],
        nivelHabilidade: 0,
        mediaGeral: 0,
        totalScore: 0,
        score: 0,
        statistics: {},
        progresso: {
          badges: [],
          conquistas: [],
          experiencia: 0,
          nivel: 'Admin',
          nivelAtual: 'Admin',
          pontosExperiencia: 0,
          streak: 0
        }
      });
      
      console.log('✅ Documento criado com role admin!');
    }

    // Verificar se foi atualizado corretamente
    const verifyDoc = await userRef.get();
    const verifyData = verifyDoc.data();
    
    console.log('\n📊 Verificação:');
    console.log(`   Role: ${verifyData.role}`);
    console.log(`   Permissões:`, verifyData.permissions);
    console.log('\n✅ Usuário configurado como administrador com sucesso!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar/atualizar usuário:', error);
    throw error;
  }
}

// Main
const uid = process.argv[2];

if (!uid) {
  console.error('❌ UID não fornecido');
  console.error('   Uso: node scripts/add-admin-user.js <UID>');
  console.error('   Exemplo: node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2');
  process.exit(1);
}

// Validar formato do UID (deve ter 28 caracteres)
if (uid.length !== 28) {
  console.warn('⚠️  Aviso: UID não possui 28 caracteres. Continuando mesmo assim...');
}

addAdminUser(uid)
  .then(() => {
    console.log('\n✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Falha ao processar:', error.message);
    process.exit(1);
  });

