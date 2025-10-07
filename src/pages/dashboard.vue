<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

// Importar composables
import { useAuth } from '@/composables/useAuth';
import { useRanking } from '@/composables/useRanking';
import { useDashboardStats } from '@/composables/useDashboardStats';
import { useRecentStations } from '@/composables/useRecentStations';

// Importar componentes
import WelcomeCard from '@/components/dashboard/WelcomeCard.vue';
import RankingCard from '@/components/dashboard/RankingCard.vue';
import StatsSummaryCard from '@/components/dashboard/StatsSummaryCard.vue';
import OverallProgressCard from '@/components/dashboard/OverallProgressCard.vue';
import RecentStationsCard from '@/components/dashboard/RecentStationsCard.vue';
import OnlineUsersCard from '@/components/dashboard/OnlineUsersCard.vue';

const router = useRouter();

// Inicializar composables
const { userName } = useAuth();
const { rankingData, loading: loadingRanking, fetchRanking } = useRanking();
const { stats, loading: loadingStats, fetchStats } = useDashboardStats();
const { recentStations, loading: loadingStations, fetchRecentStations } = useRecentStations();

// Funções de handler de eventos
const handleViewDetails = () => {
  router.push('/app/ranking');
};

const handleStartStation = (stationId: string) => {
  router.push(`/app/simulation/${stationId}`);
};

// Função para garantir que o sidebar permaneça sempre aberto
function ensureSidebarOpen(): void {
  const wrapper = document.querySelector('.layout-wrapper');
  if (wrapper) {
    // Remove a classe collapsed se existir, garantindo que o sidebar fique aberto
    wrapper.classList.remove('layout-vertical-nav-collapsed');
  }
}

// Chamar fetches no onMounted
onMounted(() => {
  fetchRanking();
  fetchStats();
  fetchRecentStations();
  // Garante que o sidebar esteja sempre aberto no dashboard
  ensureSidebarOpen();
});

onUnmounted((): void => {
  // Remove a classe collapsed ao sair da página para evitar conflitos
  const wrapper = document.querySelector('.layout-wrapper');
  wrapper?.classList.remove('layout-vertical-nav-collapsed');
});
</script>

<template>
  <VRow class="match-height dashboard-row">
    <TransitionGroup name="staggered-fade" appear>
      <!-- Linha 1: WelcomeCard e StatsSummaryCard -->
      <VCol key="welcome" cols="12" md="5">
        <WelcomeCard :user-name="userName" />
      </VCol>

      <VCol key="stats" cols="12" md="7">
        <StatsSummaryCard
          :stats="stats"
          :loading="loadingStats"
        />
      </VCol>

      <!-- Linha 2: RankingCard, OverallProgressCard e OnlineUsersCard -->
      <VCol key="ranking" cols="12" md="4">
        <RankingCard
          :ranking-data="rankingData"
          :loading="loadingRanking"
          @view-details="handleViewDetails"
        />
      </VCol>

      <VCol key="progress" cols="12" md="4">
        <OverallProgressCard
          :stats="stats"
          :loading="loadingStats"
        />
      </VCol>

      <VCol key="online-users" cols="12" md="4">
        <OnlineUsersCard
          :user-count="5"
          :loading="false"
        />
      </VCol>

      <!-- Linha 3: RecentStationsCard -->
      <VCol key="recent-stations" cols="12">
        <RecentStationsCard
          :stations="recentStations"
          :loading="loadingStations"
          @start-station="handleStartStation"
        />
      </VCol>
    </TransitionGroup>
  </VRow>
</template>

<style scoped>
@import '@/styles/dashboard.css';
@import '@/styles/dashboard-variables.css';

.dashboard-row {
  row-gap: var(--dashboard-spacing-lg);
}

/* Staggered Fade Animation */
.staggered-fade-enter-active {
  transition: all 0.5s ease-out;
}

.staggered-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

/* Apply stagger delay to each card */
.v-col:nth-child(1) { transition-delay: 0.1s; }
.v-col:nth-child(2) { transition-delay: 0.2s; }
.v-col:nth-child(3) { transition-delay: 0.3s; }
.v-col:nth-child(4) { transition-delay: 0.4s; }
.v-col:nth-child(5) { transition-delay: 0.5s; }
.v-col:nth-child(6) { transition-delay: 0.6s; }

/* Dashboard Cards Hover Effect */
.v-col > .v-card {
  transition: all var(--dashboard-transition-normal) ease-in-out;
}

.v-col > .v-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--dashboard-shadow-lg);
}
</style>