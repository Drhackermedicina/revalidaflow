<template>
  <v-dialog v-model="show" max-width="1200" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6">Dashboard de Validação - Correções Críticas</span>
        <v-btn icon @click="show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Status Geral -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-alert
              :type="healthStatusColor"
              variant="tonal"
              class="mb-4"
            >
              <div class="d-flex align-center">
                <v-icon class="mr-2">{{ healthStatusIcon }}</v-icon>
                <div>
                  <strong>Status Geral: {{ healthStatusText }}</strong>
                  <div class="text-caption mt-1">
                    Sessão: {{ sessionId }} | Última atualização: {{ lastUpdate }}
                  </div>
                </div>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Métricas Principais -->
        <v-row>
          <!-- Race Conditions -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center mb-3">
                <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
                <span class="text-h6">Race Conditions</span>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Detectadas:</span>
                  <span class="font-weight-bold">{{ metrics.raceConditions.detected }}</span>
                </div>
                <v-progress-linear
                  :value="raceConditionProgress"
                  color="warning"
                  height="8"
                  class="mb-2"
                />
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Prevenidas:</span>
                  <span class="font-weight-bold text-success">{{ metrics.raceConditions.prevented }}</span>
                </div>
                <v-progress-linear
                  :value="raceConditionSuccessRate"
                  color="success"
                  height="8"
                  class="mb-2"
                />
              </div>

              <div class="text-caption text-center mt-2">
                Taxa de Sucesso: {{ raceConditionSuccessRate.toFixed(1) }}%
              </div>
            </v-card>
          </v-col>

          <!-- Firestore Errors -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center mb-3">
                <v-icon color="error" class="mr-2">mdi-database-alert</v-icon>
                <span class="text-h6">Erros Firestore</span>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Conexão:</span>
                  <span class="font-weight-bold">{{ metrics.firestoreErrors.connectionErrors }}</span>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Proxy:</span>
                  <span class="font-weight-bold">{{ metrics.firestoreErrors.proxyErrors }}</span>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Recuperadas:</span>
                  <span class="font-weight-bold text-success">{{ metrics.firestoreErrors.recovered }}</span>
                </div>
                <v-progress-linear
                  :value="firestoreSuccessRate"
                  color="success"
                  height="8"
                  class="mb-2"
                />
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Modo Offline:</span>
                  <span class="font-weight-bold text-warning">{{ metrics.firestoreErrors.offlineModeActivated }}</span>
                </div>
              </div>

              <div class="text-caption text-center mt-2">
                Taxa de Recuperação: {{ firestoreSuccessRate.toFixed(1) }}%
              </div>
            </v-card>
          </v-col>

          <!-- Google Auth Errors -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center mb-3">
                <v-icon color="info" class="mr-2">mdi-google</v-icon>
                <span class="text-h6">Auth Google</span>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Popup Bloqueado:</span>
                  <span class="font-weight-bold">{{ metrics.googleAuthErrors.popupBlocked }}</span>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Cross-Origin:</span>
                  <span class="font-weight-bold">{{ metrics.googleAuthErrors.crossOriginPolicy }}</span>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Fallback Redirect:</span>
                  <span class="font-weight-bold text-info">{{ metrics.googleAuthErrors.fallbackRedirect }}</span>
                </div>
              </div>

              <div class="mb-2">
                <div class="d-flex justify-space-between text-body-2">
                  <span>Recuperadas:</span>
                  <span class="font-weight-bold text-success">{{ metrics.googleAuthErrors.recovered }}</span>
                </div>
                <v-progress-linear
                  :value="googleAuthSuccessRate"
                  color="success"
                  height="8"
                  class="mb-2"
                />
              </div>

              <div class="text-caption text-center mt-2">
                Taxa de Recuperação: {{ googleAuthSuccessRate.toFixed(1) }}%
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Eventos Recentes -->
        <v-row class="mt-6">
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title class="text-h6">Eventos Recentes (últimos 5 minutos)</v-card-title>
              <v-card-text>
                <v-timeline density="compact" class="mt-2">
                  <v-timeline-item
                    v-for="(event, index) in recentEvents"
                    :key="index"
                    :dot-color="getEventColor(event.type)"
                    size="small"
                  >
                    <div class="text-caption">
                      <strong>{{ getEventTypeLabel(event.type) }}</strong>
                      <div class="text-body-2 mt-1">{{ event.operation }}</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ formatTimestamp(event.timestamp) }}
                      </div>
                      <div v-if="event.details && Object.keys(event.details).length > 0" class="mt-1">
                        <v-chip
                          v-for="(value, key) in event.details"
                          :key="key"
                          size="small"
                          variant="outlined"
                          class="mr-1 mb-1"
                        >
                          {{ key }}: {{ String(value).substring(0, 20) }}
                        </v-chip>
                      </div>
                    </div>
                  </v-timeline-item>
                </v-timeline>

                <div v-if="recentEvents.length === 0" class="text-center text-medium-emphasis py-4">
                  Nenhum evento recente
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Ações -->
        <v-row class="mt-4">
          <v-col cols="12" class="text-center">
            <v-btn
              variant="outlined"
              @click="refreshData"
              :loading="loading"
              class="mr-2"
            >
              <v-icon left>mdi-refresh</v-icon>
              Atualizar
            </v-btn>

            <v-btn
              variant="outlined"
              color="warning"
              @click="resetMetrics"
              class="mr-2"
            >
              <v-icon left>mdi-restart</v-icon>
              Reset Métricas
            </v-btn>

            <v-btn
              variant="outlined"
              color="info"
              @click="exportReport"
            >
              <v-icon left>mdi-download</v-icon>
              Exportar Relatório
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import validationLogger from '@/utils/validationLogger'

const show = ref(false)
const loading = ref(false)
const metrics = ref(validationLogger.getMetrics())
const recentEvents = ref(validationLogger.getRecentEvents(5))
const sessionId = ref(validationLogger.sessionId)
const lastUpdate = ref(new Date().toLocaleTimeString())

// Computed properties
const raceConditionProgress = computed(() => {
  const total = metrics.value.raceConditions.total
  return total > 0 ? (metrics.value.raceConditions.detected / total) * 100 : 0
})

const raceConditionSuccessRate = computed(() => {
  const total = metrics.value.raceConditions.total
  return total > 0 ? (metrics.value.raceConditions.prevented / total) * 100 : 100
})

const firestoreSuccessRate = computed(() => {
  const total = metrics.value.firestoreErrors.total
  return total > 0 ? (metrics.value.firestoreErrors.recovered / total) * 100 : 100
})

const googleAuthSuccessRate = computed(() => {
  const total = metrics.value.googleAuthErrors.total
  return total > 0 ? (metrics.value.googleAuthErrors.recovered / total) * 100 : 100
})

const healthStatus = computed(() => validationLogger.calculateHealthStatus())

const healthStatusColor = computed(() => {
  switch (healthStatus.value.overall) {
    case 'healthy': return 'success'
    case 'warning': return 'warning'
    case 'critical': return 'error'
    default: return 'info'
  }
})

const healthStatusIcon = computed(() => {
  switch (healthStatus.value.overall) {
    case 'healthy': return 'mdi-check-circle'
    case 'warning': return 'mdi-alert-circle'
    case 'critical': return 'mdi-alert'
    default: return 'mdi-information'
  }
})

const healthStatusText = computed(() => {
  switch (healthStatus.value.overall) {
    case 'healthy': return 'Saudável'
    case 'warning': return 'Atenção'
    case 'critical': return 'Crítico'
    default: return 'Desconhecido'
  }
})

// Methods
const refreshData = async () => {
  loading.value = true
  try {
    metrics.value = validationLogger.getMetrics()
    recentEvents.value = validationLogger.getRecentEvents(5)
    lastUpdate.value = new Date().toLocaleTimeString()
  } finally {
    loading.value = false
  }
}

const resetMetrics = () => {
  if (confirm('Tem certeza que deseja resetar todas as métricas?')) {
    validationLogger.resetMetrics()
    refreshData()
  }
}

const exportReport = () => {
  const report = validationLogger.generateStatusReport()
  const dataStr = JSON.stringify(report, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

  const exportFileDefaultName = `validation-report-${new Date().toISOString().split('T')[0]}.json`

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

const getEventColor = (type) => {
  switch (type) {
    case 'race_condition_detected': return 'warning'
    case 'race_condition_prevented': return 'success'
    case 'firestore_connection_error': return 'error'
    case 'firestore_proxy_error': return 'warning'
    case 'firestore_recovered': return 'success'
    case 'offline_mode_activated': return 'warning'
    case 'google_auth_popup_blocked': return 'error'
    case 'google_auth_cross_origin': return 'error'
    case 'google_auth_fallback_redirect': return 'info'
    case 'google_auth_recovered': return 'success'
    default: return 'grey'
  }
}

const getEventTypeLabel = (type) => {
  switch (type) {
    case 'race_condition_detected': return 'Race Condition Detectada'
    case 'race_condition_prevented': return 'Race Condition Prevenida'
    case 'firestore_connection_error': return 'Erro de Conexão Firestore'
    case 'firestore_proxy_error': return 'Erro de Proxy Firestore'
    case 'firestore_recovered': return 'Firestore Recuperado'
    case 'offline_mode_activated': return 'Modo Offline Ativado'
    case 'google_auth_popup_blocked': return 'Popup Google Bloqueado'
    case 'google_auth_cross_origin': return 'Erro Cross-Origin Google'
    case 'google_auth_fallback_redirect': return 'Fallback Redirect Google'
    case 'google_auth_recovered': return 'Google Auth Recuperado'
    default: return type
  }
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString()
}

// Event listener para atualizações em tempo real
const handleValidationEvent = (event) => {
  refreshData()
}

onMounted(() => {
  window.addEventListener('validationLogger:event', handleValidationEvent)
  refreshData()
})

onUnmounted(() => {
  window.removeEventListener('validationLogger:event', handleValidationEvent)
})

// Expor função para abrir o dashboard
defineExpose({
  open: () => show.value = true,
  close: () => show.value = false
})
</script>

<style scoped>
.v-timeline-item {
  min-height: auto;
}
</style>