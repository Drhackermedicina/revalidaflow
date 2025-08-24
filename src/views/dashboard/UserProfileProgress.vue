<script setup>
import { currentUser } from '@/plugins/auth'
import { computed } from 'vue'

const userProgress = computed(() => {
  if (!currentUser.value || !currentUser.value.estacoesConcluidas) {
    return {
      totalEstacoesConcluidas: 0,
      mediaNotas: 0,
    }
  }

  const estacoes = currentUser.value.estacoesConcluidas
  const totalEstacoesConcluidas = estacoes.length
  const somaNotas = estacoes.reduce((acc, estacao) => acc + (estacao.nota || 0), 0)
  const mediaNotas = totalEstacoesConcluidas > 0 ? (somaNotas / totalEstacoesConcluidas).toFixed(2) : 0

  return {
    totalEstacoesConcluidas,
    mediaNotas,
  }
})
</script>

<template>
  <VCard title="Progresso do Usuário">
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="tonal">
            <VCardText class="d-flex justify-space-between">
              <div>
                <h6 class="text-h6">Estações Concluídas</h6>
                <span class="text-sm">Total de estações finalizadas</span>
              </div>
              <VAvatar
                variant="tonal"
                color="primary"
                rounded
                icon="ri-check-double-line"
              />
            </VCardText>
            <VCardText>
              <h4 class="text-h4">{{ userProgress.totalEstacoesConcluidas }}</h4>
            </VCardText>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="tonal">
            <VCardText class="d-flex justify-space-between">
              <div>
                <h6 class="text-h6">Média de Notas</h6>
                <span class="text-sm">Média geral das avaliações</span>
              </div>
              <VAvatar
                variant="tonal"
                color="success"
                rounded
                icon="ri-star-line"
              />
            </VCardText>
            <VCardText>
              <h4 class="text-h4">{{ userProgress.mediaNotas }}</h4>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
