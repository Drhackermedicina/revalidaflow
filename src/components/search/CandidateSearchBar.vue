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
  <v-card class="candidate-search-card rf-glass-card rf-hover-lift-subtle rf-animated-shimmer mb-6" elevation="0" rounded="xl">
    <div class="card-overlay rf-light-overlay" />
    <div class="card-decoration" />
    
    <v-card-text class="card-body">
      <div class="card-header">
        <div class="card-header-icon rf-animated-float">
          <v-icon size="32" color="primary">ri-user-search-line</v-icon>
        </div>
        <div class="card-header-text">
          <div class="card-title rf-text-gradient-primary">Buscar candidato</div>
          <div class="card-subtitle">
            Escolha o parceiro de treino que assumirá o papel de médico avaliado.
          </div>
        </div>
        <v-chip
          v-if="selectedCandidate"
          class="selected-chip ms-auto rf-animated-pulse"
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

<style scoped lang="scss">
.candidate-search-card {
  position: relative;
  overflow: hidden;
  width: min(600px, 92vw);
  margin: 0 auto;
  background: var(--rf-glass-bg);
  backdrop-filter: var(--rf-glass-blur-strong);
  border: 2px solid var(--rf-glass-border);
  box-shadow: var(--rf-shadow-hero);
  min-height: 380px;
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  
  &:hover {
    box-shadow: 0 35px 70px rgba(0, 0, 0, 0.2);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}

.card-overlay {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  pointer-events: none;
  z-index: 0;
}

.card-decoration {
  position: absolute;
  top: -30%;
  right: -15%;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  animation: rf-pulse 4s ease-in-out infinite;
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
  width: 56px;
  height: 56px;
  border-radius: var(--rf-radius-lg);
  background: var(--rf-gradient-primary-soft);
  box-shadow: var(--rf-shadow-card);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  
  .candidate-search-card:hover & {
    transform: scale(1.05) rotate(5deg);
    box-shadow: var(--rf-shadow-primary);
  }
}

.card-header-text {
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.95);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.card-subtitle {
  font-size: 0.95rem;
  opacity: 0.75;
  line-height: 1.5;
}

.selected-chip {
  backdrop-filter: blur(6px);
  font-weight: 600;
}

.selected-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--rf-glass-bg) !important;
  backdrop-filter: var(--rf-glass-blur);
  border: 2px solid rgba(var(--v-theme-success), 0.4);
  min-height: 96px;
  box-shadow: var(--rf-shadow-success);
  transition: all var(--rf-transition-normal);
  
  &:hover {
    border-color: rgba(var(--v-theme-success), 0.6);
    transform: translateY(-2px);
  }
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
  border-radius: var(--rf-radius-lg);
  box-shadow: var(--rf-shadow-card);
  background: var(--rf-glass-bg);
  backdrop-filter: var(--rf-glass-blur);
  border: 2px solid var(--rf-glass-border);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
}

.candidate-search-input :deep(.v-field:hover) {
  border-color: rgba(var(--v-theme-primary), 0.4);
  box-shadow: var(--rf-shadow-primary);
  transform: translateY(-2px);
}

.candidate-search-input :deep(.v-field:focus-within) {
  border-color: rgba(var(--v-theme-primary), 0.6);
  box-shadow: var(--rf-shadow-primary-hover);
}

.candidate-search-input :deep(.v-field__input) {
  color: rgba(var(--v-theme-on-surface), 0.95);
  font-size: 1rem;
  font-weight: 500;
}

.candidate-search-input :deep(.v-label) {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 500;
}

.suggestions-card {
  border-radius: var(--rf-radius-lg);
  overflow: hidden;
  backdrop-filter: var(--rf-glass-blur);
  background: var(--rf-glass-bg);
  border: 2px solid var(--rf-glass-border);
  box-shadow: var(--rf-shadow-hero);
}

.candidate-suggestion-item {
  cursor: pointer;
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  border-radius: var(--rf-radius-md);
  margin: 0.25rem 0.5rem;
}

.candidate-suggestion-item:hover {
  background: var(--rf-gradient-primary-soft);
  transform: translateX(6px) scale(1.02);
  box-shadow: var(--rf-shadow-card);
}

.candidate-suggestion-item :deep(.v-list-item-subtitle) {
  opacity: 0.7;
}

// Dark mode
.v-theme--dark {
  .candidate-search-card {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.15);
    
    &:hover {
      border-color: rgba(var(--v-theme-primary), 0.5);
    }
  }
  
  .card-title {
    color: rgba(255, 255, 255, 0.95);
  }
  
  .card-subtitle {
    color: rgba(255, 255, 255, 0.75);
  }
  
  .card-decoration {
    background: radial-gradient(circle, rgba(102, 126, 234, 0.15) 0%, transparent 70%);
  }
}

// Responsividade
@media (max-width: 600px) {
  .candidate-search-card {
    width: 95vw;
    min-height: 340px;
  }
  
  .card-body {
    padding: 28px 22px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .card-header-icon {
    width: 48px;
    height: 48px;
  }
  
  .card-title {
    font-size: 1.1rem;
  }
  
  .card-subtitle {
    font-size: 0.875rem;
  }

  .selected-banner {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: auto;
    padding: 1rem;
  }
  
  .selected-chip {
    margin-left: 0 !important;
    margin-top: 0.5rem;
  }
  
  .candidate-suggestion-item:hover {
    transform: translateX(3px) scale(1.01);
  }
}
</style>
