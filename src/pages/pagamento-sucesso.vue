<template>
  <VContainer class="pagamento-resultado-container">
    <VRow justify="center" align="center" class="min-height-screen">
      <VCol cols="12" md="6" lg="5">
        <VCard class="resultado-card" elevation="8">
          <VCardText class="text-center pa-8">
            <div v-if="isLoading" class="d-flex flex-column align-center justify-center text-center py-6">
              <VProgressCircular
                indeterminate
                color="success"
                size="70"
                width="6"
                class="mb-6"
              />
              <h2 class="text-h4 font-weight-bold mb-3 text-dark">Confirmando pagamento PIX...</h2>
              <p class="text-body-1 text-grey-darken-1">
                Estamos sincronizando com o Mercado Pago. Este processo pode levar alguns segundos.
              </p>
            </div>

            <template v-else>
              <VIcon
                :icon="statusMeta.icon"
                size="100"
                :color="statusMeta.color"
                class="mb-6"
              />
              <h2 class="text-h3 font-weight-bold mb-4 text-dark">{{ statusMeta.title }}</h2>
              <p class="text-body-1 mb-6 text-grey-darken-1">
                {{ statusMeta.subtitle }}
              </p>

              <VAlert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mb-6 text-left"
              >
                <strong class="text-dark">Não foi possível confirmar automaticamente.</strong>
                <div class="text-dark">{{ errorMessage }}</div>
              </VAlert>

              <VAlert
                v-else-if="statusMeta.alert"
                :type="statusMeta.alert.type"
                variant="tonal"
                class="mb-6 text-left"
              >
                <strong class="text-dark">{{ statusMeta.alert.title }}</strong>
                <div class="text-dark">{{ statusMeta.alert.message }}</div>
              </VAlert>

              <VAlert
                v-if="isPolling && !errorMessage"
                type="info"
                variant="tonal"
                class="mb-6 text-left"
              >
                <strong class="text-dark">Estamos confirmando o PIX junto ao Mercado Pago</strong>
                <div class="text-dark">
                  Tentativa {{ pollAttempts }} de {{ MAX_POLL_ATTEMPTS }} · Última verificação: {{ lastSyncLabel }}
                </div>
              </VAlert>

              <div v-if="paymentDetails" class="mb-6 text-left">
                <VCard variant="tonal" color="success" class="mb-4">
                  <VCardText>
                    <div class="d-flex align-center justify-space-between flex-wrap">
                      <div>
                        <span class="text-caption text-dark">Valor pago</span>
                        <div class="text-h4 font-weight-bold text-dark">{{ formatCurrency(paymentDetails.transactionAmount, paymentDetails.currencyId) }}</div>
                      </div>
                      <div class="text-right">
                        <span class="text-caption text-dark">Forma de pagamento</span>
                        <div class="text-subtitle-1 font-weight-semibold text-dark text-capitalize">
                          {{ paymentDetails.paymentMethodId === 'pix' ? 'PIX' : paymentDetails.paymentMethodId || 'Mercado Pago' }}
                        </div>
                      </div>
                    </div>
                  </VCardText>
                </VCard>

                <VList density="compact" class="detalhes-list">
                  <VListItem
                    prepend-icon="ri-fingerprint-line"
                    :title="paymentDetails.id"
                    subtitle="ID do pagamento"
                    class="text-dark"
                  />
                  <VListItem
                    v-if="referenceId"
                    prepend-icon="ri-price-tag-3-line"
                    :title="referenceId"
                    subtitle="Referência do pedido"
                    class="text-dark"
                  />
                  <VListItem
                    prepend-icon="ri-time-line"
                    :title="formatDate(paymentDetails.dateApproved || paymentDetails.dateCreated)"
                    subtitle="Data da confirmação"
                    class="text-dark"
                  />
                  <VListItem
                    prepend-icon="ri-information-line"
                    :title="statusMeta.statusLabel"
                    :subtitle="statusMeta.statusDetail"
                    class="text-dark"
                  />
                </VList>

                <p v-if="lastUpdatedAt" class="text-caption text-grey-darken-1 mt-4 mb-0">
                  Última sincronização: {{ lastSyncLabel }}
                </p>
              </div>

              <VAlert type="success" variant="tonal" class="mb-6">
                <strong class="text-dark">Acesso Liberado</strong><br>
                <span class="text-dark">Agora você tem acesso completo à plataforma Revalida Flow.</span>
              </VAlert>

              <VBtn
                size="x-large"
                color="success"
                variant="flat"
                @click="irParaDashboard"
                class="mb-4"
                block
              >
                <VIcon icon="ri-dashboard-line" start />
                Ir para Dashboard
              </VBtn>

              <VBtn
                size="large"
                color="primary"
                variant="text"
                @click="voltarInicio"
                block
              >
                <VIcon icon="ri-home-line" start />
                Voltar para Início
              </VBtn>
            </template>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

const router = useRouter()
const route = useRoute()

const referenceId = ref('')
const paymentId = ref('')
const paymentStatus = ref('')
const paymentDetails = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const lastUpdatedAt = ref(null)
const pollAttempts = ref(0)
const isPolling = ref(false)

const POLL_INTERVAL_MS = 6000
const MAX_POLL_ATTEMPTS = 30
const FINAL_STATUSES = ['approved', 'authorized', 'cancelled', 'refunded', 'rejected', 'charged_back']
const PENDING_STATUSES = ['pending', 'in_process', 'in_mediation']
let pollTimerId = null

const normalizedStatus = computed(() => (paymentStatus.value || '').toLowerCase())
const isFinalStatus = computed(() => FINAL_STATUSES.includes(normalizedStatus.value))
const isPendingStatus = computed(() => PENDING_STATUSES.includes(normalizedStatus.value))

const formatStatusDetail = (detail) => {
  if (!detail) return ''
  try {
    return detail
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  } catch (error) {
    return detail
  }
}

const statusMeta = computed(() => {
  const status = normalizedStatus.value
  const rawDetail = paymentDetails.value?.statusDetail || ''
  const base = {
    icon: 'ri-file-info-line',
    color: 'primary',
    title: 'Pagamento em processamento',
    subtitle: 'Estamos aguardando a confirmação do Mercado Pago.',
    statusLabel: status || 'em processamento',
    statusDetail: formatStatusDetail(rawDetail),
    alert: null
  }

  switch (status) {
    case 'approved':
      return {
        ...base,
        icon: 'ri-checkbox-circle-fill',
        color: 'success',
        title: 'Pagamento aprovado!',
        subtitle: 'Recebemos o seu PIX e o acesso já foi liberado.',
        statusLabel: 'Aprovado'
      }
    case 'pending':
    case 'in_process':
      return {
        ...base,
        icon: 'ri-time-line',
        color: 'warning',
        title: 'Pagamento em processamento',
        subtitle: 'Seu PIX foi iniciado e deve ser confirmado em instantes.',
        statusLabel: 'Em processamento',
        alert: {
          type: 'warning',
          title: 'Ainda aguardando confirmação',
          message: 'Assim que o Mercado Pago confirmar o pagamento, atualizaremos automaticamente.'
        }
      }
    case 'rejected':
      return {
        ...base,
        icon: 'ri-close-circle-fill',
        color: 'error',
        title: 'Pagamento não processado',
        subtitle: 'Não foi possível confirmar o PIX. Tente novamente com outra forma de pagamento.',
        statusLabel: 'Recusado'
      }
    default:
      return base
  }
})

const formatCurrency = (value, currency = 'BRL') => {
  if (typeof value !== 'number') return '--'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value)
}

const formatDate = (date) => {
  if (!date) return 'Data não informada'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(date))
  } catch (error) {
    return date
  }
}

const lastSyncLabel = computed(() => {
  if (!lastUpdatedAt.value) return 'Aguardando primeira sincronização...'
  return formatDate(lastUpdatedAt.value)
})

const normalizarPagamento = (payment) => {
  if (!payment || typeof payment !== 'object') return null

  const normalized = {
    id: payment.id ?? payment.payment_id ?? payment.paymentId ?? '',
    status: payment.status ?? '',
    statusDetail: payment.status_detail ?? payment.statusDetail ?? '',
    transactionAmount: Number(payment.transaction_amount ?? payment.transactionAmount ?? payment.transaction_details?.total_paid_amount ?? 0),
    currencyId: payment.currency_id ?? payment.currencyId ?? 'BRL',
    paymentMethodId: payment.payment_method_id ?? payment.paymentMethodId ?? 'pix',
    externalReference: payment.external_reference ?? payment.externalReference ?? '',
    dateApproved: payment.date_approved ?? payment.dateApproved ?? null,
    dateCreated: payment.date_created ?? payment.dateCreated ?? null,
    raw: payment
  }

  if (Number.isNaN(normalized.transactionAmount)) {
    normalized.transactionAmount = 0
  }

  return normalized
}

const consultarPagamentoPorId = async (id) => {
  const headers = await getAuthHeadersAsync()
  const response = await fetch(`${backendUrl}/api/payment/details/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Falha ao consultar pagamento no servidor')
  }

  const data = await response.json()

  if (data?.success && data.payment) {
    return normalizarPagamento(data.payment)
  }

  throw new Error('Não foi possível recuperar os detalhes do pagamento.')
}

const buscarPagamentoPorReferencia = async (reference) => {
  if (!reference) return null

  const headers = await getAuthHeadersAsync()
  const response = await fetch(`${backendUrl}/api/payment/reference/${encodeURIComponent(reference)}`, {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'Falha ao localizar pagamento pela referência')
  }

  const data = await response.json()

  if (data?.success && data.payment) {
    return normalizarPagamento(data.payment)
  }

  return null
}

const pararMonitoramento = (options = {}) => {
  if (pollTimerId) {
    clearInterval(pollTimerId)
    pollTimerId = null
  }
  if (options.resetAttempts) {
    pollAttempts.value = 0
  }
  isPolling.value = false
}

const iniciarMonitoramento = () => {
  if (isPolling.value || !paymentId.value || isFinalStatus.value) return

  pollAttempts.value = 0
  isPolling.value = true

  pollTimerId = window.setInterval(async () => {
    pollAttempts.value += 1

    try {
      const sucesso = await carregarDetalhesPagamento({ silent: true, skipQueryParse: true })

      if (sucesso && isFinalStatus.value) {
        pararMonitoramento()
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Erro ao monitorar pagamento:', error)
      }
    }

    if (pollAttempts.value >= MAX_POLL_ATTEMPTS && !isFinalStatus.value) {
      pararMonitoramento()
      if (!errorMessage.value) {
        errorMessage.value = 'O Mercado Pago ainda não confirmou o PIX. Caso a aprovação já tenha ocorrido, atualize a página em alguns minutos ou contate o suporte com o número de referência.'
      }
    }
  }, POLL_INTERVAL_MS)
}

const carregarDetalhesPagamento = async ({ silent = false, skipQueryParse = false } = {}) => {
  if (!silent) {
    isLoading.value = true
    errorMessage.value = ''
  }

  try {
    if (!skipQueryParse) {
      const query = route.query || {}

      if (import.meta.env.DEV) {
        console.log('🔍 URL completa:', window.location.href)
        console.log('🔍 Query params recebidos:', query)
      }

      referenceId.value = query.reference || query.external_reference || query.preference_id || referenceId.value || 'N/A'
      paymentId.value = query.payment_id || query.collection_id || paymentId.value || ''
      paymentStatus.value = query.collection_status || query.status || paymentStatus.value || ''

      if (import.meta.env.DEV) {
        console.log('🔍 Valores extraídos:', {
          referenceId: referenceId.value,
          paymentId: paymentId.value,
          paymentStatus: paymentStatus.value
        })
      }
    }

    if (!paymentId.value && referenceId.value && referenceId.value !== 'N/A') {
      const pagamentoPorReferencia = await buscarPagamentoPorReferencia(referenceId.value)

      if (pagamentoPorReferencia) {
        paymentDetails.value = pagamentoPorReferencia
        paymentId.value = pagamentoPorReferencia.id ? String(pagamentoPorReferencia.id) : paymentId.value
        paymentStatus.value = pagamentoPorReferencia.status || paymentStatus.value
      }
    }

    if (!paymentId.value) {
      if (!silent) {
        errorMessage.value = 'Ainda não recebemos a confirmação do Mercado Pago. Se o PIX foi concluído, aguarde instantes e clique em "Atualizar" ou volte mais tarde com o número de referência.'
      }

      if (import.meta.env.DEV) {
        console.warn('⚠️ Payment ID não encontrado nem após busca por referência', {
          referenceId: referenceId.value
        })
      }

      return false
    }

    const pagamento = await consultarPagamentoPorId(paymentId.value)

    if (pagamento) {
      paymentDetails.value = pagamento
      paymentStatus.value = pagamento.status || paymentStatus.value
      referenceId.value = pagamento.externalReference || referenceId.value
      lastUpdatedAt.value = new Date()
      errorMessage.value = ''
      return true
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Erro ao carregar detalhes do pagamento:', error)
    }

    if (!silent) {
      errorMessage.value = error.message || 'Erro inesperado ao confirmar o PIX.'
    }
  } finally {
    if (!silent) {
      isLoading.value = false
    }
  }

  return false
}

onMounted(async () => {
  const sucesso = await carregarDetalhesPagamento()

  if ((!sucesso || isPendingStatus.value) && paymentId.value) {
    iniciarMonitoramento()
  }
})

onBeforeUnmount(() => {
  pararMonitoramento({ resetAttempts: true })
})

watch(normalizedStatus, (status) => {
  if (FINAL_STATUSES.includes(status)) {
    pararMonitoramento()
  } else if (PENDING_STATUSES.includes(status) && paymentId.value) {
    iniciarMonitoramento()
  }
})

const irParaDashboard = () => {
  router.push('/app/dashboard')
}

const voltarInicio = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.pagamento-resultado-container {
  background: radial-gradient(circle at top, rgba(76, 175, 80, 0.15), transparent 55%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resultado-card {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border-radius: 24px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.detalhes-list {
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.text-dark {
  color: #333 !important;
}
</style>


