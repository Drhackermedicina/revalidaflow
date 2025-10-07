<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { UserRankingData } from '../composables/useRanking';
import trophy from '@/assets/images/misc/trophy.png';
import { useAppTheme } from '@/composables/useAppTheme';

// Props
defineProps<{
  rankingData: UserRankingData | null;
  loading: boolean;
}>();

// Emits
const emit = defineEmits(['view-details']);

const { isDarkTheme } = useAppTheme();

const irParaRankingGeral = () => {
  emit('view-details');
};
</script>

<template>
  <VCard 
    :class="[
      'dashboard-card hoverable-card elevation-4 ranking-card-model',
      isDarkTheme ? 'dashboard-card--dark' : 'dashboard-card--light'
    ]"
    color="surface"
  >
    <VCardText class="d-flex flex-row align-center justify-space-between">
      <div v-if="loading">
        <h5 class="text-h5 font-weight-bold mb-1">Carregando ranking...</h5>
        <div class="text-body-1 mb-1">Ranking Geral dos Usuários</div>
        <h4 class="text-h4" style="color: #7b1fa2; font-weight: bold;">
          <VProgressCircular indeterminate color="primary" size="24" />
        </h4>
        <div class="text-body-1 mb-2">
          <VProgressCircular indeterminate color="primary" size="18" />
        </div>
        <VBtn 
          color="primary" 
          class="ranking-btn" 
          size="large" 
          prepend-icon="ri-bar-chart-fill" 
          disabled
          aria-label="Ver Detalhes do Ranking"
        >
          Ver Detalhes do Ranking
        </VBtn>
      </div>
      
      <div v-else-if="rankingData">
        <h5 class="text-h5 font-weight-bold mb-1">{{ rankingData.titulo }}</h5>
        <div class="text-body-1 mb-1">Ranking Geral dos Usuários</div>
        <h4 class="text-h4" style="color: #7b1fa2; font-weight: bold;">
          {{ rankingData.posicao }}
        </h4>
        <div class="text-body-1 mb-2">
          {{ rankingData.aproveitamento }}% de aproveitamento <span>🚀</span>
        </div>
        <VBtn 
          color="primary" 
          class="ranking-btn" 
          size="large" 
          prepend-icon="ri-bar-chart-fill" 
          @click="irParaRankingGeral" 
          aria-label="Ver Detalhes do Ranking"
        >
          Ver Detalhes do Ranking
        </VBtn>
      </div>
      
      <div v-else>
        <h5 class="text-h5 font-weight-bold mb-1">Ranking indisponível</h5>
        <div class="text-body-1 mb-1">Ranking Geral dos Usuários</div>
        <h4 class="text-h4" style="color: #7b1fa2; font-weight: bold;">
          -
        </h4>
        <div class="text-body-1 mb-2">
          -% de aproveitamento <span>🚀</span>
        </div>
        <VBtn 
          color="primary" 
          class="ranking-btn" 
          size="large" 
          prepend-icon="ri-bar-chart-fill" 
          disabled
          aria-label="Ver Detalhes do Ranking"
        >
          Ver Detalhes do Ranking
        </VBtn>
      </div>
      
      <VImg :src="trophy" width="60" alt="Troféu" class="ranking-trophy" />
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';

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
</style>