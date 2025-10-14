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
                {{ item.hasBeenEdited ? formatDate(item.lastEditDate || item.normalizedUpdatedAt) : 'N/A' }}
              </template>
              <template v-slot:item.editadoPor="{ item }">
                <v-chip size="small" color="blue" v-if="item.hasBeenEdited && item.lastEditBy">
                  {{ getUserDisplayName(item.lastEditBy) }}
                  <!-- Força reatividade quando nomes são carregados -->
                  <span style="display: none">{{ userNamesVersion }}</span>
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
                {{ formatDate(item.normalizedCreatedAt) }}
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
                {{ formatDate(item.normalizedCreatedAt) }}
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
                  {{ getUserDisplayName(item.lastEditBy) || 'N/A' }}
                  <!-- Força reatividade quando nomes são carregados -->
                  <span style="display: none">{{ userNamesVersion }}</span>
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
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoading = ref(true)
const stations = ref([])
const activeTab = ref('recent')
// Cache para armazenar informações processadas das estações
const processedStationsCache = shallowRef(new Map())
// Marcações de tempo para detectar mudanças nas estações
const stationLastProcessed = shallowRef(new Map())
// Cache para nomes de usuários
const userNamesCache = shallowRef(new Map())

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
    if (station[field]) {
      createdTimestamp = station[field]
      break
    }
  }

  // Se não encontrou nos campos diretos, tenta encontrar em objetos aninhados
  if (!createdTimestamp && station.metadata && station.metadata.createdAt) {
    createdTimestamp = station.metadata.createdAt
  }

  const possibleUpdatedFields = ['atualizadoEmTimestamp', 'dataUltimaAtualizacao', 'updatedAt', 'editHistory']
  let updatedTimestamp = null

  // Primeiro verifica se tem histórico de edições
  if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
    const lastEdit = station.editHistory[station.editHistory.length - 1]
    updatedTimestamp = lastEdit.timestamp || lastEdit.data || lastEdit.date
  } else {
    // Se não tem histórico, procura nos campos diretos
    for (const field of possibleUpdatedFields) {
      if (station[field] && field !== 'editHistory') {
        updatedTimestamp = station[field]
        break
      }
    }
  }

  // Se não encontrou nos campos diretos, tenta encontrar em objetos aninhados
  if (!updatedTimestamp && station.metadata && station.metadata.updatedAt) {
    updatedTimestamp = station.metadata.updatedAt
  }

  // Normaliza os timestamps para milissegundos
  const normalizedCreated = normalizeTimestampToMs(createdTimestamp)
  const normalizedUpdated = normalizeTimestampToMs(updatedTimestamp)

  // Determina se foi editado
  let hasBeenEdited = false
  if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
    // Se tem histórico de edições, considera como editado
    hasBeenEdited = true
  } else if (station.hasBeenEdited !== undefined) {
    // Se tem o campo booleano explícito, usa ele
    hasBeenEdited = !!station.hasBeenEdited
  } else if (normalizedCreated && normalizedUpdated) {
    // Se tem ambos timestamps, compara
    hasBeenEdited = normalizedUpdated > normalizedCreated
  }

  return {
    normalizedCreatedAt: normalizedCreated || createdTimestamp,
    normalizedUpdatedAt: normalizedUpdated || updatedTimestamp,
    hasBeenEdited
  }
}

const verificarEdicaoHibridaAdmin = (station) => {
  const normalized = normalizeStationTimestamps(station)
  
  // Caso 1: Tem histórico de edições moderno
  if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
    const lastEdit = station.editHistory[station.editHistory.length - 1]
    return {
      hasBeenEdited: true,
      method: 'modern',
      lastEditDate: lastEdit?.timestamp || lastEdit?.data || lastEdit?.date || null,
      totalEdits: station.editHistory.length,
      lastEditBy: lastEdit?.editadoPor || lastEdit?.userId || lastEdit?.userName || lastEdit?.user || null
    }
  }

  // Caso 2: Tem timestamps normalizados
  const createdDate = normalized.normalizedCreatedAt
  const updatedDate = normalized.normalizedUpdatedAt

  if (createdDate && updatedDate) {
    const createdTime = normalizeTimestampToMs(createdDate)
    const updatedTime = normalizeTimestampToMs(updatedDate)
    const hasLegacyEdit = updatedTime && createdTime && updatedTime > createdTime
    
    // Tenta encontrar informações do editor
    let editor = null
    if (station.lastEditBy) {
      editor = station.lastEditBy
    } else if (station.atualizadoPor) {
      editor = station.atualizadoPor
    } else if (station.editadoPor) {
      editor = station.editadoPor
    } else if (station.updatedBy) {
      editor = station.updatedBy
    } else if (station.criadoPor && createdTime !== updatedTime) {
      editor = station.criadoPor
    }
    
    return {
      hasBeenEdited: hasLegacyEdit,
      method: 'legacy',
      totalEdits: hasLegacyEdit ? 1 : 0,
      lastEditDate: hasLegacyEdit ? updatedDate : null,
      lastEditBy: editor
    }
  }

  // Caso 3: Usa o campo booleano explícito ou retorna valores padrão
  return {
    hasBeenEdited: normalized.hasBeenEdited || false,
    method: station.hasBeenEdited !== undefined ? 'boolean' : 'none',
    totalEdits: normalized.hasBeenEdited ? 1 : 0,
    lastEditDate: updatedDate || null,
    lastEditBy: station.lastEditBy || station.atualizadoPor || station.updatedBy || station.editadoPor || null
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

const formatDate = (timestamp) => {
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

// Função para buscar nome do usuário pelo UID
const getUserName = async (uid) => {
  if (!uid) return 'N/A'

  // Verifica se já está no cache
  if (userNamesCache.value.has(uid)) {
    return userNamesCache.value.get(uid)
  }

  try {
    const userDoc = await getDoc(doc(db, 'usuarios', uid))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      // Prioriza o campo 'nome' como informado pelo usuário
      const displayName = userData.nome || userData.displayName || userData.name || userData.email || 'Usuário'
      userNamesCache.value.set(uid, displayName)
      return displayName
    } else {
      // Se não encontrar, armazena como UID para evitar buscas repetidas
      userNamesCache.value.set(uid, uid)
      return uid
    }
  } catch (error) {
    console.error('Erro ao buscar nome do usuário:', error)
    // Em caso de erro, retorna o UID
    userNamesCache.value.set(uid, uid)
    return uid
  }
}// Função para obter nome do usuário formatado (síncrona, usa cache)
const getUserDisplayName = (uid) => {
  if (!uid) return 'N/A'
  return userNamesCache.value.get(uid) || uid
}// Função para carregar nomes dos usuários que editaram as estações
const loadUserNamesForStations = async (stationsData) => {
  const userIds = new Set()

  // Coleta todos os UIDs únicos das estações
  stationsData.forEach(station => {
    if (station.lastEditBy) userIds.add(station.lastEditBy)
    if (station.editadoPor) userIds.add(station.editadoPor)
    if (station.atualizadoPor) userIds.add(station.atualizadoPor)
    if (station.updatedBy) userIds.add(station.updatedBy)

    // Também verifica no histórico de edições
    if (station.editHistory && Array.isArray(station.editHistory)) {
      station.editHistory.forEach(edit => {
        if (edit.editadoPor) userIds.add(edit.editadoPor)
        if (edit.userId) userIds.add(edit.userId)
        if (edit.user) userIds.add(edit.user)
      })
    }
  })

  // Remove UIDs que já estão no cache
  const uidsToFetch = Array.from(userIds).filter(uid => !userNamesCache.value.has(uid))

  if (uidsToFetch.length === 0) return

  // Busca os nomes em lotes para evitar muitas requisições
  const batchSize = 10
  for (let i = 0; i < uidsToFetch.length; i += batchSize) {
    const batch = uidsToFetch.slice(i, i + batchSize)
    await Promise.all(batch.map(uid => getUserName(uid)))
  }

  // Força atualização do cache para garantir que os nomes sejam exibidos
  userNamesCache.value = new Map(userNamesCache.value)
}

// Função para gerar uma marcação de tempo baseada no estado atual da estação
const getStationTimestamp = (station) => {
  // Prioriza campos que indicam atualização
  if (station.normalizedUpdatedAt) return station.normalizedUpdatedAt;
  if (station.atualizadoEmTimestamp) return station.atualizadoEmTimestamp;
  if (station.dataUltimaAtualizacao) return station.dataUltimaAtualizacao;
  if (station.editHistory && station.editHistory.length > 0) return station.editHistory[station.editHistory.length - 1].timestamp;
  
  // Caso contrário, usa a data de criação
  return station.normalizedCreatedAt || station.criadoEmTimestamp || station.dataCadastro;
};

// Função para verificar se a estação foi modificada desde o último processamento
const isStationModified = (station) => {
  if (!station.id) return true;
  
  const currentTimestamp = getStationTimestamp(station);
  const lastProcessed = stationLastProcessed.value.get(station.id);
  
  // Se nunca processamos ou o timestamp mudou, a estação foi modificada
  return !lastProcessed || lastProcessed !== currentTimestamp;
};

// Função para atualizar o cache de uma estação específica
const updateStationCache = (station) => {
  if (!station.id) return;
  
  const normalized = normalizeStationTimestamps(station);
  const editInfo = verificarEdicaoHibridaAdmin(station);
  
  const processed = {
    ...station,
    normalizedCreatedAt: normalized.normalizedCreatedAt,
    normalizedUpdatedAt: normalized.normalizedUpdatedAt,
    hasBeenEdited: editInfo.hasBeenEdited,
    totalEdits: editInfo.totalEdits,
    lastEditBy: editInfo.lastEditBy,
    lastEditDate: editInfo.lastEditDate,
    createdTime: normalizeTimestampToMs(normalized.normalizedCreatedAt) || 0,
    updatedTime: normalizeTimestampToMs(editInfo.lastEditDate) || normalizeTimestampToMs(normalized.normalizedUpdatedAt) || 0
  };
  
  processedStationsCache.value.set(station.id, processed);
  stationLastProcessed.value.set(station.id, getStationTimestamp(station));
};

// Limpa o cache para estações específicas
const clearStationCache = (stationIds) => {
  stationIds.forEach(id => {
    processedStationsCache.value.delete(id);
    stationLastProcessed.value.delete(id);
  });
};

// Watcher para atualizar o cache incrementalmente
watch(stations, (newStations) => {
  const modifiedStations = [];
  const newStationIds = new Set();
  
  // Identifica estações modificadas ou novas
  for (const station of newStations) {
    if (!station.id) continue;
    
    newStationIds.add(station.id);
    if (isStationModified(station)) {
      modifiedStations.push(station);
    }
  }
  
  // Limpa cache para estações removidas
  const cachedIds = Array.from(processedStationsCache.value.keys());
  const removedIds = cachedIds.filter(id => !newStationIds.has(id));
  if (removedIds.length > 0) {
    clearStationCache(removedIds);
  }
  
  // Atualiza cache para estações modificadas
  for (const station of modifiedStations) {
    updateStationCache(station);
  }
}, { deep: true });

// Função para obter informações processadas da estação com cache otimizado
const getProcessedStationInfo = (station) => {
  if (!station.id) {
    // Para estações sem ID (raro), processa diretamente sem cache
    const normalized = normalizeStationTimestamps(station);
    const editInfo = verificarEdicaoHibridaAdmin(station);
    
    return {
      ...station,
      normalizedCreatedAt: normalized.normalizedCreatedAt,
      normalizedUpdatedAt: normalized.normalizedUpdatedAt,
      hasBeenEdited: editInfo.hasBeenEdited,
      totalEdits: editInfo.totalEdits,
      lastEditBy: editInfo.lastEditBy,
      lastEditDate: editInfo.lastEditDate,
      createdTime: normalizeTimestampToMs(normalized.normalizedCreatedAt) || 0,
      updatedTime: normalizeTimestampToMs(editInfo.lastEditDate) || normalizeTimestampToMs(normalized.normalizedUpdatedAt) || 0
    };
  }
  
  // Primeiro verifica se precisa atualizar o cache
  if (isStationModified(station)) {
    updateStationCache(station);
  }
  
  // Retorna do cache (sempre atualizado graças ao watcher)
  return processedStationsCache.value.get(station.id) || station;
};

// Computed filters com memoização baseada em cache
const stationsNotEdited = computed(() => {
  return stations.value
    .filter(station => {
      const processed = getProcessedStationInfo(station);
      return !processed.hasBeenEdited;
    })
    .map(station => getProcessedStationInfo(station))
    .sort((a, b) => b.createdTime - a.createdTime);
});

const stationsEdited = computed(() => {
  return stations.value
    .filter(station => {
      const processed = getProcessedStationInfo(station);
      return processed.hasBeenEdited;
    })
    .map(station => getProcessedStationInfo(station))
    .sort((a, b) => b.updatedTime - a.updatedTime);
});

const stationsRecent = computed(() => {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysAgoTimestamp = fiveDaysAgo.getTime();

  return stations.value
    .filter(station => {
      const processed = getProcessedStationInfo(station);
      return processed.createdTime >= fiveDaysAgoTimestamp;
    })
    .map(station => getProcessedStationInfo(station))
    .sort((a, b) => b.createdTime - a.createdTime);
});

// Propriedade computada para forçar reatividade quando os nomes dos usuários são carregados
const userNamesVersion = computed(() => {
  return userNamesCache.value.size
});

const editStation = (stationId) => {
  router.push(`/app/edit-station/${stationId}`)
}

onMounted(() => {
  const stationsRef = collection(db, 'estacoes_clinicas')
  onSnapshot(stationsRef, async (snapshot) => {
    const stationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    stations.value = stationsData
    isLoading.value = false

    // Buscar nomes dos usuários que editaram as estações
    await loadUserNamesForStations(stationsData)
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
