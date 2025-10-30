<script setup>
/**
 * SectionHeroCard.vue
 * Card alto, mais estreito, para destacar seções
 */
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  image: { type: String, default: null },
  badgeCount: { type: Number, default: 0 },
  color: { type: String, default: 'primary' },
  gradientStart: { type: String, default: '#EEF2FF' },
  gradientEnd: { type: String, default: '#FAFBFF' },
})

const emit = defineEmits(['click'])

function onClick() {
  emit('click')
}

// Ajuste de fundo por tema (evitar inline light em dark)
const theme = useTheme()
const isDark = computed(() => {
  try {
    return theme.global.current.value?.dark ?? theme.global.name.value === 'dark'
  } catch {
    return false
  }
})

const cardStyle = computed(() => {
  if (isDark.value) {
    return {
      background: 'linear-gradient(180deg, rgba(var(--v-theme-surface), 0.98), rgba(var(--v-theme-surface), 0.92))',
      color: 'rgb(var(--v-theme-on-surface))',
    }
  }
  return {
    background: `linear-gradient(180deg, ${props.gradientStart}, ${props.gradientEnd})`,
    color: 'rgb(var(--v-theme-on-surface))',
  }
})
</script>

<template>
  <v-card
    class="section-hero-card"
    :style="cardStyle"
    elevation="4"
    rounded="xl"
    @click="onClick"
  >
    <v-card-text class="pa-6 d-flex flex-column align-center text-center">
      <div class="hero-badge" v-if="badgeCount > 0">
        <v-chip :color="color" size="small" variant="elevated">{{ badgeCount }}</v-chip>
      </div>

      <div class="hero-media mb-4">
        <v-img v-if="image" :src="image" class="hero-image" />
        <div v-else class="hero-placeholder" />
      </div>

      <div class="hero-title mb-1">{{ title }}</div>
      <div v-if="subtitle" class="hero-subtitle mb-5">{{ subtitle }}</div>

      <v-btn :color="color" variant="flat" rounded="lg" class="mt-auto px-6">
        Abrir seção
      </v-btn>
    </v-card-text>
  </v-card>
  
</template>

<style scoped>
.section-hero-card {
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  /* Alto e estreito */
  max-width: 360px;
  min-height: 460px;
  color: rgb(var(--v-theme-on-surface));
}

.section-hero-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12);
}

.hero-badge {
  position: absolute;
  top: 16px;
  right: 16px;
}

.hero-media {
  width: 160px;
  height: 160px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.hero-image {
  width: 100%;
  height: 100%;
}

.hero-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.06);
}

.hero-title {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface)) !important;
}

.hero-subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Ajustes para tema escuro */
:deep(.v-theme--dark) .section-hero-card {
  background-color: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.28) !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

:deep(.v-theme--dark) .section-hero-card .hero-title,
:deep(.v-theme--dark) .section-hero-card .hero-subtitle {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 1 !important;
}

/* Garantir que o logo não seja cortado: usar object-fit: contain */
:deep(.hero-image .v-img__img) {
  object-fit: contain !important;
}

/* Botão e chip com contraste no dark */
:deep(.v-theme--dark) .section-hero-card .v-chip {
  background-color: rgba(var(--v-theme-primary), 0.22) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

:deep(.v-theme--dark) .section-hero-card .v-btn {
  background-color: rgba(var(--v-theme-primary), 0.22) !important;
  color: rgb(var(--v-theme-primary)) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.38) !important;
  box-shadow: none !important;
}
</style>
