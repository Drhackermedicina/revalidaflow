<script setup>
import { ref, onMounted } from 'vue'
import { useLoginAuth } from '@/composables/useLoginAuth.js'

// Components
import LoginBackground from '@/components/login/LoginBackground.vue'
import LoginCard from '@/components/login/LoginCard.vue'

const { loading, error, loginComGoogle, processarRedirectResult } = useLoginAuth()

// Estados para melhor UX
const showCard = ref(false)
const isLoadingAuth = ref(false)

// Processar resultado de redirect quando o usuário volta da autenticação
onMounted(async () => {
  // Simular carregamento inicial para melhor percepção
  await new Promise(resolve => setTimeout(resolve, 300))
  showCard.value = true

  try {
    isLoadingAuth.value = true
    await processarRedirectResult()
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Erro ao processar redirect:', err)
    }
  } finally {
    isLoadingAuth.value = false
  }
})

// Handle login action
const handleLogin = async () => {
  try {
    await loginComGoogle()
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Erro no login:', err)
    }
  }
}

// Clear error message
const clearError = () => {
  error.value = ''
}
</script>

<template>
  <div class="login-page">
    <!-- Advanced Background System -->
    <LoginBackground />

    <!-- Main Content -->
    <div class="login-content">
      <Transition name="fade-slide" appear>
        <LoginCard
          v-show="showCard"
          :loading="loading"
          :is-loading-auth="isLoadingAuth"
          :error="error"
          title="REVALIDA FLOW"
          welcome-title="Bem-vindo!"
          welcome-subtitle="Acesse usando sua conta do Google para começar sua jornada médica"
          @login="handleLogin"
          @clear-error="clearError"
        />
      </Transition>
    </div>
  </div>
</template>

<style lang="scss">
// Import all modular styles
@import '@/assets/styles/login/variables.scss';
@import '@/assets/styles/login/animations.scss';
@import '@/assets/styles/login/background.scss';
@import '@/assets/styles/login/card.scss';
@import '@/assets/styles/login/typography.scss';
@import '@/assets/styles/login/responsive.scss';

// Base styles
.login-page {
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
  max-width: 520px;
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

.login-content {
  z-index: 10;
}

</style>
