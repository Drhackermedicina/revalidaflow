<template>
  <VRow class="stats-overview-row">
    <!-- Card 1: Simulações Completadas -->
    <VCol cols="6" md="3">
      <VCard
        :class="[
          'stat-card stat-card-simulations',
          isDarkTheme ? 'stat-card--dark' : 'stat-card--light'
        ]"
        elevation="2"
      >
        <VCardText class="text-center pa-4">
          <div class="stat-icon-wrapper mb-3">
            <VIcon
              icon="ri-check-double-line"
              color="success"
              size="42"
              class="stat-icon"
            />
          </div>
          <div class="stat-value text-h4 font-weight-bold mb-1">
            {{ totalSimulations }}
          </div>
          <div class="stat-label text-caption text-medium-emphasis">
            Simulações Completadas
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Card 2: Taxa de Acerto -->
    <VCol cols="6" md="3">
      <VCard
        :class="[
          'stat-card stat-card-accuracy',
          isDarkTheme ? 'stat-card--dark' : 'stat-card--light'
        ]"
        elevation="2"
      >
        <VCardText class="text-center pa-4">
          <div class="stat-progress-wrapper mb-2">
            <VProgressCircular
              :model-value="accuracyRate"
              :size="80"
              :width="8"
              color="primary"
              class="stat-progress"
            >
              <span class="text-h6 font-weight-bold">{{ accuracyRate }}%</span>
            </VProgressCircular>
          </div>
          <div class="stat-label text-caption text-medium-emphasis mt-2">
            Taxa de Acerto
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Card 3: Melhor Especialidade -->
    <VCol cols="6" md="3">
      <VCard
        :class="[
          'stat-card stat-card-specialty',
          isDarkTheme ? 'stat-card--dark' : 'stat-card--light'
        ]"
        elevation="2"
      >
        <VCardText class="text-center pa-4">
          <div class="stat-icon-wrapper mb-3">
            <VIcon
              icon="ri-award-line"
              color="warning"
              size="42"
              class="stat-icon"
            />
          </div>
          <div class="stat-value text-h6 font-weight-bold mb-1 specialty-name">
            {{ topSpecialty }}
          </div>
          <div class="stat-label text-caption text-medium-emphasis">
            Melhor Especialidade
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Card 4: Tempo de Estudo -->
    <VCol cols="6" md="3">
      <VCard
        :class="[
          'stat-card stat-card-time',
          isDarkTheme ? 'stat-card--dark' : 'stat-card--light'
        ]"
        elevation="2"
      >
        <VCardText class="text-center pa-4">
          <div class="stat-icon-wrapper mb-3">
            <VIcon
              icon="ri-time-line"
              color="info"
              size="42"
              class="stat-icon"
            />
          </div>
          <div class="stat-value text-h4 font-weight-bold mb-1">
            {{ studyHours }}h
          </div>
          <div class="stat-label text-caption text-medium-emphasis">
            Tempo Total de Estudo
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { useDashboardData } from '@/composables/useDashboardData.js'
import { useDashboardStats } from '@/composables/useDashboardStats.js'

const theme = useTheme()

// Composables
const {
  totalSimulations,
  studyHours,
  userData
} = useDashboardData()

const {
  accuracyRate,
  topSpecialty
} = useDashboardStats(userData)

// Tema
const isDarkTheme = computed(() => theme.global.name.value === 'dark')
</script>

<style scoped>
/* ========== ROW LAYOUT ========== */
.stats-overview-row {
  margin: 0 -6px;
}

.stats-overview-row > .v-col {
  padding: 6px;
}

/* ========== CARD BASE ========== */
.stat-card {
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.stat-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.stat-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

/* Efeito gradiente de fundo por tipo */
.stat-card-simulations::before,
.stat-card-accuracy::before,
.stat-card-specialty::before,
.stat-card-time::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.stat-card-simulations::before {
  background: linear-gradient(135deg, rgba(var(--v-theme-success), 0.08) 0%, transparent 100%);
}

.stat-card-accuracy::before {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08) 0%, transparent 100%);
}

.stat-card-specialty::before {
  background: linear-gradient(135deg, rgba(var(--v-theme-warning), 0.08) 0%, transparent 100%);
}

.stat-card-time::before {
  background: linear-gradient(135deg, rgba(var(--v-theme-info), 0.08) 0%, transparent 100%);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card:hover {
  transform: translateY(-6px) scale(1.02);
}

.stat-card-simulations:hover {
  box-shadow: 0 8px 24px rgba(var(--v-theme-success), 0.20) !important;
}

.stat-card-accuracy:hover {
  box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.20) !important;
}

.stat-card-specialty:hover {
  box-shadow: 0 8px 24px rgba(var(--v-theme-warning), 0.20) !important;
}

.stat-card-time:hover {
  box-shadow: 0 8px 24px rgba(var(--v-theme-info), 0.20) !important;
}

/* ========== ICON ========== */
.stat-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stat-icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

/* ========== PROGRESS CIRCULAR ========== */
.stat-progress-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.stat-progress {
  filter: drop-shadow(0 4px 8px rgba(var(--v-theme-primary), 0.20));
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-progress {
  transform: scale(1.05);
}

/* ========== VALUES ========== */
.stat-value {
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
  position: relative;
  z-index: 1;
}

.specialty-name {
  color: rgb(var(--v-theme-warning));
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stat-label {
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

/* ========== ANIMAÇÕES DE ENTRADA ========== */
.stats-overview-row .stat-card {
  animation: fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.stats-overview-row .v-col:nth-child(1) .stat-card {
  animation-delay: 0.1s;
}

.stats-overview-row .v-col:nth-child(2) .stat-card {
  animation-delay: 0.2s;
}

.stats-overview-row .v-col:nth-child(3) .stat-card {
  animation-delay: 0.3s;
}

.stats-overview-row .v-col:nth-child(4) .stat-card {
  animation-delay: 0.4s;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== RESPONSIVIDADE ========== */
@media (max-width: 960px) {
  .stats-overview-row {
    margin: 0 -4px;
  }

  .stats-overview-row > .v-col {
    padding: 4px;
  }

  .stat-card {
    border-radius: 12px;
  }
}

@media (max-width: 600px) {
  .stats-overview-row {
    margin: 0 -3px;
  }

  .stats-overview-row > .v-col {
    padding: 3px;
  }

  .stat-card {
    border-radius: 10px;
  }

  .stat-card .v-card-text {
    padding: 12px !important;
  }

  .stat-icon {
    font-size: 32px !important;
  }

  .stat-value {
    font-size: 1.5rem !important;
  }

  .stat-progress {
    transform: scale(0.9);
  }

  .stat-label {
    font-size: 0.7rem !important;
  }

  .specialty-name {
    font-size: 0.95rem !important;
    min-height: 38px;
  }
}
</style>
