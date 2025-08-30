<template>
  <VContainer class="py-6">
    <VCard elevation="4" class="mx-auto" max-width="700">
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="ri-search-line" color="primary" size="28" />
        <span class="text-h5 font-weight-bold">Buscar Usuários Online</span>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VBtn color="primary" class="mb-4" :disabled="true">
          <VIcon icon="ri-user-add-line" class="me-1" />
          Convidar Próximo Disponível (desativado)
        </VBtn>
        <VList>
          <VListItem
            v-for="user in sortedUsers"
            :key="user.uid"
            class="py-2"
          >
            <template #prepend>
              <VBadge
                :color="getStatusColor(user.status)"
                dot
                offset-x="2"
                offset-y="2"
                bordered
              >
                <VAvatar :image="user.photoURL" size="40" />
              </VBadge>
            </template>
            <VListItemTitle class="font-weight-medium">{{ user.displayName }}</VListItemTitle>
            <VListItemSubtitle class="text-caption">{{ user.email }}</VListItemSubtitle>
            <template #append>
              <VChip
                :color="getStatusColor(user.status)"
                size="small"
                class="me-2 text-capitalize"
                variant="tonal"
              >
                <VIcon :icon="user.status === 'disponivel' ? 'ri-checkbox-circle-line' : 'ri-timer-line'" size="18" class="me-1" />
                {{ getStatusLabel(user.status) }}
              </VChip>
              <VBtn
                v-if="user.status === 'disponivel' && user.uid !== currentUser?.uid"
                color="primary"
                size="small"
                variant="tonal"
                disabled
              >
                <VIcon icon="ri-user-add-line" size="18" class="me-1" />
                Convidar (desativado)
              </VBtn>
              <VBtn
                v-else-if="user.uid === currentUser?.uid"
                color="secondary"
                size="small"
                variant="outlined"
                disabled
              >
                <VIcon icon="ri-user-line" size="18" class="me-1" />
                Você
              </VBtn>
              <VBtn
                v-else
                color="grey"
                size="small"
                variant="outlined"
                disabled
              >
                <VIcon icon="ri-user-forbid-line" size="18" class="me-1" />
                Não disponível
              </VBtn>
            </template>
          </VListItem>
        </VList>
      </VCardText>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import { currentUser } from '@/plugins/auth'
import { connectSocket } from '@/plugins/socket'
import { useUserStore } from '@/stores/userStore'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const userStore = useUserStore()
const socket = ref(null)

watch(currentUser, (user) => {
  if (user && !socket.value) {
    socket.value = connectSocket({
      userId: user.uid,
      displayName: user.displayName,
      email: user.email
    })
  }
})

onMounted(() => {
  userStore.fetchUsers()
  if (currentUser.value?.uid && !socket.value) {
    socket.value = connectSocket({
      userId: currentUser.value.uid,
      displayName: currentUser.value.displayName,
      email: currentUser.value.email
    })
  }
})

onUnmounted(() => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
})

const sortedUsers = computed(() => {
  // Garante que userStore.users é um array antes de chamar slice()
  return (userStore.users || []).slice().sort((a, b) => {
    if (a.status === b.status) return a.displayName.localeCompare(b.displayName)
    if (a.status === 'disponivel') return -1
    return 1
  })
})

const nextAvailableUser = computed(() => {
  return sortedUsers.value.find(u => u.status === 'disponivel' && u.uid !== currentUser.value?.uid)
})

const getStatusColor = (status: string) => {
  return status === 'disponivel' ? 'success' : 'warning'
}

const getStatusLabel = (status: string) => {
  return status === 'disponivel' ? 'Disponível' : 'Treinando'
}

// Função inviteUser arquivada temporariamente
// function inviteUser(user) {
//   // Lógica de convite desativada
// }
</script>

<style scoped>
@media (max-width: 700px) {
  .mx-auto {
    margin-inline: 0 !important;
    max-width: 100% !important;
  }
}
</style>
