<template>
  <div class="performance-view">
    <div class="container">
      <h1>Performance</h1>
      <div v-if="loading" style="text-align:center; margin: 2rem 0;">
        Carregando dados...
      </div>
      <div v-else>
        <div v-if="error" style="color:red; text-align:center; margin-bottom:1rem;">{{ error }}</div>
        <v-row class="mb-6" justify="center">
          <v-col cols="12" md="3">
            <v-card outlined>
              <v-card-title>Simulações concluídas</v-card-title>
              <v-card-text>{{ simulations }}</v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card outlined>
              <v-card-title>Média de notas</v-card-title>
              <v-card-text>{{ averageScore }}</v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card outlined>
              <v-card-title>Streak</v-card-title>
              <v-card-text>{{ streak }}</v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-card outlined>
              <v-card-title>Evolução de desempenho</v-card-title>
                <div v-if="performanceHistory.length > 0" style="margin-bottom: 2rem;">
                  <PerformanceChart :history="performanceHistory" aria-label="Gráfico de evolução de desempenho" />
                </div>
              <v-card-text>
                <div v-if="performanceHistory.length === 0">Nenhum dado de desempenho ainda.</div>
                <ul v-else>
                  <li v-for="(item, idx) in performanceHistory" :key="idx">
                    {{ item.data }}: {{ item.score }}
                  </li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore'
import { computed, onMounted } from 'vue'

const userStore = useUserStore()
// DEBUG: Verificar retorno de usuários após fetch
console.log('[DEBUG] Usuários carregados:', userStore.state.users)
console.log('[DEBUG] Usuário atual:', userStore.state.user)

onMounted(() => {
  userStore.fetchUsers()
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
  background-color: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.dark-theme .performance-view {
  background-color: #1a1a1a;
  color: white;
}
</style>
