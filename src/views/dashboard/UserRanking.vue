<script setup>
import { currentUser } from '@/plugins/auth'
import { useUserStore } from '@/stores/userStore'
import { computed, onMounted, onUnmounted } from 'vue'

const userStore = useUserStore()
let unsubscribe = null

onMounted(() => {
  try {
    unsubscribe = userStore.fetchUsers() // Garante que todos os usuários sejam carregados
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

const rankedUsers = computed(() => {
  if (!userStore.users || !Array.isArray(userStore.users) || !userStore.users.length) return []

  try {
    const usersWithScore = userStore.users.map(user => {
      const estacoes = user.estacoesConcluidas || []
      const somaNotas = estacoes.reduce((acc, estacao) => acc + (estacao.nota || 0), 0)
      const mediaNotas = estacoes.length > 0 ? (somaNotas / estacoes.length) : 0
      
      return {
        ...user,
        mediaNotas: parseFloat(mediaNotas.toFixed(2)),
        totalEstacoesConcluidas: estacoes.length,
      }
    })

    // Ordena do maior para o menor pela média de notas, depois pelo número de estações
    return usersWithScore.sort((a, b) => {
      if (b.mediaNotas !== a.mediaNotas) {
        return b.mediaNotas - a.mediaNotas
      }
      return b.totalEstacoesConcluidas - a.totalEstacoesConcluidas
    })
  } catch (error) {
    console.error('Erro ao calcular ranking de usuários:', error)
    return []
  }
})
</script>

<template>
  <VCard title="Ranking do Usuário">
    <VCardText>
      <VList lines="two">
        <VListItem
          v-for="(user, index) in rankedUsers.slice(0, 5)"
          :key="user.uid"
          :class="{ 'bg-primary': user.uid === currentUser?.uid }"
        >
          <template #prepend>
            <VAvatar
              :color="user.uid === currentUser?.uid ? 'white' : 'primary'"
              variant="tonal"
            >
              <span>{{ index + 1 }}º</span>
            </VAvatar>
          </template>
          <VListItemTitle>{{ user.displayName || user.email || 'Usuário sem nome' }}</VListItemTitle>
          <VListItemSubtitle>
            Média: {{ user.mediaNotas || 0 }} | Estações: {{ user.totalEstacoesConcluidas || 0 }}
          </VListItemSubtitle>
        </VListItem>
        
        <VListItem v-if="rankedUsers.length === 0 && !userStore.loading">
          <VListItemTitle>Nenhum usuário encontrado</VListItemTitle>
          <VListItemSubtitle>Ainda não há dados de ranking disponíveis</VListItemSubtitle>
        </VListItem>

        <VListItem v-if="userStore.loading">
          <VListItemTitle>Carregando ranking...</VListItemTitle>
        </VListItem>

        <VListItem v-if="userStore.error">
          <VListItemTitle>Erro ao carregar ranking</VListItemTitle>
          <VListItemSubtitle>{{ userStore.error }}</VListItemSubtitle>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>
