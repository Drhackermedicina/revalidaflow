<template>
  <VCard
    :class="[
      'stations-card',
      isDarkTheme ? 'stations-card--dark' : 'stations-card--light'
    ]"
    elevation="3"
  >
    <VCardTitle class="d-flex align-center pa-3">
      <VIcon icon="ri-hospital-line" color="primary" size="24" class="me-2" />
      <span class="text-subtitle-1 font-weight-bold">Estações Recentes</span>
      <VSpacer />
      <VChip
        color="info"
        variant="tonal"
        size="small"
      >
        Últimas 5
      </VChip>
    </VCardTitle>

    <VDivider />

    <VCardText class="pa-4">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-6">
        <VProgressCircular indeterminate color="primary" size="32" />
      </div>

      <!-- Lista de estações -->
      <VList v-else-if="recentStations.length > 0" density="compact" class="pa-0">
        <VListItem
          v-for="(station, index) in recentStations"
          :key="index"
          class="station-item px-2 mb-1"
          @click="goToStationList"
        >
          <template #prepend>
            <VIcon
              icon="ri-stethoscope-line"
              color="primary"
              size="20"
            />
          </template>

          <VListItemTitle class="text-body-2 font-weight-medium">
            {{ station.title }}
          </VListItemTitle>

          <VListItemSubtitle class="text-caption">
            {{ formatDate(station.createdAt) }}
          </VListItemSubtitle>

          <template #append>
            <VChip
              :color="getDifficultyColor(station.difficulty)"
              size="x-small"
              variant="flat"
            >
              {{ station.difficulty }}
            </VChip>
          </template>
        </VListItem>
      </VList>

      <!-- Estado vazio -->
      <div v-else class="text-center py-6">
        <VIcon icon="ri-folder-open-line" size="56" color="grey" class="mb-3" />
        <p class="text-body-2 text-medium-emphasis">Nenhuma estação recente</p>
      </div>

      <!-- Espaçador flexível -->
      <div class="flex-grow-1"></div>

      <!-- Botão Ver Todas -->
      <VBtn
        color="primary"
        variant="outlined"
        block
        size="default"
        class="mt-4"
        @click="goToStationList"
      >
        Ver Todas as Estações
        <VIcon icon="ri-arrow-right-line" class="ms-1" size="16" />
      </VBtn>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { db } from '@/plugins/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'

interface Station {
  title: string
  difficulty: string
  createdAt: any
}

const router = useRouter()
const theme = useTheme()

const loading = ref(true)
const recentStations = ref<Station[]>([])

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Carregar estações recentes
onMounted(async () => {
  try {
    const stationsQuery = query(
      collection(db, 'estacoes_clinicas'),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    
    const snapshot = await getDocs(stationsQuery)
    recentStations.value = snapshot.docs.map(doc => ({
      title: doc.data().title || 'Estação sem título',
      difficulty: doc.data().difficulty || 'Médio',
      createdAt: doc.data().createdAt
    }))
  } catch (error) {
    console.error('Erro ao carregar estações:', error)
    // Mock data em caso de erro
    recentStations.value = [
      { title: 'Cardiologia Básica', difficulty: 'Fácil', createdAt: new Date() },
      { title: 'Neurologia Avançada', difficulty: 'Difícil', createdAt: new Date() },
      { title: 'Pediatria Geral', difficulty: 'Médio', createdAt: new Date() }
    ]
  } finally {
    loading.value = false
  }
})

// Formatação de data
const formatDate = (date: any): string => {
  if (!date) return 'Data desconhecida'
  
  try {
    const timestamp = date.toDate ? date.toDate() : new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    
    return timestamp.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    })
  } catch {
    return 'Data inválida'
  }
}

// Cor por dificuldade
const getDifficultyColor = (difficulty: string): string => {
  const difficultyMap: Record<string, string> = {
    'Fácil': 'success',
    'Médio': 'warning',
    'Difícil': 'error'
  }
  return difficultyMap[difficulty] || 'info'
}

// Navegação
const goToStationList = () => {
  router.push('/app/station-list')
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.stations-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stations-card .v-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stations-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.stations-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.stations-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.15) !important;
}

/* ========== LISTA DE ESTAÇÕES ========== */
.station-item {
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.station-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

/* ========== ANIMAÇÃO ========== */
.stations-card {
  animation: fadeSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s backwards;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
