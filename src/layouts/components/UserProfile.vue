<script setup>
import { currentUser } from '@/plugins/auth'
import { firebaseAuth } from '@/plugins/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { setLoggingOutFlag } from '@/plugins/firebase'

import avatar1 from '@images/avatars/avatar-1.png'

const router = useRouter()

// Propriedades computadas para exibir os dados do usuário de forma segura
const userAvatar = computed(() => currentUser.value?.photoURL || avatar1)
const userName = computed(() => currentUser.value?.displayName || 'Usuário')
const userEmail = computed(() => currentUser.value?.email || 'Nenhum e-mail')

const logout = async () => {
  try {
    console.log('[UserProfile] Iniciando logout...')

    // Marcar que estamos fazendo logout para silenciar erros esperados
    setLoggingOutFlag(true)

    await signOut(firebaseAuth)

    // Aguardar a confirmação do logout através do onAuthStateChanged
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) {
          console.log('[UserProfile] Logout confirmado, redirecionando para landing page')
          unsubscribe() // Remove o listener

          // Limpar flag de logout após confirmação
          setLoggingOutFlag(false)

          router.push({ name: 'landing-page' })
          resolve()
        }
      })
    })
  }
  catch (error) {
    console.error("[UserProfile] Erro ao fazer logout:", error)
    // Em caso de erro, garantir que a flag seja limpa
    setLoggingOutFlag(false)
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
