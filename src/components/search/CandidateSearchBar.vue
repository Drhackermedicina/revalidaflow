<script setup>
/**
 * CandidateSearchBar.vue
 *
 * Componente de busca de candidatos com menu de sugestões
 */

import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  showSuggestions: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedCandidate: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'update:modelValue',
  'update:showSuggestions',
  'search',
  'focus',
  'select-candidate',
  'clear-selection'
])

const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const showSuggestionsModel = computed({
  get: () => props.showSuggestions,
  set: (value) => emit('update:showSuggestions', value)
})

function onInput() {
  emit('search')
}

function onFocus() {
  if (searchQuery.value) {
    emit('search')
  }
  emit('focus')
}

function onSelectCandidate(candidate) {
  emit('select-candidate', candidate)
}

function onClearSelection() {
  emit('clear-selection')
}
</script>

<template>
  <v-card class="candidate-search-card mb-6" elevation="12" rounded="xl">
    <div class="card-overlay" />
    <v-card-text class="card-body">
      <div class="card-header">
        <div class="card-header-icon">
          <v-icon size="28" color="primary">ri-user-search-line</v-icon>
        </div>
        <div class="card-header-text">
          <div class="card-title">Buscar candidato</div>
          <div class="card-subtitle">
            Escolha o parceiro de treino que assumirá o papel de médico avaliado.
          </div>
        </div>
        <v-chip
          v-if="selectedCandidate"
          class="selected-chip ms-auto"
          color="success"
          variant="tonal"
          size="small"
          prepend-icon="ri-checkbox-circle-line"
        >
          Candidato ativo
        </v-chip>
      </div>

      <v-alert
        v-if="selectedCandidate"
        color="success"
        variant="tonal"
        rounded="lg"
        class="selected-banner mb-6"
      >
        <template #prepend>
          <v-avatar size="44" class="me-3 elevation-2">
            <v-img v-if="selectedCandidate.photoURL" :src="selectedCandidate.photoURL" />
            <v-icon v-else>ri-user-line</v-icon>
          </v-avatar>
        </template>
        <div class="selected-info">
          <span class="selected-name">
            {{ selectedCandidate.nome }}
          </span>
          <span class="selected-email">
            {{ selectedCandidate.email }}
          </span>
        </div>
        <template #append>
          <v-btn
            variant="text"
            color="success"
            size="small"
            prepend-icon="ri-refresh-line"
            @click="onClearSelection"
          >
            Trocar candidato
          </v-btn>
        </template>
      </v-alert>

      <div class="search-field-wrapper">
        <v-menu
          v-model="showSuggestionsModel"
          :close-on-content-click="false"
          location="bottom"
          offset="8"
          transition="scale-transition"
          max-height="340"
        >
          <template #activator="{ props: menuProps }">
            <v-text-field
              v-bind="menuProps"
              v-model="searchQuery"
              :label="selectedCandidate ? 'Buscar outro candidato' : 'Digite o nome ou e-mail'"
              placeholder="Ex: Joana Carvalho"
              prepend-inner-icon="ri-search-line"
              :append-inner-icon="loading ? undefined : 'ri-sparkling-2-line'"
              variant="solo-filled"
              density="comfortable"
              color="primary"
              rounded="lg"
              clearable
              hide-details
              :loading="loading"
              class="candidate-search-input"
              @input="onInput"
              @focus="onFocus"
            />
          </template>

          <v-card
            v-if="suggestions.length || (!loading && searchQuery)"
            elevation="12"
            class="suggestions-card"
          >
            <template v-if="suggestions.length">
              <v-list density="comfortable">
                <v-list-subheader class="text-uppercase text-caption">
                  Sugestões de candidatos
                </v-list-subheader>
                <v-divider />
                <v-list-item
                  v-for="candidate in suggestions"
                  :key="candidate.uid"
                  @click="onSelectCandidate(candidate)"
                  class="candidate-suggestion-item"
                >
                  <template #prepend>
                    <v-avatar size="40" class="me-3 elevation-1">
                      <v-img v-if="candidate.photoURL" :src="candidate.photoURL" />
                      <v-icon v-else>ri-user-3-line</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ candidate.nome }}</v-list-item-title>
                  <v-list-item-subtitle>{{ candidate.email }}</v-list-item-subtitle>
                  <template #append>
                    <v-icon size="18" color="primary">ri-arrow-right-line</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </template>
            <template v-else>
              <v-card-text class="py-5 px-6 text-center text-body-2 text-medium-emphasis">
                Nenhum candidato encontrado para <strong>{{ searchQuery }}</strong>.
              </v-card-text>
            </template>
          </v-card>
        </v-menu>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.candidate-search-card {
  position: relative;
  overflow: hidden;
  width: min(520px, 92vw);
  margin: 0 auto;
  background: linear-gradient(150deg, rgba(124, 77, 255, 0.24) 0%, rgba(41, 121, 255, 0.16) 42%, rgba(4, 21, 61, 0.3) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 32px 56px rgba(15, 9, 45, 0.3);
  min-height: 360px;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 55%);
  opacity: 0.9;
}

.card-body {
  position: relative;
  z-index: 1;
  padding: 40px 32px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
}

.card-header-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.18);
}

.card-header-text {
  flex: 1;
  color: rgba(255, 255, 255, 0.88);
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 0.85rem;
  opacity: 0.75;
}

.selected-chip {
  backdrop-filter: blur(6px);
  font-weight: 600;
}

.selected-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(21, 101, 192, 0.16) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  min-height: 96px;
}

.selected-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-name {
  font-weight: 600;
  font-size: 1rem;
}

.selected-email {
  font-size: 0.85rem;
  opacity: 0.7;
}

.search-field-wrapper {
  position: relative;
}

.candidate-search-input :deep(.v-field) {
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  background: rgba(11, 18, 43, 0.65);
  backdrop-filter: blur(10px);
}

.candidate-search-input :deep(.v-field:hover) {
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.4);
}

.candidate-search-input :deep(.v-field__input) {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.95rem;
}

.candidate-search-input :deep(.v-label) {
  color: rgba(255, 255, 255, 0.6);
}

.suggestions-card {
  border-radius: 18px;
  overflow: hidden;
  backdrop-filter: blur(14px);
  background: rgba(10, 13, 32, 0.92);
}

.candidate-suggestion-item {
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.candidate-suggestion-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.12);
  transform: translateX(4px);
}

.candidate-suggestion-item :deep(.v-list-item-subtitle) {
  opacity: 0.7;
}

@media (max-width: 600px) {
  .card-body {
    padding: 28px 22px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .selected-banner {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .candidate-search-card {
    min-height: 320px;
  }

  .selected-banner {
    min-height: auto;
  }
}
</style>
