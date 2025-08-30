<script setup>
import { ref } from 'vue'

const planos = [
  { label: 'Mensal', value: 'mensal', preco: 'R$ 29,90' },
  { label: 'Bimestral', value: 'bimestral', preco: 'R$ 54,90' },
  { label: 'Trimestral', value: 'trimestral', preco: 'R$ 79,90' },
  { label: '4 Meses', value: '4meses', preco: 'R$ 99,90' },
  { label: '5 Meses', value: '5meses', preco: 'R$ 119,90' },
  { label: '6 Meses', value: '6meses', preco: 'R$ 139,90' },
  { label: 'Anual', value: 'anual', preco: 'R$ 199,90' },
]

const formasPagamento = [
  { label: 'Pix', value: 'pix' },
  { label: 'Cartão de Crédito', value: 'cartao' },
  { label: 'Boleto Bancário', value: 'boleto' },
]

const planoSelecionado = ref('')
const pagamentoSelecionado = ref('')
const mensagem = ref('')

function realizarPagamento() {
  if (!planoSelecionado.value || !pagamentoSelecionado.value) {
    mensagem.value = 'Selecione um plano e uma forma de pagamento.'
    return
  }
  mensagem.value = `Pagamento iniciado para o plano ${planos.find(p => p.value === planoSelecionado.value)?.label} via ${formasPagamento.find(f => f.value === pagamentoSelecionado.value)?.label}.`
  // Aqui você pode integrar com seu backend ou gateway de pagamento
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
        <v-btn color="primary" block class="mt-4" @click="realizarPagamento">
          Realizar Pagamento
        </v-btn>
          <v-alert v-if="mensagem" type="info" class="mt-4">
            {{ mensagem }}
          </v-alert>
        </v-card-text>
      </v-card>
    </v-container>
  </template>
