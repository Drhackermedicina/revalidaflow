<template>
  <VContainer fluid class="candidate-selection-container pa-4">
    <VRow justify="center">
      <VCol cols="12" sm="10" md="8" lg="6">
        <!-- Card Principal -->
        <VCard
          class="candidate-selection-card"
          elevation="8"
          :loading="isLoadingCandidateSearch"
        >
          <!-- Header -->
          <VCardTitle class="text-center pa-6 bg-primary text-white">
            <VIcon icon="ri-user-search-line" size="32" class="mb-2" />
            <h2 class="text-h4 font-weight-bold mb-2">Seleção de Candidato</h2>
            <p class="text-body-1 mb-0">Busque e selecione um candidato para continuar</p>
          </VCardTitle>

          <VCardText class="pa-6">
            <!-- Campo de Busca -->
            <VTextField
              v-model="candidateSearchQuery"
              label="Buscar candidato"
              placeholder="Digite o nome, CPF ou email do candidato"
              prepend-inner-icon="ri-search-line"
              clearable
              variant="outlined"
              density="comfortable"
              class="mb-4"
              @input="handleSearchInput"
              @keyup.enter="searchCandidates"
              :loading="isLoadingCandidateSearch"
              :disabled="!!selectedCandidate"
            />

            <!-- Botão para trocar candidato (quando já há um selecionado) -->
            <div v-if="selectedCandidate" class="selected-candidate-info mb-4">
              <VAlert
                type="success"
                variant="tonal"
                prominent
                class="mb-4"
              >
                <template #prepend>
                  <VIcon icon="ri-user-check-line" />
                </template>
                <div>
                  <strong>Candidato Selecionado:</strong><br>
                  {{ selectedCandidate.nome }} {{ selectedCandidate.sobrenome }}
                  <span v-if="selectedCandidate.cpf">- CPF: {{ formatCPF(selectedCandidate.cpf) }}</span>
                </div>
              </VAlert>

              <VBtn
                color="warning"
                variant="tonal"
                block
                prepend-icon="ri-refresh-line"
                @click="clearCandidateSelection"
                class="mb-4"
              >
                Trocar Candidato
              </VBtn>
            </div>

            <!-- Lista de Sugestões -->
            <div v-if="showCandidateSuggestions && !selectedCandidate" class="suggestions-container">
              <VList
                density="compact"
                class="suggestions-list"
                max-height="300"
                elevation="2"
                rounded
              >
                <VListItem
                  v-for="candidate in candidateSearchSuggestions"
                  :key="candidate.uid"
                  class="candidate-item"
                  @click="selectCandidateWithRedirect(candidate)"
                >
                  <template #prepend>
                    <VAvatar
                      :image="candidate.photoURL"
                      :color="stringToColor(candidate.nome + candidate.sobrenome)"
                      size="40"
                      class="me-3"
                    >
                      <VIcon v-if="!candidate.photoURL" icon="ri-user-line" />
                    </VAvatar>
                  </template>

                  <VListItemTitle class="font-weight-medium">
                    {{ candidate.nome }} {{ candidate.sobrenome }}
                  </VListItemTitle>
                  
                  <VListItemSubtitle>
                    <div v-if="candidate.cpf">CPF: {{ formatCPF(candidate.cpf) }}</div>
                    <div>{{ candidate.email }}</div>
                    <div v-if="candidate.instituicao" class="text-caption">
                      Instituição: {{ candidate.instituicao }}
                    </div>
                  </VListItemSubtitle>

                  <template #append>
                    <VBtn
                      icon="ri-arrow-right-line"
                      variant="text"
                      color="primary"
                      size="small"
                    />
                  </template>
                </VListItem>

                <VListItem v-if="candidateSearchSuggestions.length === 0">
                  <VListItemTitle class="text-center text-medium-emphasis">
                    Nenhum candidato encontrado
                  </VListItemTitle>
                </VListItem>
              </VList>
            </div>

            <!-- Mensagem de estado vazio -->
            <div
              v-if="!candidateSearchQuery && !selectedCandidate"
              class="empty-state text-center py-8"
            >
              <VIcon
                icon="ri-search-eye-line"
                size="64"
                color="grey-lighten-1"
                class="mb-4"
              />
              <p class="text-body-1 text-medium-emphasis mb-0">
                Digite acima para buscar um candidato
              </p>
            </div>

            <!-- Mensagem de erro -->
            <VAlert
              v-if="searchError"
              type="error"
              variant="tonal"
              class="mt-4"
            >
              {{ searchError }}
            </VAlert>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCandidateSearch } from '@/composables/useCandidateSearch.js'
import { currentUser } from '@/plugins/auth.js'

const router = useRouter()

// Estado local
const searchError = ref('')

// Usar o composable de busca de candidatos
const {
  selectedCandidate,
  candidateSearchQuery,
  candidateSearchSuggestions,
  showCandidateSuggestions,
  isLoadingCandidateSearch,
  searchCandidates,
  selectCandidate,
  clearCandidateSelection
} = useCandidateSearch(currentUser)

// Métodos
const handleSearchInput = () => {
  // Limpar erro de busca
  searchError.value = ''
  
  // Se o campo estiver vazio, limpar sugestões
  if (!candidateSearchQuery.value?.trim()) {
    candidateSearchSuggestions.value = []
    showCandidateSuggestions.value = false
    return
  }
  
  // Buscar candidatos com debounce
  setTimeout(() => {
    if (candidateSearchQuery.value?.trim()) {
      performSearch()
    }
  }, 300)
}

const performSearch = async () => {
  try {
    searchError.value = ''
    await searchCandidates()
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error)
    searchError.value = 'Erro ao buscar candidatos. Tente novamente.'
  }
}

const handleCandidateSelection = async (candidate) => {
  try {
    await selectCandidate(candidate)
    
    // Salvar no sessionStorage
    sessionStorage.setItem('selectedCandidate', JSON.stringify(candidate))
    
    // Redirecionar para a lista de estações
    router.push('/app/station-list')
  } catch (error) {
    console.error('Erro ao selecionar candidato:', error)
    searchError.value = 'Erro ao selecionar candidato. Tente novamente.'
  }
}

const formatCPF = (cpf) => {
  if (!cpf) return ''
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '')
  // Formata como XXX.XXX.XXX-XX
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const stringToColor = (str) => {
  if (!str) return 'grey'
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 60%)`
}

// Sobrescrever o método selectCandidate do composable para incluir redirecionamento
const originalSelectCandidate = selectCandidate
const selectCandidateWithRedirect = async (candidate) => {
  await originalSelectCandidate(candidate)
  await handleCandidateSelection(candidate)
}

// Lifecycle
onMounted(() => {
  // Verificar se já existe um candidato selecionado no sessionStorage
  const savedCandidate = sessionStorage.getItem('selectedCandidate')
  if (savedCandidate) {
    try {
      const candidate = JSON.parse(savedCandidate)
      selectedCandidate.value = candidate
      candidateSearchQuery.value = `${candidate.nome} ${candidate.sobrenome}`.trim()
    } catch (error) {
      console.error('Erro ao carregar candidato salvo:', error)
      sessionStorage.removeItem('selectedCandidate')
    }
  }
})

// Watch para redirecionar automaticamente quando um candidato for selecionado
watch(selectedCandidate, (newValue) => {
  if (newValue) {
    // Salvar no sessionStorage
    sessionStorage.setItem('selectedCandidate', JSON.stringify(newValue))
    
    // Redirecionar para a lista de estações
    router.push('/app/station-list')
  }
}, { deep: true })
</script>

<style scoped>
.candidate-selection-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.candidate-selection-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.selected-candidate-info {
  animation: fadeIn 0.3s ease-in-out;
}

.suggestions-container {
  animation: slideDown 0.3s ease-in-out;
}

.suggestions-list {
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: white;
}

.candidate-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.candidate-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.empty-state {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsividade */
@media (max-width: 600px) {
  .candidate-selection-container {
    padding: 12px;
  }
  
  .candidate-selection-card {
    border-radius: 12px;
  }
}
</style>