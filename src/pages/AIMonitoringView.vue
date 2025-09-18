<template>
  <div class="pa-6">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>ri-dashboard-line</v-icon>
            Monitoramento IA - Gemini API
            <v-spacer />
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              @click="refreshStats"
              :loading="loading"
            >
              <v-icon start>ri-refresh-line</v-icon>
              Atualizar
            </v-btn>
          </v-card-title>

          <!-- Status Geral -->
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="success">
                  <v-card-text>
                    <div class="d-flex align-center">
                      <v-icon size="40" class="me-3">ri-key-2-line</v-icon>
                      <div>
                        <div class="text-h5">{{ stats.freeKeys?.length || 0 }}</div>
                        <div class="text-subtitle-2">Chaves Gratuitas</div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="tonal" color="primary">
                  <v-card-text>
                    <div class="d-flex align-center">
                      <v-icon size="40" class="me-3">ri-vip-crown-line</v-icon>
                      <div>
                        <div class="text-h5">{{ stats.paidKeys?.length || 0 }}</div>
                        <div class="text-subtitle-2">Chaves Pagas</div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Economia -->
            <v-row class="mt-2">
              <v-col cols="12">
                <v-alert
                  type="success"
                  variant="tonal"
                  :text="`Economia de ${stats.economyPercentage || 0}% usando chaves gratuitas`"
                  prominent
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Chaves Gratuitas -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start>ri-key-line</v-icon>
            Chaves Gratuitas (15 RPM cada)
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="key in stats.freeKeys"
                :key="key.index"
                cols="12"
                md="6"
                lg="4"
              >
                <v-card
                  :color="key.isActive ? (key.percentage > 80 ? 'warning' : 'success') : 'error'"
                  variant="tonal"
                >
                  <v-card-text>
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="text-h6">Chave #{{ key.index }}</div>
                        <div class="text-body-2">
                          {{ key.used }}/{{ key.quota }} requests
                        </div>
                        <div class="text-caption">
                          {{ key.percentage }}% usado
                        </div>
                      </div>
                      <div class="text-center">
                        <v-progress-circular
                          :model-value="key.percentage"
                          :color="key.isActive ? (key.percentage > 80 ? 'warning' : 'success') : 'error'"
                          size="60"
                        >
                          {{ Math.round(key.percentage) }}%
                        </v-progress-circular>
                      </div>
                    </div>
                    <div class="mt-2">
                      <v-chip
                        :color="key.isActive ? 'success' : 'error'"
                        size="small"
                        variant="flat"
                      >
                        {{ key.isActive ? 'Ativa' : 'Inativa' }}
                      </v-chip>
                      <v-chip
                        v-if="key.errors > 0"
                        color="error"
                        size="small"
                        variant="outlined"
                        class="ms-2"
                      >
                        {{ key.errors }} erros
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Chaves Pagas -->
    <v-row v-if="stats.paidKeys?.length > 0" class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start>ri-vip-crown-line</v-icon>
            Chaves Pagas
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="key in stats.paidKeys"
                :key="key.index"
                cols="12"
                md="6"
              >
                <v-card
                  :color="key.isActive ? 'primary' : 'error'"
                  variant="tonal"
                >
                  <v-card-text>
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="text-h6">Chave Paga #{{ key.index }}</div>
                        <div class="text-body-2">
                          {{ key.used }} requests usados
                        </div>
                      </div>
                      <v-icon size="40" :color="key.isActive ? 'primary' : 'error'">
                        {{ key.isActive ? 'ri-shield-check-line' : 'ri-shield-cross-line' }}
                      </v-icon>
                    </div>
                    <div class="mt-2">
                      <v-chip
                        :color="key.isActive ? 'primary' : 'error'"
                        size="small"
                        variant="flat"
                      >
                        {{ key.isActive ? 'Ativa' : 'Inativa' }}
                      </v-chip>
                      <v-chip
                        v-if="key.errors > 0"
                        color="error"
                        size="small"
                        variant="outlined"
                        class="ms-2"
                      >
                        {{ key.errors }} erros
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Health Check -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start>ri-heart-pulse-line</v-icon>
            Health Check das APIs
          </v-card-title>
          <v-card-text>
            <v-btn
              color="primary"
              @click="runHealthCheck"
              :loading="healthLoading"
              class="mb-4"
            >
              <v-icon start>ri-stethoscope-line</v-icon>
              Executar Health Check
            </v-btn>

            <div v-if="healthData">
              <v-alert
                :type="healthData.totalActive > 0 ? 'success' : 'error'"
                :text="`${healthData.totalActive} de ${healthData.freeKeys.length + healthData.paidKeys.length} chaves ativas`"
                class="mb-4"
              />

              <v-expansion-panels>
                <v-expansion-panel title="Detalhes do Health Check">
                  <v-expansion-panel-text>
                    <pre>{{ JSON.stringify(healthData, null, 2) }}</pre>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { backendUrl } from '@/utils/backendUrl'

const stats = ref({})
const healthData = ref(null)
const loading = ref(false)
const healthLoading = ref(false)

async function fetchStats() {
  try {
    loading.value = true
    const response = await fetch(`${backendUrl}/api/ai-simulation/stats`, {
      headers: {
        'user-id': 'admin-monitoring' // Temporário para monitoramento
      }
    })

    if (!response.ok) {
      throw new Error('Falha ao buscar estatísticas')
    }

    const data = await response.json()
    stats.value = data.stats
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    // Usar dados mock para desenvolvimento
    stats.value = {
      freeKeys: Array.from({length: 7}, (_, i) => ({
        index: i + 1,
        used: Math.floor(Math.random() * 1500),
        quota: 1500,
        percentage: Math.floor(Math.random() * 100),
        isActive: Math.random() > 0.1,
        errors: Math.floor(Math.random() * 3)
      })),
      paidKeys: [],
      economyPercentage: 95
    }
  } finally {
    loading.value = false
  }
}

async function runHealthCheck() {
  try {
    healthLoading.value = true
    const response = await fetch(`${backendUrl}/api/ai-simulation/health`)

    if (!response.ok) {
      throw new Error('Falha no health check')
    }

    const data = await response.json()
    healthData.value = data.health
  } catch (error) {
    console.error('Erro no health check:', error)
  } finally {
    healthLoading.value = false
  }
}

async function refreshStats() {
  await fetchStats()
}

onMounted(() => {
  fetchStats()
})
</script>