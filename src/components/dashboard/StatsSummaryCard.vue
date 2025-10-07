<script setup lang="ts">
import { defineProps, computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { useTheme } from 'vuetify';
import type { DashboardStats } from '../composables/useDashboardStats';

// Props
const props = defineProps<{
  stats: DashboardStats | null;
  loading: boolean;
}>();

const vuetifyTheme = useTheme();

// Computed para as opções dos gráficos
const averageScoreChartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: {
      enabled: true,
    },
    background: 'transparent',
  },
  plotOptions: {
    radialBar: {
      hollow: {
        size: '60%',
      },
      dataLabels: {
        name: {
          show: false,
        },
        value: {
          offsetY: 5,
          fontSize: '20px',
          fontWeight: 600,
          formatter: (val) => `${val}%`,
          color: vuetifyTheme.current.value.colors.onSurface,
        },
      },
      track: {
        background: vuetifyTheme.global.current.value.dark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  stroke: {
    lineCap: 'round',
  },
  colors: [vuetifyTheme.current.value.colors.success],
  labels: ['Média'],
  theme: {
    mode: vuetifyTheme.global.current.value.dark ? 'dark' : 'light',
  },
}));

const bestScoreChartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: {
      enabled: true,
    },
    background: 'transparent',
  },
  plotOptions: {
    radialBar: {
      hollow: {
        size: '60%',
      },
      dataLabels: {
        name: {
          show: false,
        },
        value: {
          offsetY: 5,
          fontSize: '20px',
          fontWeight: 600,
          formatter: (val) => `${val}%`,
          color: vuetifyTheme.current.value.colors.onSurface,
        },
      },
      track: {
        background: vuetifyTheme.global.current.value.dark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  stroke: {
    lineCap: 'round',
  },
  colors: [vuetifyTheme.current.value.colors.warning],
  labels: ['Melhor'],
  theme: {
    mode: vuetifyTheme.global.current.value.dark ? 'dark' : 'light',
  },
}));
</script>

<template>
  <VCard
    class="stats-summary-card"
    elevation="2"
    color="surface"
  >
    <VCardText class="pa-4">
      <!-- Estado de loading -->
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <VProgressCircular indeterminate color="primary" size="48" />
        <span class="ml-4 text-body-1">Carregando estatísticas...</span>
      </div>

      <!-- Conteúdo quando carregado -->
      <div v-else-if="stats">
        <VRow>
          <!-- Pontuação Média -->
          <VCol cols="12" sm="4" class="text-center">
            <VCard class="stat-card pa-3 hoverable-stat" elevation="1">
              <VCardTitle class="d-flex flex-column align-center pa-0">
                <VIcon icon="ri-line-chart-line" color="success" size="24" class="mb-2" />
                <span class="text-subtitle-1 font-weight-medium">Pontuação Média</span>
              </VCardTitle>
              <VCardText class="pa-0 mt-2">
                <VueApexCharts
                  type="radialBar"
                  height="120"
                  :options="averageScoreChartOptions"
                  :series="[stats.averageScore]"
                  aria-label="Gráfico radial mostrando a pontuação média"
                />
              </VCardText>
            </VCard>
          </VCol>

          <!-- Melhor Pontuação -->
          <VCol cols="12" sm="4" class="text-center">
            <VCard class="stat-card pa-3 hoverable-stat" elevation="1">
              <VCardTitle class="d-flex flex-column align-center pa-0">
                <VIcon icon="ri-medal-line" color="warning" size="24" class="mb-2" />
                <span class="text-subtitle-1 font-weight-medium">Melhor Pontuação</span>
              </VCardTitle>
              <VCardText class="pa-0 mt-2">
                <VueApexCharts
                  type="radialBar"
                  height="120"
                  :options="bestScoreChartOptions"
                  :series="[stats.bestScore]"
                  aria-label="Gráfico radial mostrando a melhor pontuação"
                />
              </VCardText>
            </VCard>
          </VCol>

          <!-- Streak -->
          <VCol cols="12" sm="4" class="text-center">
            <VCard class="stat-card pa-3 hoverable-stat" elevation="1">
              <VCardTitle class="d-flex flex-column align-center pa-0">
                <VIcon icon="ri-fire-line" color="error" size="24" class="mb-2" />
                <span class="text-subtitle-1 font-weight-medium">Streak</span>
              </VCardTitle>
              <VCardText class="pa-0 mt-2 d-flex flex-column align-center justify-center" style="height: 120px;">
                <div class="text-h4 font-weight-bold" style="color: rgb(var(--v-theme-error))">
                  {{ stats.streak }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  dias consecutivos
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </div>

      <!-- Estado vazio -->
      <div v-else class="d-flex justify-center align-center py-8">
        <div class="text-center">
          <VIcon icon="ri-bar-chart-line" size="48" color="medium-emphasis" />
          <div class="text-body-1 text-medium-emphasis mt-2">
            Nenhuma estatística disponível
          </div>
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';

.stat-card {
  height: 100%;
  transition: all 0.2s ease-in-out;
}

.hoverable-stat:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}
</style>