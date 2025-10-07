<script setup lang="ts">
import { defineProps, computed } from 'vue';
import { useTheme } from 'vuetify';
import type { DashboardStats } from '../../composables/useDashboardStats';

// Props
const props = defineProps<{
  stats: DashboardStats | null;
  loading: boolean;
}>();

const vuetifyTheme = useTheme();

// Cor da barra de progresso baseada no tema
const progressColor = computed(() => {
  return vuetifyTheme.global.current.value.dark ? 'primary' : 'primary';
});

// Formatar o valor do progresso para exibição
const formatProgress = (value: number): string => {
  return `${Math.round(value)}%`;
};

// Determinar a cor da barra de progresso com base no valor
const getProgressColor = (value: number): string => {
  if (value >= 80) return 'success';
  if (value >= 60) return 'info';
  if (value >= 40) return 'warning';
  return 'error';
};
</script>

<template>
  <VCard
    class="overall-progress-card elevation-2"
    color="surface"
  >
    <VCardItem class="pb-2">
      <VCardTitle class="d-flex align-center">
        <VIcon icon="ri-progress-3-line" color="primary" size="24" class="me-2" />
        Progresso Geral
      </VCardTitle>
    </VCardItem>

    <VCardText class="pa-4 pt-0">
      <!-- Estado de loading -->
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <VProgressCircular indeterminate color="primary" size="48" />
        <span class="ml-4 text-body-1">Carregando progresso...</span>
      </div>

      <!-- Conteúdo quando carregado -->
      <div v-else-if="stats">
        <!-- Progresso Geral -->
        <div class="mb-8">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-h6 font-weight-medium">Progresso Total</span>
            <span class="text-h6 font-weight-bold" :style="{ color: `rgb(var(--v-theme-${getProgressColor(stats.overallProgress)}))` }">
              {{ formatProgress(stats.overallProgress) }}
            </span>
          </div>
          <VProgressLinear
            :model-value="stats.overallProgress"
            :color="getProgressColor(stats.overallProgress)"
            height="14"
            rounded
            striped
          >
            <template #default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </VProgressLinear>
        </div>

        <!-- Progresso por Módulo -->
        <div>
          <VCardTitle class="text-subtitle-1 font-weight-medium pa-0 mb-4">
            Progresso por Módulo
          </VCardTitle>
          
          <VList density="compact" class="pa-0">
            <VListItem
              v-for="(area, index) in stats.performanceByArea"
              :key="index"
              class="pa-0 mb-4"
            >
              <template #prepend>
                <VIcon
                  :icon="getProgressColor(area.score) === 'success' ? 'ri-checkbox-circle-line' :
                         getProgressColor(area.score) === 'warning' ? 'ri-alert-line' :
                         'ri-close-circle-line'"
                  :color="getProgressColor(area.score)"
                  size="20"
                  class="me-3"
                />
              </template>
              
              <VListItemTitle class="d-flex justify-space-between align-center">
                <span class="text-body-2">{{ area.name }}</span>
                <span
                  class="text-body-2 font-weight-medium"
                  :style="{ color: `rgb(var(--v-theme-${getProgressColor(area.score)}))` }"
                >
                  {{ formatProgress(area.score) }}
                </span>
              </VListItemTitle>
              
              <template #append>
                <div style="width: 100px;">
                  <VProgressLinear
                    :model-value="area.score"
                    :color="getProgressColor(area.score)"
                    height="6"
                    rounded
                  />
                </div>
              </template>
            </VListItem>
          </VList>
        </div>
      </div>

      <!-- Estado vazio -->
      <div v-else class="d-flex justify-center align-center py-8">
        <div class="text-center">
          <VIcon icon="ri-progress-3-line" size="48" color="medium-emphasis" />
          <div class="text-body-1 text-medium-emphasis mt-2">
            Nenhum dado de progresso disponível
          </div>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';

/* Responsividade específica para este componente */
@media (max-width: 600px) {
  :deep(.v-list-item__append) {
    width: 80px;
  }
}

@media (max-width: 400px) {
  :deep(.v-list-item__append) {
    width: 60px;
  }
}
</style>