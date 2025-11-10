<script setup>
import inepIcon from '@/assets/images/inep.png'

import CandidateSearchBar from '@/components/search/CandidateSearchBar.vue'
import SequentialConfigPanel from '@/components/sequential/SequentialConfigPanel.vue'
import ModeSelectionCard from '@/components/station/ModeSelectionCard.vue'
import SectionHeroCard from '@/components/station/SectionHeroCard.vue'
import SelectedCandidateCard from '@/components/station/SelectedCandidateCard.vue'
import AdminUploadCard from '@/components/admin/AdminUploadCard.vue'

import { useStationListState } from '@/composables/useStationListState'

const {
  isAdmin,
  shouldShowCandidateSearch,
  shouldShowModeSelection,
  shouldShowStationList,
  isSimulationModeActive,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  recentCandidates,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  clearCandidateSelection,
  handleModeSelection,
  handleBackToModeSelection,
  handleStartSequentialSimulation,
  handleChangeCandidate,
  openInepSection,
  openRevalidaSection,
  viewStationsDirectly,
  goToAdminUpload,
  selectedCandidate,
  selectedMode,
  selectedStationsSequence,
  showSequentialConfig,
  toggleSequentialConfig,
  moveStationInSequence,
  removeFromSequence,
  resetSequentialConfig,
  loadMoreSentinel,
  hasMoreStations,
  isLoadingMoreStations,
  inepTotalAll,
  revalidaTotalAll
} = useStationListState()
</script>

<template>
  <!-- Hero Section Moderno -->
  <v-container fluid class="pa-0 main-content-container">

    <v-row>
      <v-col cols="12" md="12" class="mx-auto section-container">
        <div class="page-content">
          <AdminUploadCard
            v-if="isAdmin"
            class="admin-card"
            @navigate-to-upload="goToAdminUpload"
          />

          <div v-if="shouldShowCandidateSearch" class="candidate-search-section">
            <CandidateSearchBar
              v-model="candidateSearchQuery"
              v-model:show-suggestions="showCandidateSuggestions"
              :suggestions="candidateSearchSuggestions"
              :recent-suggestions="recentCandidates"
              :loading="isLoadingCandidateSearch"
              :selected-candidate="selectedCandidate"
              @search="searchCandidates"
              @select-candidate="selectCandidate"
              @clear-selection="clearCandidateSelection"
              @explore="viewStationsDirectly"
            />
          </div>

          <div v-if="shouldShowModeSelection" class="mode-selection-container hero-card-modern">
            <div class="text-center mb-8">
              <h2 class="heading-lg mb-4 gradient-text">Escolha o Modo de Treinamento</h2>
              <p class="body-md text-medium-emphasis">
                Selecione como deseja realizar suas simulações médicas
              </p>
            </div>
            
            <v-row>
              <v-col cols="12" md="6" class="mb-4">
                <ModeSelectionCard
                  title="Treinamento Simples"
                  description="Pratique uma estação por vez, no seu próprio ritmo e horário"
                  icon="ri-user-follow-line"
                  color="success"
                  duration="~ 15 minutos por estação"
                  @select="handleModeSelection('simple-training')"
                />
              </v-col>
              <v-col cols="12" md="6" class="mb-4">
                <ModeSelectionCard
                  title="Simulação Completa"
                  description="Experimente múltiplas estações em sequência realista"
                  icon="ri-play-list-line"
                  color="primary"
                  duration="~ 60-90 minutos total"
                  @select="handleModeSelection('simulation')"
                />
              </v-col>
            </v-row>
          </div>

          <div
            v-if="shouldShowStationList && selectedMode && selectedCandidate"
            class="selected-candidate-wrapper"
          >
            <SelectedCandidateCard
              :candidate="selectedCandidate"
              @back="handleBackToModeSelection"
              @change="handleChangeCandidate"
            />
          </div>

          <SequentialConfigPanel
            v-if="isSimulationModeActive && shouldShowStationList"
            class="sequential-panel"
            :show="showSequentialConfig"
            :selected-stations="selectedStationsSequence"
            @toggle="toggleSequentialConfig"
            @move-station="moveStationInSequence"
            @remove-station="removeFromSequence"
            @start="handleStartSequentialSimulation"
            @reset="resetSequentialConfig"
          />

          <!-- Seção de Cards Hero Modernos - Apenas após escolher o modo -->
          <div v-if="shouldShowStationList && selectedMode" class="hero-cards-section">
            <div class="text-center mb-8">
              <h3 class="heading-md mb-4">Escolha a Categoria</h3>
              <p class="body-md text-medium-emphasis">
                Acesse diferentes tipos de estações organizadas por origem
              </p>
            </div>
            
            <v-row class="justify-center">
              <v-col cols="12" sm="6" md="5" lg="4" class="d-flex justify-center mb-6">
                <div class="hero-card-wrapper">
                  <SectionHeroCard
                    title="INEP — Provas Anteriores"
                    subtitle="Acesse estações organizadas por período de exame oficial"
                    :image="inepIcon"
                    :badge-count="inepTotalAll"
                    color="primary"
                    gradient-start="#ECF4FF"
                    gradient-end="#F7FAFF"
                    cta-label="Explorar INEP"
                    cta-icon="ri-arrow-right-line"
                    decorative-icon="ri-government-line"
                    @click="openInepSection"
                  />
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="5" lg="4" class="d-flex justify-center mb-6">
                <div class="hero-card-wrapper">
                  <SectionHeroCard
                    title="REVALIDA FLOW"
                    subtitle="Estações organizadas por especialidade médica para treino focado"
                    image="/botaosemfundo.png"
                    :badge-count="revalidaTotalAll"
                    color="success"
                    gradient-start="#E9F7EF"
                    gradient-end="#F5FBF7"
                    cta-label="Explorar Especialidades"
                    cta-icon="ri-arrow-right-line"
                    decorative-icon="ri-heart-pulse-line"
                    @click="openRevalidaSection"
                  />
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- Loading State Modernizado -->
          <div v-if="shouldShowStationList" ref="loadMoreSentinel" class="load-more-sentinel" />
          
          <v-row v-if="shouldShowStationList && isLoadingMoreStations" class="mt-8">
            <v-col cols="12" class="text-center">
              <div class="loading-container">
                <v-progress-circular
                  indeterminate
                  size="48"
                  width="4"
                  color="primary"
                  class="mb-4"
                />
                <div class="body-md text-medium-emphasis">Carregando mais estações...</div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped lang="scss" src="./StationList.scss"></style>

