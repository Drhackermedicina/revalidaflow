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

const ACCESS_ALLOWED_ROUTES = new Set([
  'landing-page',
  'login',
  'register',
  'pagamento',
  'error'
])

function toDateSafe(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeAccessStatus(userData) {
  if (!userData) return { active: false, reason: 'missing_user' }

  const now = Date.now()
  const statusRaw = (userData.accessStatus || userData.plano || 'trial').toLowerCase()
  const expiresAt =
    toDateSafe(userData.accessExpiresAt) ||
    toDateSafe(userData.planoExpiraEm) ||
    toDateSafe(userData.trialExpiraEm)

  const allowedStatuses = ['paid', 'invited', 'trial']

  if (!allowedStatuses.includes(statusRaw)) {
    return { active: false, reason: `status_${statusRaw}` }
  }

  if (!expiresAt) {
    return { active: false, reason: 'missing_expiration' }
  }

  if (expiresAt.getTime() <= now) {
    return { active: false, reason: 'expired' }
  }

  return { active: true, reason: null, expiresAt }
}

function isRouteAllowedWithoutAccess(route) {
  if (!route?.name) return false
  return ACCESS_ALLOWED_ROUTES.has(route.name)
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
  authCheckCache.data = {
    isAuthenticated: result.isAuthenticated ?? false,
    isProfileComplete: result.isProfileComplete ?? false,
    hasActiveAccess: result.hasActiveAccess ?? false,
    role: result.role ?? null
  }
  authCheckCache.timestamp = Date.now()
}

// Guarda de Navegação Global (Async) - OTIMIZADO COM LOADING E ERROR HANDLING
router.beforeEach(async (to, from, next) => {
  try {
    // Mostrar loader no início da navegação
    if (window.globalLoaderRef) {
      window.globalLoaderRef.setLoading(true)
    }

    const urlParams = new URLSearchParams(window.location.search);
    const useSimulatedUser = urlParams.get('sim_user') === 'true';

    // Se estivermos em modo DEV e usando o usuário simulado, pulamos todas as verificações.
    if (import.meta.env.DEV && useSimulatedUser) {
      next();
      return;
    }

  // Verificar cache de autenticação primeiro
  if (isAuthCheckValid()) {
    const cachedResult = authCheckCache.data
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

    // Para rotas que NÃO requerem autenticação, permite acesso direto
    if (!requiresAuth) {
      next();
      return;
    }

    // Usar resultado do cache
    if (!cachedResult.isAuthenticated) {
      next('/login')
      return;
    }

    if (!cachedResult.isProfileComplete) {
      next('/register')
      return;
    }

    const cachedRole = (cachedResult.role || '').toLowerCase()
    const cachedIsAdmin = cachedRole === 'admin'

    if (!cachedIsAdmin && cachedResult.hasActiveAccess === false && !isRouteAllowedWithoutAccess(to)) {
      next({ name: 'pagamento' })
      return;
    }

    next()
    return;
  }

  // Lógica completa para produção ou para usuário real em DEV
  await waitForAuth();

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // Para rotas que NÃO requerem autenticação, permite acesso direto
  if (!requiresAuth) {
    next();
    return;
  }

  // Só para rotas que REQUEREM autenticação, faz as verificações
  if (!currentUser.value) {
    updateAuthCheck({ isAuthenticated: false, isProfileComplete: false, hasActiveAccess: false, role: null })
    next('/login')
    return
  }

  // Só verifica dados do usuário se ele estiver realmente autenticado E a rota requer autenticação
  // Evita tentar acessar Firestore quando o usuário acabou de fazer logout
  try {
    const userUid = currentUser.value?.uid;
    
    const userDoc = await getDocumentWithRetry(doc(db, 'usuarios', userUid), 'verificação de usuário')
    const user = userDoc.data()
    const userRole = (user?.role || 'user').toLowerCase()
    
    // Log apenas em desenvolvimento para diagnóstico
    if (import.meta.env.DEV) {
      console.log(`[Router] Verificando usuário ${userUid} para rota ${to.name}`);
    }
    
    // Checagem de cadastro completo: documento existe e campos obrigatórios preenchidos
    if (
      !userDoc.exists() ||
      !user?.aceitouTermos ||
      !user?.cpf ||
      !user?.nome ||
      !user?.sobrenome
    ) {
      // Redirecione para /register se cadastro incompleto
      if (import.meta.env.DEV) {
        console.log(`[Router] Cadastro incompleto, redirecionando para /register`);
      }
      updateAuthCheck({ isAuthenticated: true, isProfileComplete: false, hasActiveAccess: false, role: userRole })
      next('/register')
      return
    }

    if (userRole === 'admin') {
      if (import.meta.env.DEV) {
        console.log(`[Router] Usuário ADMIN detectado, acesso liberado`);
      }
      updateAuthCheck({
        isAuthenticated: true,
        isProfileComplete: true,
        hasActiveAccess: true,
        role: 'admin'
      })
      next()
      return
    }

    const accessState = computeAccessStatus(user)
    
    updateAuthCheck({
      isAuthenticated: true,
      isProfileComplete: true,
      hasActiveAccess: accessState.active,
      role: userRole
    })

    if (!accessState.active && !isRouteAllowedWithoutAccess(to)) {
      if (import.meta.env.DEV) {
        console.log(`[Router] Acesso negado, redirecionando para pagamento`);
      }
      next({ name: 'pagamento' })
      return
    }
    
    if (import.meta.env.DEV) {
      console.log(`[Router] Acesso liberado, continuando navegação`);
    }
  } catch (error) {
    // Se não conseguir acessar dados do usuário, redireciona para login
    // Isso acontece quando o usuário fez logout mas ainda tem currentUser definido
    
    // Log apenas em desenvolvimento para erros críticos
    if (import.meta.env.DEV) {
      console.error('[Router] Erro ao verificar usuário:', error);
      
      // Detectar erros específicos de conexão
      if (error.message?.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
          error.message?.includes('ERR_PROXY_CONNECTION_FAILED')) {
        console.error('[Router] Erro de proxy/tunnel detectado - possível proxy corporativo bloqueando Firestore');
      }
    }
    
    updateAuthCheck({ isAuthenticated: false, isProfileComplete: false, hasActiveAccess: false, role: null })
    next('/login')
    return
  }

    // ✅ Inicializar sistema de presença após autenticação bem-sucedida
    if (!presenceInitialized && currentUser.value) {
      presenceInitialized = true
      
      // 🔍 DEBUG: Log de inicialização do Presence no router
      if (import.meta.env.DEV) {
        console.debug('[DEBUG] Router - Inicializando useUserPresence...')
      }
      
      try {
        const { initUserPresence } = await import('@/composables/useUserPresence')
        initUserPresence()
        
        // 🔍 DEBUG: Log de sucesso
        if (import.meta.env.DEV) {
          console.debug('[DEBUG] Router - useUserPresence inicializado com SUCESSO')
        }
      } catch (error) {
        // Log apenas em desenvolvimento
        if (import.meta.env.DEV) {
          console.warn('[Router] Erro ao inicializar sistema de presença:', error)
          console.debug('[DEBUG] Router - ERRO ao inicializar useUserPresence:', error.message)
        }
      }
    }

    next()
  } catch (error) {
    // Error handling para falhas críticas na navegação
    console.error('[Router] Erro crítico na navegação:', error)

    // Em caso de erro, redirecionar para uma página segura
    if (to.path !== '/login' && to.path !== '/error') {
      next('/login')
    } else {
      next() // Evitar loop infinito
    }
  }
})

// Guarda após navegação para esconder o loader
router.afterEach(() => {
  if (window.globalLoaderRef) {
    window.globalLoaderRef.setLoading(false)
  }
})

// REMOVIDO: beforeunload antigo - agora o useUserPresence cuida disso

// Sistema de presença do usuário - inicializado dinamicamente após autenticação
let presenceInitialized = false

export default function (app) {
  app.use(router)
}

export { router }

















