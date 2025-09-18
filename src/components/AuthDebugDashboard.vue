<template>
  <VDialog v-model="isOpen" max-width="800px" scrollable>
    <template #activator="{ props }">
      <VBtn
        v-bind="props"
        icon="ri-bug-line"
        variant="text"
        size="small"
        @click="refreshData"
      />
    </template>

    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>🐛 Auth Debug Dashboard</span>
        <VBtn
          icon="ri-close-line"
          variant="text"
          size="small"
          @click="isOpen = false"
        />
      </VCardTitle>

      <VCardText>
        <VTabs v-model="activeTab">
          <VTab value="summary">Resumo</VTab>
          <VTab value="logs">Logs</VTab>
          <VTab value="dom">Proteções DOM</VTab>
          <VTab value="network">Network</VTab>
          <VTab value="actions">Ações</VTab>
        </VTabs>

        <VTabsWindow v-model="activeTab" class="mt-4">
          <!-- Resumo -->
          <VTabsWindowItem value="summary">
            <VCard variant="outlined" class="mb-4">
              <VCardTitle class="text-h6">📊 Status Geral</VCardTitle>
              <VCardText>
                <VChip
                  :color="authSummary.hasErrors ? 'error' : 'success'"
                  variant="flat"
                  class="mr-2 mb-2"
                >
                  {{ authSummary.hasErrors ? 'Com Erros' : 'OK' }}
                </VChip>
                <VChip
                  color="info"
                  variant="flat"
                  class="mr-2 mb-2"
                >
                  {{ authSummary.totalLogs }} logs
                </VChip>
                <VChip
                  color="warning"
                  variant="flat"
                  class="mr-2 mb-2"
                >
                  {{ authSummary.loginAttempts }} tentativas de login
                </VChip>
              </VCardText>
            </VCard>

            <VCard variant="outlined" class="mb-4">
              <VCardTitle class="text-h6">🌐 Ambiente</VCardTitle>
              <VCardText>
                <VRow>
                  <VCol cols="6">
                    <strong>URL:</strong> {{ currentUrl }}
                  </VCol>
                  <VCol cols="6">
                    <strong>User Agent:</strong> {{ userAgent.substring(0, 50) }}...
                  </VCol>
                  <VCol cols="6">
                    <strong>Session ID:</strong> {{ authReport.sessionId }}
                  </VCol>
                  <VCol cols="6">
                    <strong>Timestamp:</strong> {{ new Date().toLocaleTimeString() }}
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>

            <VCard variant="outlined">
              <VCardTitle class="text-h6">⚠️ Problemas Detectados</VCardTitle>
              <VCardText>
                <VAlert
                  v-if="domReport.interferences.mutationObserverErrors > 0"
                  type="warning"
                  class="mb-2"
                >
                  {{ domReport.interferences.mutationObserverErrors }} erros de MutationObserver
                </VAlert>
                <VAlert
                  v-if="domReport.interferences.hasOperaTranslation"
                  type="info"
                  class="mb-2"
                >
                  Tradução automática do Opera detectada
                </VAlert>
                <VAlert
                  v-if="domReport.extensions.length > 0"
                  type="info"
                  class="mb-2"
                >
                  Extensões: {{ domReport.extensions.join(', ') }}
                </VAlert>
                <VAlert
                  v-if="!hasProblems"
                  type="success"
                >
                  Nenhum problema detectado
                </VAlert>
              </VCardText>
            </VCard>
          </VTabsWindowItem>

          <!-- Logs -->
          <VTabsWindowItem value="logs">
            <div class="d-flex align-center justify-space-between mb-4">
              <VSelect
                v-model="logFilter"
                :items="logFilterOptions"
                label="Filtrar por nível"
                density="compact"
                style="max-width: 200px"
              />
              <VBtn
                color="error"
                variant="outlined"
                size="small"
                @click="clearLogs"
              >
                Limpar Logs
              </VBtn>
            </div>

            <VCard
              v-for="(log, index) in filteredLogs"
              :key="index"
              variant="outlined"
              class="mb-2"
            >
              <VCardText class="py-2">
                <div class="d-flex align-center mb-1">
                  <VChip
                    :color="getLogColor(log.level)"
                    size="small"
                    class="mr-2"
                  >
                    {{ log.level.toUpperCase() }}
                  </VChip>
                  <span class="text-caption text-medium-emphasis">
                    {{ new Date(log.timestamp).toLocaleTimeString() }}
                  </span>
                </div>
                <div class="text-body-2 mb-1">{{ log.message }}</div>
                <div v-if="log.data && Object.keys(log.data).length > 0" class="text-caption">
                  <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
                </div>
              </VCardText>
            </VCard>
          </VTabsWindowItem>

          <!-- Proteções DOM -->
          <VTabsWindowItem value="dom">
            <VCard variant="outlined" class="mb-4">
              <VCardTitle class="text-h6">🛡️ Status das Proteções</VCardTitle>
              <VCardText>
                <VRow>
                  <VCol cols="6">
                    <VAlert
                      :type="domReport.interferences.isEnabled ? 'success' : 'error'"
                      density="compact"
                    >
                      {{ domReport.interferences.isEnabled ? 'Ativas' : 'Desabilitadas' }}
                    </VAlert>
                  </VCol>
                  <VCol cols="6">
                    <strong>Elementos protegidos:</strong> {{ domReport.interferences.protectedElementsCount }}
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>

            <VCard variant="outlined" class="mb-4">
              <VCardTitle class="text-h6">🔍 Extensões Detectadas</VCardTitle>
              <VCardText>
                <VChip
                  v-for="extension in domReport.extensions"
                  :key="extension"
                  color="info"
                  variant="outlined"
                  class="mr-2 mb-2"
                >
                  {{ extension }}
                </VChip>
                <div v-if="domReport.extensions.length === 0" class="text-body-2 text-medium-emphasis">
                  Nenhuma extensão detectada
                </div>
              </VCardText>
            </VCard>

            <VCard variant="outlined">
              <VCardTitle class="text-h6">🧬 Elementos de Tradução</VCardTitle>
              <VCardText>
                <div class="text-body-2">
                  <strong>Encontrados:</strong> {{ domReport.translationElementsFound }}
                </div>
              </VCardText>
            </VCard>
          </VTabsWindowItem>

          <!-- Network -->
          <VTabsWindowItem value="network">
            <VCard variant="outlined">
              <VCardTitle class="text-h6">🌐 Atividade de Rede</VCardTitle>
              <VCardText>
                <div class="text-body-2 text-medium-emphasis">
                  Implementação futura: monitoramento de requests Firebase e APIs externas
                </div>
              </VCardText>
            </VCard>
          </VTabsWindowItem>

          <!-- Ações -->
          <VTabsWindowItem value="actions">
            <VCard variant="outlined" class="mb-4">
              <VCardTitle class="text-h6">🔧 Ações de Debug</VCardTitle>
              <VCardText>
                <VBtn
                  color="primary"
                  variant="outlined"
                  class="mr-2 mb-2"
                  @click="exportLogs"
                >
                  Exportar Logs
                </VBtn>
                <VBtn
                  color="warning"
                  variant="outlined"
                  class="mr-2 mb-2"
                  @click="testLogin"
                >
                  Testar Login
                </VBtn>
                <VBtn
                  color="info"
                  variant="outlined"
                  class="mr-2 mb-2"
                  @click="checkFirebase"
                >
                  Verificar Firebase
                </VBtn>
                <VBtn
                  color="error"
                  variant="outlined"
                  class="mr-2 mb-2"
                  @click="clearAllData"
                >
                  Limpar Tudo
                </VBtn>
              </VCardText>
            </VCard>

            <VCard variant="outlined">
              <VCardTitle class="text-h6">💾 Dados Persistidos</VCardTitle>
              <VCardText>
                <div class="text-body-2">
                  <strong>Logs persistidos:</strong> {{ authReport.persistedLogs?.length || 0 }}
                </div>
                <div class="text-body-2">
                  <strong>Storage usado:</strong> ~{{ getStorageSize() }}KB
                </div>
              </VCardText>
            </VCard>
          </VTabsWindowItem>
        </VTabsWindow>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { authLogger } from '@/utils/authLogger'
import { domProtection } from '@/utils/domProtection'

const isOpen = ref(false)
const activeTab = ref('summary')
const logFilter = ref('all')
const authReport = ref({})
const domReport = ref({})

const logFilterOptions = [
  { title: 'Todos', value: 'all' },
  { title: 'Erros', value: 'error' },
  { title: 'Avisos', value: 'warn' },
  { title: 'Info', value: 'info' },
  { title: 'Debug', value: 'debug' }
]

const currentUrl = computed(() => window.location.href)
const userAgent = computed(() => navigator.userAgent)

const authSummary = computed(() => authReport.value.summary || {})

const filteredLogs = computed(() => {
  const logs = authReport.value.sessionLogs || []
  if (logFilter.value === 'all') return logs
  return logs.filter(log => log.level === logFilter.value)
})

const hasProblems = computed(() => {
  return authSummary.value.hasErrors ||
         domReport.value.interferences?.mutationObserverErrors > 0 ||
         domReport.value.extensions?.length > 0
})

function refreshData() {
  authReport.value = authLogger.getDebugReport()
  domReport.value = domProtection.getDebugReport()
}

function getLogColor(level) {
  switch (level) {
    case 'error': return 'error'
    case 'warn': return 'warning'
    case 'info': return 'info'
    case 'debug': return 'secondary'
    default: return 'default'
  }
}

function clearLogs() {
  authLogger.clearLogs()
  refreshData()
}

function exportLogs() {
  authLogger.exportLogs()
}

function testLogin() {
  authLogger.info('Teste de login iniciado manualmente')
  // Implementar teste básico se necessário
}

function checkFirebase() {
  authLogger.info('Verificação manual do Firebase')
  // Implementar verificação de conectividade
}

function clearAllData() {
  authLogger.clearLogs()
  localStorage.removeItem('auth_debug_logs')
  refreshData()
  authLogger.info('Todos os dados de debug limpos')
}

function getStorageSize() {
  try {
    const data = localStorage.getItem('auth_debug_logs') || ''
    return Math.round(data.length / 1024)
  } catch {
    return 0
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  max-height: 100px;
  overflow-y: auto;
}

.v-card {
  transition: all 0.2s ease;
}

.v-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>