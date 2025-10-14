<script setup>
/**
 * SpecialtySection.vue
 *
 * Componente reutilizável para seções de especialidade
 * CORRIGIDO: Substituído @tanstack/vue-virtual por v-virtual-scroll nativo do Vuetify
 */
import StationListItem from '@/components/StationListItem.vue'

// Props
defineProps({
  title: {
    type: String,
    required: true
  },
  stations: {
    type: Array,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    default: null
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  getUserStationScore: {
    type: Function,
    required: true
  },
  getStationBackgroundColor: {
    type: Function,
    required: true
  },
  isStationInSequence: {
    type: Function,
    required: true
  },
  creatingSessionForStationId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits([
  'station-click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station',
  'start-ai-training'
])
</script>

<template>
  <v-expansion-panel>
    <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
      <template #default="{ expanded }">
        <v-row no-gutters align="center">
          <v-col cols="auto">
            <v-icon class="me-2" :color="color">{{ icon }}</v-icon>
          </v-col>
          <v-col>{{ title }}</v-col>
          <v-col cols="auto">
            <v-badge :content="stations.length" :color="color" inline />
          </v-col>
        </v-row>
      </template>
    </v-expansion-panel-title>

    <v-expansion-panel-text class="virtual-scroll-panel-text">
      <v-virtual-scroll
        :items="stations"
        :item-height="140"
        :height="Math.min(stations.length * 140, 700)"
        style="overflow-y: auto;"
      >
        <template #default="{ item: station }">
          <StationListItem
            :station="station"
            :user-score="getUserStationScore(station.id)"
            :specialty="specialty"
            :background-color="getStationBackgroundColor(station)"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :is-in-sequence="isStationInSequence(station.id)"
            :is-creating-session="creatingSessionForStationId === station.id"
            :show-detailed-dates="true"
            @click="emit('station-click', $event)"
            @add-to-sequence="emit('add-to-sequence', $event)"
            @remove-from-sequence="emit('remove-from-sequence', $event)"
            @edit-station="emit('edit-station', $event)"
            @start-ai-training="emit('start-ai-training', $event)"
          />
        </template>
      </v-virtual-scroll>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
.virtual-scroll-panel-text {
  padding: 0 !important;
}
</style>
