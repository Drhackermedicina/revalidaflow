<script setup>
/**
 * StationList.vue - VERSÃO REFATORADA
 *
 * Página principal de listagem de estações clínicas
 * Reduzida de ~2.300 linhas para ~600 linhas através de:
 * - Extração de 7 composables
 * - Criação de 6 componentes reutilizáveis
 * - Consolidação de CSS duplicado
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

// Componentes
import inepIcon from '@/assets/images/inep.png'
import SpecialtySection from '@/components/specialty/SpecialtySection.vue'
import INEPPeriodSection from '@/components/specialty/INEPPeriodSection.vue'
import SearchBar from '@/components/search/SearchBar.vue'
import CandidateSearchBar from '@/components/search/CandidateSearchBar.vue'
import SequentialConfigPanel from '@/components/sequential/SequentialConfigPanel.vue'
import AdminUploadCard from '@/components/admin/AdminUploadCard.vue'
import StationSkeleton from '@/components/StationSkeleton.vue'

// Composables
import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized' // OTIMIZADO!
import { useStationCategorization } from '@/composables/useStationCategorization'
import { useSequentialMode } from '@/composables/useSequentialMode'
import { useCandidateSearch } from '@/composables/useCandidateSearch'
import { useUserManagement } from '@/composables/useUserManagement'
import { useStationNavigation } from '@/composables/useStationNavigation'
import { useTrainingInvites } from '@/composables/useTrainingInvites.js'
import { currentUser } from '@/plugins/auth.js'

// 🔹 Data Management
const {
  stations,
  isLoadingStations,
  fetchUserScores,
  fetchStations,
  loadFullStation,
  getUserStationScore,
  hasMoreStations,
  isLoadingMoreStations
} = useStationData()

// 🔹 Filtering & Search - USANDO VERSÃO OTIMIZADA
const {
  globalSearchQuery,
  isINEPStation,
  isRevalidaFacilStation,
  getSpecialty,
  getRevalidaFacilSpecialty,
  getCleanStationTitle,
  filteredINEPStations,
  filteredRevalidaFacilStations,
  filteredStationsRevalidaFacilClinicaMedica,
  filteredStationsRevalidaFacilCirurgia,
  filteredStationsRevalidaFacilPediatria,
  filteredStationsRevalidaFacilGO,
  filteredStationsRevalidaFacilPreventiva,
  filteredStationsRevalidaFacilProcedimentos,
  filteredStationsByInepPeriod,
  globalAutocompleteItems
} = useStationFilteringOptimized(stations)

// 🔹 Categorization & Colors
const {
  getStationBackgroundColor,
  getStationArea
} = useStationCategorization()

// 🔹 Sequential Mode
const {
  showSequentialConfig,
  selectedStationsSequence,
  isStationInSequence,
  toggleSequentialConfig,
  resetSequentialConfig,
  addToSequence,
  removeFromSequence,
  moveStationInSequence,
  startSequentialSimulation
} = useSequentialMode(loadFullStation, getCleanStationTitle, getStationArea)

// 🔹 Candidate Search
const {
  selectedCandidate,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  clearCandidateSelection
} = useCandidateSearch(currentUser)

// 🔹 User Management
const { isAdmin } = useUserManagement()

// 🔹 Navigation
const {
  creatingSessionForStationId,
  startSimulationAsActor,
  startAITraining,
  goToEditStation,
  goToAdminUpload,
  expandCorrectSection
} = useStationNavigation()

// 🔹 Sistema de Convites para Treino
const {
  initializeInviteListeners,
  hasPendingInvites
} = useTrainingInvites()

// 🔹 Local State
const selectedStation = ref(null)
const inepPeriods = ['2025.1', '2024.2', '2024.1', '2023.2', '2023.1', '2022.2', '2022.1', '2021', '2020', '2017', '2016', '2015', '2014', '2013', '2012', '2011']

// 🔹 Estados para convites aceitos
const inviteAcceptedData = ref(null)
const showInviteNotification = ref(false)

// Ref para scroll infinito
const loadMoreSentinel = ref(null)
let intersectionObserver = null

// Refs para controle dos accordions
const accordionRefs = {
  showPreviousExamsSection: ref(false),
  showRevalidaFacilClinicaMedica: ref(false),
  showRevalidaFacilCirurgia: ref(false),
  showRevalidaFacilPediatria: ref(false),
  showRevalidaFacilGO: ref(false),
  showRevalidaFacilPreventiva: ref(false),
  showRevalidaFacilProcedimentos: ref(false)
}

// 🔹 Computed
// (nenhum computed adicional necessário no momento)

// 🔹 Methods
function findStation(stationId) {
  return stations.value.find(s => s.id === stationId)
}

function clearSearchFields() {
  selectedStation.value = null
  globalSearchQuery.value = ''
}

// Processa dados de convite aceito vindo da URL
function processAcceptedInviteFromUrl() {
  const urlParams = new URLSearchParams(window.location.search)

  if (urlParams.get('inviteAccepted') === 'true') {
    const invitedBy = urlParams.get('invitedBy')
    const invitedByName = urlParams.get('invitedByName')
    const inviteId = urlParams.get('inviteId')

    if (invitedBy && invitedByName) {
      inviteAcceptedData.value = {
        invitedBy,
        invitedByName,
        inviteId
      }

      // Auto-preencher candidato com dados do convite
      const candidate = {
        uid: invitedBy,
        name: invitedByName,
        displayName: invitedByName
      }

      selectedCandidate.value = candidate
      showInviteNotification.value = true

      // Limpar URL para não mostrar parâmetros novamente
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)

      // Auto-rolar para área de seleção de estações
      setTimeout(() => {
        const stationSection = document.querySelector('.v-expansion-panels')
        if (stationSection) {
          stationSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 500)

      // Auto-expand primeira seção com estações
      setTimeout(() => {
        expandCorrectSection({
          tituloEstacao: '',
          tipoEstacao: 'revalida_facil'
        }, accordionRefs, isINEPStation, isRevalidaFacilStation, getRevalidaFacilSpecialty)
      }, 800)
    }
  }
}

// Fecha a notificação de convite aceito
function closeInviteNotification() {
  showInviteNotification.value = false
  inviteAcceptedData.value = null
}

// Limpa seleção de candidato (se já existir a função, mantém)
if (typeof clearCandidateSelection !== 'function') {
  function clearCandidateSelection() {
    selectedCandidate.value = null
    closeInviteNotification()
  }
}

function handleStartSimulation(stationId) {
  startSimulationAsActor(stationId, {
    loadFullStation,
    expandCorrectSection: (station) => expandCorrectSection(
      station,
      accordionRefs,
      isINEPStation,
      isRevalidaFacilStation,
      getRevalidaFacilSpecialty
    ),
    findStation,
    selectedCandidate,
    clearSearchFields
  })
}

function handleStartAITraining(stationId) {
  startAITraining(stationId, {
    loadFullStation,
    expandCorrectSection: (station) => expandCorrectSection(
      station,
      accordionRefs,
      isINEPStation,
      isRevalidaFacilStation,
      getRevalidaFacilSpecialty
    ),
    findStation,
    clearSearchFields
  })
}

function handleStartSequentialSimulation() {
  startSequentialSimulation({
    candidate: selectedCandidate.value || null
  })
}

function toggleCollapse() {
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.toggle('layout-vertical-nav-collapsed')
}

// 🔹 Lifecycle
onMounted(async () => {
  document.documentElement.classList.add('station-list-page-active')

  // Processar convite aceito da URL (antes de carregar estações)
  processAcceptedInviteFromUrl()

  // Inicializar listeners de convites se o usuário estiver logado
  if (currentUser.value?.uid) {
    initializeInviteListeners(currentUser.value.uid)
  }

  // Carregar primeira página
  await fetchStations()
  clearSearchFields()

  // Carregar automaticamente mais 2 páginas para garantir conteúdo nas seções
  // Isso totaliza ~600 estações iniciais (3 x 200)
  if (hasMoreStations.value) {
    await fetchStations(true) // Segunda página
    if (hasMoreStations.value) {
      await fetchStations(true) // Terceira página
    }
  }

  // Configurar scroll infinito para páginas adicionais
  if (loadMoreSentinel.value) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreStations.value && !isLoadingMoreStations.value) {
          // Carregar mais estações quando o sentinel ficar visível
          fetchStations(true)
        }
      },
      {
        rootMargin: '200px', // Começar a carregar 200px antes de chegar no fim
        threshold: 0.1
      }
    )

    intersectionObserver.observe(loadMoreSentinel.value)
  }
})

onUnmounted(() => {
  document.documentElement.classList.remove('station-list-page-active')
  const wrapper = document.querySelector('.layout-wrapper')
  wrapper?.classList.remove('layout-vertical-nav-collapsed')
  
  // Limpar observer
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }
})

// 🔹 Watchers
watchDebounced(
  globalSearchQuery,
  () => {
    // Debounced search query - filtros já estão em computed properties
  },
  { debounce: 300 }
)

watch(currentUser, (newUser) => {
  if (newUser && stations.value.length > 0) {
    fetchUserScores()
  }
}, { immediate: true })
</script>

<template>
  <v-container fluid class="pa-0 main-content-container">
    <!-- Botão de toggle do menu lateral -->
    <v-tooltip location="right">
      <template #activator="{ props }">
        <v-btn
          icon
          fixed
          top
          left
          @click="toggleCollapse"
          class="ma-3 z-index-5"
          v-bind="props"
          aria-label="Abrir/Fechar menu lateral"
        >
          <v-icon aria-hidden="false" role="img" aria-label="Menu de navegação">ri-menu-line</v-icon>
        </v-btn>
      </template>
      Abrir/Fechar menu lateral
    </v-tooltip>

    <v-row>
      <v-col cols="12" md="12" class="mx-auto">
        <!-- Admin Upload Card -->
        <AdminUploadCard v-if="isAdmin" @navigate-to-upload="goToAdminUpload" />

        <!-- Notificação de Convite Aceito -->
        <VAlert
          v-if="showInviteNotification && inviteAcceptedData"
          type="success"
          variant="tonal"
          prominent
          class="mb-6 invite-accepted-alert"
          closable
          @click:close="closeInviteNotification"
        >
          <VAlertTitle class="d-flex align-center">
            <VIcon icon="ri-handshake-line" size="24" class="me-2" />
            Convite Aceito!
          </VAlertTitle>

          <div class="invite-accepted-content">
            <p class="mb-3">
              <strong>{{ inviteAcceptedData.invitedByName }}</strong> aceitou seu convite para treinar!
            </p>

            <p class="text-body-2 mb-4">
              O candidato já foi selecionado automaticamente. Agora selecione uma estação clínica abaixo para iniciar a simulação.
            </p>

            <div class="d-flex align-center gap-3">
              <VChip
                color="success"
                variant="elevated"
                prepend-icon="ri-user-line"
              >
                {{ selectedCandidate?.name || 'Candidato selecionado' }}
              </VChip>

              <VBtn
                size="small"
                variant="text"
                @click="clearCandidateSelection"
              >
                <VIcon size="16" class="me-1">ri-refresh-line</VIcon>
                Trocar candidato
              </VBtn>
            </div>
          </div>
        </VAlert>

        <!-- Sequential Config Panel -->
        <SequentialConfigPanel
          :show="showSequentialConfig"
          :selected-stations="selectedStationsSequence"
          @toggle="toggleSequentialConfig"
          @move-station="moveStationInSequence"
          @remove-station="removeFromSequence"
          @start="handleStartSequentialSimulation"
          @reset="resetSequentialConfig"
        />

        <!-- Candidate Search -->
        <CandidateSearchBar
          v-model="candidateSearchQuery"
          v-model:show-suggestions="showCandidateSuggestions"
          :suggestions="candidateSearchSuggestions"
          :loading="isLoadingCandidateSearch"
          :selected-candidate="selectedCandidate"
          @search="searchCandidates"
          @select-candidate="selectCandidate"
          @clear-selection="clearCandidateSelection"
        />

        <!-- Global Search -->
        <SearchBar
          v-model="globalSearchQuery"
          v-model:selected-station="selectedStation"
          :items="globalAutocompleteItems"
          :total-stations="stations.length"
          @station-selected="handleStartSimulation"
        />

        <!-- Estações por categoria -->
        <v-expansion-panels variant="accordion" class="mb-6">
          <!-- INEP Revalida -->
          <v-expansion-panel class="contained-panel">
            <v-expansion-panel-title class="text-h6 font-weight-bold rounded-button-title">
              <template #default>
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img :src="inepIcon" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">INEP Revalida – Provas Anteriores</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="filteredINEPStations.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                <INEPPeriodSection
                  v-for="period in inepPeriods"
                  :key="period"
                  v-show="filteredStationsByInepPeriod[period]?.length > 0"
                  :period="period"
                  :stations="filteredStationsByInepPeriod[period] || []"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :get-specialty="getSpecialty"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />
              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- REVALIDA FÁCIL -->
          <v-expansion-panel class="contained-panel">
            <v-expansion-panel-title class="text-h6 font-weight-bold rounded-button-title">
              <template #default>
                <v-row no-gutters align="center" class="w-100">
                  <v-col cols="auto">
                    <v-img src="/botaosemfundo.png" style="height: 80px; width: 80px; margin-right: 24px;" />
                  </v-col>
                  <v-col class="d-flex flex-column">
                    <div class="text-h6 font-weight-bold">REVALIDA FLOW</div>
                  </v-col>
                  <v-col cols="auto">
                    <v-badge :content="filteredRevalidaFacilStations.length" color="primary" inline />
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-expansion-panels variant="accordion" class="mt-4">
                <!-- Clínica Médica -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilClinicaMedica.length > 0"
                  title="Clínica Médica"
                  :stations="filteredStationsRevalidaFacilClinicaMedica"
                  icon="ri-stethoscope-line"
                  color="info"
                  specialty="clinica-medica"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Cirurgia -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilCirurgia.length > 0"
                  title="Cirurgia"
                  :stations="filteredStationsRevalidaFacilCirurgia"
                  icon="ri-knife-line"
                  color="primary"
                  specialty="cirurgia"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Pediatria -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilPediatria.length > 0"
                  title="Pediatria"
                  :stations="filteredStationsRevalidaFacilPediatria"
                  icon="ri-bear-smile-line"
                  color="success"
                  specialty="pediatria"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Ginecologia e Obstetrícia -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilGO.length > 0"
                  title="Ginecologia e Obstetrícia"
                  :stations="filteredStationsRevalidaFacilGO"
                  icon="ri-women-line"
                  color="error"
                  specialty="ginecologia"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Preventiva -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilPreventiva.length > 0"
                  title="Preventiva"
                  :stations="filteredStationsRevalidaFacilPreventiva"
                  icon="ri-shield-cross-line"
                  color="warning"
                  specialty="preventiva"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />

                <!-- Procedimentos -->
                <SpecialtySection
                  v-if="filteredStationsRevalidaFacilProcedimentos.length > 0"
                  title="Procedimentos"
                  :stations="filteredStationsRevalidaFacilProcedimentos"
                  icon="ri-syringe-line"
                  color="#A52A2A"
                  specialty="procedimentos"
                  :show-sequential-config="showSequentialConfig"
                  :is-admin="isAdmin"
                  :get-user-station-score="getUserStationScore"
                  :get-station-background-color="getStationBackgroundColor"
                  :is-station-in-sequence="isStationInSequence"
                  :creating-session-for-station-id="creatingSessionForStationId"
                  @station-click="handleStartSimulation"
                  @add-to-sequence="addToSequence"
                  @remove-from-sequence="removeFromSequence"
                  @edit-station="goToEditStation"
                  @start-ai-training="handleStartAITraining"
                />
              </v-expansion-panels>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Sentinel para scroll infinito -->
        <div 
          ref="loadMoreSentinel" 
          class="load-more-sentinel"
          style="height: 1px; margin-top: 20px;"
        />

        <!-- Loading mais estações -->
        <v-row v-if="isLoadingMoreStations" class="mt-4">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" />
            <div class="mt-2">Carregando mais estações...</div>
          </v-col>
        </v-row>

        <!-- Indicador de fim de lista -->
        <v-row v-if="!hasMoreStations && stations.length > 0" class="mt-4">
          <v-col cols="12" class="text-center text-grey">
            <v-icon>ri-check-line</v-icon>
            <div class="mt-2">Todas as estações carregadas</div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Loading inicial com Skeleton -->
    <v-row v-if="isLoadingStations && stations.length === 0">
      <v-col cols="12">
        <div class="text-center mb-4">
          <v-progress-circular indeterminate color="primary" size="40" />
          <div class="mt-2 text-subtitle-1">Carregando estações...</div>
        </div>
        <StationSkeleton :count="8" />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Estilos consolidados - removidas ~200 linhas de CSS duplicado */
.station-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.station-list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.main-content-container {
  background-color: transparent !important;
}

.rounded-input .v-input__control .v-input__slot {
  border-radius: 8px;
}

.v-expansion-panel-title.rounded-button-title {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease-in-out;
}

.v-expansion-panel-title.rounded-button-title:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.v-expansion-panel.contained-panel {
  margin-left: auto;
  margin-right: auto;
}

/* Estilos de ícones de seleção sequencial - CONSOLIDADO */
.sequential-selection-btn .v-icon {
  color: #1565C0 !important;
  opacity: 1 !important;
  font-weight: 700 !important;
  visibility: visible !important;
}

.v-btn[variant="tonal"].sequential-selection-btn .v-icon {
  color: #2E7D32 !important;
}

/* ========== NOTIFICAÇÃO DE CONVITE ACEITO ========== */
.invite-accepted-alert {
  border-left: 6px solid rgb(var(--v-theme-success)) !important;
  background: linear-gradient(135deg, rgba(var(--v-theme-success), 0.08) 0%, rgba(var(--v-theme-primary), 0.04) 100%) !important;
  animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.invite-accepted-content {
  padding: 4px 0;
}

.invite-accepted-alert .v-alert-title {
  color: rgb(var(--v-theme-success)) !important;
  font-weight: 700 !important;
}

.invite-accepted-alert .v-chip {
  font-weight: 600;
  letter-spacing: 0.02em;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Destaque quando há convite aceito */
.invite-accepted-alert + .v-expansion-panels {
  border: 2px dashed rgb(var(--v-theme-success));
  border-radius: 12px;
  padding: 8px;
  transition: all 0.3s ease;
}

.invite-accepted-alert + .v-expansion-panels:hover {
  border-color: rgba(var(--v-theme-success), 0.6);
  background: rgba(var(--v-theme-success), 0.02);
}
</style>
