<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const planos = [
  { label: 'Mensal', value: 'mensal', preco: 'R$ 29,90', valor: 29.90 },
  { label: 'Bimestral', value: 'bimestral', preco: 'R$ 54,90', valor: 54.90 },
  { label: 'Trimestral', value: 'trimestral', preco: 'R$ 79,90', valor: 79.90 },
  { label: '4 Meses', value: '4meses', preco: 'R$ 99,90', valor: 99.90 },
  { label: '5 Meses', value: '5meses', preco: 'R$ 119,90', valor: 119.90 },
  { label: '6 Meses', value: '6meses', preco: 'R$ 139,90', valor: 139.90 },
  { label: 'Anual', value: 'anual', preco: 'R$ 199,90', valor: 199.90 },
]

const formasPagamento = [
  { label: 'Pix', value: 'pix', gateway: 'mercadopago' },
  { label: 'Cartão de Crédito', value: 'cartao', gateway: 'stripe' },
  { label: 'Boleto Bancário', value: 'boleto', gateway: 'mercadopago' },
]

const planoSelecionado = ref('')
const pagamentoSelecionado = ref('')
const mensagem = ref('')
const carregando = ref(false)

function realizarPagamento() {
  if (!planoSelecionado.value || !pagamentoSelecionado.value) {
    mensagem.value = 'Selecione um plano e uma forma de pagamento.'
    return
  }

  carregando.value = true
  mensagem.value = `Processando pagamento para ${planos.find(p => p.value === planoSelecionado.value)?.label}...`

  // Simulação de redirecionamento para gateway de pagamento
  setTimeout(() => {
    const plano = planos.find(p => p.value === planoSelecionado.value)
    const metodo = formasPagamento.find(f => f.value === pagamentoSelecionado.value)
    
    // Redirecionar para gateway apropriado baseado no método escolhido
    if (metodo?.gateway === 'stripe') {
      redirecionarParaStripe(plano, metodo)
    } else if (metodo?.gateway === 'mercadopago') {
      redirecionarParaMercadoPago(plano, metodo)
    } else {
      mensagem.value = 'Gateway de pagamento não configurado para este método.'
      carregando.value = false
    }
  }, 1500)
}

function redirecionarParaStripe(plano, metodo) {
  // URL de exemplo do Stripe - em produção seria gerada pela API
  const stripeUrl = `https://checkout.stripe.com/pay/cs_test_example?amount=${plano.valor * 100}&currency=brl`
  window.open(stripeUrl, '_blank')
  mensagem.value = `Redirecionando para processamento no Stripe...`
  
  // Simular conclusão após redirecionamento
  setTimeout(() => {
    carregando.value = false
    mensagem.value = `Pagamento processado via Stripe para ${plano.label}. Verifique seu email para confirmação.`
  }, 3000)
}

function redirecionarParaMercadoPago(plano, metodo) {
  // URL de exemplo do Mercado Pago - em produção seria gerada pela API
  const mercadopagoUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?preference-id=TEST-example`
  window.open(mercadopagoUrl, '_blank')
  mensagem.value = `Redirecionando para processamento no Mercado Pago...`
  
  // Simular conclusão após redirecionamento
  setTimeout(() => {
    carregando.value = false
    mensagem.value = `Pagamento processado via ${metodo.label} para ${plano.label}. Verifique seu email para confirmação.`
  }, 3000)
}
</script>

<template>
  <v-container>
    <v-card class="mx-auto" max-width="500">
      <v-card-title>Escolha seu plano</v-card-title>
      <v-card-text>
        <v-select
          v-model="planoSelecionado"
          :items="planos"
          item-title="label"
          item-value="value"
          label="Plano"
          required
        />
        <div v-if="planoSelecionado">
          <p>Valor: {{ planos.find(p => p.value === planoSelecionado)?.preco }}</p>
        </div>
        <v-select
          v-model="pagamentoSelecionado"
          :items="formasPagamento"
          item-title="label"
          item-value="value"
          label="Forma de Pagamento"
          required
        />
        <v-btn
          color="primary"
          block
          class="mt-4"
          @click="realizarPagamento"
          :loading="carregando"
          :disabled="carregando || !planoSelecionado || !pagamentoSelecionado"
        >
          {{ carregando ? 'Processando...' : 'Realizar Pagamento' }}
        </v-btn>
        
        <v-alert
          v-if="mensagem"
          :type="mensagem.includes('erro') ? 'error' : 'info'"
          class="mt-4"
        >
          {{ mensagem }}
        </v-alert>

        <v-alert
          v-if="carregando"
          type="info"
          class="mt-4"
        >
          <div class="d-flex align-center">
            <v-progress-circular
              indeterminate
              color="primary"
              class="mr-3"
            ></v-progress-circular>
            <span>Redirecionando para gateway de pagamento...</span>
          </div>
        </v-alert>
        </v-card-text>
      </v-card>
    </v-container>
  </template>

  <style scoped>
  .v-card {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
  
  .v-card-title {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 12px 12px 0 0;
  }
  
  .v-card-text {
    padding: 24px;
  }
  </style>
