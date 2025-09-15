<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

// Imagens e Logo
import authV1MaskDark from '@images/pages/auth-v1-mask-dark.png'
import authV1MaskLight from '@images/pages/auth-v1-mask-light.png'
import revalidaFacilLogo from '@images/revalidafacillogo.png'

const vuetifyTheme = useTheme()
const router = useRouter()

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light' ? authV1MaskLight : authV1MaskDark
})

// Dados do formulário
const agentCode = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

// Função de login para agentes
async function loginAgent() {
  loading.value = true
  error.value = ''

  try {
    // Simulação de autenticação - substitua por lógica real
    if (agentCode.value && password.value) {
      // Aqui você pode integrar com Firebase Auth ou serviço de backend
      // Por exemplo: await signInWithEmailAndPassword(firebaseAuth, agentCode.value, password.value)
      console.log('Login de agente:', agentCode.value)
      router.push('/app/dashboard') // Redirecionar após login
    } else {
      throw new Error('Preencha todos os campos')
    }
  } catch (err) {
    error.value = err.message || 'Erro ao fazer login. Tente novamente.'
  } finally {
    loading.value = false
  }
}
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
            :src="revalidaFacilLogo"
            alt="Revalida Fácil Logo"
            style="block-size: 40px;"
          >
          <h2 class="font-weight-medium text-2xl text-uppercase">
            REVALIDA FÁCIL
          </h2>
        </RouterLink>
      </VCardItem>

      <VCardText class="pt-2">
        <h4 class="text-h4 mb-1">
          Login de Agente
        </h4>
        <p class="mb-0">
          Insira seu código de agente e senha para acessar
        </p>
      </VCardText>

      <VCardText>
        <VForm @submit.prevent="loginAgent">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="agentCode"
                label="Código de Agente"
                placeholder="Digite seu código de agente"
                :rules="[v => !!v || 'Código de agente é obrigatório']"
                required
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="password"
                label="Senha"
                placeholder="Digite sua senha"
                type="password"
                :rules="[v => !!v || 'Senha é obrigatória']"
                required
              />
            </VCol>
            <VCol cols="12">
              <VBtn
                block
                type="submit"
                :loading="loading"
                color="primary"
                class="text-white"
                aria-label="Entrar como Agente"
              >
                Entrar como Agente
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
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