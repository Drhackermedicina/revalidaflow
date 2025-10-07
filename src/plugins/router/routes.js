export const routes = [
  // Landing, login e register SEM layout global
  {
    path: '/',
    component: () => import('@/layouts/components/blank.vue'),
    children: [
      {
        path: '',
        name: 'landing-page',
        component: () => import('@/pages/landing/LandingPage.vue'),
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/login.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/pages/register.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'error',
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
  // Demais rotas protegidas com layout global
  {
    path: '/app',
    component: () => import('@/layouts/default.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
      },
      {
        path: 'account-settings',
        name: 'account-settings',
        component: () => import('@/pages/account-settings.vue'),
      },
      {
        path: 'typography',
        name: 'typography',
        component: () => import('@/pages/typography.vue'),
      },
      {
        path: 'icons',
        name: 'icons',
        component: () => import('@/pages/icons.vue'),
      },
      {
        path: 'cards',
        name: 'cards',
        component: () => import('@/pages/cards.vue'),
      },
      {
        path: 'tables',
        name: 'tables',
        component: () => import('@/pages/tables.vue'),
      },
      {
        path: 'form-layouts',
        name: 'form-layouts',
        component: () => import('@/pages/form-layouts.vue'),
      },
      {
        path: 'admin-upload',
        name: 'admin-upload',
        component: () => import('@/pages/AdminUpload.vue'),
      },
      // rota 'admin' restaurada — página administrativa
      {
        path: 'admin',
        name: 'admin',
        component: () => import('@/pages/AdminView.vue'),
        meta: {
          requiresAuth: true,
          requiresAdmin: true
        },
      },
      {
        path: 'admin-reset-users',
        name: 'admin-reset-users',
        component: () => import('@/pages/AdminResetUsers.vue'),
        meta: {
          requiresAuth: true,
          requiresAdmin: true, // Adicionar verificação de admin se implementada
        },
      },
      {
        // rota 'admin-dashboard-ia' removida (painel IA legado)
        // Para restaurar, recupere '@/pages/AdminDashboardIA.vue' do histórico Git
        path: 'questoes',
        name: 'questoes',
        component: () => import('@/pages/questoes.vue'),
        meta: {
          requiresAuth: true,
        },
      },
      {
        // rota 'virtual-agent' removida (página de agente virtual legado)
        // Para restaurar, recupere '@/pages/VirtualAgentView.vue' do histórico Git
        path: 'chat-group',
        name: 'ChatGroupView',
        component: () => import('@/pages/ChatGroupView.vue'),
        meta: {
          requiresAuth: true,
          layout: 'default',
        },
      },
      {
        path: 'simulation/:id',
        name: 'simulation-view',
        component: () => import('@/pages/SimulationView.vue'),
        props: true,
      },
      {
        path: 'station-list',
        name: 'station-list',
        component: () => import('@/pages/StationList.vue'),
        meta: { requiresAuth: false }, // Temporariamente desabilitado para depuração
      },
      {
        path: 'edit-station/:id',
        name: 'edit-station',
        component: () => import('@/pages/EditStationView.vue'),
        props: true,
      },
      {
        path: 'edit-questao/:id',
        name: 'edit-questao',
        component: () => import('@/pages/EditQuestaoView.vue'),
        props: true,
      },
      {
        path: 'station/:id',
        name: 'station-view',
        component: () => import('@/pages/SimulationView.vue'),
        props: true,
      },
      {
        path: 'station/:id/simulate',
        name: 'station-simulation',
        component: () => import('@/pages/SimulationView.vue'),
        props: true,
      },
      {
        path: 'simulation-ai/:id',
        name: 'simulation-ai',
        component: () => import('@/pages/SimulationViewAI.vue'),
        props: true,
      },
      {
        path: 'stations-index',
        name: 'stations-index',
        component: () => import('@/pages/StationList.vue'),
      },
      {
        // rota 'aguarde-simulacao' removida
        path: 'ranking',
        name: 'ranking-geral',
        component: () => import('@/pages/RankingView.vue'),
      },
      {
        path: 'diagnostico-ranking',
        name: 'diagnostico-ranking',
        component: () => import('@/pages/DiagnosticoRanking.vue'),
      },
      {
        path: 'chat-private/:uid',
        name: 'ChatPrivateView',
        component: () => import('@/pages/ChatPrivateView.vue'),
        meta: {
          requiresAuth: true,
          layout: 'default',
        },
        props: true,
      },
      // {
      //   path: 'task-manager',
      //   name: 'task-manager',
      //   component: () => import('@/pages/task-manager.vue'),
      //   meta: {
      //     requiresAuth: true,
      //     layout: 'default',
      //   },
      // },
    ],
  },

  // Rotas da Área do Candidato (REMOVIDAS - componentes obsoletos após refatoração do dashboard)
  // Os componentes Progresso.vue, Estatisticas.vue, Historico.vue e PerformanceView.vue foram removidos
  // pois sua lógica foi centralizada no useDashboardStats.ts e seus layouts foram incorporados nos novos cards

  // Rotas absolutas para acesso direto às estações e simulação (REMOVIDAS para garantir layout global)
  // {
  //   path: '/station/:id',
  //   name: 'station-view-absolute',
  //   component: () => import('@/pages/StationView.vue'),
  //   props: true,
  // },
  // {
  //   path: '/station/:id/simulate',
  //   name: 'station-simulation-absolute',
  //   component: () => import('@/pages/SimulationView.vue'),
  //   props: true,
  // },
]
