<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import SectionHeroCard from '@/components/station/SectionHeroCard.vue'
import inepIcon from '@/assets/images/inep.png'

import { useStationData } from '@/composables/useStationData'
import { useStationFilteringOptimized } from '@/composables/useStationFilteringOptimized'
import stationRepository from '@/repositories/stationRepository'

const router = useRouter()

const { stations, fetchStations } = useStationData()
const {
  isINEPStation,
  isRevalidaFacilStation,
} = useStationFilteringOptimized(stations)

const allStationsForCounts = ref([])

const inepCount = computed(() => (allStationsForCounts.value || []).filter(isINEPStation).length)
const revalidaCount = computed(() => (allStationsForCounts.value || []).filter(isRevalidaFacilStation).length)

fetchStations().catch(() => {})
stationRepository.getAll(true).then(list => { allStationsForCounts.value = list || [] }).catch(() => {})

function openInep() {
  router.push({ name: 'stations-inep', query: { mode: 'simple-training' } })
}

function openRevalida() {
  router.push({ name: 'stations-revalida', query: { mode: 'simple-training' } })
}
</script>

<template>
  <v-container fluid>
    <v-row justify="center" class="mt-6 mb-8">
      <v-col cols="12" sm="6" md="4" lg="3" class="d-flex justify-center mb-4">
        <SectionHeroCard
          title="INEP — Provas Anteriores"
          subtitle="Acesse estações por período"
          :image="inepIcon"
          :badge-count="inepCount"
          color="primary"
          gradient-start="#ECF4FF"
          gradient-end="#F7FAFF"
          @click="openInep"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="3" class="d-flex justify-center mb-4">
        <SectionHeroCard
          title="REVALIDA FLOW"
          subtitle="Estações por especialidade"
          image="/botaosemfundo.png"
          :badge-count="revalidaCount"
          color="success"
          gradient-start="#E9F7EF"
          gradient-end="#F5FBF7"
          @click="openRevalida"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
</style>
