<template>
  <div 
    :class="[
      'performance-view',
      isDarkTheme ? 'performance-view--dark' : 'performance-view--light'
    ]"
  >
    <div 
      :class="[
        'container',
        isDarkTheme ? 'container--dark' : 'container--light'
      ]"
    >
      <h1 id="performance-title">Performance</h1>
      <div v-if="loading" class="loading-message" role="status" aria-live="polite">
        Carregando dados...
      </div>
      <div v-else>
        <div v-if="error" class="error-message" role="alert" aria-live="assertive">{{ error }}</div>
        <section aria-labelledby="performance-stats">
          <h2 id="performance-stats" class="sr-only">Estatísticas de Performance</h2>
          <v-row class="mb-6" justify="center">
            <v-col cols="12" md="3">
              <v-card outlined role="region" aria-labelledby="simulations-title">
                <v-card-title id="simulations-title">Simulações concluídas</v-card-title>
                <v-card-text aria-describedby="simulations-title">{{ simulations }}</v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card outlined role="region" aria-labelledby="average-title">
                <v-card-title id="average-title">Média de notas</v-card-title>
                <v-card-text aria-describedby="average-title">{{ averageScore }}</v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card outlined role="region" aria-labelledby="streak-title">
                <v-card-title id="streak-title">Streak</v-card-title>
                <v-card-text aria-describedby="streak-title">{{ streak }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </section>
        <section aria-labelledby="performance-evolution">
          <v-row>
            <v-col cols="12">
              <v-card outlined role="region" aria-labelledby="performance-evolution">
                <v-card-title id="performance-evolution">Evolução de desempenho</v-card-title>
                <!-- Gráfico de desempenho -->
                <div v-if="performanceHistory.length > 0" style="margin-bottom: 2rem; padding: 1rem;">
                  <PerformanceChart :history="performanceHistory" aria-label="Gráfico de evolução de desempenho ao longo do tempo" />
                </div>
                <v-card-text>
                  <div v-if="performanceHistory.length === 0" role="status">
                    Nenhum dado de desempenho ainda.
                  </div>
                  <div v-else>
                    <h3 class="sr-only">Lista detalhada do histórico de performance</h3>
                    <ul role="list" aria-label="Histórico de notas por data">
                      <li v-for="(item, idx) in performanceHistory" :key="idx" role="listitem">
                        <span aria-label="Data">{{ item.data }}</span>:
                        <span aria-label="Nota">{{ item.score }}</span>
                      </li>
                    </ul>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import PerformanceChart from '@/components/PerformanceChart.vue'
import { useUserStore } from '@/stores/userStore'
import { computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'

const userStore = useUserStore()
const theme = useTheme()

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

onMounted(() => {
  userStore.fetchUsers()
  
  // Debug logs para identificar o problema
  setTimeout(() => {
    console.log('userData:', userData.value)
    console.log('performanceHistory:', performanceHistory.value)
    console.log('estacoesConcluidas:', userData.value?.estacoesConcluidas)
  }, 1000)
})

const currentUserUid = computed(() => userStore.state.user?.uid)
const userData = computed(() => {
  if (!currentUserUid.value) return null
  return userStore.state.users.find(u => u.uid === currentUserUid.value) || null
})

const simulations = computed(() => userData.value?.estacoesConcluidas?.length ?? 0)
const averageScore = computed(() => {
  const media = userData.value?.statistics?.geral?.mediaNotas
  return media !== undefined ? Number(media).toFixed(2) : '-'
})
const streak = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []
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
  return concluidas.length ? streakCount : '-'
})
const performanceHistory = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || []
  return concluidas.map(item => ({
    data: item.data?.toDate ? item.data.toDate().toLocaleDateString() : (item.data instanceof Date ? item.data.toLocaleDateString() : ''),
    score: item.nota ?? '-'
  }))
})
const loading = computed(() => userStore.state.users.length === 0)
const error = computed(() => !userData.value ? 'Usuário não encontrado ou não autenticado.' : '')
</script>

<style scoped>
.performance-view {
  padding: 20px;
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Performance view - tema claro */
.performance-view--light {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* Performance view - tema escuro */
.performance-view--dark {
  background-color: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Loading message */
.loading-message {
  text-align: center;
  margin: 2rem 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.1rem;
}

/* Error message */
.error-message {
  color: rgb(var(--v-theme-error));
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 500;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.3);
}

/* Title styling */
h1 {
  color: rgb(var(--v-theme-on-background));
  margin-bottom: 1.5rem;
  font-weight: 600;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Performance cards styling */
.v-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* List styling for performance history */
ul[role="list"] {
  list-style: none;
  padding: 0;
}

ul[role="list"] li {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

ul[role="list"] li:last-child {
  border-bottom: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .performance-view {
    padding: 12px;
  }
  
  .container {
    padding: 0 12px;
  }
}
</style>
