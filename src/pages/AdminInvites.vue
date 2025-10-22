<script setup>
import { onMounted, ref, watch } from 'vue'
import { createInvite, listInvites } from '@/services/accessControlService.js'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
const isAdmin = userStore.isAdmin

const formRef = ref()
const creating = ref(false)
const fetching = ref(false)
const invites = ref([])
const statusFilter = ref('all')

const durationDays = ref(30)
const note = ref('')
const customCode = ref('')

const successMessage = ref('')
const errorMessage = ref('')
const isMockMode = ref(false)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const headers = [
  { title: 'Código', key: 'code' },
  { title: 'Status', key: 'status' },
  { title: 'Duração (dias)', key: 'durationDays' },
  { title: 'Emitido Por', key: 'issuerEmail' },
  { title: 'Emitido Em', key: 'issuedAt' },
  { title: 'Resgatado Por', key: 'redeemedByUid' },
  { title: 'Resgatado Em', key: 'redeemedAt' },
  { title: 'Ações', key: 'actions', sortable: false }
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString()
}

function showSnackbar(message, color = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

async function fetchInvites() {
  fetching.value = true
  errorMessage.value = ''
  try {
    const { invites: items, mockMode } = await listInvites({
      status: statusFilter.value,
      limit: 100
    })
    isMockMode.value = Boolean(mockMode)
    invites.value = items || []
  } catch (error) {
    console.error('[AdminInvites] Erro ao listar convites:', error)
    errorMessage.value = error.message || 'Não foi possível carregar a lista de convites.'
    isMockMode.value = false
  } finally {
    fetching.value = false
  }
}

async function handleCreateInvite() {
  if (!isAdmin.value) {
    showSnackbar('Apenas administradores podem gerar convites.', 'error')
    return
  }

  if (durationDays.value < 1 || durationDays.value > 30) {
    showSnackbar('A duração deve ser entre 1 e 30 dias.', 'error')
    return
  }

  creating.value = true
  errorMessage.value = ''

  try {
    const payload = {
      durationDays: durationDays.value,
      note: note.value || undefined,
      code: customCode.value ? customCode.value.trim().toUpperCase() : undefined
    }

    const response = await createInvite(payload)
    if (typeof response.mockMode === 'boolean') {
      isMockMode.value = response.mockMode
    }
    const mockSuffix = response.mockMode ? ' (modo mock - configure Firebase para persistir)' : ''
    successMessage.value = `Convite criado: ${response.code}${mockSuffix}`
    showSnackbar(successMessage.value, 'success')
    note.value = ''
    customCode.value = ''
    durationDays.value = 30
    await fetchInvites()
  } catch (error) {
    console.error('[AdminInvites] Erro ao criar convite:', error)
    errorMessage.value = error.message || 'Erro ao criar convite.'
    showSnackbar(errorMessage.value, 'error')
  } finally {
    creating.value = false
  }
}

function copyInviteCode(code) {
  if (!code) return
  navigator.clipboard?.writeText(code).then(() => {
    showSnackbar(`Código ${code} copiado!`, 'success')
  }).catch(() => {
    showSnackbar('Não foi possível copiar o código.', 'error')
  })
}

onMounted(() => {
  if (isAdmin.value) {
    fetchInvites()
  }
})

watch(statusFilter, () => {
  if (isAdmin.value) {
    fetchInvites()
  }
})
</script>

<template>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12" md="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Gerar Convite de Acesso</span>
          </v-card-title>
          <v-card-subtitle>
            Convites concedem acesso gratuito por até 30 dias e só podem ser usados uma vez.
          </v-card-subtitle>

          <v-card-text>
            <v-alert
              v-if="!isAdmin"
              type="warning"
              border="start"
              prominent
              class="mb-4"
            >
              Apenas administradores podem emitir convites. Solicite a um administrador.
            </v-alert>
            <v-alert
              v-else-if="isMockMode"
              type="info"
              border="start"
              prominent
              class="mb-4"
            >
              Backend em modo mock. Os convites não são persistidos e o acesso não é aplicado. Configure Firebase para usar convites reais.
            </v-alert>

            <v-form ref="formRef" @submit.prevent="handleCreateInvite">
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="durationDays"
                    type="number"
                    label="Duração (dias)"
                    :disabled="creating || !isAdmin"
                    :rules="[
                      value => (value >= 1 && value <= 30) || 'Informe entre 1 e 30 dias'
                    ]"
                    min="1"
                    max="30"
                    required
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="customCode"
                    label="Código personalizado"
                    :disabled="creating || !isAdmin"
                    hint="Opcional - será gerado automaticamente se vazio"
                    persistent-hint
                    maxlength="16"
                    counter
                    class="text-uppercase"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="note"
                    label="Observação"
                    :disabled="creating || !isAdmin"
                    hint="Opcional - visível apenas para admins"
                    persistent-hint
                    maxlength="120"
                    counter
                  />
                </v-col>
              </v-row>

              <v-btn
                type="submit"
                color="primary"
                :loading="creating"
                :disabled="creating || !isAdmin"
              >
                Gerar convite
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-text v-if="successMessage">
            <v-alert type="success" border="start" class="mb-0">
              {{ successMessage }}
            </v-alert>
          </v-card-text>

          <v-card-text v-if="errorMessage">
            <v-alert type="error" border="start" class="mb-0">
              {{ errorMessage }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Convites Emitidos</span>
            <v-select
              v-model="statusFilter"
              :items="[
                { title: 'Todos', value: 'all' },
                { title: 'Ativos', value: 'active' },
                { title: 'Resgatados', value: 'redeemed' },
                { title: 'Expirados', value: 'expired' }
              ]"
              label="Filtrar status"
              density="comfortable"
              hide-details
              style="max-width: 220px;"
            />
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="invites"
            :loading="fetching"
            loading-text="Carregando convites..."
            class="text-no-wrap"
            item-key="code"
          >
            <template #item.issuedAt="{ item }">
              {{ formatDate(item.issuedAt) }}
            </template>

            <template #item.redeemedAt="{ item }">
              {{ formatDate(item.redeemedAt) }}
            </template>

            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click="copyInviteCode(item.code)"
              >
                Copiar
              </v-btn>
            </template>
          </v-data-table>

          <v-card-text v-if="!fetching && invites.length === 0">
            <v-alert type="info" border="start">
              Nenhum convite encontrado para o filtro selecionado.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
