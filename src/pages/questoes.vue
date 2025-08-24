<template>
  <VContainer class="questoes-container" fluid>
    <!-- Header da Página -->
    <VRow class="mb-6">
      <VCol cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold text-primary mb-2">
              🧠 Banco de Questões de Residência
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Filtre as questões e teste seus conhecimentos médicos
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

          <!-- Filtro de Banca -->
          <VCol cols="12" sm="6" md="4" lg="2">
            <VSelect
              v-model="filtroBanca"
              :items="bancasDisponiveis"
              label="Banca"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-school"
            />
          </VCol>

          <!-- Filtro de Área Principal -->
          <VCol cols="12" sm="6" md="4" lg="3">
            <VSelect
              v-model="filtroArea"
              :items="areasPrincipais"
              label="Área Médica"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-medical-bag"
              @update:modelValue="onAreaChange"
            />
          </VCol>

          <!-- Filtro de Subespecialidade -->
          <VCol cols="12" sm="6" md="6" lg="3">
            <VSelect
              v-model="filtroSubespecialidade"
              :items="subespecialidadesDisponiveis"
              label="Subespecialidade"
              :disabled="!filtroArea"
              clearable
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-stethoscope"
            />
          </VCol>

          <!-- Filtro de Tema/Doença -->
          <VCol cols="12" sm="8" md="6" lg="3">
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
        :class="{ 'question-answered': question.isAnswered }"
      >
        <!-- Header da Questão -->
        <VCardItem>
          <div class="d-flex justify-space-between align-start flex-column flex-sm-row gap-3">
            <div class="d-flex gap-2 flex-wrap">
              <VChip color="primary" size="small">{{ question.banca }}</VChip>
              <VChip color="secondary" size="small">{{ question.ano }}</VChip>
              <VChip v-if="question.especialidade" color="success" size="small" variant="outlined">
                {{ question.especialidade }}
              </VChip>
              <VChip v-if="question.subespecialidade" color="info" size="small" variant="outlined">
                {{ question.subespecialidade }}
              </VChip>
              <!-- Palavras-chave - mais compactas em mobile -->
              <VChip 
                v-if="question.palavrasChaves" 
                color="warning" 
                size="small" 
                variant="outlined"
                class="d-none d-sm-flex"
              >
                <VIcon start size="small" icon="mdi-tag-multiple"></VIcon>
                {{ question.palavrasChaves }}
              </VChip>
              <!-- Versão compacta para mobile -->
              <VChip 
                v-if="question.palavrasChaves" 
                color="warning" 
                size="small" 
                variant="outlined"
                class="d-flex d-sm-none"
              >
                <VIcon size="small" icon="mdi-tag-multiple"></VIcon>
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
            <strong>Questão {{ ((currentPage - 1) * itemsPerPage) + index + 1 }}:</strong> {{ getCleanEnunciado(question.enunciado) }}
          </div>

          <!-- Imagens da Questão -->
          <div v-if="question.imagens && question.imagens.length > 0" class="mb-4">
            <VRow>
              <VCol
                v-for="(imagem, imgIndex) in question.imagens"
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

          <!-- Opções de Resposta (Layout Vertical) -->
          <VRadioGroup
            v-model="question.userAnswer"
            :disabled="question.isAnswered"
            class="mt-4"
          >
            <div
              v-for="(opcao, index) in getFormattedOptions(question)"
              :key="opcao.letra"
              class="mb-2"
            >
              <VCard
                :class="getOptionCardClass(question, opcao.letra)"
                :elevation="question.userAnswer === opcao.letra && !question.isAnswered ? 3 : 1"
                class="option-card pa-3"
              >
                <div class="d-flex align-start">
                  <VRadio
                    :value="opcao.letra"
                    color="primary"
                    class="me-3 mt-n1"
                  />
                  <div class="flex-grow-1">
                    <span class="font-weight-bold text-uppercase me-2">{{ opcao.letra }})</span>
                    <span class="option-text">{{ removeTeacherNote(opcao.texto) }}</span>
                  </div>
                  <!-- Ícone de resultado -->
                  <VIcon
                    v-if="question.isAnswered"
                    :icon="getOptionIcon(question, opcao.letra)"
                    :color="getOptionIconColor(question, opcao.letra)"
                    size="small"
                    class="ms-2"
                  />
                </div>
              </VCard>
            </div>
          </VRadioGroup>

          <!-- Botão de Verificação -->
          <div class="d-flex justify-center mt-4">
            <VBtn
              v-if="!question.isAnswered"
              @click="checkAnswer(question)"
              :disabled="!question.userAnswer"
              color="primary"
              size="large"
              variant="elevated"
              prepend-icon="mdi-check-circle"
            >
              Verificar Resposta
            </VBtn>
          </div>

          <!-- Resultado da Resposta -->
          <VAlert
            v-if="question.isAnswered"
            :type="question.isCorrect ? 'success' : 'error'"
            class="mt-4"
            variant="tonal"
          >
            <VAlertTitle>
              {{ question.isCorrect ? '🎉 Parabéns! Resposta Correta!' : '❌ Resposta Incorreta' }}
            </VAlertTitle>
            <div v-if="!question.isCorrect">
              A resposta correta era: <strong>{{ question.respostaCorreta.toUpperCase() }}</strong>
            </div>
            <div v-if="question.explicacao" class="mt-2">
              <strong>Explicação:</strong> {{ question.explicacao }}
            </div>
          </VAlert>
        </VCardText>

        <!-- Seção de Comentários -->
        <VExpansionPanels v-if="question.isAnswered" variant="accordion">
          <VExpansionPanel>
            <VExpansionPanelTitle>
              <VIcon icon="mdi-comment-multiple" class="me-2"></VIcon>
              Comentário da questão
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <!-- Comentário do Professor -->
              <div v-if="question.commentsprofessor" class="professor-comment mb-4">
                <div class="d-flex align-center justify-space-between">
                  <div class="font-weight-bold text-primary">
                    <VIcon icon="mdi-school" class="me-2"></VIcon>
                    Comentário do Professor
                  </div>
                  <VBtn
                    v-if="isAdmin"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="editProfessorComment(question)"
                  />
                </div>
                <VCard class="mt-2 pa-3" color="primary" variant="outlined">
                  {{ question.commentsprofessor }}
                </VCard>
              </div>

              <!-- Editor de Comentário do Professor (apenas admin) -->
              <div v-if="isAdmin && question.isEditingProfessorComment" class="mb-4">
                <VTextarea
                  v-model="question.newProfessorComment"
                  label="Editar comentário do professor"
                  rows="3"
                  variant="outlined"
                  class="mb-2"
                />
                <div class="d-flex gap-2">
                  <VBtn
                    color="primary"
                    @click="saveProfessorComment(question)"
                    :loading="question.isSavingProfessorComment"
                  >
                    Salvar
                  </VBtn>
                  <VBtn
                    color="error"
                    variant="outlined"
                    @click="question.isEditingProfessorComment = false"
                  >
                    Cancelar
                  </VBtn>
                </div>
              </div>

              <!-- Lista de Comentários dos Usuários -->
              <div v-if="question.comments && question.comments.length > 0" class="mb-4">
                <VCard
                  v-for="(comment, commentIndex) in question.comments"
                  :key="commentIndex"
                  variant="outlined"
                  class="mb-3"
                >
                  <VCardText class="pb-2">
                    <div class="d-flex align-center mb-2">
                      <VAvatar size="32" color="primary" class="me-2">
                        {{ comment.author.charAt(0).toUpperCase() }}
                      </VAvatar>
                      <span class="font-weight-medium">{{ comment.author }}</span>
                    </div>
                    <p class="text-body-2 mb-0">{{ comment.text }}</p>
                  </VCardText>
                </VCard>
              </div>

              <!-- Adicionar Novo Comentário -->
              <div class="d-flex gap-2">
                <VTextField
                  v-model="question.newComment"
                  label="Adicione um comentário..."
                  variant="outlined"
                  density="compact"
                  class="flex-grow-1"
                  :disabled="question.isAddingComment"
                  @keyup.enter="addComment(question)"
                />
                <VBtn
                  @click="addComment(question)"
                  :disabled="!question.newComment?.trim() || question.isAddingComment"
                  :loading="question.isAddingComment"
                  color="primary"
                  icon="mdi-send"
                />
              </div>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
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
import { useAuth } from '@/composables/useAuth'
import { db } from '@/plugins/firebase'
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

// Composables e stores
const authStore = useAuth()
const router = useRouter()

// Função de debounce para otimizar performance
function debounce(func, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Remove a nota do professor do texto da opção
function removeTeacherNote(texto) {
  if (!texto) return '';
  const noteIndex = texto.indexOf('Essa questão possui comentário do professor no site');
  if (noteIndex !== -1) {
    return texto.substring(0, noteIndex).trim();
  }
  return texto;
}

// Função para formatar opções de questões
// Suporta tanto formato antigo {A: "texto"} quanto novo [{letra: "A", texto: "texto"}]
function getFormattedOptions(question) {
  if (!question || !question.opcoes) return [];
  
  // Se já é um array, retorna direto
  if (Array.isArray(question.opcoes)) {
    const options = [...question.opcoes];
    // Remove a nota do professor de todas as opções
    options.forEach(opt => {
      opt.texto = removeTeacherNote(opt.texto);
    });
    return options;
  }
  
  // Converte formato antigo para novo
  return Object.entries(question.opcoes).map(([letra, texto]) => ({
    letra,
    texto: removeTeacherNote(texto)
  }));
}

// Estados reativo
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
const filtroBanca = ref('')
const filtroArea = ref('')
const filtroSubespecialidade = ref('')
const filtroTemaDoenca = ref('')

// Filtros com debounce para otimização
const filtroTemaDoencaDebounced = ref('')

// Debounce para filtros de texto
const debouncedTemaDoenca = debounce((value) => {
  filtroTemaDoencaDebounced.value = value
}, 300)

// Watchers para aplicar debounce
watch(filtroTemaDoenca, (newValue) => {
  debouncedTemaDoenca(newValue)
  resetPage()
})

// Watchers para resetar página quando filtros mudarem
watch([filtroAno, filtroBanca, filtroArea, filtroSubespecialidade], () => {
  resetPage()
})

// Estrutura das especialidades principais do REVALIDA (atualizada)
const especialidadesMedicas = {
  'Clínica Médica': [
    'Cardiologia',
    'Neurologia',
    'Endocrinologia',
    'Pneumologia',
    'Gastroenterologia',
    'Nefrologia',
    'Reumatologia',
    'Hematologia',
    'Oncologia',
    'Dermatologia',
    'Infectologia',
    'Medicina Interna',
    'Geriatria',
    'Imunologia',
    'Psiquiatria'
  ],
  'Cirurgia': [
    'Cirurgia Vascular',
    'Urologia',
    'Ortopedia',
    'Neurocirurgia',
    'Cirurgia Plástica',
    'Cirurgia Torácica',
    'Cirurgia Cardíaca',
    'Cirurgia do Aparelho Digestivo',
    'Coloproctologia',
    'Cirurgia Oncológica'
  ],
  'Pediatria': [
    'Neonatologia',
    'Cardiologia Pediátrica',
    'Neurologia Pediátrica',
    'Endocrinologia Pediátrica',
    'Pneumologia Pediátrica',
    'Gastroenterologia Pediátrica',
    'Nefrologia Pediátrica',
    'Hemato-oncologia Pediátrica',
    'Infectologia Pediátrica'
  ],
  'Ginecologia & Obstetrícia': [
    'Ginecologia',
    'Obstetrícia',
    'Reprodução Humana',
    'Oncologia Ginecológica',
    'Mastologia',
    'Endoscopia Ginecológica',
    'Medicina Fetal',
    'Climatério'
  ],
  'Medicina da Família e Comunidade': [
    'Medicina Preventiva',
    'Saúde Coletiva',
    'Epidemiologia',
    'Medicina do Trabalho',
    'Medicina Comunitária',
    'Atenção Primária',
    'Saúde Pública',
    'Medicina Social'
  ]
}

// Computed para áreas principais
const areasPrincipais = computed(() => {
  // ✅ ESPECIALIDADES REAIS: Apenas as 5 que existem nos dados
  return [
    'Clínica Médica',
    'Cirurgia',
    'Ginecologia & Obstetrícia',
    'Pediatria',
    'Medicina da Família e Comunidade'
  ].sort()
})

// Computed para subespecialidades disponíveis
const subespecialidadesDisponiveis = computed(() => {
  if (!filtroArea.value) return []
  return especialidadesMedicas[filtroArea.value] || []
})

// Computed para anos disponíveis
const anosDisponiveis = computed(() => {
  const anos = [...new Set(questions.value.map(q => q.ano))].sort().reverse()
  return anos.map(ano => ({ title: ano, value: ano }))
})

// Computed para bancas disponíveis
const bancasDisponiveis = computed(() => {
  const bancas = [...new Set(questions.value.map(q => q.banca))].sort()
  return bancas.map(banca => ({ title: banca, value: banca }))
})

// Computed para questões filtradas
const questoesFiltradas = computed(() => {
  let filtradas = [...questions.value]

  if (filtroAno.value) {
    filtradas = filtradas.filter(q => q.ano === filtroAno.value)
  }

  if (filtroBanca.value) {
    filtradas = filtradas.filter(q => q.banca === filtroBanca.value)
  }

  if (filtroArea.value) {
    filtradas = filtradas.filter(q => {
      // ✅ BUSCA APENAS NO CAMPO "especialidade" 
      const questionEspecialidade = q.especialidade
      
      // Busca exata primeiro
      if (questionEspecialidade === filtroArea.value) {
        return true
      }
      
      // Busca normalizada (sem acentos) como fallback
      const filtroNormalizado = filtroArea.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const especialidadeNormalizada = questionEspecialidade?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      
      return especialidadeNormalizada === filtroNormalizado
    })
  }

  if (filtroSubespecialidade.value) {
    filtradas = filtradas.filter(q => {
      // ✅ CORREÇÃO: Buscar no campo correto de subespecialidade
      const questionSubespecialidade = q['sub-especialidade'] || q.subespecialidade
      return questionSubespecialidade === filtroSubespecialidade.value
    })
  }

  if (filtroTemaDoencaDebounced.value) {
    const tema = filtroTemaDoencaDebounced.value.toLowerCase()
    filtradas = filtradas.filter(q => {
      // ✅ BUSCA EXPANDIDA: múltiplos campos
      const matchTemaDoenca = q.temaDoença?.toLowerCase().includes(tema)
      const matchTema = q.tema?.toLowerCase().includes(tema)
      const matchEnunciado = q.enunciado?.toLowerCase().includes(tema)
      
      // ✅ CORREÇÃO: palavrasChaves pode ser array ou string
      let matchPalavrasChaves = false
      if (q.palavrasChaves) {
        if (Array.isArray(q.palavrasChaves)) {
          matchPalavrasChaves = q.palavrasChaves.some(palavra => 
            palavra?.toLowerCase().includes(tema)
          )
        } else if (typeof q.palavrasChaves === 'string') {
          matchPalavrasChaves = q.palavrasChaves.toLowerCase().includes(tema)
        }
      }
      
      // Busca nas opções
      let matchOpcoes = false
      if (q.opcoes) {
        if (Array.isArray(q.opcoes)) {
          matchOpcoes = q.opcoes.some(opcao => 
            opcao.texto?.toLowerCase().includes(tema)
          )
        } else {
          matchOpcoes = Object.values(q.opcoes).some(opcao => 
            opcao.toLowerCase().includes(tema)
          )
        }
      }
      
      return matchTemaDoenca || matchTema || matchEnunciado || matchPalavrasChaves || matchOpcoes
    })
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

// Computed para filtros ativos
const filtrosAtivos = computed(() => {
  const ativos = []
  
  if (filtroAno.value) {
    ativos.push({ key: 'ano', label: 'Ano', value: filtroAno.value })
  }
  
  if (filtroBanca.value) {
    ativos.push({ key: 'banca', label: 'Banca', value: filtroBanca.value })
  }
  
  if (filtroArea.value) {
    ativos.push({ key: 'area', label: 'Área', value: filtroArea.value })
  }
  
  if (filtroSubespecialidade.value) {
    ativos.push({ key: 'subespecialidade', label: 'Subespecialidade', value: filtroSubespecialidade.value })
  }
  
  if (filtroTemaDoenca.value) {
    ativos.push({ key: 'temaDoenca', label: 'Buscar Tema/Doença', value: filtroTemaDoenca.value })
  }
  
  return ativos
})

// Computed para verificar se é admin
const isAdmin = computed(() => authStore.isAdmin)

// Métodos
const loadQuestions = async () => {
  try {
    isLoading.value = true
    errorMsg.value = ''
    
    const querySnapshot = await getDocs(collection(db, 'questoes'))
    
    // Validar e filtrar questões válidas
    const validQuestions = []
    let invalidCount = 0
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data()
      
      // ✅ VALIDAÇÃO APRIMORADA - Campos obrigatórios
      const hasRequiredFields = data.enunciado && data.banca && data.ano
      const hasValidOptions = data.opcoes && (Array.isArray(data.opcoes) || typeof data.opcoes === 'object')
      const hasCorrectAnswer = data.respostaCorreta
      
      if (hasRequiredFields && hasValidOptions && hasCorrectAnswer) {
        // ✅ CORREÇÃO FINAL: Priorizar data.id se existir, senão usar doc.id
        const questionId = data.id || doc.id
        
        // ✅ VALIDAÇÃO DE DADOS - Sanitizar e normalizar
        const sanitizedQuestion = {
          id: questionId,  // ← ID preferencial (data.id primeiro)
          firebaseDocId: doc.id,  // ← ID real do documento (backup)
          originalId: data.id || doc.id,  // ← ID original dos dados (backup)
          
          // Campos obrigatórios sanitizados
          enunciado: data.enunciado?.trim() || '',
          banca: data.banca?.trim() || '',
          ano: data.ano || new Date().getFullYear(),
          opcoes: data.opcoes || [],
          respostaCorreta: data.respostaCorreta?.trim() || '',
          
          // Campos opcionais com valores padrão
          especialidade: data.especialidade?.trim() || '',
          area: data.area || '',
          subespecialidade: data.subespecialidade?.trim() || '',
          temaDoenca: data.temaDoenca?.trim() || '',
          palavrasChaves: Array.isArray(data.palavrasChaves) ? data.palavrasChaves.join(', ') : (data.palavrasChaves?.trim() || ''),
          imagens: Array.isArray(data.imagens) ? data.imagens : [],
          
          // Campos do sistema
          comments: Array.isArray(data.comments) ? data.comments : [],
          commentsprofessor: data.commentsprofessor?.trim() || '',
          
          // Estados da interface
          userAnswer: null,
          isAnswered: false,
          isCorrect: false,
          newComment: '',
          isEditingProfessorComment: false,
          isSavingProfessorComment: false,
          newProfessorComment: '',
          isAddingComment: false
        }
        
        validQuestions.push(sanitizedQuestion)
      } else {
        invalidCount++
        console.warn(`Questão inválida encontrada: ${doc.id}`, {
          hasRequiredFields,
          hasValidOptions,
          hasCorrectAnswer,
          data
        })
      }
    })
    
    questions.value = validQuestions
    
    // ✅ FEEDBACK MELHORADO - Informações detalhadas sobre carregamento
    console.log(`✅ ${validQuestions.length} questões válidas carregadas`)
    if (invalidCount > 0) {
      console.warn(`⚠️ ${invalidCount} questões inválidas foram filtradas`)
      
      // Notificar usuário sobre questões inválidas se for admin
      if (isAdmin.value && invalidCount > 0) {
        console.info(`ℹ️ Admin: ${invalidCount} questões possuem dados incompletos e foram omitidas da lista`)
      }
    }
    
    // Feedback sobre total de dados carregados
    const totalDocs = querySnapshot.docs.length
    console.log(`📊 Estatísticas: ${validQuestions.length}/${totalDocs} questões carregadas (${Math.round((validQuestions.length/totalDocs)*100)}% válidas)`)
    
  } catch (error) {
    console.error('Erro ao carregar questões:', error)
    errorMsg.value = 'Erro ao carregar questões. Tente novamente.'
  } finally {
    isLoading.value = false
  }
}

const onAreaChange = () => {
  // Limpa a subespecialidade quando a área muda
  filtroSubespecialidade.value = ''
  // Reset página quando filtro muda
  currentPage.value = 1
}

const onPageChange = (newPage) => {
  currentPage.value = newPage
  // Scroll para o topo da página quando muda de página
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Reset página quando qualquer filtro muda
const resetPage = () => {
  currentPage.value = 1
}

const removerFiltro = (key) => {
  switch (key) {
    case 'ano':
      filtroAno.value = ''
      break
    case 'banca':
      filtroBanca.value = ''
      break
    case 'area':
      filtroArea.value = ''
      filtroSubespecialidade.value = '' // Limpa também a subespecialidade
      break
    case 'subespecialidade':
      filtroSubespecialidade.value = ''
      break
    case 'temaDoenca':
      filtroTemaDoenca.value = ''
      break
  }
}

// Função para limpar o enunciado de palavras-chave
const getCleanEnunciado = (enunciado) => {
  if (!enunciado) return ''
  
  // Encontra a primeira ocorrência de texto que parece ser o verdadeiro enunciado
  // Procura por padrões como "Paciente", "Sobre", "Analise", etc
  const startPatterns = [
    'Paciente',
    'Sobre',
    'Analise',
    'Em relação',
    'Considere',
    'Uma paciente',
    'Um paciente'
  ]
  
  for (const pattern of startPatterns) {
    const index = enunciado.indexOf(pattern)
    if (index !== -1) {
      return enunciado.substring(index)
    }
  }
  
  // Se não encontrar nenhum padrão, retorna o enunciado original
  return enunciado
}

const checkAnswer = (question) => {
  if (!question.userAnswer) return
  
  question.isAnswered = true
  question.isCorrect = question.userAnswer === question.respostaCorreta
}

const getOptionCardClass = (question, letra) => {
  if (!question.isAnswered) {
    return question.userAnswer === letra ? 'option-selected' : 'option-default'
  }
  
  if (letra === question.respostaCorreta) {
    return 'option-correct'
  }
  
  if (letra === question.userAnswer && letra !== question.respostaCorreta) {
    return 'option-incorrect'
  }
  
  return 'option-default'
}

const getOptionIcon = (question, letra) => {
  if (letra === question.respostaCorreta) {
    return 'mdi-check-circle'
  }
  
  if (letra === question.userAnswer && letra !== question.respostaCorreta) {
    return 'mdi-close-circle'
  }
  
  return ''
}

const getOptionIconColor = (question, letra) => {
  if (letra === question.respostaCorreta) {
    return 'success'
  }
  
  if (letra === question.userAnswer && letra !== question.respostaCorreta) {
    return 'error'
  }
  
  return ''
}

const addComment = async (question) => {
  if (!question.newComment?.trim() || question.isAddingComment) return
  
  try {
    question.isAddingComment = true
    
    // ✅ SOLUÇÃO DEFINITIVA: Buscar questão pelo campo 'id' usando query
    const questoesRef = collection(db, 'questoes')
    const q = query(questoesRef, where('id', '==', question.id))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.error(`Questão não encontrada: ${question.id}`)
      alert(`Erro: Questão ${question.id} não encontrada no banco de dados.\n\nPor favor, recarregue a página.`)
      return
    }
    
    // Pegar o primeiro documento encontrado (deve ser único)
    const docRef = querySnapshot.docs[0].ref
    
    const newComment = {
      text: question.newComment.trim(),
      author: authStore.user?.name || 'Usuário',
      timestamp: new Date().toISOString()
    }
    
    // Atualizar localmente primeiro (UI otimista)
    question.comments.push(newComment)
    const originalComment = question.newComment
    question.newComment = ''
    
    // Atualizar no Firebase usando a referência correta
    await updateDoc(docRef, {
      comments: question.comments
    })
    
    console.log(`Comentário adicionado com sucesso na questão ${question.id}`)
    
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error)
    
    // Reverter mudança local se falhou no Firebase
    if (question.comments.length > 0) {
      question.comments.pop()
    }
    
    // Mostrar erro específico baseado no tipo
    if (error.code === 'not-found') {
      const recarregar = confirm(
        'Questão não encontrada no banco de dados.\n\n' +
        'Deseja recarregar a página para atualizar os dados?'
      )
      if (recarregar) {
        window.location.reload()
      }
    } else if (error.code === 'permission-denied') {
      alert('Erro: Você não tem permissão para adicionar comentários.')
    } else {
      alert('Erro ao salvar comentário. Tente novamente.')
    }
  } finally {
    question.isAddingComment = false
  }
}

const editQuestion = (questionId) => {
  router.push(`/app/edit-questao/${questionId}`)
}

// Funções para gerenciar comentários do professor
const editProfessorComment = (question) => {
  if (!isAdmin.value) return
  question.isEditingProfessorComment = true
  question.newProfessorComment = question.commentsprofessor || ''
}

const saveProfessorComment = async (question) => {
  if (!isAdmin.value) return
  
  try {
    question.isSavingProfessorComment = true
    
    // ✅ SOLUÇÃO DEFINITIVA: Buscar questão pelo campo 'id' usando query
    const questoesRef = collection(db, 'questoes')
    const q = query(questoesRef, where('id', '==', question.id))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.error(`Questão não encontrada: ${question.id}`)
      alert(`Erro: Questão ${question.id} não encontrada no banco de dados.`)
      return
    }
    
    // Pegar o primeiro documento encontrado (deve ser único)
    const docRef = querySnapshot.docs[0].ref
    
    await updateDoc(docRef, {
      commentsprofessor: question.newProfessorComment
    })
    
    question.commentsprofessor = question.newProfessorComment
    question.isEditingProfessorComment = false
    
    console.log(`Comentário do professor salvo com sucesso na questão ${question.id}`)
    
  } catch (error) {
    console.error('Erro ao salvar comentário do professor:', error)
    
    if (error.code === 'not-found') {
      alert('Erro: Questão não encontrada. Por favor, recarregue a página.')
    } else if (error.code === 'permission-denied') {
      alert('Erro: Você não tem permissão para editar comentários do professor.')
    } else {
      alert('Erro ao salvar comentário do professor. Tente novamente.')
    }
  } finally {
    question.isSavingProfessorComment = false
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
    
    console.log('✅ Questões recarregadas com sucesso')
    
  } catch (error) {
    console.error('Erro ao recarregar questões:', error)
    errorMsg.value = 'Erro ao recarregar questões: ' + error.message
  } finally {
    isReloading.value = false
  }
}

// Watchers
watch(filtroArea, onAreaChange)

// Lifecycle
onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.questoes-container {
  max-width: 1200px;
  margin: 0 auto;
}

.filter-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.question-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
  transition: all 0.3s ease;
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
}

.question-answered {
  border-left-color: rgb(var(--v-theme-success));
}

.option-card {
  transition: all 0.2s ease;
  cursor: pointer;
}

.option-default {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.option-selected {
  border: 2px solid rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary), 0.1);
}

.option-correct {
  border: 2px solid rgb(var(--v-theme-success));
  background-color: rgb(var(--v-theme-success), 0.1);
}

.option-incorrect {
  border: 2px solid rgb(var(--v-theme-error));
  background-color: rgb(var(--v-theme-error), 0.1);
}

.question-text {
  line-height: 1.6;
}

.option-text {
  line-height: 1.5;
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
