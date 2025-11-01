<script setup>
import { computed, onMounted } from 'vue'

// Props opcionais para customização
const props = defineProps({
  title: {
    type: String,
    default: 'REVALIDA FLOW'
  },
  to: {
    type: String,
    default: '/app/dashboard'
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

// Tamanhos do texto
const fontSize = computed(() => {
  const sizes = {
    small: '1rem',
    medium: '1.5rem',
    large: '2rem'
  }
  return sizes[props.size]
})

// Quebrar o título em letras para animação individual
const letters = computed(() => props.title.split(''))

// Debug: verificar se o componente foi montado
onMounted(() => {
  console.log('✅ [NavbarBrand] MONTADO!')
  console.log('   → Título:', props.title)
  console.log('   → Tamanho:', props.size)
  console.log('   → Font-size:', fontSize.value)
  
  // Debug extremo: verificar elementos no DOM
  setTimeout(() => {
    const wrapper = document.querySelector('.navbar-logo-wrapper')
    const text = document.querySelector('.navbar-logo-text')
    const letters = document.querySelectorAll('.navbar-logo-letter')
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 DIAGNÓSTICO DO LOGO NO DOM:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 1. Verificar se elementos existem
    console.log('1️⃣ ELEMENTOS ENCONTRADOS:')
    console.log('   wrapper (.navbar-logo-wrapper):', wrapper ? '✅ SIM' : '❌ NÃO')
    console.log('   text (.navbar-logo-text):', text ? '✅ SIM' : '❌ NÃO')
    console.log('   letters (.navbar-logo-letter):', letters.length, 'letras')
    
    if (wrapper) {
      const wrapperStyle = window.getComputedStyle(wrapper)
      console.log('')
      console.log('2️⃣ ESTILOS DO WRAPPER:')
      console.log('   display:', wrapperStyle.display)
      console.log('   width:', wrapperStyle.width)
      console.log('   height:', wrapperStyle.height)
      console.log('   visibility:', wrapperStyle.visibility)
      console.log('   opacity:', wrapperStyle.opacity)
    }
    
    if (text) {
      const textStyle = window.getComputedStyle(text)
      console.log('')
      console.log('3️⃣ ESTILOS DO TEXTO:')
      console.log('   color:', textStyle.color)
      console.log('   font-size:', textStyle.fontSize)
      console.log('   font-weight:', textStyle.fontWeight)
      console.log('   display:', textStyle.display)
      console.log('   opacity:', textStyle.opacity)
      console.log('   visibility:', textStyle.visibility)
      
      console.log('')
      console.log('4️⃣ DIMENSÕES DO TEXTO:')
      console.log('   width:', text.offsetWidth, 'px')
      console.log('   height:', text.offsetHeight, 'px')
      console.log('   top:', text.offsetTop, 'px')
      console.log('   left:', text.offsetLeft, 'px')
      
      console.log('')
      console.log('5️⃣ POSIÇÃO NA TELA:')
      const rect = text.getBoundingClientRect()
      console.log('   x:', rect.x)
      console.log('   y:', rect.y)
      console.log('   visível na viewport:', rect.y >= 0 && rect.y <= window.innerHeight ? '✅ SIM' : '❌ NÃO')
    }
    
    // Verificar nav-header
    const navHeader = document.querySelector('.nav-header')
    if (navHeader) {
      const navStyle = window.getComputedStyle(navHeader)
      console.log('')
      console.log('6️⃣ NAV-HEADER (container pai):')
      console.log('   existe:', '✅ SIM')
      console.log('   display:', navStyle.display)
      console.log('   height:', navStyle.height)
      console.log('   background:', navStyle.background.substring(0, 50) + '...')
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, 1000)
})
</script>

<template>
  <RouterLink :to="to" class="navbar-brand">
    <div class="navbar-logo-wrapper">
      <!-- Glow effect atrás do texto -->
      <div 
        class="navbar-logo-glow" 
        :style="{ fontSize }"
        aria-hidden="true"
      >
        {{ title }}
      </div>

      <!-- Texto principal com gradiente -->
      <h1 class="navbar-logo-text" :style="{ fontSize }">
        <span
          v-for="(letter, index) in letters"
          :key="`${letter}-${index}`"
          class="navbar-logo-letter"
          :style="{ animationDelay: `${index * 0.05}s` }"
        >
          {{ letter === ' ' ? '\u00A0' : letter }}
        </span>
      </h1>
    </div>
  </RouterLink>
</template>

<style scoped>
.navbar-logo-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 6px;
}

.navbar-logo-glow {
  position: absolute;
  inset: 0;
  transform: scale(1.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  -webkit-text-fill-color: transparent;
  background: var(--navbar-logo-gradient);
  background-size: 220% 220%;
  filter: blur(18px);
  opacity: 0.45;
  pointer-events: none;
  border-radius: 14px;
  animation: gradient-shift 12s ease infinite;
}

.navbar-logo-text {
  margin: 0 !important;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  font-weight: 800 !important;
  font-size: 1.45rem !important;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--navbar-logo-gradient);
  background-size: 220% 220%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 12s ease infinite;
  filter: drop-shadow(0 8px 18px rgba(8, 12, 28, 0.55));
}

@supports not (-webkit-background-clip: text) {
  .navbar-logo-text {
    color: #f4f7ff !important;
    -webkit-text-fill-color: #f4f7ff !important;
  }
}

.navbar-logo-letter {
  display: inline-block;
  opacity: 0;
  color: inherit;
  animation: letter-fade-in 0.5s var(--transition-bounce, cubic-bezier(0.68, -0.55, 0.265, 1.55)) forwards;
}

@keyframes letter-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .navbar-logo-letter {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .navbar-logo-text,
  .navbar-logo-glow {
    animation: none;
  }
}
</style>

