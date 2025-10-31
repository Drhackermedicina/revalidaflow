<template>
  <div class="particle-container">
    <!-- Medical Particles -->
    <div
      v-for="(particle, index) in particles"
      :key="`particle-${index}`"
      :class="[
        'particle',
        particle.type,
        `particle-${index}`
      ]"
      :style="particle.style"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const particles = ref([])

/* Particle configuration */
const particleTypes = [
  { type: 'medical-cell', size: 8, color: 'var(--medical-green)' },
  { type: 'medical-molecule', size: 6, color: 'var(--medical-blue)' },
  { type: 'primary-particle', size: 10, color: 'var(--login-primary)' },
  { type: 'medical-cell', size: 7, color: 'var(--medical-green-light)' },
  { type: 'medical-molecule', size: 5, color: 'var(--medical-blue-light)' }
]

const generateParticles = () => {
  const particleArray = []
  const particleCount = window.innerWidth < 600 ? 6 : 12

  for (let i = 0; i < particleCount; i++) {
    const particleType = particleTypes[i % particleTypes.length]
    const delay = Math.random() * 15
    const duration = 15 + Math.random() * 10
    const startPosition = Math.random() * 100

    particleArray.push({
      type: particleType.type,
      style: {
        left: `${startPosition}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        width: `${particleType.size}px`,
        height: `${particleType.size}px`,
        background: particleType.color,
        boxShadow: `0 0 ${particleType.size * 2}px ${particleType.color}`
      }
    })
  }

  particles.value = particleArray
}

onMounted(() => {
  generateParticles()

  // Regenerate particles on window resize
  const handleResize = () => {
    generateParticles()
  }

  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<style scoped>
.particle-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.7;
  animation: particle-float linear infinite;
}

.particle-medical-cell {
  width: 8px;
  height: 8px;
}

.particle-medical-molecule {
  width: 6px;
  height: 6px;
}

.particle-primary-particle {
  width: 10px;
  height: 10px;
}

@keyframes particle-float {
  0% {
    transform: translateY(100vh) rotate(0deg) scale(0);
    opacity: 0;
  }
  10% {
    transform: translateY(90vh) rotate(45deg) scale(1);
    opacity: 0.8;
  }
  90% {
    transform: translateY(10vh) rotate(315deg) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-10vh) rotate(360deg) scale(0);
    opacity: 0;
  }
}

/* Performance optimizations for mobile */
@media (max-width: 600px) {
  .particle {
    will-change: transform;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .particle {
    animation: none;
    position: static;
    display: none;
  }
}
</style>