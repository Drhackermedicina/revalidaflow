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
    <!-- Linha 1: WelcomeCard e StatsSummaryCard -->
    <VCol cols="12" md="5">
      <transition name="fade-slide" appear>
        <WelcomeCard :user-name="userName" />
      </transition>
    </VCol>

    <VCol cols="12" md="7">
      <transition name="fade-slide" appear>
        <StatsSummaryCard
          :stats="stats"
          :loading="loadingStats"
        />
      </transition>
    </VCol>

    <!-- Linha 2: RankingCard, OverallProgressCard e OnlineUsersCard -->
    <VCol cols="12" md="4">
      <transition name="fade-slide" appear>
        <RankingCard
          :ranking-data="rankingData"
          :loading="loadingRanking"
          @view-details="handleViewDetails"
        />
      </transition>
    </VCol>

    <VCol cols="12" md="4">
      <transition name="fade-slide" appear>
        <OverallProgressCard
          :stats="stats"
          :loading="loadingStats"
        />
      </transition>
    </VCol>

    <VCol cols="12" md="4">
      <transition name="fade-slide" appear>
        <OnlineUsersCard
          :user-count="5"
          :loading="false"
        />
      </transition>
    </VCol>

    <!-- Linha 3: RecentStationsCard -->
    <VCol cols="12">
      <transition name="fade-slide" appear>
        <RecentStationsCard
          :stations="recentStations"
          :loading="loadingStations"
          @start-station="handleStartStation"
        />
      </transition>
    </VCol>
  </VRow>
</template>

<style scoped>
@import '@/styles/dashboard.css';

.dashboard-row {
  row-gap: 18px;
}
</style>