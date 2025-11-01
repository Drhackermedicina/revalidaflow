<script setup>
import { computed } from 'vue'
const props = defineProps({
  stationData: Object,
  stationTagChips: Array,
  stationHighlightCards: Array,
  infrastructureHighlights: Array,
  selectedDurationMinutes: Number,
  availableDurations: Array,
  myReadyState: Boolean,
  candidateReadyButtonEnabled: Boolean,
})
const emits = defineEmits(['goBack','toggleReadyState','openTutorial', 'update:selectedDurationMinutes'])
const durationModel = computed({
  get: () => props.selectedDurationMinutes,
  set: (val) => emits('update:selectedDurationMinutes', val),
})
</script>

<template>
  <div class="ai-prep-card">
    <div class="ai-prep-card__hero">
      <div class="hero-content">
        <v-chip color="primary" variant="flat" size="small" class="hero-chip mb-3">
          <v-icon start size="18">ri-robot-2-line</v-icon>
          Simulação guiada por IA
        </v-chip>
        <h1 class="hero-title">
          {{ stationData?.tituloEstacao || 'Simulação clínica' }}
        </h1>
        <p class="hero-subtitle text-medium-emphasis">
          Prepare-se para atuar como candidato enquanto a IA simula paciente e avaliador em tempo real.
        </p>
        <div v-if="stationTagChips?.length" class="hero-tags">
          <v-chip
            v-for="chip in stationTagChips"
            :key="`${chip.text}-${chip.icon}`"
            variant="elevated"
            size="small"
            class="hero-tag-chip me-2 mb-2"
          >
            <v-icon size="16" class="me-1">{{ chip.icon }}</v-icon>
            {{ chip.text }}
          </v-chip>
        </div>
      </div>
      <div class="hero-status">
        <v-progress-circular :model-value="myReadyState ? 100 : 45" size="96" width="8" color="success" class="mb-3">
          <template v-if="myReadyState">
            <v-icon color="success" size="36">ri-check-line</v-icon>
          </template>
          <template v-else>
            <v-icon color="warning" size="36">ri-timer-line</v-icon>
          </template>
        </v-progress-circular>
        <div class="text-caption text-medium-emphasis mb-1">Status candidato</div>
        <div class="text-subtitle-1 font-weight-medium">
          {{ myReadyState ? 'Pronto para iniciar' : 'Aguardando confirmação' }}
        </div>
        <v-btn class="mt-4" variant="tonal" color="primary" prepend-icon="ri-arrow-go-back-line" @click="$emit('goBack')">
          Voltar para estações
        </v-btn>
      </div>
    </div>

    <div class="ai-prep-card__body">
      <v-row>
        <v-col cols="12" md="7">
          <v-sheet class="info-panel" rounded="lg">
            <div class="panel-header">
              <v-icon class="me-2" color="primary">ri-compass-3-line</v-icon>
              <h3 class="panel-title">Briefing da estação</h3>
            </div>
            <v-row>
              <v-col v-for="card in stationHighlightCards" :key="card.label" cols="12" sm="6" class="mb-3">
                <div class="info-chip">
                  <div class="info-chip__icon">
                    <v-icon size="22">{{ card.icon }}</v-icon>
                  </div>
                  <div>
                    <p class="info-chip__label text-caption text-medium-emphasis">{{ card.label }}</p>
                    <p class="info-chip__value text-subtitle-1">{{ card.value }}</p>
                  </div>
                </div>
              </v-col>
            </v-row>

            <div v-if="infrastructureHighlights?.length" class="infra-section mt-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-2" color="info">ri-building-4-line</v-icon>
                <span class="text-subtitle-2 font-weight-medium">Infraestrutura relevante</span>
              </div>
              <div class="infra-chips">
                <v-chip
                  v-for="infra in infrastructureHighlights"
                  :key="`${infra.label}-${infra.icon}`"
                  :color="infra.isSubItem ? 'primary' : infra.color || 'primary'"
                  variant="tonal"
                  size="small"
                  class="me-2 mb-2"
                >
                  <v-icon size="16" class="me-1">{{ infra.icon }}</v-icon>
                  {{ infra.label }}
                </v-chip>
              </div>
            </div>
          </v-sheet>
        </v-col>

        <v-col cols="12" md="5">
          <v-sheet class="status-panel" rounded="lg">
            <div class="panel-header">
              <v-icon class="me-2" color="success">ri-timer-flash-line</v-icon>
              <h3 class="panel-title">Defina a dinâmica</h3>
            </div>
            <div class="mb-4">
              <span class="text-caption text-medium-emphasis d-block">Tempo da estação</span>
              <v-btn-toggle v-model="durationModel" mandatory class="duration-toggle mt-3">
                <v-btn v-for="duration in availableDurations" :key="duration" :value="duration">{{ duration }} min</v-btn>
              </v-btn-toggle>
              <p class="text-caption text-medium-emphasis mt-2">Ajuste o tempo conforme o perfil da prova. A IA se adapta às suas escolhas.</p>
            </div>

            <div class="ready-cards">
              <div class="ready-card" :class="{ 'ready-card--active': myReadyState }">
                <div class="ready-card__icon">
                  <v-icon size="24">{{ myReadyState ? 'ri-user-star-line' : 'ri-user-line' }}</v-icon>
                </div>
                <div>
                  <p class="ready-card__label">Você</p>
                  <p class="ready-card__status">{{ myReadyState ? 'Pronto' : 'Aguardando' }}</p>
                </div>
              </div>

              <div class="ready-card ready-card--active">
                <div class="ready-card__icon">
                  <v-icon size="24">ri-robot-line</v-icon>
                </div>
                <div>
                  <p class="ready-card__label">IA Virtual</p>
                  <p class="ready-card__status">Pronta</p>
                </div>
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <div class="ai-prep-card__actions">
        <v-btn :color="myReadyState ? 'warning' : 'success'" :variant="myReadyState ? 'outlined' : 'elevated'" size="large" class="action-btn" :disabled="!candidateReadyButtonEnabled" @click="$emit('toggleReadyState')">
          <v-icon class="me-2">{{ myReadyState ? 'ri-close-line' : 'ri-rocket-line' }}</v-icon>
          {{ myReadyState ? 'Cancelar prontidão' : 'Estou pronto(a) para simular' }}
        </v-btn>
        <v-btn color="secondary" variant="text" size="large" class="action-btn" @click="$emit('openTutorial')">
          <v-icon class="me-2">ri-lightbulb-line</v-icon>
          Ver tutorial rápido
        </v-btn>
      </div>
    </div>
  </div>
</template>
