<script setup>
import { ref, onMounted } from 'vue'
import { useRegister } from '@/composables/useRegister.js'
import LoginBackground from '@/components/login/LoginBackground.vue'
import AnimatedTitle from '@/components/login/AnimatedTitle.vue'

console.log('[Register] Iniciando componente de registro...')

const showCard = ref(false)
const isLoadingAuth = ref(false)

const {
  loading,
  error,
  usuarioGoogle,
  form,
  loginComGoogle,
  salvarUsuarioFirestore,
  processarRedirectResult,
  aplicarMascaraCPF,
} = useRegister()

onMounted(async () => {
  console.log('[Register] Verificando resultado de redirect...')
  await new Promise(resolve => setTimeout(resolve, 300))
  showCard.value = true

  try {
    isLoadingAuth.value = true
    await processarRedirectResult()
  } catch (processErr) {
    if (import.meta.env.DEV) {
      console.error('[Register] Erro ao processar redirect:', processErr)
    }
  } finally {
    isLoadingAuth.value = false
  }
})

async function handleGoogleLogin() {
  console.log('[Register] Botão "Registrar com Google" clicado!')
  console.log('[Register] Estado atual antes do login:', {
    loading: loading.value,
    error: error.value,
    usuarioGoogle: usuarioGoogle.value,
    form: form.value
  })

  try {
    await loginComGoogle()
    console.log('[Register] loginComGoogle executado com sucesso.')
  } catch (e) {
    console.error('[Register] Erro capturado ao executar loginComGoogle:', e)
  }
}

const clearError = () => {
  error.value = ''
}

const redirectToWhatsApp = () => {
  const phoneNumber = '5545998606685'
  const message = encodeURIComponent('Olá! Preciso de ajuda com o cadastro no Revalida Flow.')
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
  window.open(whatsappUrl, '_blank')
}

console.log('[Register] Componente inicializado com useRegister:', {
  loading: loading.value,
  error: error.value,
  usuarioGoogle: usuarioGoogle.value,
  form: form.value
})
</script>

<template>
  <div class="login-page register-page">
    <LoginBackground />

    <div class="login-content">
      <Transition name="fade-slide" appear>
        <div v-show="showCard" class="login-card register-card">
          <div class="card-glow"></div>
          <div class="login-card-content">
            <AnimatedTitle
              title="REVALIDA FLOW"
              subtitle="Complete seu cadastro e desbloqueie o melhor treinamento para o Revalida"
              emoji="🩺"
              :show-subtitle="true"
            />

            <div class="welcome-section typography-slide-up stagger-2">
              <h3 class="welcome-title">
                <span class="emoji-accent">🚀</span>
                Comece sua jornada
              </h3>
              <p class="welcome-subtitle">
                Conecte-se com sua conta Google e finalize seus dados para liberar o acesso completo.
              </p>
            </div>

            <div class="login-form typography-slide-up stagger-3">
              <VBtn
                v-if="!usuarioGoogle"
                block
                size="large"
                :loading="loading"
                :disabled="loading || isLoadingAuth"
                color="primary"
                variant="elevated"
                class="google-btn text-white hover-lift"
                aria-label="Registrar com Google"
                @click="handleGoogleLogin"
              >
                <template #loader>
                  <VProgressCircular indeterminate size="20" width="2" class="mr-2" />
                  Conectando...
                </template>
                <VIcon start icon="ri-google-fill" size="20" />
                <span class="button-text">Registrar com Google</span>
              </VBtn>

              <div v-if="isLoadingAuth" class="login-loading mt-4">
                <div class="skeleton-loader"></div>
              </div>

              <VAlert
                v-if="error"
                type="error"
                variant="tonal"
                class="login-alert mt-4"
                closable
                aria-live="assertive"
                @click:close="clearError"
              >
                <template #title>
                  <span class="error-text">Erro de cadastro</span>
                </template>
                <span class="error-text">{{ error }}</span>
              </VAlert>
            </div>

            <VExpandTransition>
              <div v-if="usuarioGoogle" class="register-form">
                <div class="register-header">
                  <div class="register-avatar">
                    <VAvatar
                      v-if="usuarioGoogle?.photoURL"
                      :image="usuarioGoogle.photoURL"
                      size="64"
                    />
                    <VAvatar
                      v-else
                      color="primary"
                      size="64"
                    >
                      <VIcon icon="mdi-account-plus" />
                    </VAvatar>
                  </div>
                  <div class="register-greeting">
                    <h4>{{ usuarioGoogle?.displayName || 'Olá!' }}</h4>
                    <p>Último passo: confirme seus dados para liberar o acesso.</p>
                  </div>
                </div>

                <VForm @submit.prevent="salvarUsuarioFirestore">
                  <VRow dense>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model="form.nome"
                        label="Nome"
                        required
                        prepend-inner-icon="mdi-account"
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model="form.sobrenome"
                        label="Sobrenome"
                        required
                        prepend-inner-icon="mdi-account-outline"
                      />
                    </VCol>
                    <VCol cols="12">
                      <VTextField
                        v-model="form.cpf"
                        label="CPF"
                        required
                        prepend-inner-icon="mdi-card-account-details"
                        maxlength="14"
                        hint="Digite apenas números"
                        persistent-hint
                        @input="form.cpf = aplicarMascaraCPF(form.cpf)"
                      />
                    </VCol>
                    <VCol cols="12">
                      <VTextField
                        v-model="form.inviteCode"
                        label="Código de convite (opcional)"
                        prepend-inner-icon="mdi-ticket-account"
                        hint="Informe o código recebido para liberar 30 dias de acesso"
                        persistent-hint
                        maxlength="16"
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model="form.cidade"
                        label="Cidade"
                        prepend-inner-icon="mdi-city"
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model="form.paisOrigem"
                        label="País de Origem"
                        prepend-inner-icon="mdi-earth"
                      />
                    </VCol>
                  </VRow>

                  <div class="terms-wrapper">
                    <VCheckbox
                      v-model="form.aceitouTermos"
                      label="Li e aceito os termos de uso"
                      required
                    />
                  </div>

                  <div class="form-actions">
                    <VBtn
                      :loading="loading"
                      type="submit"
                      color="success"
                      block
                      class="submit-btn"
                      :disabled="!form.nome || !form.sobrenome || !form.cpf || !form.aceitouTermos"
                      aria-label="Salvar e Continuar"
                    >
                      <VIcon start icon="mdi-arrow-right-bold" />
                      Salvar e Continuar
                    </VBtn>
                  </div>
                </VForm>
              </div>
            </VExpandTransition>

            <div class="additional-options">
              <div class="additional-links">
                <button
                  type="button"
                  class="help-link typography-hover"
                  @click="redirectToWhatsApp"
                >
                  Precisa de ajuda?
                </button>
                <RouterLink
                  to="/login"
                  class="about-link typography-hover"
                >
                  Já tem conta? Fazer login
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style lang="scss">
@import '@/assets/styles/login/variables.scss';
@import '@/assets/styles/login/animations.scss';
@import '@/assets/styles/login/background.scss';
@import '@/assets/styles/login/card.scss';
@import '@/assets/styles/login/typography.scss';
@import '@/assets/styles/login/responsive.scss';

.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  position: relative;
  z-index: 1;
}

.login-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 640px;
}

.register-card {
  max-width: 100%;
}

// Global animations
.fade-slide-enter-active {
  transition: all 0.8s var(--transition-smooth);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

// Ensure proper stacking
.login-background {
  z-index: 1;
}

.register-form {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: 18px;
  background: rgba(12, 20, 33, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 45px rgba(17, 24, 39, 0.45);
}

.register-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.register-greeting {
  h4 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
  }

  p {
    margin: 0.25rem 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
  }
}

.terms-wrapper {
  margin-top: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.form-actions {
  margin-top: 1.5rem;
}

.submit-btn {
  border-radius: 16px;
  height: 56px;
  font-size: 1.05rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 30px rgba(82, 183, 136, 0.35);
}

.additional-options {
  margin-top: 2.5rem;
}

.additional-links {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.register-page .help-link,
.register-page .about-link {
  color: rgba(255, 255, 255, 0.85);
}

// Global animations
.fade-slide-enter-active {
  transition: all 0.8s var(--transition-smooth);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

// Ensure proper stacking
.login-background {
  z-index: 1;
}

@media (max-width: 600px) {
  .register-card {
    max-width: 100%;
  }

  .register-form {
    padding: 1.25rem;
  }

  .additional-links {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
