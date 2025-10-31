<template>
  <div class="login-background">
    <!-- Dynamic Gradient Layers -->
    <div class="gradient-layers">
      <div class="gradient-layer gradient-1"></div>
      <div class="gradient-layer gradient-2"></div>
      <div class="gradient-layer gradient-3"></div>
    </div>

    <!-- Medical Theme Elements -->
    <div class="medical-theme-bg">
      <div class="dna-pattern"></div>
      <div class="ecg-pattern"></div>
      <div class="medical-icons">
        <div
          v-for="icon in medicalIcons"
          :key="icon.id"
          :class="['medical-icon', icon.className]"
          :aria-label="icon.label"
        >
          <span aria-hidden="true">{{ icon.symbol }}</span>
        </div>
      </div>
    </div>

    <!-- Interactive Mouse Glow -->
    <div
      ref="mouseGlow"
      class="mouse-glow"
      :style="mouseGlowStyle"
    />

    <!-- Particle System -->
    <MedicalParticles />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import MedicalParticles from './MedicalParticles.vue'

const mouseGlow = ref(null)
const mouseGlowStyle = ref({ opacity: 0 })
const medicalIcons = [
  { id: 1, symbol: '⚕️', className: 'icon-1', label: 'Símbolo da medicina' },
  { id: 2, symbol: '🩺', className: 'icon-2', label: 'Estetoscópio' },
  { id: 3, symbol: '💓', className: 'icon-3', label: 'Batimento cardíaco' },
  { id: 4, symbol: '➕', className: 'icon-4', label: 'Cruz médica' },
  { id: 5, symbol: '🧬', className: 'icon-5', label: 'DNA' },
  { id: 6, symbol: '💊', className: 'icon-6', label: 'Medicamento' }
] // Ícones médicos exibidos no fundo

/* Mouse tracking for glow effect */
const handleMouseMove = (e) => {
  if (!mouseGlow.value) return

  const x = e.clientX
  const y = e.clientY

  mouseGlowStyle.value = {
    left: `${x}px`,
    top: `${y}px`,
    opacity: 1
  }
}

const handleMouseLeave = () => {
  mouseGlowStyle.value = {
    ...mouseGlowStyle.value,
    opacity: 0
  }
}

onMounted(() => {
  // Add mouse tracking
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseleave', handleMouseLeave)

  // Initialize time-based animations
  startTimedAnimations()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseleave', handleMouseLeave)
})

/* Time-based background animations */
const startTimedAnimations = () => {
  // Change gradient intensity based on time of day
  const hour = new Date().getHours()
  let intensity = 0.6

  if (hour >= 6 && hour < 12) {
    intensity = 0.4 // Morning - softer
  } else if (hour >= 12 && hour < 18) {
    intensity = 0.6 // Afternoon - normal
  } else if (hour >= 18 && hour < 22) {
    intensity = 0.8 // Evening - stronger
  } else {
    intensity = 0.3 // Night - very soft
  }

  document.documentElement.style.setProperty('--bg-intensity', intensity)
}
</script>

<style scoped>
.login-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: hidden;
}

.gradient-layers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.gradient-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: var(--bg-intensity, 0.6);
}

.gradient-1 {
  background:
    radial-gradient(circle at 20% 80%, var(--medical-blue) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, var(--medical-green) 0%, transparent 50%);
  animation: gradient-shift-1 20s ease-in-out infinite;
}

.gradient-2 {
  background:
    radial-gradient(circle at 40% 40%, var(--login-primary) 0%, transparent 40%);
  animation: gradient-shift-2 25s ease-in-out infinite reverse;
}

.gradient-3 {
  background:
    linear-gradient(135deg,
      var(--bg-gradient-start) 0%,
      var(--bg-gradient-mid) 50%,
      var(--bg-gradient-end) 100%);
  animation: gradient-shift-3 30s ease-in-out infinite;
}

.medical-theme-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.dna-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      var(--medical-blue) 10px,
      var(--medical-blue) 12px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 10px,
      var(--medical-green) 10px,
      var(--medical-green) 12px
    );
  animation: float 20s ease-in-out infinite;
}

.ecg-pattern {
  position: absolute;
  bottom: 10%;
  left: 0;
  width: 100%;
  height: 100px;
  background: url("data:image/svg+xml,%3Csvg width='200' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,50 L30,50 L40,20 L50,80 L60,10 L70,90 L80,30 L90,50 L200,50' stroke='%238C57FF' stroke-width='2' fill='none' opacity='0.3'/%3E%3C/svg%3E") repeat-x;
  background-size: 200px 100px;
  animation: medical-pulse 3s ease-in-out infinite;
}

.medical-icons {
  position: absolute;
  width: 100%;
  height: 100%;
}

.medical-icon {
  position: absolute;
  opacity: 0.15;
  animation: float-icon 15s ease-in-out infinite;
  color: var(--login-primary);
  font-size: 2rem;
}

.icon-1 { top: 15%; left: 10%; animation-delay: 0s; }
.icon-2 { top: 25%; right: 15%; animation-delay: 2s; }
.icon-3 { top: 60%; left: 20%; animation-delay: 4s; }
.icon-4 { top: 70%; right: 10%; animation-delay: 6s; }
.icon-5 { top: 40%; left: 50%; animation-delay: 8s; }
.icon-6 { top: 80%; left: 60%; animation-delay: 10s; }

.mouse-glow {
  position: fixed;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(140, 87, 255, 0.1) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 2;
  transform: translate(-50%, -50%);
  transition: opacity 0.3s ease;
  will-change: transform;
}

/* Animations */
@keyframes gradient-shift-1 {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(5deg); }
}

@keyframes gradient-shift-2 {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(0.9) rotate(-3deg); }
}

@keyframes gradient-shift-3 {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes float-icon {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(5deg); }
  75% { transform: translateY(5px) rotate(-5deg); }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .medical-icon {
    font-size: 1.5rem;
  }

  .icon-5, .icon-6 {
    display: none; /* Hide some icons on mobile */
  }

  .mouse-glow {
    display: none; /* Disable on touch devices */
  }

  .ecg-pattern {
    bottom: 5%;
    height: 60px;
  }
}

/* Performance optimizations */
@media (max-width: 768px) {
  .dna-pattern {
    opacity: 0.05;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .gradient-layer,
  .dna-pattern,
  .ecg-pattern,
  .medical-icon {
    animation: none;
  }
}
</style>
