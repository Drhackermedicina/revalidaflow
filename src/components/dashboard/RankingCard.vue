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
    <VCardItem class="pb-2">
      <VCardTitle class="text-subtitle-1 font-weight-medium text-medium-emphasis">
        Sua Posição
      </VCardTitle>
    </VCardItem>
    
    <VCardText class="text-center py-4">
      <!-- Estado de loading -->
      <div v-if="loading">
        <VProgressCircular indeterminate color="primary" size="32" />
        <div class="text-body-2 mt-2">Carregando...</div>
      </div>
      
      <!-- Conteúdo quando carregado -->
      <div v-else-if="rankingData">
        <div class="ranking-position">
          #{{ rankingData.posicao }}
        </div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          {{ rankingData.aproveitamento }}% de aproveitamento
        </div>
        <VBtn
          variant="text"
          color="primary"
          size="small"
          @click="irParaRankingGeral"
          aria-label="Ver Detalhes do Ranking"
        >
          Ver ranking completo
        </VBtn>
      </div>
      
      <!-- Estado vazio -->
      <div v-else>
        <div class="ranking-position">
          -
        </div>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Ranking indisponível
        </div>
        <VBtn
          variant="text"
          color="primary"
          size="small"
          disabled
          aria-label="Ver Detalhes do Ranking"
        >
          Ver ranking completo
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';

.ranking-card-model {
  border-radius: 16px;
  padding: 16px;
}

.ranking-position {
  font-size: 3rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  line-height: 1;
  margin-bottom: 8px;
}
</style>