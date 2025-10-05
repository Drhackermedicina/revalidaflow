<script setup>
/**
 * CandidateSearchBar.vue
 *
 * Componente de busca de candidatos com menu de sugestões
 */

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
  <!-- Card de candidato selecionado -->
  <v-card v-if="selectedCandidate" class="mb-4" elevation="2" rounded>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="me-2" color="success">ri-user-check-line</v-icon>
        <span class="text-h6">Candidato Selecionado</span>
      </div>
      <v-btn
        variant="outlined"
        size="small"
        color="error"
        @click="onClearSelection"
        prepend-icon="ri-close-line"
      >
        Limpar
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-alert type="success" variant="tonal" class="mb-0">
        <template #title>
          <div class="d-flex align-center">
            <v-avatar size="32" class="me-2">
              <v-img v-if="selectedCandidate.photoURL" :src="selectedCandidate.photoURL" />
              <v-icon v-else>ri-user-line</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-bold">{{ selectedCandidate.nome }}</div>
            </div>
          </div>
        </template>
        <div class="text-body-2">
          Visualizando estatísticas deste candidato nas estações abaixo
        </div>
      </v-alert>
    </v-card-text>
  </v-card>

  <!-- Campo de busca -->
  <v-card v-if="!selectedCandidate" class="mb-4" elevation="2" rounded>
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2" color="primary">ri-search-line</v-icon>
      <span class="text-h6">Buscar Candidato</span>
    </v-card-title>
    <v-card-text>
      <v-menu
        v-model="showSuggestionsModel"
        :close-on-content-click="false"
        location="bottom"
        offset="4"
        max-height="300"
      >
        <template #activator="{ props: menuProps }">
          <v-text-field
            v-bind="menuProps"
            v-model="searchQuery"
            label="Digite o nome do candidato"
            placeholder="Ex: João Silva"
            prepend-inner-icon="ri-search-line"
            variant="outlined"
            :loading="loading"
            @input="onInput"
            @focus="onFocus"
            clearable
            hide-details
            class="rounded-input"
          />
        </template>
        <v-card
          v-if="suggestions.length > 0"
          elevation="8"
          max-height="300"
          style="overflow-y: auto;"
        >
          <v-list density="compact">
            <v-list-item
              v-for="candidate in suggestions"
              :key="candidate.uid"
              @click="onSelectCandidate(candidate)"
              class="candidate-suggestion-item"
            >
              <template #prepend>
                <v-avatar size="32">
                  <v-img v-if="candidate.photoURL" :src="candidate.photoURL" />
                  <v-icon v-else>ri-user-line</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ candidate.nome }}</v-list-item-title>
              <v-list-item-subtitle>{{ candidate.email }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.candidate-suggestion-item {
  cursor: pointer;
}

.candidate-suggestion-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
