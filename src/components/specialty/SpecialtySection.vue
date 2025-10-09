<script setup>
/**
 * SpecialtySection.vue
 *
 * Componente reutilizável para seções de especialidade
 * OTIMIZADO: Usa virtual scrolling avançado para melhor performance
 */
import StationListItem from '@/components/StationListItem.vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { computed, ref } from 'vue'

// Props
const props = defineProps({
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

// Virtual scrolling setup
const parentRef = ref(null)
const ITEM_HEIGHT = 160
const CONTAINER_HEIGHT = 600 // Altura máxima do container

const virtualizer = useVirtualizer({
  count: computed(() => props.stations.length),
  getScrollElement: () => parentRef.value,
  estimateSize: () => ITEM_HEIGHT,
  overscan: 5 // Renderizar 5 itens extras fora da viewport
})
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

    <v-expansion-panel-text>
      <div
        ref="parentRef"
        :style="{
          height: Math.min(stations.length * ITEM_HEIGHT, CONTAINER_HEIGHT) + 'px',
          overflow: 'auto'
        }"
        class="virtual-scroll-container"
      >
        <div
          :style="{
            height: virtualizer.getTotalSize() + 'px',
            width: '100%',
            position: 'relative'
          }"
        >
          <div
            v-for="virtualItem in virtualizer.getVirtualItems()"
            :key="virtualItem.key"
            :style="{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size + 'px',
              transform: `translateY(${virtualItem.start}px)`
            }"
          >
            <StationListItem
              :station="stations[virtualItem.index]"
              :user-score="getUserStationScore(stations[virtualItem.index].id)"
              :specialty="specialty"
              :background-color="getStationBackgroundColor(stations[virtualItem.index])"
              :show-sequential-config="showSequentialConfig"
              :is-admin="isAdmin"
              :is-in-sequence="isStationInSequence(stations[virtualItem.index].id)"
              :is-creating-session="creatingSessionForStationId === stations[virtualItem.index].id"
              :show-detailed-dates="true"
              @click="emit('station-click', $event)"
              @add-to-sequence="emit('add-to-sequence', $event)"
              @remove-from-sequence="emit('remove-from-sequence', $event)"
              @edit-station="emit('edit-station', $event)"
              @start-ai-training="emit('start-ai-training', $event)"
            />
          </div>
        </div>
      </div>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
/* Estilos específicos podem ser adicionados aqui se necessário */
</style>
