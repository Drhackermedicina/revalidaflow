<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Ranking Geral dos Candidatos">
        <VCardText>
          <p class="text-body-1 mb-4">Confira sua posição e a dos demais candidatos no ranking geral, baseado na pontuação das simulações.</p>

          <VTable class="text-no-wrap">
            <thead>
              <tr>
                <th class="text-uppercase">Posição</th>
                <th class="text-uppercase">Candidato</th>
                <th class="text-uppercase">Pontuação Total</th>
                <th class="text-uppercase">Simulações Concluídas</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(candidate, index) in sortedCandidates"
                :key="candidate.id"
                :class="{ 'bg-primary-lighten-5': candidate.isCurrentUser }"
              >
                <td>{{ index + 1 }}</td>
                <td>
                  <div class="d-flex align-center">
                    <VAvatar
                      :image="candidate.avatar"
                      size="38"
                      class="me-3"
                    />
                    <div>
                      <p class="font-weight-medium mb-0">{{ candidate.name }}</p>
                      <span class="text-caption text-medium-emphasis">{{ candidate.email }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <VChip
                    color="success"
                    size="small"
                    class="font-weight-medium"
                  >
                    {{ candidate.score }}
                  </VChip>
                </td>
                <td>{{ candidate.simulationsCompleted }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<script setup>
import { currentUser } from '@/plugins/auth';
import { useUserStore } from '@/stores/userStore';
import { computed, onMounted, ref } from 'vue';

const userStore = useUserStore();

// Dados de exemplo, que serão substituídos pelos dados reais do userStore
const localCandidates = ref([]);

onMounted(() => {
  userStore.fetchUsers(); // Garante que os usuários sejam buscados
});

const sortedCandidates = computed(() => {
  // Mapeia os usuários do store para o formato esperado e adiciona a flag isCurrentUser
  const allCandidates = (userStore.users || []).map(user => ({
    id: user.uid,
    name: user.displayName || 'Usuário Desconhecido',
    email: user.email || '',
    score: user.ranking || 0, // Assumindo que 'ranking' é a pontuação total
    simulationsCompleted: user.estacoesConcluidas?.length || 0, // Assumindo que 'estacoesConcluidas' é um array
    avatar: user.photoURL || '/images/avatars/avatar-1.png', // Usar avatar real ou fallback
    isCurrentUser: currentUser.value && user.uid === currentUser.value.uid,
  }));

  // Adiciona alguns dados de exemplo se não houver usuários reais ou para complementar
  if (allCandidates.length === 0) {
    return [
      { id: 'ex1', name: 'João Silva', email: 'joao.s@example.com', score: 980, simulationsCompleted: 15, avatar: '/images/avatars/avatar-1.png', isCurrentUser: false },
      { id: 'ex2', name: 'Maria Oliveira', email: 'maria.o@example.com', score: 950, simulationsCompleted: 14, avatar: '/images/avatars/avatar-2.png', isCurrentUser: false },
      { id: 'ex3', name: 'Carlos Souza', email: 'carlos.s@example.com', score: 920, simulationsCompleted: 13, avatar: '/images/avatars/avatar-3.png', isCurrentUser: false },
    ].sort((a, b) => b.score - a.score);
  }

  return allCandidates.sort((a, b) => b.score - a.score);
});
</script>

<style scoped>
.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05); /* Ajuste conforme a variável de cor do seu tema */
}
</style>
