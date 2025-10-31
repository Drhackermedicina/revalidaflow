<template>
  <div class="login-card">
    <!-- Inner glow effect -->
    <div class="card-glow"></div>

    <!-- Card content -->
    <div class="login-card-content">
      <!-- Animated Title -->
      <AnimatedTitle
        :title="title"
        :subtitle="subtitle"
        :emoji="emoji"
        :show-subtitle="showSubtitle"
      />

      <!-- Welcome Section -->
      <div class="welcome-section typography-slide-up stagger-2">
        <h3 class="welcome-title">
          <span class="emoji-accent">👋🏻</span>
          {{ welcomeTitle }}
        </h3>
        <p class="welcome-subtitle">
          {{ welcomeSubtitle }}
        </p>
      </div>

      <!-- Login Form -->
      <div class="login-form typography-slide-up stagger-3">
        <VBtn
          block
          size="large"
          :loading="loading"
          :disabled="loading || isLoadingAuth"
          color="primary"
          variant="elevated"
          class="google-btn text-white hover-lift"
          aria-label="Entrar com Google"
          @click="$emit('login')"
        >
          <template v-slot:loader>
            <VProgressCircular
              indeterminate
              size="20"
              width="2"
              class="mr-2"
            />
            Conectando...
          </template>
          <VIcon
            start
            icon="ri-google-fill"
            size="20"
          />
          <span class="button-text">Entrar com Google</span>
        </VBtn>

        <!-- Skeleton loading state -->
        <div v-if="isLoadingAuth" class="login-loading mt-4">
          <div class="skeleton-loader"></div>
        </div>

        <!-- Enhanced Error Alert -->
        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="login-alert mt-4"
          closable
          aria-live="assertive"
          @click:close="$emit('clearError')"
        >
          <template v-slot:title>
            <span class="error-text">Erro de autenticação</span>
          </template>
          <span class="error-text">{{ error }}</span>
        </VAlert>

      </div>

      <!-- Additional Options -->
      <div class="additional-options typography-slide-up stagger-4">
        <div class="options-divider">
          <span class="divider-text">ou</span>
        </div>

        <div class="additional-links">
          <RouterLink
            to="/register"
            class="help-link typography-hover"
          >
            Precisa de ajuda?
          </RouterLink>

          <RouterLink
            to="/"
            class="about-link typography-hover"
          >
            Sobre o Revalida Flow
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import AnimatedTitle from './AnimatedTitle.vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  isLoadingAuth: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: 'REVALIDA FLOW'
  },
  subtitle: {
    type: String,
    default: ''
  },
  welcomeTitle: {
    type: String,
    default: 'Bem-vindo!'
  },
  welcomeSubtitle: {
    type: String,
    default: 'Acesse usando sua conta do Google para começar'
  },
  emoji: {
    type: String,
    default: ''
  },
  showSubtitle: {
    type: Boolean,
    default: false
  }
})

defineEmits(['login', 'clearError'])
</script>

<style scoped>
.login-card {
  position: relative;
  z-index: 10;
  border-radius: 24px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px); /* Reduzido de 20px para 12px */
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  transition: all var(--transition-medium);
  overflow: hidden;
  max-width: 100%;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(140, 87, 255, 0.5),
    transparent
  );
  animation: shimmer 3s infinite;
}

.login-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(140, 87, 255, 0.3);
}

.login-card:hover .card-glow {
  opacity: 1;
}

.login-card-content {
  position: relative;
  z-index: 11;
  padding: 2rem;
  isolation: isolate; /* Isolar conteúdo do efeito backdrop-filter */

  /* Garantir que elementos de texto sejam renderizados corretamente */
  .modern-title {
    /* Forçar nova camada de composição para evitar problemas com backdrop-filter */
    transform: translateZ(0);
    will-change: transform;
  }

  .title-gradient {
    /* Garantir que o gradiente funcione mesmo com backdrop-filter */
    isolation: isolate;
    position: relative;
    z-index: 2;
  }
}

.welcome-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.welcome-title {
  font-size: var(--subtitle-size);
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.emoji-accent {
  font-size: 1.2em;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(140, 87, 255, 0.4));
}

.welcome-subtitle {
  font-size: var(--body-size);
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
}

.login-form {
  margin-bottom: 1.5rem;
}

.google-btn {
  position: relative;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  height: 56px;
  text-transform: none;
  letter-spacing: 0.02em;
  overflow: hidden;
  background: var(--title-gradient);
  border: none;
  box-shadow: 0 8px 24px rgba(140, 87, 255, 0.3);
}

.google-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.6s;
}

.google-btn:hover::before {
  left: 100%;
}

.google-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 32px rgba(140, 87, 255, 0.4);
}

.google-btn:active {
  transform: translateY(-1px) scale(1.01);
}

.login-loading {
  margin-top: 1rem;
}

.skeleton-loader {
  background: var(--glass-bg);
  border-radius: 12px;
  height: 56px;
  position: relative;
  overflow: hidden;
}

.skeleton-loader::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(140, 87, 255, 0.2),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

.login-alert {
  border-radius: 12px;
  margin-top: 1.5rem;
  animation: slideDown 0.4s var(--transition-bounce);
  backdrop-filter: blur(10px);
}

.login-alert.v-alert--error {
  background: rgba(230, 57, 70, 0.1);
  border: 1px solid rgba(230, 57, 70, 0.3);
  color: #ff6b6b;
}

.login-alert.v-alert--success {
  background: rgba(82, 183, 136, 0.1);
  border: 1px solid rgba(82, 183, 136, 0.3);
  color: var(--medical-green);
}

.additional-options {
  text-align: center;
  margin-top: 1.5rem;
}

.options-divider {
  position: relative;
  margin: 1.5rem 0;
  text-align: center;
}

.options-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.divider-text {
  background: var(--glass-bg);
  color: rgba(255, 255, 255, 0.6);
  padding: 0 1rem;
  font-size: 0.9rem;
  position: relative;
  z-index: 1;
}

.additional-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-link,
.about-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.help-link:hover,
.about-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .login-card {
    margin: 1rem;
    border-radius: 20px;
  }

  .login-card-content {
    padding: 1.5rem;
  }

  .welcome-title {
    font-size: 1.3rem;
  }

  .welcome-subtitle {
    font-size: 0.95rem;
  }

  .google-btn {
    height: 48px;
    font-size: 1rem;
  }

  .additional-links {
    font-size: 0.85rem;
  }
}

@media (max-width: 400px) {
  .login-card-content {
    padding: 1.25rem;
  }

  .welcome-title {
    font-size: 1.2rem;
  }

  .welcome-subtitle {
    font-size: 0.9rem;
  }
}

/* Dark theme adjustments */
.v-theme--dark {
  .login-card {
    background: var(--glass-bg-dark);
    border-color: rgba(140, 87, 255, 0.2);
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.4);
  }

  .login-card:hover {
    border-color: rgba(140, 87, 255, 0.4);
  }

  .welcome-subtitle {
    color: rgba(255, 255, 255, 0.6);
  }

  .divider-text {
    background: var(--glass-bg-dark);
  }
}

/* High contrast for accessibility */
@media (prefers-contrast: high) {
  .login-card {
    border: 2px solid var(--login-primary);
    background: rgba(255, 255, 255, 0.95);
  }

  .v-theme--dark .login-card {
    background: rgba(0, 0, 0, 0.95);
    border-color: var(--login-primary-light);
  }
}
</style>
