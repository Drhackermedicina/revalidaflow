import { currentUser, waitForAuth } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc } from 'firebase/firestore'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { getDocumentWithRetry } from '@/services/firestoreService'

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

// Cache de verificações de autenticação para performance
const authCheckCache = {
  data: null,
  timestamp: 0,
  ttl: 30000 // 30 segundos
}

/**
 * Verifica se a autenticação ainda é válida no cache
 */
function isAuthCheckValid() {
  const now = Date.now()
  return authCheckCache.data && (now - authCheckCache.timestamp) < authCheckCache.ttl
}

/**
 * Atualiza o cache de verificação de autenticação
 */
function updateAuthCheck(result) {
  authCheckCache.data = result
  authCheckCache.timestamp = Date.now()
}

// Guarda de Navegação Global (Async) - OTIMIZADO
router.beforeEach(async (to, from, next) => {
  const urlParams = new URLSearchParams(window.location.search);
  const useSimulatedUser = urlParams.get('sim_user') === 'true';

  // Se estivermos em modo DEV e usando o usuário simulado, pulamos todas as verificações.
  if (import.meta.env.DEV && useSimulatedUser) {
    console.log('[beforeEach] Acesso permitido para usuário simulado.');
    next();
    return;
  }

  // Verificar cache de autenticação primeiro
  if (isAuthCheckValid()) {
    console.log('[beforeEach] Usando cache de autenticação válido');
    const cachedResult = authCheckCache.data

    // Para rotas que NÃO requerem autenticação, permite acesso direto
    if (!to.matched.some(record => record.meta.requiresAuth)) {
      console.log('[beforeEach] Rota não requer autenticação, permitindo acesso direto');
      next();
      return;
    }

    // Usar resultado do cache
    if (!cachedResult.isAuthenticated) {
      console.log('[beforeEach] Cache: Usuário não autenticado, redirecionando para login');
      next('/login')
      return;
    }

    if (!cachedResult.isProfileComplete) {
      console.log('[beforeEach] Cache: Cadastro incompleto, redirecionando para register');
      next('/register')
      return;
    }

    console.log('[beforeEach] Cache: Verificação concluída com sucesso');
    next()
    return;
  }

  // Lógica completa para produção ou para usuário real em DEV
  await waitForAuth();

  // Para rotas que NÃO requerem autenticação, permite acesso direto
  if (!to.matched.some(record => record.meta.requiresAuth)) {
    updateAuthCheck({ isAuthenticated: !!currentUser.value, isProfileComplete: true })
    next();
    return;
  }

  // Só para rotas que REQUEREM autenticação, faz as verificações
  if (!currentUser.value) {
    updateAuthCheck({ isAuthenticated: false, isProfileComplete: false })
    next('/login')
    return
  }

  // Só verifica dados do usuário se ele estiver realmente autenticado E a rota requer autenticação
  // Evita tentar acessar Firestore quando o usuário acabou de fazer logout
  try {
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
      updateAuthCheck({ isAuthenticated: true, isProfileComplete: false })
      next('/register')
      return
    }
    updateAuthCheck({ isAuthenticated: true, isProfileComplete: true })
  } catch (error) {
    // Se não conseguir acessar dados do usuário, redireciona para login
    // Isso acontece quando o usuário fez logout mas ainda tem currentUser definido
    console.warn('[beforeEach] Não foi possível verificar dados do usuário, redirecionando para login:', error.message)
    updateAuthCheck({ isAuthenticated: false, isProfileComplete: false })
    next('/login')
    return
  }

  // ✅ Inicializar sistema de presença após autenticação bem-sucedida
  if (!presenceInitialized && currentUser.value) {
    presenceInitialized = true
    import('@/composables/useUserPresence').then(({ initUserPresence }) => {
      initUserPresence()
      console.log('[Router] Sistema de presença inicializado')
    }).catch(error => {
      console.warn('[Router] Erro ao inicializar sistema de presença:', error)
    })
  }

  next()
})

// REMOVIDO: afterEach antigo - agora o useUserPresence cuida da presença do usuário
// REMOVIDO: beforeunload antigo - agora o useUserPresence cuida disso

// Sistema de presença do usuário - inicializado dinamicamente após autenticação
let presenceInitialized = false

export default function (app) {
  app.use(router)
}

export { router }

