<template>
  <div class="pa-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">🎯 Admin Dashboard - Gestão de Estações</h1>
      </v-col>
    </v-row>

    <!-- Cards de Estatísticas -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card color="primary" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stations.length }}</div>
            <div class="text-subtitle1">Total de Estações</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="success" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stationsEdited.length }}</div>
            <div class="text-subtitle1">Estações Editadas</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card color="warning" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stationsNotEdited.length }}</div>
            <div class="text-subtitle1">Não Editadas</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs para diferentes visualizações -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="recent">Adicionadas recentemente ({{ stationsRecent.length }})</v-tab>
      <v-tab value="not-edited">Não Editadas ({{ stationsNotEdited.length }})</v-tab>
      <v-tab value="edited">Editadas ({{ stationsEdited.length }})</v-tab>
    </v-tabs>

    <v-card>
      <v-tabs-window v-model="activeTab">
        <!-- Aba: Adicionadas recentemente -->
        <v-tabs-window-item value="recent">
          <v-card-title>
            🆕 Estações Adicionadas nos Últimos 5 Dias
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersRecent"
              :items="stationsRecent"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsRecent.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.normalizedCreatedAt) }}
              </template>
              <template v-slot:item.editada="{ item }">
                <v-chip
                  :color="item.hasBeenEdited ? 'success' : 'warning'"
                  size="small"
                >
                  {{ item.hasBeenEdited ? 'Sim' : 'Não' }}
                </v-chip>
              </template>
              <template v-slot:item.ultimaEdicao="{ item }">
                {{ item.hasBeenEdited ? formatDate(item.normalizedUpdatedAt) : 'N/A' }}
              </template>
              <template v-slot:item.editadoPor="{ item }">
                <v-chip size="small" color="blue" v-if="item.hasBeenEdited && item.lastEditBy">
                  {{ item.lastEditBy }}
                </v-chip>
                <span v-else class="text-grey">N/A</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba: Estações Não Editadas -->
        <v-tabs-window-item value="not-edited">
          <v-card-title>
            🔄 Estações Aguardando Primeira Edição
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersNotEdited"
              :items="stationsNotEdited"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsNotEdited.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.criadoEmTimestamp || item.normalizedCreatedAt) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba: Estações Editadas -->
        <v-tabs-window-item value="edited">
          <v-card-title>
            ✅ Estações Já Editadas
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersEdited"
              :items="stationsEdited"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsEdited.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.criadoEmTimestamp || item.normalizedCreatedAt) }}
              </template>
              <template v-slot:item.atualizadoEm="{ item }">
                {{ formatDate(item.lastEditDate || item.normalizedUpdatedAt) }}
              </template>
              <template v-slot:item.totalEdits="{ item }">
                <v-chip 
                  :color="item.totalEdits > 5 ? 'red' : item.totalEdits > 2 ? 'orange' : 'green'"
                  size="small"
                >
                  {{ item.totalEdits || 1 }} edições
                </v-chip>
              </template>
              <template v-slot:item.atualizadoPor="{ item }">
                <v-chip size="small" color="green">
                  {{ item.lastEditBy || item.atualizadoPor || 'N/A' }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- Loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
  </div>
</template>

<script setup>
import { db } from '@/plugins/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(true)
const stations = ref([])
const activeTab = ref('recent')
const stationsCache = shallowRef(new Map())

// Headers
const headersNotEdited = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'Criado em', key: 'criadoEm', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

const headersRecent = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'CRIADO EM', key: 'criadoEm', sortable: true },
  { title: 'Editada', key: 'editada', sortable: true },
  { title: 'ÚLTIMA EDIÇÃO', key: 'ultimaEdicao', sortable: true },
  { title: 'EDITADO POR', key: 'editadoPor', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

const headersEdited = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'CRIADO EM', key: 'criadoEm', sortable: true },
  { title: 'Edições', key: 'totalEdits', sortable: true },
  { title: 'ÚLTIMA EDIÇÃO', key: 'atualizadoEm', sortable: true },
  { title: 'EDITADO POR', key: 'atualizadoPor', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

// Helpers
const normalizeTimestampToMs = (timestamp) => {
  if (!timestamp) return null
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    return timestamp.seconds * 1000
  }
  if (typeof timestamp === 'number' && timestamp > 1000000000000) return timestamp
  if (typeof timestamp === 'number' && timestamp > 1000000000) return timestamp * 1000
  const date = new Date(timestamp)
  if (!isNaN(date.getTime())) return date.getTime()
  if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate().getTime()
  return null
}

const normalizeStationTimestamps = (station) => {
  const possibleCreatedFields = ['criadoEmTimestamp', 'dataCadastro', 'createdAt', 'timestamp']
  let createdTimestamp = null
  for (const field of possibleCreatedFields) {
    if (station[field]) { createdTimestamp = station[field]; break }
  }

  const possibleUpdatedFields = ['atualizadoEmTimestamp', 'dataUltimaAtualizacao', 'updatedAt', 'editHistory']
  let updatedTimestamp = null

  if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
    const lastEdit = station.editHistory[station.editHistory.length - 1]
    updatedTimestamp = lastEdit.timestamp || lastEdit.data || lastEdit.date
  } else {
    for (const field of possibleUpdatedFields) {
      if (station[field] && field !== 'editHistory') { updatedTimestamp = station[field]; break }
    }
  }

  return {
    normalizedCreatedAt: createdTimestamp,
    normalizedUpdatedAt: updatedTimestamp,
    hasBeenEdited: !!(station.editHistory && station.editHistory.length > 0) || (createdTimestamp && updatedTimestamp && normalizeTimestampToMs(updatedTimestamp) > normalizeTimestampToMs(createdTimestamp)) || !!station.hasBeenEdited
  }
}

const verificarEdicaoHibridaAdmin = (station) => {
  const normalized = normalizeStationTimestamps(station)
  if (station.editHistory && Array.isArray(station.editHistory)) {
    const lastEdit = station.editHistory[station.editHistory.length - 1]
    return {
      hasBeenEdited: true,
      method: 'modern',
      lastEditDate: lastEdit?.timestamp || lastEdit?.data || lastEdit?.date || null,
      totalEdits: station.editHistory.length,
      lastEditBy: lastEdit?.editadoPor || lastEdit?.userId || lastEdit?.userName || null
    }
  }

  const createdDate = normalized.normalizedCreatedAt
  const updatedDate = normalized.normalizedUpdatedAt

  if (createdDate && updatedDate) {
    const createdTime = normalizeTimestampToMs(createdDate)
    const updatedTime = normalizeTimestampToMs(updatedDate)
    const hasLegacyEdit = updatedTime && createdTime && updatedTime > createdTime
    return {
      hasBeenEdited: hasLegacyEdit,
      method: 'legacy',
      totalEdits: hasLegacyEdit ? 1 : 0,
      lastEditDate: hasLegacyEdit ? updatedDate : null,
      lastEditBy: station.atualizadoPor || station.editadoPor || station.updatedBy || station.criadoPor
    }
  }

  return {
    hasBeenEdited: normalized.hasBeenEdited,
    method: station.hasBeenEdited !== undefined ? 'boolean' : 'none',
    totalEdits: normalized.hasBeenEdited ? 1 : 0,
    lastEditDate: updatedDate,
    lastEditBy: station.atualizadoPor || station.updatedBy
  }
}

const simplifySpecialty = (especialidade) => {
  if (!especialidade) return 'N/A'
  const especialidadeUpper = especialidade.toUpperCase().trim()
  const map = {
    'CLÍNICA MÉDICA': 'CM',
    'CLINICA MEDICA': 'CM',
    'CIRURGIA': 'CR',
    'PEDIATRIA': 'PED',
    'GINECOLOGIA E OBSTETRÍCIA': 'G.O',
    'MEDICINA DA FAMÍLIA E COMUNIDADE': 'MED F.C'
  }
  return map[especialidade] || map[especialidadeUpper] || especialidade
}

const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return 'N/A'
  try {
    let date
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) date = new Date(timestamp.seconds * 1000)
    else if (typeof timestamp === 'number' && timestamp > 1000000000000) date = new Date(timestamp)
    else if (typeof timestamp === 'number' && timestamp > 1000000000) date = new Date(timestamp * 1000)
    else if (typeof timestamp === 'string') date = new Date(timestamp)
    else if (timestamp instanceof Date) date = timestamp
    else if (timestamp && typeof timestamp.toDate === 'function') date = timestamp.toDate()
    if (!date || isNaN(date.getTime())) return 'N/A'
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} às ${timeStr}`
  } catch {
    return 'N/A'
  }
}

// Computed filters
const stationsNotEdited = computed(() => {
  const result = stations.value.filter(station => {
    const normalized = normalizeStationTimestamps(station)
    return !normalized.hasBeenEdited
  }).map(station => {
    const normalized = normalizeStationTimestamps(station)
    return { ...station, normalizedCreatedAt: normalized.normalizedCreatedAt, normalizedUpdatedAt: normalized.normalizedUpdatedAt, hasBeenEdited: normalized.hasBeenEdited }
  }).sort((a,b) => {
    const dateA = normalizeTimestampToMs(a.normalizedCreatedAt) || 0
    const dateB = normalizeTimestampToMs(b.normalizedCreatedAt) || 0
    return dateB - dateA
  })
  return result
})

const stationsEdited = computed(() => {
  const result = stations.value.filter(station => {
    const normalized = normalizeStationTimestamps(station)
    return normalized.hasBeenEdited
  }).map(station => {
    const normalized = normalizeStationTimestamps(station)
    const editInfo = verificarEdicaoHibridaAdmin(station)
    return { ...station, normalizedCreatedAt: normalized.normalizedCreatedAt, normalizedUpdatedAt: normalized.normalizedUpdatedAt, hasBeenEdited: normalized.hasBeenEdited, totalEdits: editInfo.totalEdits, lastEditBy: editInfo.lastEditBy, lastEditDate: editInfo.lastEditDate }
  }).sort((a,b) => {
    const dateA = normalizeTimestampToMs(a.lastEditDate) || normalizeTimestampToMs(a.normalizedUpdatedAt) || 0
    const dateB = normalizeTimestampToMs(b.lastEditDate) || normalizeTimestampToMs(b.normalizedUpdatedAt) || 0
    return dateB - dateA
  })
  return result
})

const stationsRecent = computed(() => {
  const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const fiveDaysAgoTimestamp = fiveDaysAgo.getTime()
  const result = stations.value.filter(station => {
    const normalized = normalizeStationTimestamps(station)
    const createdTime = normalizeTimestampToMs(normalized.normalizedCreatedAt)
    if (!createdTime) return false
    return createdTime >= fiveDaysAgoTimestamp
  }).map(station => {
    const normalized = normalizeStationTimestamps(station)
    return { ...station, normalizedCreatedAt: normalized.normalizedCreatedAt, normalizedUpdatedAt: normalized.normalizedUpdatedAt, hasBeenEdited: normalized.hasBeenEdited }
  }).sort((a,b) => {
    const dateA = normalizeTimestampToMs(a.normalizedCreatedAt) || 0
    const dateB = normalizeTimestampToMs(b.normalizedCreatedAt) || 0
    return dateB - dateA
  })
  return result
})

const editStation = (stationId) => {
  router.push(`/app/edit-station/${stationId}`)
}

onMounted(() => {
  const stationsRef = collection(db, 'estacoes_clinicas')
  onSnapshot(stationsRef, (snapshot) => {
    const stationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    stations.value = stationsData
    isLoading.value = false
  }, (error) => {
    console.error('AdminView: Erro ao carregar dados:', error)
    isLoading.value = false
  })
})
</script>

<style scoped>
.prose-content { line-height: 1.6; }
.proposal-card { border: 1px solid #e0e0e0; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.proposal-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.code-block { background-color: #2d2d2d; color: #f8f8f2; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; }
code { background-color: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9em; }
.v-card { border-radius: 12px !important; }
.v-chip { font-weight: 500; }
.v-btn { border-radius: 8px !important; font-weight: 500; }
.v-alert { border-radius: 8px !important; }
.v-text-field, .v-textarea, .v-file-input { border-radius: 8px !important; }
</style>
