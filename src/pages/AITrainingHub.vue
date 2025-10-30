<script setup>
/**
 * AITrainingHub.vue
 *
 * Centraliza o fluxo de Treinamento com IA em uma página dedicada.
 * Permite escolher o companheiro de treino e iniciar sessões por especialidade.
 */

import { ref, computed, onMounted } from 'vue'
import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized'
import { useStationNavigation } from '@/composables/useStationNavigation'

// Dados das estações
const {
  stations,
  fetchStations,
  loadFullStation,
  hasMoreStations,
  isLoadingStations,
  isLoadingMoreStations
} = useStationData()

const {
  filteredStationsRevalidaFacilClinicaMedica,
  filteredStationsRevalidaFacilCirurgia,
  filteredStationsRevalidaFacilPediatria,
  filteredStationsRevalidaFacilGO,
  filteredStationsRevalidaFacilPreventiva,
  filteredStationsRevalidaFacilProcedimentos,
  filteredStationsByInepPeriod
} = useStationFilteringOptimized(stations)

const { startAITraining } = useStationNavigation()

// Estado local
const isLaunching = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('info')
const showTutorialDialog = ref(false)

const inepPeriods = ['2025.1', '2024.2', '2024.1', '2023.2', '2023.1', '2022.2', '2022.1', '2021', '2020', '2017', '2016', '2015', '2014', '2013', '2012', '2011']

const specialtyCards = computed(() => {
  const revalidaCards = [
    {
      id: 'clinica-medica',
      name: 'Clínica Médica',
      icon: 'ri-stethoscope-line',
      color: 'info',
      stations: filteredStationsRevalidaFacilClinicaMedica.value || [],
      description: 'Cenários clínicos com foco em raciocínio e conduta.',
      badge: 'Revalida Flow'
    },
    {
      id: 'cirurgia',
      name: 'Cirurgia',
      icon: 'ri-knife-line',
      color: 'indigo',
      stations: filteredStationsRevalidaFacilCirurgia.value || [],
      description: 'Procedimentos cirúrgicos e manejo de sala de emergência.',
      badge: 'Revalida Flow'
    },
    {
      id: 'pediatria',
      name: 'Pediatria',
      icon: 'ri-bear-smile-line',
      color: 'teal',
      stations: filteredStationsRevalidaFacilPediatria.value || [],
      description: 'Casos voltados para neonatologia e pediatria geral.',
      badge: 'Revalida Flow'
    },
    {
      id: 'ginecologia',
      name: 'Ginecologia e Obstetrícia',
      icon: 'ri-women-line',
      color: 'pink',
      stations: filteredStationsRevalidaFacilGO.value || [],
      description: 'Atendimentos pré-natal, parto e ginecologia clínica.',
      badge: 'Revalida Flow'
    },
    {
      id: 'preventiva',
      name: 'Preventiva',
      icon: 'ri-shield-cross-line',
      color: 'orange',
      stations: filteredStationsRevalidaFacilPreventiva.value || [],
      description: 'Ênfase em medicina preventiva e saúde pública.',
      badge: 'Revalida Flow'
    },
    {
      id: 'procedimentos',
      name: 'Procedimentos',
      icon: 'ri-syringe-line',
      color: 'purple',
      stations: filteredStationsRevalidaFacilProcedimentos.value || [],
      description: 'Habilidades práticas e procedimentos técnicos.',
      badge: 'Revalida Flow'
    }
  ]

  const inepCards = inepPeriods
    .map(period => {
      const list = filteredStationsByInepPeriod.value?.[period] || []
      if (!list.length) return null

      return {
        id: `inep-${period}`,
        name: `INEP ${period}`,
        icon: 'ri-book-2-line',
        color: 'cyan',
        stations: list,
        description: 'Estações oficiais do exame INEP Revalida.',
        badge: 'Provas Oficiais'
      }
    })
    .filter(Boolean)

  return [...revalidaCards, ...inepCards]
})

const totalStations = computed(() =>
  specialtyCards.value.reduce((total, card) => total + card.stations.length, 0)
)

function showSnackbar(message, color = 'info') {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

async function ensureInitialStations() {
  if (stations.value.length > 0) return

  await fetchStations()
  if (hasMoreStations.value) {
    await fetchStations(true)
    if (hasMoreStations.value) {
      await fetchStations(true)
    }
  }
}

function pickRandomStation(stationsPool) {
  if (!stationsPool.length) return null
  const index = Math.floor(Math.random() * stationsPool.length)
  return stationsPool[index]
}

async function handleSpecialtyLaunch(card) {
  if (!card.stations.length) {
    showSnackbar('Não encontramos estações disponíveis para essa especialidade.', 'warning')
    return
  }

  const randomStation = pickRandomStation(card.stations)
  if (!randomStation) {
    showSnackbar('Não foi possível escolher uma estação para essa especialidade.', 'error')
    return
  }

  try {
    isLaunching.value = true
    await startAITraining(randomStation.id, { loadFullStation })
    showSnackbar('Abrimos o treinamento com IA em uma nova aba.', 'success')
  } catch (error) {
    console.error('Erro ao iniciar treinamento com IA:', error)
    showSnackbar(error.message || 'Não foi possível iniciar o treinamento.', 'error')
  } finally {
    isLaunching.value = false
  }
}

onMounted(async () => {
  await ensureInitialStations()
})
</script>

<template>
  <v-container class="ai-training-container py-6 px-sm-6 px-4" fluid>
    <v-row justify="center" class="mb-6">
      <v-col cols="12" md="8" lg="6">
        <v-alert
          variant="tonal"
          color="primary"
          elevation="1"
          border="start"
          class="ai-training-intro"
        >
          <div class="d-flex align-center">
            <v-avatar color="primary" variant="tonal" size="48" class="me-4">
              <v-icon size="28" color="primary">ri-robot-line</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Treinamento com IA Virtual
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Escolha a especialidade para que o sistema sorteie uma estação surpresa.
                {{ totalStations ? `Disponíveis: ${totalStations} estações.` : '' }}
              </div>
            </div>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <v-row justify="center" class="mb-4">
      <v-col cols="12" md="8" lg="6" class="d-flex justify-end">
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="ri-question-line"
          class="text-none"
          @click="showTutorialDialog = true"
        >
          Tutorial
        </v-btn>
      </v-col>
    </v-row>

    <v-row justify="center" class="specialty-grid">
      <v-col
        v-for="card in specialtyCards"
        :key="card.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
            class="ai-specialty-card h-100"
          :class="{
            'ai-specialty-card--disabled': !card.stations.length
          }"
          elevation="8"
          rounded="xl"
        >
          <v-card-text class="pa-6">
            <div class="d-flex align-center mb-4">
              <v-avatar :color="card.color" variant="tonal" size="52" class="me-4">
                <v-icon color="white" size="28">{{ card.icon }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ card.name }}</div>
                <v-chip
                  v-if="card.badge"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="mb-1 text-uppercase font-weight-medium"
                >
                  {{ card.badge }}
                </v-chip>
                <div class="text-caption text-medium-emphasis">
                  {{ card.description }}
                </div>
              </div>
            </div>

            <v-alert
              color="primary"
              variant="tonal"
              rounded="lg"
              class="mb-4"
            >
              <div class="d-flex align-center">
                <v-icon class="me-2" color="primary">ri-database-2-line</v-icon>
                <span>{{ card.stations.length }} estações disponíveis</span>
              </div>
            </v-alert>

            <v-btn
              color="primary"
              variant="flat"
              block
              size="large"
              class="text-none"
              :disabled="!card.stations.length || isLaunching"
              :loading="isLaunching"
              prepend-icon="ri-sparkling-2-line"
              @click="handleSpecialtyLaunch(card)"
            >
              Iniciar treino surpresa
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      v-if="isLoadingStations || isLoadingMoreStations"
      justify="center"
      class="mt-8"
    >
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="40" />
        <div class="mt-2 text-body-2 text-medium-emphasis">
          Carregando estações disponíveis…
        </div>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarMessage }}
    </v-snackbar>

    <v-dialog v-model="showTutorialDialog" max-width="720">
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon class="me-2" color="primary">ri-lightbulb-flash-line</v-icon>
          Guia rápido: como usar o Treinamento com IA
        </v-card-title>
        <v-card-text class="pt-1 pb-5">
          <v-alert color="primary" variant="tonal" class="mb-4">
            <strong>Objetivo:</strong> sortear automaticamente uma estação surpresa e conduzir a sessão com o paciente virtual.
          </v-alert>

          <h4 class="text-subtitle-1 font-weight-bold mb-2">1. Antes de iniciar</h4>
          <ul class="tutorial-list mb-4">
            <li>Escolha a especialidade desejada e clique em <strong>“Iniciar treino surpresa”</strong>.</li>
            <li>Uma nova aba abrirá com a estação selecionada e o paciente virtual preparado.</li>
            <li>Garanta que microfone e câmera (se necessários) estejam configurados no navegador.</li>
          </ul>

          <h4 class="text-subtitle-1 font-weight-bold mb-2">2. Durante a simulação</h4>
          <ul class="tutorial-list mb-4">
            <li>Use o painel lateral para acompanhar roteiro do candidato, materiais e indicadores de tempo.</li>
            <li>Interaja com o paciente virtual conversando naturalmente; ele responde aos comandos do cenário.</li>
            <li>Registre condutas e observações no bloco de anotações disponível na própria estação.</li>
          </ul>

          <h4 class="text-subtitle-1 font-weight-bold mb-2">3. Solicitando impressos e materiais</h4>
          <ul class="tutorial-list mb-4">
            <li>Acesse o painel <strong>“Materiais Disponíveis”</strong> na lateral direita.</li>
            <li>Clique em <strong>“Solicitar Impressos”</strong> para liberar exames, formulários ou anexos necessários.</li>
            <li>Os arquivos liberados ficam acessíveis imediatamente para download ou visualização.</li>
          </ul>

          <h4 class="text-subtitle-1 font-weight-bold mb-2">4. Encerrando a sessão</h4>
          <ul class="tutorial-list mb-0">
            <li>Finalize o atendimento clicando em <strong>“Encerrar simulação”</strong>.</li>
            <li>Revise feedbacks e pontuações exibidos automaticamente ao término.</li>
            <li>Retorne ao hub de Treinamento IA para iniciar uma nova estação sempre que desejar.</li>
          </ul>
        </v-card-text>
        <v-card-actions class="justify-end px-6 pb-4">
          <v-btn color="primary" @click="showTutorialDialog = false" class="text-none">
            Entendi
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.ai-training-container {
  background: radial-gradient(circle at top, rgba(124, 77, 255, 0.12), transparent),
    radial-gradient(circle at bottom, rgba(33, 150, 243, 0.06), transparent);
}

.specialty-grid {
  gap: 8px;
}

.ai-specialty-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: linear-gradient(145deg, rgba(18, 32, 77, 0.9), rgba(12, 20, 52, 0.92));
  border: 1px solid rgba(124, 77, 255, 0.15);
}

.ai-specialty-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(18, 32, 77, 0.25);
}

.ai-specialty-card--disabled {
  opacity: 0.65;
  filter: grayscale(0.25);
  pointer-events: none;
}

.ai-training-intro {
  border-left-width: 6px;
  backdrop-filter: blur(6px);
}

.tutorial-list {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
}

.tutorial-list li {
  margin-bottom: 6px;
}

.tutorial-list li strong {
  font-weight: 600;
}

@media (max-width: 960px) {
  .ai-specialty-card {
    border-radius: 22px;
  }
}
</style>


