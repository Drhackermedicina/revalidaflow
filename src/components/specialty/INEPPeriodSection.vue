<script setup>
/**
 * INEPPeriodSection.vue
 *
 * Componente para renderizar seção de período INEP com lista virtualizada
 */
import StationListItem from '@/components/StationListItem.vue'

defineProps({
  period: {
    type: String,
    required: true
  },
  stations: {
    type: Array,
    required: true
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
  getSpecialty: {
    type: Function,
    required: true
  },
  creatingSessionForStationId: {
    type: String,
    default: null
  }
})

const emit = defineEmits([
  'station-click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station'
])
</script>

<template>
  <v-expansion-panel>
    <v-expansion-panel-title class="text-subtitle-1 font-weight-medium">
      <template #default="{ expanded }">
        <v-row no-gutters align="center">
          <v-col cols="auto">
            <v-icon class="me-2" color="info">ri-calendar-event-line</v-icon>
          </v-col>
          <v-col>INEP {{ period }}</v-col>
          <v-col cols="auto">
            <v-badge :content="stations.length" color="info" inline />
          </v-col>
        </v-row>
      </template>
    </v-expansion-panel-title>

    <v-expansion-panel-text class="virtual-scroll-panel-text">
      <v-virtual-scroll
        :items="stations"
        :item-height="200"
        :height="Math.min(stations.length * 200, 820)"
        class="station-list-scroll"
      >
        <template #default="{ item: station }">
          <StationListItem
            :station="station"
            :user-score="getUserStationScore(station.id)"
            :specialty="getSpecialty(station)"
            :background-color="getStationBackgroundColor(station)"
            :show-sequential-config="showSequentialConfig"
            :is-admin="isAdmin"
            :is-in-sequence="isStationInSequence(station.id)"
            :is-creating-session="creatingSessionForStationId === station.id"
            @click="emit('station-click', $event)"
            @add-to-sequence="emit('add-to-sequence', $event)"
            @remove-from-sequence="emit('remove-from-sequence', $event)"
            @edit-station="emit('edit-station', $event)"
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

.station-list-scroll {
  overflow-y: auto !important;
  max-height: 820px !important;
}

.station-list-scroll :deep(.v-virtual-scroll__item) {
  padding: 14px 20px;
}

/* Força a exibição de todos os items na lista */
:deep(.v-virtual-scroll__container) {
  transform: none !important;
  position: relative !important;
}
</style>
