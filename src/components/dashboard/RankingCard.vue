<script setup lang="ts">
import { computed } from 'vue';
import trophy from '@/assets/images/misc/trophy.png';
import { useAppTheme } from '@/composables/useAppTheme';
import type { RankingData } from '@/composables/useRanking';

interface Props {
  rankingTitle: string;
  rankingSubtitle: string;
  rankingValue: string;
  rankingMeta: string;
  loadingRanking: boolean;
  errorRanking: string;
  rankingBtnText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rankingBtnText: 'Ver Detalhes do Ranking'
});

const emit = defineEmits<{
  'navigate-to-ranking': []
}>();

const { isDarkTheme } = useAppTheme();

const cardClasses = computed(() => [
  'dashboard-card hoverable-card elevation-4 ranking-card-model',
  isDarkTheme.value ? 'dashboard-card--dark' : 'dashboard-card--light'
]);

function irParaRankingGeral(): void {
  emit('navigate-to-ranking');
}
</script>

<template>
  <VCard :class="cardClasses" color="surface">
    <VCardText class="d-flex flex-row align-center justify-space-between">
      <div>
        <h5 class="text-h5 font-weight-bold mb-1">{{ rankingTitle }}</h5>
        <div class="text-body-1 mb-1">{{ rankingSubtitle }}</div>
        <h4 class="text-h4" style="color: #7b1fa2; font-weight: bold;">
          <span v-if="!loadingRanking">{{ rankingValue }}</span>
          <VProgressCircular v-else indeterminate color="primary" size="24" />
        </h4>
        <div class="text-body-1 mb-2">
          <span v-if="!loadingRanking">{{ rankingMeta }}% de aproveitamento <span>🚀</span></span>
          <VProgressCircular v-else indeterminate color="primary" size="18" />
        </div>
        <VBtn 
          color="primary" 
          class="ranking-btn" 
          size="large" 
          prepend-icon="ri-bar-chart-fill" 
          @click="irParaRankingGeral" 
          aria-label="Ver Detalhes do Ranking"
        >
          {{ rankingBtnText }}
        </VBtn>
        <div v-if="errorRanking" class="text-error mt-2">{{ errorRanking }}</div>
      </div>
      <VImg :src="trophy" width="60" alt="Troféu" class="ranking-trophy" />
    </VCardText>
  </VCard>
</template>

<style scoped>
.dashboard-card {
  border-radius: 18px;
  margin-bottom: 18px;
  transition: box-shadow 0.25s, transform 0.18s;
}

.dashboard-card--light {
  box-shadow: 0 4px 24px 0 rgba(123, 31, 162, 0.08), 0 1.5px 4px 0 rgba(0,0,0,0.04);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--light:hover {
  box-shadow: 0 8px 32px 0 rgba(123, 31, 162, 0.18), 0 3px 8px 0 rgba(0,188,212,0.10);
}

.dashboard-card--dark {
  box-shadow: 0 4px 24px 0 rgba(255, 255, 255, 0.05), 0 1.5px 4px 0 rgba(255, 255, 255, 0.02);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--dark:hover {
  box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.08), 0 3px 8px 0 rgba(123, 31, 162, 0.15);
}

.hoverable-card:hover {
  transform: translateY(-4px) scale(1.015);
}

.ranking-card-model {
  border-radius: 18px;
  padding: 18px 24px;
}

.ranking-trophy {
  position: relative;
  right: 0;
  bottom: 0;
  filter: drop-shadow(0 2px 8px #ffd600);
}

.ranking-btn {
  font-weight: bold;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
  margin-top: 8px;
}

@media (max-width: 900px) {
  .dashboard-card {
    border-radius: 12px;
    margin-bottom: 12px;
  }
}

@media (max-width: 600px) {
  .dashboard-card {
    border-radius: 8px;
    margin-bottom: 8px;
    padding: 0 2px;
  }
}
</style>