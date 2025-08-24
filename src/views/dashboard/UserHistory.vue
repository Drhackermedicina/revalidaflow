<script setup>
import { currentUser } from '@/plugins/auth'
import { computed } from 'vue'

const userHistory = computed(() => {
  if (!currentUser.value || !currentUser.value.estacoesConcluidas) {
    return []
  }
  // Ordena as estações concluídas pela data, da mais recente para a mais antiga
  return [...currentUser.value.estacoesConcluidas].sort((a, b) => new Date(b.data) - new Date(a.data))
})

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp.seconds * 1000) // Converte timestamp do Firebase para Date
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR')
}
</script>

<template>
  <VCard title="Histórico do Usuário">
    <VCardText>
      <VList lines="two">
        <VListItem
          v-for="(estacao, index) in userHistory"
          :key="index"
        >
          <VListItemTitle>Estação: {{ estacao.idEstacao }}</VListItemTitle>
          <VListItemSubtitle>
            Nota: {{ estacao.nota }} | Data: {{ formatDate(estacao.data) }}
          </VListItemSubtitle>
        </VListItem>
        <VListItem v-if="userHistory.length === 0">
          <VListItemTitle>Nenhum histórico encontrado.</VListItemTitle>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>
