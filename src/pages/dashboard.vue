<template>
  <VContainer fluid class="dashboard-container px-0 py-4">
    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay d-flex justify-center align-center">
      <div class="text-center">
        <VProgressCircular indeterminate color="primary" size="64" class="mb-4" />
        <p class="text-h6 text-medium-emphasis">Carregando dashboard...</p>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Header Moderno -->
      <div class="dashboard-header-modern mb-6">
        <div class="header-gradient-bg">
          <div class="header-content d-flex align-center justify-space-between flex-wrap">
            <!-- Lado Esquerdo: Logo e Título -->
            <div class="header-left d-flex align-center">
              <div class="header-icon-wrapper me-4">
                <img 
                  src="/botaosemfundo.png" 
                  alt="RevalidaFlow Logo" 
                  class="header-logo"
                />
              </div>
              <div>
                <h1 class="header-title mb-1">
                  <span class="brand-name">RevalidaFlow</span>
                </h1>
                <p class="header-subtitle mb-0">
                  <VIcon icon="ri-bar-chart-line" size="16" class="me-1" />
                  Visão geral do seu progresso e atividades
                </p>
              </div>
            </div>

            <!-- Lado Direito: Stats Rápidas -->
            <div class="header-right d-flex gap-3">
              <div class="quick-stat">
                <VIcon icon="ri-fire-fill" color="warning" size="20" class="mb-1" />
                <div class="stat-value">{{ streakDays }}</div>
                <div class="stat-label">Dias</div>
              </div>
              <div class="quick-stat">
                <VIcon icon="ri-trophy-fill" color="success" size="20" class="mb-1" />
                <div class="stat-value">{{ rankingPosition || '-' }}</div>
                <div class="stat-label">Ranking</div>
              </div>
              <div class="quick-stat">
                <VIcon icon="ri-checkbox-circle-fill" color="primary" size="20" class="mb-1" />
                <div class="stat-value">{{ totalSimulations }}</div>
                <div class="stat-label">Simulações</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <VRow class="dashboard-grid mt-0">
        <!-- Linha 1: Welcome Card + Ranking Card -->
        <VCol cols="12" lg="9" md="8" class="d-flex flex-column">
          <WelcomeCard />
          
          <!-- Linha 1.5: Usuários Online + Estações Recentes (logo abaixo do Welcome) -->
          <VRow class="mt-3 flex-grow-1">
            <VCol cols="12" sm="6">
              <OnlineUsersCard class="fill-height" />
            </VCol>
            <VCol cols="12" sm="6">
              <RecentStationsCard class="fill-height" />
            </VCol>
          </VRow>
        </VCol>

        <VCol cols="12" lg="3" md="4" class="d-flex">
          <RankingCard
            :loading="loading" 
            :error="error" 
            :loadDashboardData="loadDashboardData"
            :rankingPosition="rankingPosition"
            :rankingScore="rankingScore"
            :top3Users="top3Users"
            :userData="userData"
            :pointsToNextLevel="pointsToNextLevel"
            :nextRankingMilestone="nextRankingMilestone"
            :rankingHistory="rankingHistory"
          />
        </VCol>

        <!-- Linha 2: Stats Overview (4 cards em 1 row) -->
        <VCol cols="12">
          <StatsOverview />
        </VCol>

        <!-- Linha 3: Progresso Semanal + Notificações -->
        <VCol cols="12" md="6">
          <WeeklyProgressCard />
        </VCol>

        <VCol cols="12" md="6">
          <NotificationsCard />
        </VCol>
      </VRow>

      <!-- Quick Actions -->
      <VRow class="mt-4">
        <VCol cols="12">
          <VCard
            :class="[
              'quick-actions-card',
              isDarkTheme ? 'quick-actions-card--dark' : 'quick-actions-card--light'
            ]"
            elevation="1"
          >
            <VCardText class="d-flex flex-wrap justify-center gap-3 pa-4">
              <VBtn
                color="primary"
                variant="tonal"
                size="small"
                @click="goToStations"
              >
                <VIcon icon="ri-hospital-line" class="me-2" />
                Estações
              </VBtn>

              <VBtn
                color="secondary"
                variant="tonal"
                size="small"
                @click="goToPerformance"
              >
                <VIcon icon="ri-line-chart-line" class="me-2" />
                Performance
              </VBtn>

              <VBtn
                color="success"
                variant="tonal"
                size="small"
                @click="goToRanking"
              >
                <VIcon icon="ri-trophy-line" class="me-2" />
                Ranking
              </VBtn>

              <VBtn
                color="info"
                variant="tonal"
                size="small"
                @click="goToChat"
              >
                <VIcon icon="ri-wechat-line" class="me-2" />
                Chat
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- Error Snackbar -->
    <VSnackbar
      v-model="showError"
      color="error"
      timeout="5000"
      location="top"
    >
      {{ error }}
      <template #actions>
        <VBtn variant="text" @click="showError = false">Fechar</VBtn>
      </template>
    </VSnackbar>
  </VContainer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useDashboardData } from '@/composables/useDashboardData.js'
import { useDashboardStats } from '@/composables/useDashboardStats.js'

// Componentes
import WelcomeCard from '@/components/dashboard/WelcomeCard.vue'
import RankingCard from '@/components/dashboard/RankingCard.vue'
import OnlineUsersCard from '@/components/dashboard/OnlineUsersCard.vue'
import RecentStationsCard from '@/components/dashboard/RecentStationsCard.vue'
import StatsOverview from '@/components/dashboard/StatsOverview.vue'
import WeeklyProgressCard from '@/components/dashboard/WeeklyProgressCard.vue'
import NotificationsCard from '@/components/dashboard/NotificationsCard.vue'


const router = useRouter()
const theme = useTheme()

// Composable central
const {
  loading,
  error,
  loadDashboardData,
  userData,
  rankingPosition,
  rankingScore,
  top3Users,
  streakDays,
  totalSimulations
} = useDashboardData()

// Stats derivadas
const {
  pointsToNextLevel,
  nextRankingMilestone,
  rankingHistory
} = useDashboardStats(userData)

// Estado local
const showError = ref(false)

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Lifecycle
onMounted(async () => {
  try {
    await loadDashboardData()

    // Garantir que o sidebar esteja sempre aberto no dashboard
    ensureSidebarOpen()
  } catch (err) {
    showError.value = true
  }
})

// Sidebar sempre aberto
function ensureSidebarOpen() {
  const wrapper = document.querySelector('.layout-wrapper')
  if (wrapper) {
    wrapper.classList.remove('layout-vertical-nav-collapsed')
  }
}

// Navegação
const goToStations = () => {
  router.push('/app/station-list')
}

const goToPerformance = () => {
  router.push('/candidato/performance')
}

const goToRanking = () => {
  router.push('/app/ranking')
}

const goToChat = () => {
  router.push('/app/chat-group')
}
</script>

<style scoped>
/* ========== CONTAINER ========== */
.dashboard-container {
  width: 100%;
  margin: 0;
  position: relative;
  min-height: calc(100vh - 64px);
}

/* ========== LOADING OVERLAY ========== */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--v-theme-surface), 0.95);
  z-index: 10;
  backdrop-filter: blur(8px);
}

/* ========== HEADER MODERNO ========== */
.dashboard-header-modern {
  animation: fadeSlideDown 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  margin: 0 0 24px 0;
  border-radius: 0;
  overflow: hidden;
}

.header-gradient-bg {
  background: 
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.5) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      rgba(0, 0, 0, 0.5) 100%
    ),
    url('/header-bg.png') center/cover no-repeat;
  border-bottom: 2px solid rgba(255, 255, 255, 0.15);
  padding: 16px 16px;
  position: relative;
  overflow: hidden;
}

.header-gradient-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 50%, rgba(138, 43, 226, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(0, 191, 255, 0.12) 0%, transparent 50%);
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
}

/* Ícone do Header - Logo Container */
.header-icon-wrapper {
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: float 3s ease-in-out infinite;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  padding: 10px;
}

.header-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: 
    brightness(1.15)
    contrast(1.4)
    saturate(1.2)
    drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))
    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  transition: filter 0.3s ease;
}

.header-logo:hover {
  filter: 
    brightness(1.25)
    contrast(1.5)
    saturate(1.3)
    drop-shadow(0 0 15px rgba(255, 255, 255, 0.7))
    drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

/* Animação de flutuação */
@keyframes float {
  0%, 100% { 
    transform: translateY(0px); 
  }
  50% { 
    transform: translateY(-5px); 
  }
}

/* Título */
.header-title {
  font-size: 2.8rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

.brand-name {
  color: #ffffff !important;
  font-weight: 800;
  letter-spacing: 0.5px;
  position: relative;
  display: inline-block;
  text-shadow: 
    0 3px 10px rgba(0, 0, 0, 0.9),
    0 5px 20px rgba(0, 0, 0, 0.7),
    0 0 40px rgba(138, 43, 226, 0.5);
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
}

.header-subtitle {
  font-size: 0.95rem;
  color: #ffffff;
  font-weight: 600;
  display: flex;
  align-items: center;
  text-shadow: 
    0 1px 4px rgba(0, 0, 0, 0.6),
    0 2px 8px rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 12px;
  border-radius: 8px;
  backdrop-filter: blur(8px);
  display: inline-flex;
  margin-top: 4px;
}

/* Stats Rápidas */
.header-right {
  gap: 12px;
}

.quick-stat {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  min-width: 80px;
  text-align: center;
  transition: all 0.3s ease;
  animation: fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.quick-stat:nth-child(1) { animation-delay: 0.1s; }
.quick-stat:nth-child(2) { animation-delay: 0.2s; }
.quick-stat:nth-child(3) { animation-delay: 0.3s; }

.quick-stat:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.7);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
  margin-top: 4px;
  margin-bottom: 2px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

@keyframes fadeSlideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== GRID LAYOUT ========== */
.dashboard-grid {
  row-gap: 20px;
  margin-left: 0;
  margin-right: 0;
}

.dashboard-grid > .v-col {
  display: flex;
}

.dashboard-grid > .v-col > * {
  width: 100%;
}

/* ========== QUICK ACTIONS ========== */
.quick-actions-card {
  border-radius: 16px;
  transition: all 0.3s ease;
  animation: fadeIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.5s backwards;
}

.quick-actions-card--light {
  background: rgba(var(--v-theme-surface-bright), 0.6);
  border: 1px solid rgba(var(--v-theme-outline), 0.08);
}

.quick-actions-card--dark {
  background: rgba(var(--v-theme-surface-dim), 0.4);
  border: 1px solid rgba(var(--v-theme-outline), 0.16);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ========== RESPONSIVIDADE ========== */
@media (max-width: 1280px) {
  .dashboard-container {
    padding: 12px 0;
  }

  .dashboard-grid {
    row-gap: 16px;
    margin-left: 0;
    margin-right: 0;
  }
  
  .dashboard-header-modern {
    margin: 0 0 24px 0;
  }
}

@media (max-width: 960px) {
  .dashboard-container {
    padding: 8px 0;
  }

  .dashboard-grid {
    row-gap: 12px;
    margin-left: 0;
    margin-right: 0;
  }

  .dashboard-header-modern {
    margin: 0 0 16px 0;
  }

  .header-gradient-bg {
    padding: 20px 24px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 20px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .quick-stat {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 600px) {
  .dashboard-container {
    padding: 6px 0;
  }

  .dashboard-grid {
    row-gap: 10px;
    margin-left: 0;
    margin-right: 0;
  }

  .dashboard-header-modern {
    margin: 0 0 16px 0;
  }

  .header-gradient-bg {
    padding: 16px;
  }

  .header-icon-wrapper {
    width: 100px !important;
    height: 100px !important;
    margin-right: 12px !important;
  }

  .header-title {
    font-size: 1.75rem !important;
  }

  .header-subtitle {
    font-size: 0.85rem !important;
  }

  .quick-stat {
    padding: 10px 12px;
    min-width: 70px;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }

  .quick-actions-card .v-btn {
    font-size: 0.8rem !important;
    padding: 6px 12px !important;
  }
}

/* ========== MATCH HEIGHT ========== */
.match-height {
  align-items: stretch;
}

.match-height > .v-col {
  display: flex;
  flex-direction: column;
}

.match-height > .v-col > .v-card {
  flex: 1;
}

/* ========== PERFORMANCE ========== */
@media (prefers-reduced-motion: reduce) {
  .dashboard-header-modern,
  .quick-actions-card,
  .dashboard-grid > .v-col > * {
    animation: none !important;
  }
}
</style>
