<template>
  <div class="animated-title-container">
    <RouterLink to="/" class="logo-link">
      <div class="title-wrapper">
        <!-- Glow effect behind text -->
        <div class="title-glow" :style="titleStyle">
          {{ title }}
        </div>

        <!-- Main title text -->
        <h1 class="modern-title">
          <span
            class="title-gradient"
            :style="titleStyle"
            :data-text="title"
          >
            <span
              v-for="(letter, index) in letters"
              :key="index"
              class="letter"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              {{ letter === ' ' ? '\u00A0' : letter }}
            </span>
          </span>
        </h1>

        <!-- Decorative elements -->
        <div class="title-decorations">
          <div class="decoration decoration-left"></div>
          <div class="decoration decoration-right"></div>
        </div>
      </div>
    </RouterLink>

    <!-- Subtitle with emoji -->
    <div class="subtitle-container" v-if="showSubtitle">
      <h2 class="modern-subtitle">
        <span class="subtitle-text">
          <span class="emoji-accent">{{ emoji }}</span>
          {{ subtitle }}
        </span>
      </h2>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    default: 'REVALIDA FLOW'
  },
  subtitle: {
    type: String,
    default: 'Bem-vindo!'
  },
  emoji: {
    type: String,
    default: '👋🏻'
  },
  showSubtitle: {
    type: Boolean,
    default: true
  },
  animateOnMount: {
    type: Boolean,
    default: true
  }
})

// Simplificado: usar título diretamente para garantir visibilidade imediata
const letters = computed(() => props.title.split(''))
const titleStyle = computed(() => {
  // Verificar se a variável CSS está disponível
  const rootStyles = getComputedStyle(document.documentElement)
  const gradientValue = rootStyles.getPropertyValue('--title-gradient') ||
                       'linear-gradient(135deg, #8C57FF 0%, #00B4D8 50%, #52B788 100%)'

  return {
    backgroundImage: gradientValue.trim(),
    backgroundSize: '200% 200%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    // Fallback de cor sólida
    color: 'white',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
  }
})

// Simplified initialization - no complex typing effect
onMounted(() => {
  // Title is immediately available, no async operations needed

  // Garantir visibilidade do título após montagem
  nextTick(() => {
    const titleElement = document.querySelector('.title-gradient')
    if (titleElement) {
      // Forçar re-renderização para garantir que o gradiente seja aplicado
      titleElement.style.display = 'none'
      titleElement.offsetHeight // Trigger reflow
      titleElement.style.display = 'block'
    }
  })
})
</script>

<style scoped>
.animated-title-container {
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
  z-index: 100; /* Garantir que o título esteja acima de tudo */
}

.logo-link {
  display: inline-block;
  text-decoration: none;
  transition: transform var(--transition-fast);
}

.logo-link:hover {
  transform: scale(1.02);
}

.title-wrapper {
  position: relative;
  display: inline-block;
}

.modern-title {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: var(--title-size);
  font-weight: var(--title-font-weight);
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0;
  position: relative;
  z-index: 2;
}

.title-gradient {
  position: relative;
  z-index: 2;
  display: block;
  animation: gradient-shift 8s ease infinite;

  /* Garantir que o gradiente seja aplicado mesmo com backdrop-filter */
  background: var(--title-gradient);
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  /* Fallback sólido para navegadores que não suportam background-clip: text */
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}

/* Fallback para garantir visibilidade do texto */
.title-gradient::before {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Detectar quando o gradiente não está funcionando */
@supports not (-webkit-background-clip: text) {
  .title-gradient::before {
    opacity: 1;
  }
  .title-gradient {
    -webkit-text-fill-color: white;
    background: none;
    color: white;
  }
}

/* Fallback específico para quando o backdrop-filter interfere */
@supports (backdrop-filter: blur(12px)) {
  .title-gradient {
    /* Garantir visibilidade mesmo com backdrop-filter */
    color: white !important;
    text-shadow:
      0 0 20px rgba(140, 87, 255, 0.8),
      0 2px 10px rgba(0, 0, 0, 0.8) !important;
    /* Forçar visibilidade */
    -webkit-text-fill-color: white !important;
    background: none !important;
  }

  /* Tentar aplicar o gradiente em uma camada separada */
  .title-gradient::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--title-gradient);
    background-size: 200% 200%;
    z-index: -2;
    opacity: 0.3;
    mix-blend-mode: screen;
    animation: gradient-shift 8s ease infinite;
    border-radius: 0.1em;
  }
}

/* Garantir fallback final para todos os casos */
.title-gradient {
  /* Forçar texto branco visível - IMPORTANTE! */
  color: white !important;
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.8) !important;
  -webkit-text-fill-color: white !important;
  background: none !important;
}

/* Sobrescrever todas as regras que podem tornar o texto invisível */
.title-gradient * {
  color: white !important;
  -webkit-text-fill-color: white !important;
}

/* Fallback para navegadores muito antigos */
@media (max-resolution: 1dppx) {
  .title-gradient {
    background: none !important;
    -webkit-text-fill-color: white !important;
    color: white !important;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8) !important;
  }
}

.title-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: var(--title-size);
  font-weight: var(--title-font-weight);
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0;
  filter: blur(8px); /* Reduzido blur para melhor contraste */
  opacity: 0.8; /* Aumentado opacidade para melhor visibilidade */
  z-index: 1;
  animation: gradient-shift 8s ease infinite;
  background-size: 200% 200%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.letter {
  display: inline-block;
  opacity: 1; /* Fallback: sempre visível */
  transform: translateY(0) rotateX(0deg); /* Fallback: posição normal */
  animation: letter-reveal 0.4s var(--transition-bounce) forwards;
}

/* Fallback for browsers that don't support animations */
@supports not (animation: letter-reveal) {
  .letter {
    opacity: 1;
    transform: none;
  }
}

.title-decorations {
  position: absolute;
  top: 50%;
  width: 100%;
  height: 2px;
  pointer-events: none;
}

.decoration {
  position: absolute;
  height: 2px;
  background: var(--title-gradient);
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}

.decoration-left {
  left: -60px;
  right: 110%;
  transform: translateY(-50%);
}

.decoration-right {
  right: -60px;
  left: 110%;
  transform: translateY(-50%);
}

.subtitle-container {
  margin-top: 1.5rem;
  animation: fade-in-up 0.8s var(--transition-smooth) 0.5s both;
}

.modern-subtitle {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: var(--subtitle-size);
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  position: relative;
}

.subtitle-text {
  color: white;
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.emoji-accent {
  font-size: 1.1em;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(140, 87, 255, 0.4));
}

/* Decorative underline */
.modern-subtitle::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: var(--title-gradient);
  border-radius: 2px;
  animation: slide-in-left 0.8s var(--transition-smooth) 0.5s both;
}

/* Animations */
@keyframes letter-reveal {
  0% {
    opacity: 0.3;
    transform: translateY(5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .modern-title {
    font-size: 2rem;
  }

  .title-glow {
    font-size: 2rem;
  }

  .letter {
    animation-duration: 0.4s;
  }

  .decoration-left {
    left: -40px;
  }

  .decoration-right {
    right: -40px;
  }

  .modern-subtitle {
    font-size: 1.3rem;
  }
}

@media (max-width: 400px) {
  .modern-title {
    font-size: 1.8rem;
  }

  .title-glow {
    font-size: 1.8rem;
  }

  .decoration-left,
  .decoration-right {
    display: none;
  }

  .modern-subtitle {
    font-size: 1.2rem;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .letter {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .title-gradient,
  .title-glow,
  .decoration {
    animation: none;
  }

  .emoji-accent {
    animation: none;
  }
}

/* Dark theme adjustments */
.v-theme--dark .subtitle-text {
  color: white;
}
</style>
