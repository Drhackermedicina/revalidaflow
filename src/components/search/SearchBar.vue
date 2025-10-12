<script setup>
/**
 * SearchBar.vue
 *
 * Componente de busca global de estações com autocomplete
 */
import inepIcon from '@/assets/images/inep.png'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  items: {
    type: Array,
    default: () => []
  },
  totalStations: {
    type: Number,
    default: 0
  },
  selectedStation: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'update:selectedStation', 'station-selected'])

const searchQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const selectedStationModel = computed({
  get: () => props.selectedStation,
  set: (value) => emit('update:selectedStation', value)
})

function onStationSelected(stationId) {
  emit('station-selected', stationId)
}
</script>

<template>
  <v-card class="mb-4" elevation="2" rounded>
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2" color="primary">ri-search-line</v-icon>
      <span class="text-h6">Buscar Estação Globalmente ({{ totalStations }})</span>
    </v-card-title>
    <v-card-text>
      <v-autocomplete
        v-model="selectedStationModel"
        v-model:search="searchQuery"
        :items="searchQuery && searchQuery.length >= 2 ? items : []"
        item-title="title"
        item-value="value"
        label="Digite para buscar estações..."
        placeholder="Ex: Estação 1, Clínica Médica"
        prepend-inner-icon="ri-search-line"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="rounded-input"
        no-data-text="Digite pelo menos 2 caracteres para buscar"
      >
        <template #item="{ props, item }">
          <v-list-item
            v-bind="props"
            @click="onStationSelected(item.raw.value)"
          >
            <template #prepend>
              <div :style="{
                width: item.raw.isINEP ? '60px' : '48px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }">
                <v-img
                  :src="item.raw.iconImage"
                  :max-width="item.raw.isINEP ? '60px' : '48px'"
                  :max-height="'32px'"
                  contain
                />
              </div>
            </template>

            <template v-if="item.raw.subsectionChips && item.raw.subsectionChips.length > 0" #append>
              <div class="d-flex gap-2">
                <v-chip
                  v-for="(chip, index) in item.raw.subsectionChips"
                  :key="index"
                  size="small"
                  :color="item.raw.color"
                  variant="tonal"
                >
                  {{ chip }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </template>
      </v-autocomplete>
    </v-card-text>
  </v-card>
</template>
