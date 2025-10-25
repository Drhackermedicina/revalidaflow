<script setup>
import { onMounted, computed } from 'vue'
import { useLoginAuth } from '@/composables/useLoginAuth.js'
import { useTheme } from 'vuetify'

// Imagens e Logo
import authV1MaskDark from '@images/pages/auth-v1-mask-dark.png'
import authV1MaskLight from '@images/pages/auth-v1-mask-light.png'

const revalidaFlowLogo = '/image.png'

const vuetifyTheme = useTheme()
const { loading, error, loginComGoogle, processarRedirectResult } = useLoginAuth()

// Processar resultado de redirect quando o usuário volta da autenticação
onMounted(async () => {
  await processarRedirectResult()
})

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light' ? authV1MaskLight : authV1MaskDark
})

</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card pa-4 pt-7"
      max-width="448"
    >
      <VCardItem class="justify-center">
        <RouterLink
          to="/"
          class="d-flex align-center gap-3"
        >
          <img
            :src="revalidaFlowLogo"
            alt="Revalida Flow Logo"
            style="block-size: 40px;"
          >
          <h2 class="font-weight-medium text-2xl text-uppercase">
            REVALIDA FLOW
          </h2>
        </RouterLink>
      </VCardItem>

      <VCardText class="pt-2">
        <h4 class="text-h4 mb-1">
          Bem-vindo! 👋🏻
        </h4>
        <p class="mb-0">
          Acesse usando sua conta do Google para começar
        </p>
      </VCardText>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <VBtn
              block
              @click="loginComGoogle"
              :loading="loading"
              color="#DB4437"
              class="text-white"
            aria-label="Entrar com Google"
            >
              <VIcon
                start
                icon="ri-google-fill"
              />
              Entrar com Google
            </VBtn>
          </VCol>
        </VRow>
        <div v-if="error" class="text-error mt-2" aria-live="assertive">{{ error }}</div>
      </VCardText>
    </VCard>

    <VImg
      class="auth-footer-mask d-none d-md-block"
      :src="authThemeMask"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
