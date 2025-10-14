<template>
  <div :class="themeClasses.container">
    <VContainer>
      <VRow>
        <VCol cols="12">
          <VCard
            title="Performance do Candidato"
            :class="themeClasses.card"
            elevation="2"
          >
            <VCardText>
              <p class="text-body-1 mb-4 performance-description">
                Acompanhe sua evolução e mantenha o foco nos estudos.
              </p>

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
                <span class="ml-4 text-h6" aria-label="Carregando performance">Carregando dados de performance...</span>
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="error-container">
                <VAlert type="error" text>{{ error }}</VAlert>
              </div>

              <!-- Content -->
              <div v-else>
                <VRow class="mb-6" justify="center">
                  <VCol cols="12" md="4">
                    <VCard :class="['mb-4', themeClasses.card]" elevation="2">
                      <VCardTitle class="d-flex align-center gap-2">
                        <VIcon icon="ri-check-circle-line" color="success" size="24" />
                        <span class="text-h6 font-weight-bold">Simulações concluídas</span>
                      </VCardTitle>
                      <VCardText>
                        <div class="stat-value">{{ simulations }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="12" md="4">
                    <VCard :class="['mb-4', themeClasses.card]" elevation="2">
                      <VCardTitle class="d-flex align-center gap-2">
                        <VIcon icon="ri-star-line" color="warning" size="24" />
                        <span class="text-h6 font-weight-bold">Média de notas</span>
                      </VCardTitle>
                      <VCardText>
                        <div class="stat-value">{{ averageScore }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                  <VCol cols="12" md="4">
                    <VCard :class="['mb-4', themeClasses.card]" elevation="2">
                      <VCardTitle class="d-flex align-center gap-2">
                        <VIcon icon="ri-fire-line" color="error" size="24" />
                        <span class="text-h6 font-weight-bold">Streak</span>
                      </VCardTitle>
                      <VCardText>
                        <div class="stat-value">{{ streak }}</div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>

                <VRow>
                  <VCol cols="12">
                    <VCard :class="['mb-4', themeClasses.card]" elevation="2">
                      <VCardTitle class="d-flex align-center gap-2">
                        <VIcon icon="ri-line-chart-line" color="primary" size="24" />
                        <span class="text-h6 font-weight-bold">Evolução de desempenho</span>
                      </VCardTitle>
                      <VCardText>
                        <div v-if="performanceHistory.length > 0" class="chart-container">
                          <PerformanceChart :history="performanceHistory" aria-label="Gráfico de evolução de desempenho" />
                        </div>
                        <div v-if="performanceHistory.length === 0" class="no-data-message">
                          <VIcon icon="ri-bar-chart-line" size="48" color="grey" />
                          <p class="text-body-1 mt-2">Nenhum dado de desempenho ainda.</p>
                          <p class="text-caption text-medium-emphasis">Complete algumas simulações para ver sua evolução!</p>
                        </div>
                        <div v-else class="history-list">
                          <h4 class="text-subtitle-1 mb-3">Histórico detalhado</h4>
                          <ul class="performance-history">
                            <li v-for="(item, idx) in performanceHistory" :key="idx" class="history-item">
                              <span class="date">{{ item.data }}</span>
                              <span class="score">{{ item.score }}</span>
                            </li>
                          </ul>
                        </div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeConfig } from '@/composables/useThemeConfig'
import { useFirebaseData } from '@/composables/useFirebaseData'
import PerformanceChart from '@/components/PerformanceChart.vue'

const { themeClasses } = useThemeConfig()
const { loading, error, userData, fetchUserStats } = useFirebaseData()

const simulations = computed(() => userData.value?.estacoesConcluidas?.length ?? 0)

const averageScore = computed(() => {
  const media = userData.value?.statistics?.geral?.mediaNotas
  return media !== undefined ? Number(media).toFixed(2) : '-'
})

const streak = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []
  if (!concluidas.length) return '-'

  let streakCount = 0
  let lastDate = null

  concluidas
    .map(item => {
      if (item.data?.toDate) return item.data.toDate()
      if (item.data instanceof Date) return item.data
      if (typeof item.data === 'string' || typeof item.data === 'number') return new Date(item.data)
      return null
    })
    .filter(Boolean)
    .sort((a, b) => b - a)
    .forEach(date => {
      if (!lastDate) {
        streakCount = 1
        lastDate = date
      } else {
        const diff = (lastDate - date) / (1000 * 60 * 60 * 24)
        if (diff <= 1.5) {
          streakCount++
          lastDate = date
        }
      }
    })

  return streakCount
})

const performanceHistory = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []
  return concluidas.map(item => ({
    data: item.data?.toDate ? item.data.toDate().toLocaleDateString() : (item.data instanceof Date ? item.data.toLocaleDateString() : ''),
    score: item.nota ?? '-'
  }))
})

// Lifecycle hooks
onMounted(() => {
  fetchUserStats()
})
</script>

<style scoped>
.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: rgb(var(--v-theme-primary));
  text-align: center;
  margin-top: 0.5rem;
}

.chart-container {
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-outline), 0.08);
}

.no-data-message {
  text-align: center;
  padding: 3rem 1rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.history-list {
  margin-top: 2rem;
}

.performance-history {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-outline), 0.08);
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

.date {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.score {
  font-weight: bold;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.error-container {
  margin-bottom: 1rem;
}

/* Responsividade */
@media (max-width: 768px) {
  .stat-value {
    font-size: 1.5rem;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
