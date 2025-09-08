<template>
  <VContainer class="py-6">
    <VCard elevation="4" class="mx-auto" max-width="900">
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="ri-user-search-line" color="primary" size="28" />
        <span class="text-h5 font-weight-bold">Buscar Usuários</span>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <!-- Campo de busca -->
        <VTextField
          v-model="searchTerm"
          placeholder="Buscar por nome ou email..."
          prepend-inner-icon="ri-search-line"
          density="comfortable"
          variant="outlined"
          class="mb-4"
          clearable
          @update:model-value="handleSearch"
        />
        
        <!-- Filtros avançados -->
        <VExpansionPanels variant="accordion" class="mb-4">
          <VExpansionPanel>
            <VExpansionPanelTitle expand-icon="ri-filter-line">
              <span class="font-weight-medium">Filtros Avançados</span>
              <template #actions>
                <VChip
                  v-if="hasActiveFilters"
                  size="small"
                  color="primary"
                  variant="tonal"
                >
                  {{ activeFiltersCount }}
                </VChip>
              </template>
            </VExpansionPanelTitle>
            <VExpansionPanelContent>
              <VRow>
                <VCol cols="12" sm="6" md="4">
                  <VSelect
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Status"
                    density="comfortable"
                    variant="outlined"
                    clearable
                  />
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <VSelect
                    v-model="filters.sortBy"
                    :items="sortOptions"
                    label="Ordenar por"
                    density="comfortable"
                    variant="outlined"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <VTextField
                    v-model="filters.emailDomain"
                    label="Domínio de email"
                    placeholder="ex: gmail.com"
                    density="comfortable"
                    variant="outlined"
                    clearable
                  />
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <VSelect
                    v-model="filters.activityTime"
                    :items="activityTimeOptions"
                    label="Tempo de atividade"
                    density="comfortable"
                    variant="outlined"
                    clearable
                  />
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <VSwitch
                    v-model="filters.excludeCurrentUser"
                    label="Excluir meu usuário"
                    density="comfortable"
                  />
                </VCol>
                <VCol cols="12" sm="6" md="4">
                  <VBtn
                    color="secondary"
                    variant="outlined"
                    @click="clearFilters"
                    class="mt-4"
                    block
                  >
                    <VIcon icon="ri-close-line" class="me-1" />
                    Limpar Todos os Filtros
                  </VBtn>
                </VCol>
              </VRow>
            </VExpansionPanelContent>
          </VExpansionPanel>
        </VExpansionPanels>

        <!-- Contador de resultados -->
        <div class="d-flex justify-space-between align-center mb-4">
          <span class="text-caption text-medium-emphasis">
            {{ filteredUsers.length }} usuário(s) encontrado(s)
          </span>
          <VBtn
            color="primary"
            variant="tonal"
            size="small"
            @click="refreshUsers"
            :loading="userStore.state.loadingUsers"
          >
            <VIcon icon="ri-refresh-line" class="me-1" />
            Atualizar
          </VBtn>
        </div>

        <!-- Lista de usuários -->
        <div v-if="filteredUsers.length > 0">
          <VList>
            <VListItem
              v-for="user in filteredUsers"
              :key="user.uid"
              class="py-3"
            >
              <template #prepend>
                <VBadge
                  :color="getStatusColor(user.status)"
                  dot
                  offset-x="2"
                  offset-y="2"
                  bordered
                >
                  <VAvatar :image="user.photoURL" size="48" />
                </VBadge>
              </template>
              
              <VListItemTitle class="font-weight-medium d-flex align-center gap-2">
                {{ user.displayName }}
                <VChip
                  v-if="user.uid === currentUser?.uid"
                  color="primary"
                  size="small"
                  variant="tonal"
                >
                  <VIcon icon="ri-user-line" size="16" class="me-1" />
                  Você
                </VChip>
              </VListItemTitle>
              
              <VListItemSubtitle class="text-caption mb-1">
                {{ user.email }}
              </VListItemSubtitle>
              
              <VListItemSubtitle class="text-caption text-medium-emphasis">
                <VIcon icon="ri-time-line" size="14" class="me-1" />
                Última atividade: {{ formatLastActive(user.lastActive) }}
              </VListItemSubtitle>

              <template #append>
                <div class="d-flex flex-column align-end gap-2">
                  <VChip
                    :color="getStatusColor(user.status)"
                    size="small"
                    class="text-capitalize"
                    variant="tonal"
                  >
                    <VIcon :icon="user.status === 'disponivel' ? 'ri-checkbox-circle-line' : 'ri-timer-line'" size="16" class="me-1" />
                    {{ getStatusLabel(user.status) }}
                  </VChip>
                  
                  <VBtn
                    v-if="user.status === 'disponivel' && user.uid !== currentUser?.uid"
                    color="primary"
                    size="small"
                    variant="tonal"
                    :disabled="true"
                  >
                    <VIcon icon="ri-user-add-line" size="16" class="me-1" />
                    Convidar
                  </VBtn>
                  
                  <VBtn
                    v-else-if="user.uid !== currentUser?.uid"
                    color="secondary"
                    size="small"
                    variant="outlined"
                    :disabled="true"
                  >
                    <VIcon icon="ri-user-forbid-line" size="16" class="me-1" />
                    Indisponível
                  </VBtn>
                </div>
              </template>
            </VListItem>
          </VList>
        </div>
        
        <!-- Mensagem quando não há resultados -->
        <div v-else class="text-center py-8">
          <VIcon icon="ri-search-line" size="48" color="disabled" class="mb-2" />
          <p class="text-body-1 text-medium-emphasis mb-2">Nenhum usuário encontrado</p>
          <p class="text-caption text-disabled">Tente ajustar os filtros ou termos de busca</p>
        </div>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import { currentUser } from '@/plugins/auth'
import { connectSocket } from '@/plugins/socket'
import { useUserStore } from '@/stores/userStore'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const userStore = useUserStore()
const socket = ref(null)

// Variáveis para busca e filtros
const searchTerm = ref('')
const filters = ref({
  status: '',
  sortBy: 'name-asc',
  emailDomain: '',
  activityTime: '',
  excludeCurrentUser: false
})

const statusOptions = [
  { title: 'Todos os status', value: '' },
  { title: 'Disponível', value: 'disponivel' },
  { title: 'Treinando', value: 'treinando' }
]

const sortOptions = [
  { title: 'Nome (A-Z)', value: 'name-asc' },
  { title: 'Nome (Z-A)', value: 'name-desc' },
  { title: 'Status (Disponível primeiro)', value: 'status-asc' },
  { title: 'Status (Treinando primeiro)', value: 'status-desc' },
  { title: 'Última atividade (recente)', value: 'lastActive-desc' },
  { title: 'Última atividade (antiga)', value: 'lastActive-asc' }
]

const activityTimeOptions = [
  { title: 'Qualquer tempo', value: '' },
  { title: 'Últimos 5 minutos', value: '5min' },
  { title: 'Últimos 15 minutos', value: '15min' },
  { title: 'Última hora', value: '1h' },
  { title: 'Últimas 3 horas', value: '3h' }
]

// Computed properties para filtros ativos
const hasActiveFilters = computed(() => {
  return filters.value.status !== '' ||
         filters.value.emailDomain !== '' ||
         filters.value.activityTime !== '' ||
         filters.value.excludeCurrentUser
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.status !== '') count++
  if (filters.value.emailDomain !== '') count++
  if (filters.value.activityTime !== '') count++
  if (filters.value.excludeCurrentUser) count++
  return count
})

watch(currentUser, (user) => {
  if (user && !socket.value) {
    socket.value = connectSocket({
      userId: user.uid,
      displayName: user.displayName,
      email: user.email
    })
  }
})

onMounted(() => {
  userStore.fetchUsers()
  if (currentUser.value?.uid && !socket.value) {
    socket.value = connectSocket({
      userId: currentUser.value.uid,
      displayName: currentUser.value.displayName,
      email: currentUser.value.email
    })
  }
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
})

// Usuários filtrados com busca e ordenação
const filteredUsers = computed(() => {
  let users = userStore.users || []
  
  // Aplicar filtro de busca
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    users = users.filter(user =>
      user.displayName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term)
    )
  }
  
  // Aplicar filtro de status
  if (filters.value.status) {
    users = users.filter(user => user.status === filters.value.status)
  }
  
  // Aplicar filtro de domínio de email
  if (filters.value.emailDomain) {
    const domain = filters.value.emailDomain.toLowerCase()
    users = users.filter(user =>
      user.email?.toLowerCase().includes(`@${domain}`) ||
      user.email?.toLowerCase().endsWith(`@${domain}`)
    )
  }
  
  // Aplicar filtro de tempo de atividade
  if (filters.value.activityTime) {
    const now = new Date()
    let timeThreshold = 0
    
    switch (filters.value.activityTime) {
      case '5min':
        timeThreshold = 5 * 60 * 1000
        break
      case '15min':
        timeThreshold = 15 * 60 * 1000
        break
      case '1h':
        timeThreshold = 60 * 60 * 1000
        break
      case '3h':
        timeThreshold = 3 * 60 * 60 * 1000
        break
    }
    
    users = users.filter(user => {
      if (!user.lastActive) return false
      const lastActiveTime = user.lastActive instanceof Date ?
        user.lastActive.getTime() :
        new Date(user.lastActive).getTime()
      return (now.getTime() - lastActiveTime) <= timeThreshold
    })
  }
  
  // Excluir usuário atual se necessário
  if (filters.value.excludeCurrentUser && currentUser.value) {
    users = users.filter(user => user.uid !== currentUser.value.uid)
  }
  
  // Aplicar ordenação
  users = users.slice().sort((a, b) => {
    switch (filters.value.sortBy) {
      case 'name-desc':
        return b.displayName?.localeCompare(a.displayName) || 0
      case 'status-asc':
        if (a.status === b.status) return a.displayName?.localeCompare(b.displayName) || 0
        return a.status === 'disponivel' ? -1 : 1
      case 'status-desc':
        if (a.status === b.status) return a.displayName?.localeCompare(b.displayName) || 0
        return a.status === 'disponivel' ? 1 : -1
      case 'lastActive-desc':
        return (b.lastActive?.getTime() || 0) - (a.lastActive?.getTime() || 0)
      case 'lastActive-asc':
        return (a.lastActive?.getTime() || 0) - (b.lastActive?.getTime() || 0)
      default: // name-asc
        return a.displayName?.localeCompare(b.displayName) || 0
    }
  })
  
  return users
})

const handleSearch = () => {
  // Busca é feita automaticamente pelo computed filteredUsers
}

const clearFilters = () => {
  searchTerm.value = ''
  filters.value = {
    status: '',
    sortBy: 'name-asc',
    emailDomain: '',
    activityTime: '',
    excludeCurrentUser: false
  }
}

const refreshUsers = () => {
  userStore.fetchUsers()
}

const getStatusColor = (status: string) => {
  return status === 'disponivel' ? 'success' : 'warning'
}

const getStatusLabel = (status: string) => {
  return status === 'disponivel' ? 'Disponível' : 'Treinando'
}

// Função para formatar data da última atividade
const formatLastActive = (lastActive: any) => {
  if (!lastActive) return 'Nunca'
  
  const date = lastActive instanceof Date ? lastActive : new Date(lastActive)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Agora mesmo'
  if (diffMins < 60) return `Há ${diffMins} min`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Há ${diffHours} h`
  
  const diffDays = Math.floor(diffHours / 24)
  return `Há ${diffDays} dia(s)`
}
</script>

<style scoped>
@media (max-width: 700px) {
  .mx-auto {
    margin-inline: 0 !important;
    max-width: 100% !important;
  }
}
</style>
