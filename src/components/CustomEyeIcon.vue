<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true
  },
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: 'primary'
  }
})

// Theme
const theme = useTheme()
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Computed para determinar a cor baseada no tema e prop
const iconColor = computed(() => {
  if (props.color === 'primary') {
    return `rgb(var(--v-theme-${props.color}))`
  }
  return props.color
})

// Classes CSS dinâmicas
const iconClasses = computed(() => [
  'custom-eye-icon',
  {
    'custom-eye-icon--open': props.isOpen,
    'custom-eye-icon--closed': !props.isOpen,
    'custom-eye-icon--dark': isDarkTheme.value,
    'custom-eye-icon--light': !isDarkTheme.value
  }
])

// Estilo dinâmico
const iconStyle = computed(() => {
  const size = typeof props.size === 'number' ? props.size : parseInt(props.size) || 24
  return {
    width: `${size}px`,
    height: `${size}px`,
    color: iconColor.value,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    fontSize: `${size}px`,
    lineHeight: `${size}px`
  }
})
</script>

<template>
  <svg
    :class="iconClasses"
    :style="iconStyle"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    role="img"
  >
    <!-- Olho aberto - Design geométrico moderno -->
    <g v-if="isOpen" class="eye-open">
      <!-- Forma externa do olho - mais geométrica -->
      <path
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="rgba(var(--v-theme-primary), 0.1)"
      />
      
      <!-- Íris - design geométrico -->
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="rgba(var(--v-theme-primary), 0.2)"
        stroke="currentColor"
        stroke-width="1.5"
      />
      
      <!-- Pupila - formato mais moderno -->
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
      />
      
      <!-- Brilho no olho - efeito moderno -->
      <circle
        cx="13"
        cy="11"
        r="0.8"
        fill="rgba(var(--v-theme-surface), 0.8)"
      />
    </g>
    
    <!-- Olho fechado - Design geométrico moderno -->
    <g v-else class="eye-closed">
      <!-- Linha superior do olho fechado -->
      <path
        d="M2 12s3-2 10-2 10 2 10 2"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      
      <!-- Linhas do cílios - estilo geométrico -->
      <g stroke="currentColor" stroke-width="1" stroke-linecap="round">
        <!-- Cílios superiores -->
        <line x1="4" y1="10" x2="3" y2="8" />
        <line x1="7" y1="9" x2="6.5" y2="7" />
        <line x1="10" y1="8.5" x2="10" y2="6.5" />
        <line x1="14" y1="8.5" x2="14" y2="6.5" />
        <line x1="17" y1="9" x2="17.5" y2="7" />
        <line x1="20" y1="10" x2="21" y2="8" />
      </g>
      
      <!-- Arco inferior do olho fechado -->
      <path
        d="M2 12s3 2 10 2 10-2 10-2"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
        stroke-dasharray="3 2"
        opacity="0.6"
      />
    </g>
  </svg>
</template>

<style scoped>
.custom-eye-icon {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: inline-block;
  flex-shrink: 0;
  max-width: none !important;
  max-height: none !important;
}

/* Forçar tamanho dentro de containers Vuetify */
.custom-eye-icon svg {
  width: inherit !important;
  height: inherit !important;
  min-width: inherit !important;
  min-height: inherit !important;
  flex-shrink: 0;
}

/* Override de possíveis restrições do Vuetify */
:deep(.v-field__append-inner) .custom-eye-icon {
  width: inherit !important;
  height: inherit !important;
  min-width: inherit !important;
  min-height: inherit !important;
  flex-shrink: 0;
}

.custom-eye-icon:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.custom-eye-icon:active {
  transform: scale(0.95);
}

/* Animações específicas para olho aberto */
.eye-open {
  animation: eyeBlink 4s infinite;
}

.eye-open path,
.eye-open circle {
  transition: all 0.3s ease;
}

.custom-eye-icon:hover .eye-open circle {
  fill-opacity: 0.3;
}

/* Animações específicas para olho fechado */
.eye-closed path,
.eye-closed line {
  transition: all 0.3s ease;
}

.custom-eye-icon:hover .eye-closed line {
  stroke-width: 1.5;
}

/* Animação de piscar */
@keyframes eyeBlink {
  0%, 90%, 100% {
    opacity: 1;
  }
  95% {
    opacity: 0.3;
  }
}

/* Variações de tema */
.custom-eye-icon--dark {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.custom-eye-icon--light {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* Focus para acessibilidade */
.custom-eye-icon:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 4px;
}

/* Animação de transição entre estados */
.custom-eye-icon--closed .eye-closed {
  animation: eyeClose 0.3s ease-out;
}

.custom-eye-icon--open .eye-open {
  animation: eyeOpen 0.3s ease-out;
}

@keyframes eyeClose {
  from {
    opacity: 0;
    transform: scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes eyeOpen {
  from {
    opacity: 0;
    transform: scaleY(1.2);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}
</style>