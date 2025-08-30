<script setup>
import { currentUser } from '@/plugins/auth'
import { firebaseAuth } from '@/plugins/firebase'
import { signOut } from 'firebase/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import avatar1 from '@images/avatars/avatar-1.png'

const router = useRouter()

// Propriedades computadas para exibir os dados do usuário de forma segura
const userAvatar = computed(() => currentUser.value?.photoURL || avatar1)
const userName = computed(() => currentUser.value?.displayName || 'Usuário')
const userEmail = computed(() => currentUser.value?.email || 'Nenhum e-mail')

const logout = async () => {
  try {
    await signOut(firebaseAuth)
    // Redireciona para a landing page após o logout
    router.push({ name: 'landing-page' })
  }
  catch (error) {
    console.error("Erro ao fazer logout:", error)
  }
}
</script>

<template>
  <VBadge
    v-if="currentUser"
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    color="success"
    bordered
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <VImg :src="userAvatar" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    <VImg :src="userAvatar" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ userName }}
            </VListItemTitle>
            <VListItemSubtitle>{{ userEmail }}</VListItemSubtitle>
          </VListItem>
          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem @click="logout">
            <template #prepend>
              <VIcon
                class="me-2"
                icon="ri-logout-box-r-line"
                size="22"
              />
            </template>

            <VListItemTitle>Sair</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
