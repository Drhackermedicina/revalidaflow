<template>
  <VCard
    :class="[
      'welcome-card',
      isDarkTheme ? 'welcome-card--dark' : 'welcome-card--light'
    ]"
    elevation="3"
  >
    <VCardText class="pa-3">
      <!-- Header com Avatar e Saudação -->
      <div class="d-flex align-center mb-3 welcome-header">
        <VAvatar
          :image="userPhoto || undefined"
          :icon="!userPhoto ? 'ri-user-line' : undefined"
          size="56"
          :color="!userPhoto ? 'primary' : undefined"
          class="welcome-avatar elevation-4"
        />
        <div class="ms-4 flex-grow-1">
          <h2 class="text-h5 font-weight-bold mb-1 welcome-title">
            {{ greeting }}, {{ firstName }}! 👋
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ motivationalMessage }}
          </p>
        </div>
      </div>

      <!-- Streak Badge -->
      <div v-if="streakDays > 0" class="mb-2">
        <VChip
          color="success"
          variant="elevated"
          size="small"
          class="streak-chip"
        >
          <VIcon icon="ri-fire-line" size="18" class="me-1" />
          <strong>{{ streakDays }}</strong>
          <span class="ms-1">{{ streakDays === 1 ? 'dia consecutivo' : 'dias consecutivos' }}</span>
        </VChip>
      </div>

      <VDivider class="my-2" />

      <!-- Mini Stats Grid -->
      <VRow class="mini-stats-row">
        <VCol
          v-for="stat in miniStats"
          :key="stat.label"
          cols="4"
          class="mini-stat-col"
        >
          <div
            :class="[
              'mini-stat-card text-center pa-2',
              isDarkTheme ? 'mini-stat-card--dark' : 'mini-stat-card--light'
            ]"
          >
            <VIcon
              :icon="stat.icon"
              :color="stat.color"
              size="24"
              class="mb-1"
            />
            <div class="text-h6 font-weight-bold mb-1">
              {{ stat.value }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ stat.label }}
            </div>
          </div>
        </VCol>
      </VRow>

      <VDivider class="my-2" />

      <!-- CTA Principal -->
      <VBtn
        color="primary"
        size="default"
        block
        variant="elevated"
        class="welcome-cta"
        @click="goToStations"
      >
        <VIcon icon="ri-play-circle-line" class="me-2" size="20" />
        Iniciar Nova Simulação
      </VBtn>

      <!-- Link Secundário -->
      <div class="text-center mt-1">
        <VBtn
          variant="text"
          size="small"
          color="secondary"
          @click="goToPerformance"
        >
          Ver Estatísticas Completas
          <VIcon icon="ri-arrow-right-line" class="ms-1" size="16" />
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useDashboardData } from '@/composables/useDashboardData'
import { useDashboardStats } from '@/composables/useDashboardStats'

const router = useRouter()
const theme = useTheme()

// Props dos composables
const {
  userName,
  userPhoto,
  streakDays,
  userData
} = useDashboardData()

const { miniStats } = useDashboardStats(userData)

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

// Primeiro nome do usuário
const firstName = computed(() => {
  const fullName = userName.value
  return fullName.split(' ')[0] || 'Candidato'
})

// Saudação baseada no horário
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
})

// Mensagem motivacional baseada no streak
const motivationalMessage = computed(() => {
  const days = streakDays.value
  
  if (days === 0) {
    return 'Comece sua jornada hoje mesmo!'
  } else if (days < 3) {
    return 'Continue firme nos estudos!'
  } else if (days < 7) {
    return 'Você está indo muito bem!'
  } else if (days < 30) {
    return 'Consistência é a chave do sucesso!'
  } else {
    return 'Parabéns pela dedicação excepcional!'
  }
})

// Navegação
const goToStations = () => {
  router.push('/app/station-list')
}

const goToPerformance = () => {
  router.push('/candidato/performance')
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.welcome-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

.welcome-card--light {
  background: linear-gradient(135deg, rgb(var(--v-theme-surface)) 0%, rgba(var(--v-theme-primary), 0.03) 100%);
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.welcome-card--dark {
  background: linear-gradient(135deg, rgb(var(--v-theme-surface)) 0%, rgba(var(--v-theme-primary), 0.08) 100%);
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.welcome-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.15) !important;
}

/* ========== HEADER ========== */
.welcome-header {
  position: relative;
}

.welcome-avatar {
  border: 3px solid rgb(var(--v-theme-primary));
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.25);
}

.welcome-title {
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
}

/* ========== STREAK CHIP ========== */
.streak-chip {
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(var(--v-theme-success), 0.20);
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes pulse-subtle {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* ========== MINI STATS ========== */
.mini-stats-row {
  margin: 0 -4px;
}

.mini-stat-col {
  padding: 4px;
}

.mini-stat-card {
  border-radius: 12px;
  transition: all 0.2s ease;
  cursor: default;
  height: 100%;
}

.mini-stat-card--light {
  background: rgba(var(--v-theme-surface-bright), 0.6);
  border: 1px solid rgba(var(--v-theme-outline), 0.08);
}

.mini-stat-card--dark {
  background: rgba(var(--v-theme-surface-dim), 0.4);
  border: 1px solid rgba(var(--v-theme-outline), 0.16);
}

.mini-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.12);
}

.mini-stat-card--light:hover {
  background: rgba(var(--v-theme-surface-bright), 0.9);
}

.mini-stat-card--dark:hover {
  background: rgba(var(--v-theme-surface-dim), 0.7);
}

/* ========== CTA BUTTON ========== */
.welcome-cta {
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.25);
  transition: all 0.3s ease;
}

.welcome-cta:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.35);
}

/* ========== ANIMAÇÃO DE ENTRADA ========== */
.welcome-card {
  animation: fadeSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== RESPONSIVIDADE ========== */
@media (max-width: 600px) {
  .welcome-card {
    border-radius: 12px;
  }

  .welcome-header {
    flex-direction: column;
    text-align: center;
  }

  .welcome-avatar {
    margin-bottom: 12px;
  }

  .welcome-title {
    font-size: 1.25rem !important;
  }

  .mini-stats-row {
    margin: 0 -2px;
  }

  .mini-stat-col {
    padding: 2px;
  }

  .mini-stat-card {
    padding: 8px !important;
  }

  .mini-stat-card .v-icon {
    font-size: 20px !important;
  }

  .mini-stat-card .text-h6 {
    font-size: 1rem !important;
  }
}
</style>
