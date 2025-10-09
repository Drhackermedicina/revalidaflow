<template>
  <div :class="themeClasses.container">
    <VContainer>
      <VRow>
        <VCol cols="12">
          <VCard
            title="Estatísticas de Desempenho do Candidato"
            :class="themeClasses.card"
            elevation="2"
          >
        <VCardText>
          <p class="text-body-1 mb-4 estatisticas-description" role="text" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 500 !important; font-size: 1.1rem !important; line-height: 1.7 !important;">Analise seu desempenho em diversas áreas e identifique pontos de melhoria.</p>

          <!-- Loading State -->
          <div v-if="loading"
            :class="[
              'd-flex justify-center align-center pa-8',
              themeClasses.loading
            ]"
            role="status"
            aria-live="polite"
          >
            <VProgressCircular indeterminate color="primary" size="64" aria-hidden="true" />
            <span class="ml-4 text-h6" aria-label="Carregando estatísticas">Carregando estatísticas...</span>
          </div>

          <!-- Content -->
          <div v-else>
            <VRow>
            <VCol cols="12" md="6">
              <VCard :class="['mb-4', themeClasses.card]">
                <VCardTitle class="d-flex align-center gap-2">
                  <VIcon icon="ri-line-chart-line" color="primary" size="24" />
                  <span class="text-h6 font-weight-bold" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 700 !important;">Pontuação Média por Simulação</span>
                </VCardTitle>
                <VCardText>
                  <VueApexCharts
                    type="radialBar"
                    height="200"
                    :options="averageScoreChartOptions"
                    :series="[averageScore]"
                    aria-label="Gráfico radial mostrando a pontuação média por simulação"
                    role="img"
                  />
                  <p class="text-caption text-medium-emphasis text-center mt-n4" role="text" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 500 !important;">Sua média nas últimas simulações.</p>
                </VCardText>
              </VCard>
            </VCol>

            <VCol cols="12" md="6">
              <VCard :class="['mb-4', themeClasses.card]">
                <VCardTitle class="d-flex align-center gap-2">
                  <VIcon icon="ri-medal-line" color="warning" size="24" />
                  <span class="text-h6 font-weight-bold" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 700 !important;">Melhor Pontuação</span>
                </VCardTitle>
                <VCardText>
                  <VueApexCharts
                    type="radialBar"
                    height="200"
                    :options="bestScoreChartOptions"
                    :series="[bestScore]"
                    aria-label="Gráfico radial mostrando a melhor pontuação obtida"
                    role="img"
                  />
                  <p class="text-caption text-medium-emphasis text-center mt-n4" role="text" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 500 !important;">Sua maior pontuação em uma única simulação.</p>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>

          <VDivider class="my-6" />

          <h3 class="text-h6 mb-4 estatisticas-section-title" role="heading" aria-level="3" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 700 !important; font-size: 1.25rem !important;">Desempenho por Área</h3>
          <VueApexCharts
            type="bar"
            height="350"
            :options="performanceByAreaChartOptions"
            :series="performanceByAreaSeries"
            aria-label="Gráfico de barras mostrando o desempenho por área de conhecimento médico"
            role="img"
          />
          <p class="text-caption text-medium-emphasis text-center mt-4 estatisticas-chart-description" role="text" style="color: rgb(var(--v-theme-on-surface)) !important; font-weight: 500 !important; font-size: 0.9rem !important; line-height: 1.6 !important;">Desempenho detalhado em cada área de conhecimento.</p>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</VContainer>
</div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { useTheme } from 'vuetify';
import { useThemeConfig } from '@/composables/useThemeConfig';
import { useFirebaseData } from '@/composables/useFirebaseData';

const vuetifyTheme = useTheme();
const { isDarkTheme, themeClasses } = useThemeConfig();
const { loading, userData, fetchUserStats } = useFirebaseData();

// Mapeamento de especialidades
const especialidadeNomes = {
  'clinica-medica': 'Clínica Médica',
  'cirurgia': 'Cirurgia Geral',
  'pediatria': 'Pediatria',
  'ginecologia-obstetricia': 'Ginecologia e Obstetrícia',
  'medicina-preventiva': 'Medicina Preventiva',
};

// Computed properties simplificadas
const averageScore = computed(() => {
  const nivel = userData.value?.nivelHabilidade;
  return nivel !== undefined ? Math.round(nivel * 10) : 0;
});

const bestScore = computed(() => {
  const estacoes = userData.value?.estacoesConcluidas || [];
  const notas = estacoes.map(estacao => estacao.nota || 0);
  return notas.length ? Math.max(...notas) : 0;
});

const performanceByArea = computed(() => {
  const stats = userData.value?.statistics;
  if (!stats) return [];

  const areas = Object.entries(stats)
    .filter(([key]) => key !== 'geral' && especialidadeNomes[key])
    .map(([key, dados]) => ({
      name: especialidadeNomes[key],
      score: Math.min(Math.round((dados.mediaNotas || 0) * 10), 100)
    }));

  return areas.length ? areas : Object.values(especialidadeNomes).map(nome => ({
    name: nome,
    score: 0
  }));
});

// Opções para o gráfico de Pontuação Média
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
        size: '50%',
      },
      dataLabels: {
        name: {
          show: false,
        },
        value: {
          offsetY: 5,
          fontSize: '22px',
          fontWeight: 600,
          formatter: (val) => `${val}%`,
          color: isDarkTheme.value
            ? vuetifyTheme.current.value.colors.onSurface
            : vuetifyTheme.current.value.colors.onSurface,
        },
      },
      track: {
        background: isDarkTheme.value
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
    mode: isDarkTheme.value ? 'dark' : 'light',
  },
}));

// Opções para o gráfico de Melhor Pontuação
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
        size: '50%',
      },
      dataLabels: {
        name: {
          show: false,
        },
        value: {
          offsetY: 5,
          fontSize: '22px',
          fontWeight: 600,
          formatter: (val) => `${val}%`,
          color: isDarkTheme.value
            ? vuetifyTheme.current.value.colors.onSurface
            : vuetifyTheme.current.value.colors.onSurface,
        },
      },
      track: {
        background: isDarkTheme.value
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
    mode: isDarkTheme.value ? 'dark' : 'light',
  },
}));

// Opções e séries para o gráfico de Desempenho por Área (Barra)
const performanceByAreaChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: {
      show: false,
    },
    background: 'transparent',
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 5,
      dataLabels: {
        position: 'top',
      },
    },
  },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${val}%`,
    offsetX: 30,
    style: {
      fontSize: '12px',
      colors: [isDarkTheme.value
        ? vuetifyTheme.current.value.colors.onSurface
        : vuetifyTheme.current.value.colors.onSurface],
    },
  },
  xaxis: {
    categories: performanceByArea.value.map(area => area.name),
    max: 100,
    labels: {
      formatter: (val) => `${val}%`,
      style: {
        colors: isDarkTheme.value
          ? vuetifyTheme.current.value.colors.onSurface
          : vuetifyTheme.current.value.colors.onSurface,
      },
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: isDarkTheme.value
          ? vuetifyTheme.current.value.colors.onSurface
          : vuetifyTheme.current.value.colors.onSurface,
      },
    },
  },
  grid: {
    show: true,
    borderColor: isDarkTheme.value
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
    xaxis: {
      lines: {
        show: false,
      },
    },
    yaxis: {
      lines: {
        show: true,
      },
    },
  },
  colors: [vuetifyTheme.current.value.colors.info],
  tooltip: {
    theme: isDarkTheme.value ? 'dark' : 'light',
    y: {
      formatter: (val) => `${val}%`,
    },
  },
  theme: {
    mode: isDarkTheme.value ? 'dark' : 'light',
  },
}));

const performanceByAreaSeries = computed(() => [
  {
    name: 'Pontuação',
    data: performanceByArea.value.map(area => area.score),
  },
]);

// Lifecycle hooks
onMounted(() => {
  fetchUserStats();
});
</script>

<style scoped>
/* Melhorar visual dos gráficos */
.apexcharts-text {
  fill: rgb(var(--v-theme-on-surface)) !important;
  font-weight: 500 !important;
}

.apexcharts-tooltip {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgb(var(--v-theme-outline)) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
</style>
