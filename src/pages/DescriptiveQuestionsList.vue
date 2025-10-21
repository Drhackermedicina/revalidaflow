<template>
  <VContainer class="descriptive-questions-container px-0" fluid>
    <!-- Header da Página -->
    <VRow class="mb-6">
      <VCol cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold text-primary mb-2">
              📝 Questões Descritivas de Residência
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Pratique questões discursivas e receba feedback personalizado
            </p>
          </div>
          <VChip v-if="!isLoading" color="primary" variant="outlined" size="large">
            {{ questoesFiltradas.length }} questões encontradas
            <span v-if="totalPages > 1" class="ms-2">
              (Página {{ currentPage }}/{{ totalPages }})
            </span>
          </VChip>
        </div>
      </VCol>
    </VRow>

    <!-- Card de Filtros -->
    <VCard class="filter-card mb-6" elevation="2">
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-filter-variant" class="me-2"></VIcon>
        Filtros de Busca
      </VCardTitle>
      <VCardText>
        <VRow>
          <!-- Filtro de Ano -->
          <VCol cols="12" sm="6" md="4" lg="2">
            <VSelect
              v-model="filtroAno"
              :items="anosDisponiveis"
              label="Ano"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar"
            />
          </VCol>

          <!-- Filtro de Especialidade -->
          <VCol cols="12" sm="6" md="4" lg="3">
            <VSelect
              v-model="filtroEspecialidade"
              :items="especialidadesDisponiveis"
              label="Especialidade"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-medical-bag"
            />
          </VCol>

          <!-- Filtro de Tema/Doença -->
          <VCol cols="12" sm="8" md="6" lg="4">
            <VTextField
              v-model="filtroTemaDoenca"
              label="Buscar Tema/Doença"
              placeholder="Ex: Pneumonia, Diabetes, Infarto"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
            />
          </VCol>

          <!-- Botão de Recarregar -->
          <VCol cols="12" sm="4" md="12" lg="1" class="d-flex align-center">
            <VBtn
              @click="recarregarQuestoes"
              color="primary"
              variant="outlined"
              density="compact"
              :loading="isReloading"
              icon="mdi-refresh"
              title="Recarregar questões"
              block
              class="d-sm-none d-md-block d-lg-inline"
            />
            <VBtn
              @click="recarregarQuestoes"
              color="primary"
              variant="outlined"
              density="compact"
              :loading="isReloading"
              prepend-icon="mdi-refresh"
              title="Recarregar questões"
              class="d-none d-sm-flex d-md-none"
            >
              Recarregar
            </VBtn>
          </VCol>

          <!-- Botão Criar Nova Questão (apenas admin) -->
          <VCol v-if="isAdmin" cols="12" sm="4" md="12" lg="2" class="d-flex align-center">
            <VBtn
              @click="criarNovaQuestao"
              color="success"
              variant="elevated"
              density="compact"
              prepend-icon="mdi-plus"
              title="Criar nova questão descritiva"
              block
            >
              Nova Questão
            </VBtn>
          </VCol>
        </VRow>

        <!-- Chips de Filtros Ativos -->
        <VRow v-if="filtrosAtivos.length > 0" class="mt-2">
          <VCol cols="12">
            <div class="d-flex flex-wrap gap-2">
              <VChip
                v-for="filtro in filtrosAtivos"
                :key="filtro.key"
                closable
                size="small"
                color="primary"
                variant="outlined"
                @click:close="removerFiltro(filtro.key)"
              >
                {{ filtro.label }}: {{ filtro.value }}
              </VChip>
            </div>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="min-height: 200px;">
      <VProgressCircular indeterminate color="primary" size="64"></VProgressCircular>
    </div>

    <!-- Error State -->
    <VAlert v-else-if="errorMsg" type="error" class="mb-6">
      <VAlertTitle>Erro ao carregar questões</VAlertTitle>
      {{ errorMsg }}
    </VAlert>

    <!-- Empty State -->
    <VAlert v-else-if="questoesFiltradas.length === 0" type="info" class="mb-6">
      <VAlertTitle>Nenhuma questão encontrada</VAlertTitle>
      Tente ajustar os filtros ou verificar se há questões disponíveis no sistema.
    </VAlert>

    <!-- Lista de Questões Paginadas -->
    <div v-else>
      <VCard
        v-for="(question, index) in questoesPaginadas"
        :key="question.id"
        class="question-card mb-6"
        elevation="3"
      >
        <!-- Header da Questão -->
        <VCardItem>
          <div class="d-flex justify-space-between align-start flex-column flex-sm-row gap-3">
            <div class="d-flex gap-2 flex-wrap">
              <VChip color="primary" size="small">{{ question.year }}</VChip>
              <VChip v-if="question.specialty" color="success" size="small" variant="outlined">
                {{ question.specialty }}
              </VChip>
              <VChip v-if="question.topic" color="warning" size="small" variant="outlined">
                {{ question.topic }}
              </VChip>
            </div>

            <!-- Botão de Editar para Admins -->
            <VBtn
              v-if="isAdmin"
              @click="editQuestion(question.id)"
              icon="mdi-pencil"
              size="small"
              variant="outlined"
              color="primary"
            />
          </div>
        </VCardItem>

        <!-- Enunciado da Questão -->
        <VCardText>
          <div class="text-h6 mb-4 question-text">
            <strong>Questão {{ ((currentPage - 1) * itemsPerPage) + index + 1 }}:</strong> {{ question.question }}
          </div>

          <!-- Imagens da Questão -->
          <div v-if="question.images && question.images.length > 0" class="mb-4">
            <VRow>
              <VCol
                v-for="(imagem, imgIndex) in question.images"
                :key="imgIndex"
                cols="12"
                md="6"
              >
                <VImg
                  :src="imagem"
                  :alt="`Imagem da questão ${index + 1}`"
                  class="rounded"
                  max-height="300"
                  cover
                />
              </VCol>
            </VRow>
          </div>

          <!-- Botão de Responder -->
          <div class="d-flex justify-center mt-4">
            <VBtn
              @click="responderQuestao(question)"
              color="primary"
              size="large"
              variant="elevated"
              prepend-icon="mdi-pencil"
            >
              Responder Questão
            </VBtn>
          </div>
        </VCardText>
      </VCard>

      <!-- Controles de Paginação -->
      <VCard v-if="totalPages > 1" class="pagination-card mt-6" elevation="2">
        <VCardText>
          <div class="d-flex justify-center align-center">
            <VPagination
              v-model="currentPage"
              :length="totalPages"
              :total-visible="$vuetify.display.mobile ? 3 : 5"
              color="primary"
              class="pagination-controls"
              @update:modelValue="onPageChange"
            />
          </div>

          <!-- Informações da página -->
          <div class="text-center mt-3 text-caption text-medium-emphasis">
            Mostrando {{ ((currentPage - 1) * itemsPerPage) + 1 }} -
            {{ Math.min(currentPage * itemsPerPage, questoesFiltradas.length) }}
            de {{ questoesFiltradas.length }} questões
          </div>

          <!-- Navegação rápida para mobile -->
          <div class="d-flex justify-center gap-2 mt-3 d-sm-none">
            <VBtn
              :disabled="currentPage === 1"
              @click="currentPage = 1"
              size="small"
              variant="outlined"
              icon="mdi-page-first"
            />
            <VBtn
              :disabled="currentPage === 1"
              @click="currentPage--"
              size="small"
              variant="outlined"
              icon="mdi-chevron-left"
            />
            <VBtn
              :disabled="currentPage === totalPages"
              @click="currentPage++"
              size="small"
              variant="outlined"
              icon="mdi-chevron-right"
            />
            <VBtn
              :disabled="currentPage === totalPages"
              @click="currentPage = totalPages"
              size="small"
              variant="outlined"
              icon="mdi-page-last"
            />
          </div>
        </VCardText>
      </VCard>
    </div>
  </VContainer>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore'
import { db } from '@/plugins/firebase'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

// Composables e stores
const { canEditStations } = useUserStore()
const router = useRouter()

// Estados reativos
const questions = ref([])
const isLoading = ref(true)
const isReloading = ref(false)
const errorMsg = ref('')

// Estados de paginação
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = ref(0)

// Filtros
const filtroAno = ref('')
const filtroEspecialidade = ref('')
const filtroTemaDoenca = ref('')

// Computed para questões filtradas
const questoesFiltradas = computed(() => {
  let filtradas = [...questions.value]

  if (filtroAno.value) {
    filtradas = filtradas.filter(q => q.year === filtroAno.value)
  }

  if (filtroEspecialidade.value) {
    filtradas = filtradas.filter(q => q.specialty === filtroEspecialidade.value)
  }

  if (filtroTemaDoenca.value) {
    const tema = filtroTemaDoenca.value.toLowerCase()
    filtradas = filtradas.filter(q =>
      q.question?.toLowerCase().includes(tema) ||
      q.topic?.toLowerCase().includes(tema) ||
      q.expectedAnswer?.toLowerCase().includes(tema)
    )
  }

  return filtradas
})

// Computed para questões paginadas
const questoesPaginadas = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value
  const endIndex = startIndex + itemsPerPage.value
  const filtradas = questoesFiltradas.value

  // Atualizar total de páginas
  totalPages.value = Math.ceil(filtradas.length / itemsPerPage.value)

  return filtradas.slice(startIndex, endIndex)
})

// Computed para anos disponíveis
const anosDisponiveis = computed(() => {
  const anos = [...new Set(questions.value.map(q => q.year))].sort().reverse()
  return anos.map(ano => ({ title: ano, value: ano }))
})

// Computed para especialidades disponíveis
const especialidadesDisponiveis = computed(() => {
  const especialidades = [...new Set(questions.value.map(q => q.specialty))].filter(Boolean).sort()
  return especialidades.map(especialidade => ({ title: especialidade, value: especialidade }))
})

// Computed para filtros ativos
const filtrosAtivos = computed(() => {
  const ativos = []

  if (filtroAno.value) {
    ativos.push({ key: 'ano', label: 'Ano', value: filtroAno.value })
  }

  if (filtroEspecialidade.value) {
    ativos.push({ key: 'especialidade', label: 'Especialidade', value: filtroEspecialidade.value })
  }

  if (filtroTemaDoenca.value) {
    ativos.push({ key: 'temaDoenca', label: 'Buscar Tema/Doença', value: filtroTemaDoenca.value })
  }

  return ativos
})

// Computed para verificar se é admin
const isAdmin = computed(() => canEditStations.value)

// Métodos
const loadQuestions = async () => {
  try {
    isLoading.value = true
    errorMsg.value = ''

    const querySnapshot = await getDocs(collection(db, 'descriptiveQuestions'))

    const validQuestions = []
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()

      // Validação básica dos campos obrigatórios
      if (data.question && data.year) {
        const question = {
          id: doc.id,
          question: data.question,
          year: data.year,
          specialty: data.specialty || '',
          topic: data.topic || '',
          expectedAnswer: data.expectedAnswer || '',
          images: Array.isArray(data.images) ? data.images : [],
          createdAt: data.createdAt || new Date().toISOString()
        }
        validQuestions.push(question)
      }
    })

    questions.value = validQuestions.sort((a, b) => b.year - a.year)

  } catch (error) {
    console.error('Erro ao carregar questões descritivas:', error)
    errorMsg.value = 'Erro ao carregar questões. Tente novamente.'
  } finally {
    isLoading.value = false
  }
}

const onPageChange = (newPage) => {
  currentPage.value = newPage
  // Scroll para o topo da página quando muda de página
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const removerFiltro = (key) => {
  switch (key) {
    case 'ano':
      filtroAno.value = ''
      break
    case 'especialidade':
      filtroEspecialidade.value = ''
      break
    case 'temaDoenca':
      filtroTemaDoenca.value = ''
      break
  }
  currentPage.value = 1
}

const responderQuestao = (question) => {
  router.push(`/app/descriptive-question/${question.id}`)
}

const editQuestion = (questionId) => {
  router.push(`/app/admin/descriptive-questions/edit/${questionId}`)
}

const criarNovaQuestao = () => {
  router.push('/app/admin/descriptive-questions/new')
}

// Função para recarregar questões manualmente
const recarregarQuestoes = async () => {
  try {
    isReloading.value = true

    // Limpar dados atuais
    questions.value = []
    currentPage.value = 1

    // Recarregar questões
    await loadQuestions()

  } catch (error) {
    console.error('Erro ao recarregar questões:', error)
    errorMsg.value = 'Erro ao recarregar questões: ' + error.message
  } finally {
    isReloading.value = false
  }
}

// Watchers para resetar página quando filtros mudarem
watch([filtroAno, filtroEspecialidade, filtroTemaDoenca], () => {
  currentPage.value = 1
})

// Lifecycle
onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.descriptive-questions-container {
  max-width: 100%;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
}

.descriptive-questions-container h1 {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.descriptive-questions-container .text-subtitle-1 {
  color: rgb(var(--v-theme-on-surface), 0.8) !important;
}

.filter-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.v-theme--dark .filter-card {
  background: linear-gradient(135deg, #312d4b 0%, #3d3759 100%);
  border: 1px solid #4a5072;
}

.question-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
  transition: all 0.3s ease;
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
}

.question-text {
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface)) !important;
  font-weight: 600;
}

.question-text strong {
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 700;
}

.pagination-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.pagination-controls {
  max-width: 100%;
}

/* Responsive pagination */
@media (max-width: 600px) {
  .pagination-controls {
    transform: scale(0.9);
  }
}
</style>
