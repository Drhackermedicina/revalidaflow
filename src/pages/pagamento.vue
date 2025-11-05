<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

const router = useRouter()

// Estrutura de planos
const planosDisponiveis = {
  revalidaFlowFull: {
    id: 'revalida-flow-full',
    nome: 'Revalida Flow Full',
    descricao: 'Acesso completo à plataforma com todas as funcionalidades',
    icone: 'ri-vip-crown-fill',
    cor: 'primary',
    periodos: [
      { id: 'mensal', label: 'Mensal', valor: 94.99 },
      { id: 'bimestral', label: 'Bimestral', valor: 159.99 },
      { id: 'trimestral', label: 'Trimestral', valor: 199.00 },
      { id: 'ate-prova', label: 'Até a data da prova', valor: 249.99 },
    ]
  },
  revalidaFlowEstacoes: {
    id: 'revalida-flow-estacoes',
    nome: 'Revalida Flow Estações',
    descricao: 'Acesso exclusivo às estações práticas',
    icone: 'ri-hospital-fill',
    cor: 'info',
    periodos: [
      { id: 'mensal', label: 'Mensal', valor: 54.99 },
      { id: 'bimestral', label: 'Bimestral', valor: 129.99 },
      { id: 'trimestral', label: 'Trimestral', valor: 159.00 },
      { id: 'ate-prova', label: 'Até a data da prova', valor: 219.99 },
    ]
  },
  mentoriaAtivaMed: {
    id: 'mentoria-ativa-med',
    nome: 'Mentoria Ativa Med',
    descricao: 'Mentoria personalizada com profissionais revalidados',
    icone: 'ri-graduation-cap-fill',
    cor: 'success',
    subplanos: [
      {
        id: 'ator-feedback',
        nome: 'Ator Revalida + Feedback',
        descricao: 'Estações ilimitadas com feedback detalhado',
        icone: 'ri-user-star-fill',
        quantidades: [
          { min: 1, max: 5, valorUnitario: 9.90, label: '1-5 estações - R$ 9,90/estação' },
          { min: 6, max: 14, valorUnitario: 8.90, label: '6-14 estações - R$ 8,90/estação' },
          { min: 15, max: 999, valorUnitario: 7.50, label: '15+ estações - R$ 7,50/estação' },
        ]
      },
      {
        id: 'mentoria-flash',
        nome: 'Mentoria Flash',
        descricao: '5 aulas intensivas para construir base sólida',
        icone: 'ri-flashlight-fill',
        valorFixo: 500.00
      },
      {
        id: 'mentoria-completa',
        nome: 'Mentoria Completa',
        descricao: '15 aulas + acompanhamento até a prova',
        icone: 'ri-trophy-fill',
        valorFixo: 1500.00
      }
    ]
  }
}

// Estados
const etapa = ref(1) // 1: Seleção de plano, 2: Confirmação/Pagamento
const planoSelecionado = ref('')
const periodoSelecionado = ref('')
const subplanoSelecionado = ref('')
const quantidadeEstacoes = ref(1)
const processando = ref(false)
const mensagemStatus = ref('')

// Computed
const planoAtual = computed(() => {
  return planosDisponiveis[planoSelecionado.value] || null
})

const valorTotal = computed(() => {
  if (!planoSelecionado.value) return 0

  const plano = planosDisponiveis[planoSelecionado.value]

  // Revalida Flow Full ou Estações
  if (plano.periodos && periodoSelecionado.value) {
    const periodo = plano.periodos.find(p => p.id === periodoSelecionado.value)
    return periodo?.valor || 0
  }

  // Mentoria Ativa Med
  if (plano.subplanos && subplanoSelecionado.value) {
    const subplano = plano.subplanos.find(s => s.id === subplanoSelecionado.value)
    
    if (subplano?.valorFixo) {
      return subplano.valorFixo
    }
    
    if (subplano?.quantidades && quantidadeEstacoes.value > 0) {
      const faixa = subplano.quantidades.find(q => 
        quantidadeEstacoes.value >= q.min && quantidadeEstacoes.value <= q.max
      )
      return faixa ? faixa.valorUnitario * quantidadeEstacoes.value : 0
    }
  }

  return 0
})

const podeProsseguir = computed(() => {
  if (etapa.value === 1) {
    if (!planoSelecionado.value) return false
    
    const plano = planosDisponiveis[planoSelecionado.value]
    
    if (plano.periodos && !periodoSelecionado.value) return false
    if (plano.subplanos && !subplanoSelecionado.value) return false
    
    const subplano = plano.subplanos?.find(s => s.id === subplanoSelecionado.value)
    if (subplano?.quantidades && quantidadeEstacoes.value < 1) return false
    
    return valorTotal.value > 0
  }
  
  return false
})

// Watchers
watch(planoSelecionado, () => {
  periodoSelecionado.value = ''
  subplanoSelecionado.value = ''
  quantidadeEstacoes.value = 1
})

watch(subplanoSelecionado, () => {
  quantidadeEstacoes.value = 1
})

// Funções
const selecionarPlano = (planoId) => {
  planoSelecionado.value = planoId
}

const avancarEtapa = async () => {
  if (podeProsseguir.value) {
    // Vai direto para finalização (etapa 2 = confirmação/pagamento)
    etapa.value = 2
    // Chama finalizarPagamento automaticamente
    await finalizarPagamento()
  }
}

const voltarEtapa = () => {
  if (etapa.value > 1) {
    etapa.value--
    mensagemStatus.value = ''
  }
}

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

const finalizarPagamento = async () => {
  processando.value = true
  mensagemStatus.value = 'Criando checkout...'

  try {
    // Montar descrição do plano
    let descricao = ''
    const plano = planosDisponiveis[planoSelecionado.value]
    
    if (plano.periodos && periodoSelecionado.value) {
      const periodo = plano.periodos.find(p => p.id === periodoSelecionado.value)
      descricao = `${plano.nome} - ${periodo?.label || ''}`
    } else if (plano.subplanos && subplanoSelecionado.value) {
      const subplano = plano.subplanos.find(s => s.id === subplanoSelecionado.value)
      if (subplano?.valorFixo) {
        descricao = `${plano.nome} - ${subplano.nome}`
      } else if (subplano?.quantidades) {
        descricao = `${plano.nome} - ${subplano.nome} (${quantidadeEstacoes.value} estações)`
      }
    }

    // Obter headers de autenticação
    const headers = await getAuthHeadersAsync()

    // Criar checkout no backend
    const response = await fetch(`${backendUrl}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        valor: valorTotal.value,
        descricao: descricao || plano.nome,
        planoId: planoSelecionado.value,
        periodoId: periodoSelecionado.value || null,
        subplanoId: subplanoSelecionado.value || null,
        quantidadeEstacoes: quantidadeEstacoes.value || null
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar checkout')
    }

    const data = await response.json()

    if (data.success && data.checkout && data.checkout.initPoint) {
      // Redirecionar imediatamente para o checkout do Mercado Pago
      // Não atualizar mensagemStatus para evitar mostrar "Pagamento Confirmado"
      window.location.href = data.checkout.initPoint
      return // Não continua o código após redirecionar
    } else {
      throw new Error('Resposta inválida do servidor')
    }
  } catch (err) {
    console.error('Erro ao criar checkout:', err)
    mensagemStatus.value = err.message || 'Erro ao criar checkout. Tente novamente.'
    processando.value = false
  }
}

const voltarInicio = () => {
  router.push('/app/mentoria')
}
</script>

<template>
  <div class="pagamento-page">
    <!-- Main Content -->
    <VContainer class="pagamento-container py-10">
      <div class="login-content">
        <VRow justify="center">
          <VCol cols="12" md="12" lg="8" xl="6">
            <VCard class="payment-card login-card" elevation="12">
          <div class="payment-header pa-6">
            <div class="payment-header-content">
              <div class="payment-header-main">
                <h2 class="payment-title">Finalizar Assinatura</h2>
                <p class="payment-subtitle">Escolha seu plano e finalize sua jornada médica</p>
              </div>
              <VChip color="white" variant="flat" size="large" class="step-chip">
                <VIcon icon="ri-progress-1" start size="16" />
                Etapa {{ etapa }}/2
              </VChip>
            </div>
          </div>

          <VCardText class="pa-6 pa-md-8">
            <!-- ETAPA 1: SELEÇÃO DE PLANO -->
            <div v-show="etapa === 1" class="etapa-planos">
              <h3 class="text-h5 font-weight-bold mb-6">Escolha seu plano</h3>
              
              <VRow class="mb-6">
                <VCol
                  v-for="(plano, key) in planosDisponiveis"
                  :key="key"
                  cols="12"
                  md="4"
                >
                  <VCard
                    :class="['plano-option', 'login-card', { 'selected': planoSelecionado === key }]"
                    :color="planoSelecionado === key ? plano.cor : ''"
                    :variant="planoSelecionado === key ? 'tonal' : 'outlined'"
                    @click="selecionarPlano(key)"
                    hover
                  >
                    <!-- Inner glow effect -->
                    <div class="card-glow"></div>
                    
                    <VCardText class="text-center pa-6">
                      <VIcon :icon="plano.icone" size="48" :color="plano.cor" class="mb-3 plan-icon" />
                      <h4 class="text-h6 font-weight-bold mb-2 plan-title">{{ plano.nome }}</h4>
                      <p class="text-body-2 text-medium-emphasis mb-0 plan-description">{{ plano.descricao }}</p>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>

              <!-- Opções de período (Flow Full e Estações) -->
              <div v-if="planoAtual?.periodos" class="opcoes-periodo mb-6">
                <h4 class="text-h6 font-weight-bold mb-4">Escolha o período</h4>
                <VRadioGroup v-model="periodoSelecionado" class="periodo-radio">
                  <VRadio
                    v-for="periodo in planoAtual.periodos"
                    :key="periodo.id"
                    :value="periodo.id"
                    class="periodo-item"
                  >
                    <template v-slot:label>
                      <div class="d-flex align-center justify-space-between w-100 periodo-label">
                        <span class="font-weight-medium periodo-label-text">{{ periodo.label }}</span>
                        <strong class="periodo-valor">{{ formatarMoeda(periodo.valor) }}</strong>
                      </div>
                    </template>
                  </VRadio>
                </VRadioGroup>
              </div>

              <!-- Subplanos de Mentoria -->
              <div v-if="planoAtual?.subplanos" class="opcoes-mentoria mb-6">
                <h4 class="text-h6 font-weight-bold mb-4">Escolha o tipo de mentoria</h4>
                <VRow>
                  <VCol
                    v-for="subplano in planoAtual.subplanos"
                    :key="subplano.id"
                    cols="12"
                    md="4"
                  >
                    <VCard
                      :class="['subplano-option', { 'selected': subplanoSelecionado === subplano.id }]"
                      :variant="subplanoSelecionado === subplano.id ? 'tonal' : 'outlined'"
                      @click="subplanoSelecionado = subplano.id"
                      hover
                    >
                      <VCardText class="pa-5">
                        <VIcon :icon="subplano.icone" size="32" color="success" class="mb-2" />
                        <h5 class="text-subtitle-1 font-weight-bold mb-2">{{ subplano.nome }}</h5>
                        <p class="text-body-2 text-medium-emphasis mb-3">{{ subplano.descricao }}</p>
                        <div v-if="subplano.valorFixo" class="text-h6 font-weight-bold subplano-valor-fixo">
                          {{ formatarMoeda(subplano.valorFixo) }}
                        </div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>

                <!-- Quantidade de estações (Ator Feedback) -->
                <div
                  v-if="subplanoSelecionado === 'ator-feedback'"
                  class="quantidade-estacoes mt-6"
                >
                  <h5 class="text-subtitle-1 font-weight-bold mb-3">Quantas estações?</h5>
                  <VTextField
                    v-model.number="quantidadeEstacoes"
                    type="number"
                    min="1"
                    max="999"
                    label="Número de estações"
                    variant="outlined"
                    class="mb-3"
                  />
                  <VAlert
                    v-if="quantidadeEstacoes > 0"
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="estacoes-valor-alert"
                  >
                    <div class="mb-2">
                      <strong class="text-dark">Tabela de Preços:</strong>
                    </div>
                    <div v-for="faixa in planoAtual.subplanos[0].quantidades" :key="faixa.min" class="estacoes-faixa-item">
                      <div :class="['estacoes-valor-texto', { 'estacoes-faixa-ativa': quantidadeEstacoes >= faixa.min && quantidadeEstacoes <= faixa.max }]">
                        <span>{{ faixa.label }}</span>
                        <span v-if="quantidadeEstacoes >= faixa.min && quantidadeEstacoes <= faixa.max" class="estacoes-valor-total">
                          = {{ formatarMoeda(faixa.valorUnitario * quantidadeEstacoes) }}
                        </span>
                      </div>
                    </div>
                  </VAlert>
                </div>
              </div>

              <!-- Resumo do valor -->
              <VAlert v-if="valorTotal > 0" color="primary" variant="tonal" class="mb-6 resumo-valor-alert">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-h6 resumo-label">Valor total:</span>
                  <strong class="text-h5 resumo-valor">{{ formatarMoeda(valorTotal) }}</strong>
                </div>
              </VAlert>

              <VBtn
                block
                size="x-large"
                color="primary"
                variant="elevated"
                :disabled="!podeProsseguir"
                @click="avancarEtapa"
                class="continue-btn hover-lift"
                :class="{ 'pulse-animation': podeProsseguir }"
              >
                <template v-slot:loader>
                  <VProgressCircular
                    indeterminate
                    size="20"
                    width="2"
                    class="mr-2"
                  />
                  Processando...
                </template>
                <VIcon icon="ri-arrow-right-line" end />
                Continuar para Pagamento
              </VBtn>
            </div>

            <!-- ETAPA 2: CONFIRMAÇÃO/PAGAMENTO -->
            <div v-show="etapa === 2" class="etapa-confirmacao text-center">
              <!-- Aguardando criação do checkout -->
              <div v-if="processando && !mensagemStatus.includes('Redirecionando')">
                <VIcon
                  icon="ri-loader-4-line"
                  size="80"
                  color="primary"
                  class="mb-4 animate-spin"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">{{ mensagemStatus || 'Processando pagamento...' }}</h3>
              </div>
              
              <!-- Mensagem de erro -->
              <div v-else-if="mensagemStatus && mensagemStatus.includes('Erro')">
                <VIcon
                  icon="ri-error-warning-line"
                  size="80"
                  color="error"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Erro no Pagamento</h3>
                <p class="text-body-1 mb-6 text-dark">{{ mensagemStatus }}</p>
                <VBtn
                  size="large"
                  color="primary"
                  @click="voltarEtapa"
                  class="me-3"
                >
                  <VIcon icon="ri-arrow-left-line" start />
                  Voltar
                </VBtn>
                <VBtn
                  size="large"
                  color="success"
                  @click="finalizarPagamento"
                >
                  <VIcon icon="ri-refresh-line" start />
                  Tentar Novamente
                </VBtn>
              </div>
              
              <!-- Pagamento Confirmado - só aparece quando realmente confirmado (via webhook/retorno) -->
              <div v-else-if="mensagemStatus && mensagemStatus.includes('confirmado') && !processando">
                <VIcon
                  icon="ri-checkbox-circle-fill"
                  size="80"
                  color="success"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Pagamento Confirmado!</h3>
                <p class="text-body-1 mb-6 text-dark">{{ mensagemStatus }}</p>

                <VAlert type="success" variant="tonal" class="mb-6">
                  <strong class="text-dark">Pagamento aprovado com sucesso!</strong><br>
                  <span class="text-dark">Você receberá um email de confirmação em instantes com todos os detalhes da sua assinatura.</span>
                </VAlert>

                <VBtn
                  size="x-large"
                  color="primary"
                  @click="voltarInicio"
                >
                  <VIcon icon="ri-home-line" start />
                  Voltar para Início
                </VBtn>
              </div>
              
              <!-- Fallback: apenas loading se nenhuma das condições acima foi atendida -->
              <div v-else>
                <VIcon
                  icon="ri-loader-4-line"
                  size="80"
                  color="primary"
                  class="mb-4 animate-spin"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Redirecionando para o Mercado Pago...</h3>
                <p class="text-body-1 mb-6 text-dark">Aguarde, você será redirecionado automaticamente.</p>
              </div>
          </div>
          </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </div>
    </VContainer>
  </div>
</template>

<style scoped lang="scss">
// Import all modular styles
@import '@/assets/styles/login/variables.scss';
@import '@/assets/styles/login/animations.scss';
@import '@/assets/styles/login/background.scss';
@import '@/assets/styles/login/card.scss';
@import '@/assets/styles/login/typography.scss';
@import '@/assets/styles/login/responsive.scss';

.pagamento-page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1rem;
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, #1a0033 0%, #330066 50%, #4d0099 100%);
  background-size: 200% 200%;
  animation: gradient-shift 15s ease infinite;
}

.login-content {
  position: relative;
  z-index: 20;
  width: 100%;
  max-width: 1800px;
}

.pagamento-container {
  position: relative;
  z-index: 10;
  width: 100%;
}

.payment-card {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--glass-shadow) !important;
  border-radius: 24px !important;
  overflow: hidden;
  transition: all var(--transition-medium);
  
  // Inner glow effect
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(140, 87, 255, 0.5),
      transparent
    );
    animation: shimmer 3s infinite;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: var(--shadow-card-hover);
    border-color: rgba(140, 87, 255, 0.3);
  }
}

// Garantir visibilidade de todos os textos
h3, h4, h5, p, span, label {
  color: rgba(255, 255, 255, 0.95) !important;
}

.text-dark {
  color: rgba(255, 255, 255, 0.9) !important;
}

.etapa-planos,
.etapa-confirmacao {
  h3, h4, h5 {
    color: rgba(255, 255, 255, 0.98) !important;
  }
  
  p, span {
    color: rgba(255, 255, 255, 0.85) !important;
  }
}

.payment-header {
  background: linear-gradient(135deg, #8C57FF 0%, #00B4D8 50%, #52B788 100%) !important;
  background-size: 200% 200% !important;
  animation: gradient-shift 8s ease infinite;
  color: white !important;
  position: relative;
  overflow: visible !important;
  z-index: 1000 !important;
  margin-bottom: 2rem;
  padding: 3rem 1.5rem !important;
  border-radius: 24px 24px 0 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    animation: shimmer 4s infinite;
    z-index: 1;
  }
}

.payment-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1001 !important;
  text-align: center;
  width: 100%;
  
  @media (min-width: 960px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.payment-header-main {
  margin-bottom: 1.5rem;
  
  @media (min-width: 960px) {
    margin-bottom: 0;
  }
}

.payment-title {
  font-size: 2.5rem !important;
  font-weight: 800 !important;
  color: white !important;
  margin: 0 0 1rem 0 !important;
  padding: 0 !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(140, 87, 255, 0.3) !important;
  line-height: 1.2 !important;
  
  @media (max-width: 960px) {
    font-size: 2rem !important;
  }
  
  @media (max-width: 600px) {
    font-size: 1.5rem !important;
  }
}

.payment-subtitle {
  font-size: 1.125rem !important;
  font-weight: 500 !important;
  color: rgba(255, 255, 255, 0.98) !important;
  margin: 0 !important;
  padding: 0 !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3) !important;
  line-height: 1.5 !important;
  opacity: 0.95;
  
  @media (max-width: 960px) {
    font-size: 1rem !important;
  }
  
  @media (max-width: 600px) {
    font-size: 0.9rem !important;
  }
}

.step-chip {
  margin-top: 0.5rem;
  
  @media (min-width: 960px) {
    margin-top: 0;
  }
}

.plano-option,
.subplano-option,
.forma-pagamento-option {
  cursor: pointer;
  transition: all var(--transition-medium);
  border-width: 2px !important;
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  border-color: var(--glass-border) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;

  &.selected {
    transform: scale(1.02) translateY(-2px);
    box-shadow: 0 8px 24px rgba(140, 87, 255, 0.3) !important;
    border-color: rgba(140, 87, 255, 0.5) !important;
    background: rgba(140, 87, 255, 0.1) !important;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(140, 87, 255, 0.2) !important;
    border-color: rgba(140, 87, 255, 0.4) !important;
  }
  
  h4 {
    color: rgba(255, 255, 255, 0.95) !important;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8) !important;
  }
}

.periodo-radio {
  .periodo-item {
    border: 1px solid var(--glass-border) !important;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all var(--transition-medium);
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(140, 87, 255, 0.15) !important;
      border-color: rgba(140, 87, 255, 0.4) !important;
      transform: translateX(4px);
    }
  }

  .periodo-label {
    width: 100%;
    gap: 24px; // Espaçamento entre o texto do período e o valor
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .periodo-label-text {
      color: rgba(255, 255, 255, 0.95) !important;
      flex: 1; // Permite que o texto ocupe o espaço disponível
      margin-right: auto; // Empurra para a esquerda
      text-align: left;
    }
    
    .periodo-valor {
      color: rgba(255, 255, 255, 0.98) !important;
      font-weight: 700 !important;
      margin-left: auto; // Empurra o valor para a direita
      flex-shrink: 0; // Impede que o valor seja comprimido
      white-space: nowrap; // Evita quebra de linha no valor
      text-align: right; // Alinha o texto do valor à direita
      min-width: 100px; // Garante largura mínima para alinhamento
    }
  }
}

.form-cartao {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--glass-shadow);
}

.pix-info {
  text-align: left;
  color: rgba(255, 255, 255, 0.95) !important;
  
  p {
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.9) !important;
  }
}

.pix-dados {
  p {
    color: rgba(255, 255, 255, 0.9) !important;
  }
}

// Estilos para QR Code PIX
.qr-code-card {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  border: 2px solid rgba(140, 87, 255, 0.3) !important;
}

.qr-code-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.qr-code-image {
  max-width: 300px;
  width: 100%;
  height: auto;
  display: block;
}

.pix-code-textarea {
  font-family: monospace;
  font-size: 12px;
  
  :deep(.v-field__input) {
    color: rgba(255, 255, 255, 0.95) !important;
    background: rgba(255, 255, 255, 0.05) !important;
  }
}

.status-alert {
  background: rgba(140, 87, 255, 0.15) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(140, 87, 255, 0.3) !important;
  
  strong, span {
    color: rgba(255, 255, 255, 0.95) !important;
  }
}

// Estilos para resumo de valores - garantir visibilidade
.resumo-valor-alert {
  background: rgba(140, 87, 255, 0.15) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(140, 87, 255, 0.3) !important;
  
  .resumo-label {
    color: rgba(255, 255, 255, 0.95) !important;
  }
  
  .resumo-valor {
    color: rgba(255, 255, 255, 1) !important;
    font-weight: 700 !important;
  }
}

.resumo-card {
  .resumo-title {
    color: rgba(255, 255, 255, 0.98) !important;
  }
  
  .resumo-label {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  
  .resumo-value {
    color: rgba(255, 255, 255, 0.9) !important;
  }
  
  .resumo-valor {
    color: rgba(255, 255, 255, 1) !important;
    font-weight: 700 !important;
  }
  
  .resumo-valor-total {
    color: rgba(255, 255, 255, 1) !important;
    font-weight: 800 !important;
  }
  
  // Garantir que texto dentro do VCardText tenha cor clara
  :deep(.v-card-text) {
    span, strong {
      color: rgba(255, 255, 255, 0.95) !important;
    }
  }
}

// Garantir labels visíveis
:deep(.v-label) {
  color: rgba(255, 255, 255, 0.9) !important;
}

// Valores de subplanos visíveis
.subplano-valor-fixo {
  color: var(--medical-green) !important;
  font-weight: 700 !important;
  text-shadow: 0 0 10px rgba(82, 183, 136, 0.5);
}

// Valores no alerta de estações
.estacoes-valor-alert {
  background: rgba(140, 87, 255, 0.1) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(140, 87, 255, 0.2) !important;
  
  .estacoes-faixa-item {
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .estacoes-valor-texto {
    color: rgba(255, 255, 255, 0.95) !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &.estacoes-faixa-ativa {
      background-color: rgba(140, 87, 255, 0.2);
      padding-left: 8px;
      padding-right: 8px;
      font-weight: 600;
      border: 1px solid rgba(140, 87, 255, 0.4);
    }
    
    span:first-child {
      flex: 1;
      text-align: left;
    }
  }
  
  .estacoes-valor-total {
    color: rgba(255, 255, 255, 1) !important;
    font-weight: 700 !important;
    margin-left: 16px; // Espaçamento adicional antes do valor
    white-space: nowrap; // Evita quebra de linha no valor
    text-align: right;
    min-width: 120px; // Garante largura mínima para alinhamento
  }
  
  .estacoes-valor-moeda {
    color: rgba(255, 255, 255, 1) !important;
    font-weight: 700 !important;
    margin-left: 12px; // Espaçamento adicional antes do valor (depois do "=")
    white-space: nowrap; // Evita quebra de linha no valor
  }
}

:deep(.v-field__input) {
  color: rgba(255, 255, 255, 0.95) !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-selection-control-group) {
  label {
    color: rgba(255, 255, 255, 0.9) !important;
  }
}

:deep(.v-field--focused .v-field__input) {
  color: rgba(255, 255, 255, 1) !important;
}

:deep(.v-text-field__input) {
  color: rgba(255, 255, 255, 0.95) !important;
}

:deep(.v-card-text),
:deep(.v-card-title),
:deep(.v-alert__content) {
  color: rgba(255, 255, 255, 0.95) !important;
  
  * {
    color: inherit;
  }
}

// Animação de spin para loader
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

// Global animations
.fade-slide-enter-active {
  transition: all 0.8s var(--transition-smooth);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

// Ensure proper stacking
.login-background {
  z-index: 1;
}

.login-content {
  z-index: 10;
}

@media (max-width: 960px) {
  .payment-header {
    padding: 2.5rem 1rem !important;
  }

  .plano-option {
    margin-bottom: 16px;
  }
  
  .qr-code-image {
    max-width: 250px;
  }
}

// Enhanced Button Styles
.continue-btn {
  position: relative;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  height: 56px;
  text-transform: none;
  letter-spacing: 0.02em;
  overflow: hidden;
  background: var(--title-gradient) !important;
  border: none;
  box-shadow: 0 8px 24px rgba(140, 87, 255, 0.3) !important;
  transition: all var(--transition-medium);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.6s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 32px rgba(140, 87, 255, 0.4) !important;
  }
  
  &:active:not(:disabled) {
    transform: translateY(-1px) scale(1.01);
  }
  
  &.pulse-animation {
    animation: pulse-glow 2s ease-in-out infinite;
  }
}

.hover-lift {
  transition: all var(--transition-medium);
  
  &:hover {
    transform: translateY(-2px);
  }
}

.pulse-animation {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(140, 87, 255, 0.3);
  }
  50% {
    box-shadow: 0 8px 24px rgba(140, 87, 255, 0.5), 0 0 20px rgba(140, 87, 255, 0.3);
  }
}

.step-chip {
  animation: slideInRight 0.6s ease-out;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  
  .v-icon {
    animation: rotate 2s linear infinite;
  }
}

// Enhanced Card Hover Effects
.payment-card {
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(140, 87, 255, 0.5),
      transparent
    );
    animation: shimmer 3s infinite;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: var(--shadow-card-hover);
    border-color: rgba(140, 87, 255, 0.3);
  }
}

// Responsive Enhancements
@media (max-width: 1200px) {
  .login-content {
    max-width: 1600px;
  }
  
  .payment-card .login-card-content {
    padding: 2.5rem;
  }
}

@media (max-width: 1400px) {
  .login-content {
    max-width: 1400px;
  }
}

@media (max-width: 960px) {
  .login-content {
    max-width: 100%;
    padding: 0 1rem;
  }
  
  .payment-card .login-card-content {
    padding: 2rem;
  }
  
  .payment-header {
    padding: 2.5rem 1rem !important;
  }
}

@media (max-width: 600px) {
  .payment-card {
    border-radius: 20px;
    margin: 0.5rem;
  }
  
  .payment-card .login-card-content {
    padding: 1.5rem;
  }
  
  .payment-header {
    padding: 2rem 1rem !important;
  }
  
  .continue-btn {
    height: 48px;
    font-size: 1rem;
  }
}

@media (max-width: 400px) {
  .payment-card .login-card-content {
    padding: 1.25rem;
  }
  
  // Additional mobile optimizations can be added here if needed
}

// Additional animations
@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Enhanced Plan Card Styles
.plano-option.login-card {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24px !important;
  overflow: hidden;
  transition: all var(--transition-medium);
  position: relative;
  box-shadow: var(--glass-shadow) !important;
  
  .card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(140, 87, 255, 0.5),
      transparent
    );
    animation: shimmer 3s infinite;
    z-index: 1;
  }
  
  &.selected {
    transform: scale(1.02) translateY(-2px);
    box-shadow: 0 8px 24px rgba(140, 87, 255, 0.3) !important;
    border-color: rgba(140, 87, 255, 0.5) !important;
    background: rgba(140, 87, 255, 0.1) !important;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(140, 87, 255, 0.2) !important;
    border-color: rgba(140, 87, 255, 0.4) !important;
  }
  
  .plan-icon {
    filter: drop-shadow(0 4px 12px rgba(140, 87, 255, 0.6)) drop-shadow(0 0 8px rgba(140, 87, 255, 0.4));
    animation: float-icon 3s ease-in-out infinite;
  }
  
  .plan-title {
    background: linear-gradient(135deg, #8C57FF 0%, #00B4D8 50%, #52B788 100%);
    background-size: 200% 200%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-shift 8s ease infinite;
    
    /* Fallback */
    color: #8C57FF;
  }
  
  .plan-description {
    color: rgba(255, 255, 255, 0.8) !important;
  }
  
  /* Icon animation delays */
  &:nth-child(1) .plan-icon { animation-delay: 0s; }
  &:nth-child(2) .plan-icon { animation-delay: 0.5s; }
  &:nth-child(3) .plan-icon { animation-delay: 1s; }
}

  </style>
