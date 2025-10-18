<template>
  <VContainer fluid class="admin-form-container pa-4">
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4">Criar Nova Questão Descritiva</h1>
      <VBtn variant="outlined" @click="goBack">
        <VIcon icon="ri-arrow-left-line" class="me-2" />
        Voltar
      </VBtn>
    </div>

    <!-- Success Message -->
    <VAlert
      v-if="success"
      type="success"
      variant="tonal"
      class="mb-6"
      closable
      @click:close="clearMessages"
    >
      {{ success }}
    </VAlert>

    <!-- Error Message -->
    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
      closable
      @click:close="clearMessages"
    >
      {{ error }}
    </VAlert>

    <VForm ref="form" @submit.prevent="handleSubmit">
      <VCard elevation="2" class="mb-6">
        <VCardTitle class="bg-primary text-white">
          <VIcon icon="ri-file-text-line" class="me-2" />
          Informações Básicas
        </VCardTitle>
        <VCardText class="pa-6">
          <VRow>
            <VCol cols="12" md="8">
              <VTextField
                v-model="form.title"
                label="Título da Questão"
                placeholder="Ex: Avaliação de Paciente com Dor Abdominal"
                :rules="[rules.required]"
                required
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model.number="form.year"
                label="Ano"
                type="number"
                :rules="[rules.required, rules.year]"
                required
              />
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.specialty"
                :items="specialtyOptions"
                label="Especialidade"
                :rules="[rules.required]"
                required
              />
            </VCol>
            <VCol cols="12" md="6">
              <VSelect
                v-model="form.type"
                :items="typeOptions"
                label="Tipo"
                :rules="[rules.required]"
                required
              />
            </VCol>
          </VRow>

          <VRow>
            <VCol cols="12">
              <VTextarea
                v-model="form.statement"
                label="Enunciado da Questão"
                placeholder="Descreva o caso clínico em detalhes..."
                :rules="[rules.required]"
                rows="6"
                required
              />
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <VCard elevation="2" class="mb-6">
        <VCardTitle class="bg-secondary text-white d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <VIcon icon="ri-list-check-2" class="me-2" />
            Itens de Avaliação
          </div>
          <VBtn
            color="white"
            variant="outlined"
            size="small"
            @click="addItem"
          >
            <VIcon icon="ri-add-line" class="me-1" />
            Adicionar Item
          </VBtn>
        </VCardTitle>
        <VCardText class="pa-6">
          <div v-if="form.items.length === 0" class="text-center py-8">
            <VIcon icon="ri-list-check-2" size="48" color="grey" class="mb-4" />
            <p class="text-medium-emphasis">Nenhum item adicionado ainda.</p>
            <p class="text-caption">Clique em "Adicionar Item" para começar.</p>
          </div>

          <div v-else>
            <VRow
              v-for="(item, index) in form.items"
              :key="index"
              class="mb-4"
            >
              <VCol cols="12">
                <VCard variant="outlined" class="item-card">
                  <VCardTitle class="d-flex align-center justify-space-between pa-4">
                    <span class="text-h6">Item {{ index + 1 }}</span>
                    <VBtn
                      icon="ri-delete-bin-line"
                      color="error"
                      variant="text"
                      size="small"
                      @click="removeItem(index)"
                    />
                  </VCardTitle>
                  <VCardText class="pa-4">
                    <VRow>
                      <VCol cols="12" md="10">
                        <VTextarea
                          v-model="item.description"
                          :label="`Descrição do Item ${index + 1}`"
                          placeholder="Ex: Quais as hipóteses diagnósticas mais prováveis?"
                          :rules="[rules.required]"
                          rows="3"
                          required
                        />
                      </VCol>
                      <VCol cols="12" md="2">
                        <VTextField
                          v-model.number="item.weight"
                          label="Peso"
                          type="number"
                          min="0"
                          step="0.5"
                          suffix="pontos"
                        />
                      </VCol>
                    </VRow>
                    <VRow>
                      <VCol cols="12">
                        <VTextarea
                          v-model="item.expectedAnswer"
                          :label="`Resposta Esperada para Item ${index + 1}`"
                          placeholder="Descreva a resposta correta detalhadamente..."
                          :rules="[rules.required]"
                          rows="4"
                          required
                        />
                      </VCol>
                    </VRow>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </div>
        </VCardText>
      </VCard>

      <div class="d-flex justify-end gap-4">
        <VBtn
          variant="outlined"
          @click="resetForm"
          :disabled="loading"
        >
          Limpar Formulário
        </VBtn>
        <VBtn
          color="primary"
          type="submit"
          :loading="loading"
          :disabled="!isFormValid"
        >
          <VIcon icon="ri-save-line" class="me-2" />
          Criar Questão
        </VBtn>
      </div>
    </VForm>
  </VContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminDescriptiveQuestions } from '@/composables/useAdminDescriptiveQuestions'

const router = useRouter()
const { loading, error, success, createQuestion, clearMessages } = useAdminDescriptiveQuestions()

// Form data
const form = ref({
  title: '',
  specialty: '',
  year: new Date().getFullYear(),
  type: '',
  statement: '',
  items: []
})

// Form reference
const formRef = ref(null)

// Validation rules
const rules = {
  required: value => !!value || 'Este campo é obrigatório',
  year: value => (value >= 2000 && value <= 2030) || 'Ano deve estar entre 2000 e 2030'
}

// Options for selects
const specialtyOptions = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Cardiologia',
  'Neurologia',
  'Psiquiatria',
  'Ortopedia',
  'Dermatologia',
  'Oftalmologia',
  'Otorrinolaringologia',
  'Urologia',
  'Anestesiologia',
  'Radiologia',
  'Patologia',
  'Medicina Preventiva'
]

const typeOptions = [
  'PEP',
  'TEP',
  'MAP',
  'Outros'
]

// Computed
const isFormValid = computed(() => {
  return form.value.title &&
         form.value.specialty &&
         form.value.year &&
         form.value.type &&
         form.value.statement &&
         form.value.items.length > 0 &&
         form.value.items.every(item => item.description && item.expectedAnswer)
})

// Methods
const addItem = () => {
  form.value.items.push({
    description: '',
    expectedAnswer: '',
    weight: 0
  })
}

const removeItem = (index) => {
  form.value.items.splice(index, 1)
}

const resetForm = () => {
  form.value = {
    title: '',
    specialty: '',
    year: new Date().getFullYear(),
    type: '',
    statement: '',
    items: []
  }
  formRef.value?.reset()
  clearMessages()
}

const handleSubmit = async () => {
  if (!formRef.value?.validate()) {
    return
  }

  try {
    const questionData = {
      title: form.value.title,
      specialty: form.value.specialty,
      year: form.value.year,
      type: form.value.type,
      statement: form.value.statement,
      items: form.value.items.map(item => ({
        description: item.description,
        expectedAnswer: item.expectedAnswer,
        weight: item.weight || 0
      }))
    }

    await createQuestion(questionData)

    // Reset form on success
    resetForm()
  } catch (err) {
    console.error('Erro ao criar questão:', err)
  }
}

const goBack = () => {
  router.go(-1)
}

// Initialize with one empty item
onMounted(() => {
  addItem()
})
</script>

<style scoped>
.admin-form-container {
  max-width: 1200px;
  margin: 0 auto;
}

.item-card {
  border-left: 4px solid rgba(var(--v-theme-secondary), 0.5);
  transition: all 0.3s ease;
}

.item-card:hover {
  border-left-color: rgba(var(--v-theme-secondary), 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .admin-form-container {
    padding: 16px;
  }
}
</style>