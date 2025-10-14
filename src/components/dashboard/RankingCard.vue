<template>
  <VCard
    :class="[
      'ranking-card',
      isDarkTheme ? 'ranking-card--dark' : 'ranking-card--light'
    ]"
    elevation="3"
  >
    <VCardTitle class="d-flex align-center pa-4">
      <VIcon icon="ri-trophy-line" color="warning" size="28" class="me-2" />
      <span class="text-h6 font-weight-bold">Seu Ranking</span>
      <VSpacer />
      <VChip
        v-if="!loading && rankingPosition > 0"
        :color="getPositionColor(rankingPosition)"
        variant="elevated"
        size="small"
        class="rank-badge"
      >
        #{{ rankingPosition }}
      </VChip>
    </VCardTitle>

    <VDivider />

    <VCardText class="pa-4">
      <!-- Loading State -->
      <div v-if="loading" class="d-flex flex-column justify-center align-center py-8">
        <VProgressCircular indeterminate color="primary" size="48" class="mb-3" />
        <p class="text-body-2 text-medium-emphasis">Carregando seu ranking...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="d-flex flex-column justify-center align-center py-8">
        <VIcon icon="ri-error-warning-line" color="error" size="48" class="mb-3" />
        <p class="text-body-2 text-error mb-3">Erro ao carregar ranking</p>
        <VBtn color="primary" variant="outlined" size="small" @click="loadData">
          Tentar Novamente
        </VBtn>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Mensagem Motivacional -->
        <VAlert
          v-if="rankingPosition > 0"
          :color="getPositionColor(rankingPosition)"
          variant="tonal"
          class="mb-4"
          density="compact"
        >
          <div class="d-flex align-center">
            <VIcon :icon="getPositionIcon(rankingPosition)" size="24" class="me-2" />
            <span class="text-body-2 font-weight-medium">{{ getMotivationalMessage(rankingPosition) }}</span>
          </div>
        </VAlert>

        <!-- Posição Atual e Progresso -->
        <div class="ranking-position mb-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="flex-grow-1">
              <div class="text-caption text-medium-emphasis mb-1">Posição Global</div>
              <div class="d-flex align-center gap-2">
                <div class="text-h2 font-weight-bold ranking-number">
                  {{ rankingPosition > 0 ? rankingPosition : '—' }}
                </div>
                <div class="d-flex flex-column">
                  <span class="text-caption text-medium-emphasis">º lugar</span>
                  <VChip
                    :color="getRankTier(rankingPosition)"
                    size="x-small"
                    variant="flat"
                    class="rank-tier-chip"
                  >
                    {{ getRankTierName(rankingPosition) }}
                  </VChip>
                </div>
              </div>
            </div>
            <div class="text-end">
              <div class="text-caption text-medium-emphasis mb-1">Pontuação</div>
              <div class="text-h4 font-weight-bold" style="color: rgb(var(--v-theme-primary))">
                {{ rankingScore.toLocaleString('pt-BR') }}
              </div>
              <div class="text-caption text-medium-emphasis">pontos</div>
            </div>
          </div>

          <!-- Barra de Progresso -->
          <div class="progress-section mt-3">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-caption font-weight-medium">Progresso até próximo nível</span>
              <span class="text-caption font-weight-bold text-primary">{{ rankingProgress }}%</span>
            </div>
            <VProgressLinear
              :model-value="rankingProgress"
              color="primary"
              height="10"
              rounded
              class="ranking-progress"
            >
              <template #default="{ value }">
                <div class="progress-label">{{ Math.ceil(value) }}%</div>
              </template>
            </VProgressLinear>
            <div class="d-flex justify-space-between align-center mt-1">
              <span class="text-caption text-medium-emphasis">
                Faltam {{ pointsToNextLevel }} pontos
              </span>
              <span class="text-caption font-weight-medium text-secondary">
                Meta: {{ nextRankingMilestone }}
              </span>
            </div>
          </div>
        </div>

        <VDivider class="my-4" />

        <!-- Sparkline de Evolução -->
        <div class="ranking-chart mb-4">
          <div class="text-caption text-medium-emphasis mb-2">
            Evolução (Últimos 7 dias)
          </div>
          <VSparkline
            :model-value="rankingHistory"
            color="secondary"
            line-width="3"
            smooth
            auto-draw
            :gradient="['#00bcd4', '#7b1fa2']"
            gradient-direction="top"
            height="60"
            padding="8"
            stroke-linecap="round"
            fill
          />
        </div>

        <VDivider class="my-4" />

        <!-- Top 3 Usuários -->
        <div class="top-users mb-3">
          <div class="text-caption text-medium-emphasis mb-3">
            🏆 Top 3 do Ranking
          </div>
          
          <VList density="compact" class="top-users-list">
            <VListItem
              v-for="(user, index) in top3Users"
              :key="user.uid"
              :class="[
                'top-user-item',
                { 'highlight-user': user.uid === currentUserId }
              ]"
            >
              <template #prepend>
                <VChip
                  :color="getMedalColor(index)"
                  variant="flat"
                  size="small"
                  class="medal-chip me-2"
                >
                  {{ getMedalIcon(index) }}
                </VChip>
                <VAvatar
                  :image="user.photoURL || undefined"
                  :icon="!user.photoURL ? 'ri-user-line' : undefined"
                  :color="!user.photoURL ? 'primary' : undefined"
                  size="36"
                  class="elevation-2"
                />
              </template>

              <VListItemTitle class="font-weight-medium">
                {{ getUserName(user) }}
              </VListItemTitle>
              <VListItemSubtitle class="text-caption">
                Nível {{ Math.round(user.nivelHabilidade * 10) }}
              </VListItemSubtitle>

              <template #append>
                <div class="text-end">
                  <div class="font-weight-bold" style="color: rgb(var(--v-theme-primary))">
                    {{ user.ranking }}
                  </div>
                  <div class="text-caption text-medium-emphasis">pontos</div>
                </div>
              </template>
            </VListItem>
          </VList>
        </div>

        <!-- Botão Ver Ranking Completo -->
        <VBtn
          color="primary"
          variant="outlined"
          block
          class="ranking-cta"
          @click="goToRanking"
        >
          Ver Ranking Completo
          <VIcon icon="ri-arrow-right-line" class="ms-2" size="18" />
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup>
import { computed, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { currentUser } from '@/plugins/auth'

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  loadDashboardData: { type: Function, required: true },
  rankingPosition: { type: Number, default: 0 },
  rankingScore: { type: Number, default: 0 },
  top3Users: { type: Array, default: () => [] },
  userData: { type: Object, default: null },
  rankingProgress: { type: Number, default: 0 },
  pointsToNextLevel: { type: Number, default: 0 },
  nextRankingMilestone: { type: Number, default: 0 },
  rankingHistory: { type: Array, default: () => [] }
})

const { loadDashboardData: loadData } = props

const {
  loading,
  error,
  rankingPosition,
  rankingScore,
  top3Users,
  rankingProgress,
  pointsToNextLevel,
  nextRankingMilestone,
  rankingHistory
} = toRefs(props)

const router = useRouter()
const theme = useTheme()

const isDarkTheme = computed(() => theme.global.name.value === 'dark')
const currentUserId = computed(() => currentUser.value?.uid || '')

const getUserName = (user) => {
  if (!user || typeof user !== 'object') return 'Usuário'
  if (user.nome) {
    return `${user.nome} ${user.sobrenome || ''}`.trim()
  }
  return user.displayName || 'Usuário'
}

const getMedalIcon = (index) => {
  const medals = ['🥇', '🥈', '🥉']
  return medals[index] || '🏅'
}

const getMedalColor = (index) => {
  const colors = ['warning', 'grey', 'brown']
  return colors[index] || 'info'
}

const getPositionColor = (position) => {
  if (position <= 3) return 'warning'
  if (position <= 10) return 'success'
  if (position <= 50) return 'primary'
  return 'info'
}

const getPositionIcon = (position) => {
  if (position === 1) return 'ri-medal-line'
  if (position <= 3) return 'ri-award-line'
  if (position <= 10) return 'ri-star-line'
  return 'ri-thumb-up-line'
}

const getMotivationalMessage = (position) => {
  if (position === 1) return '🏆 Incrível! Você é o 1º lugar!'
  if (position === 2) return '🥈 Muito bem! Você está em 2º lugar!'
  if (position === 3) return '🥉 Parabéns! Você está em 3º lugar!'
  if (position <= 10) return '⭐ Excelente! Você está no Top 10!'
  if (position <= 50) return '🚀 Continue assim! Você está no Top 50!'
  return '💪 Continue estudando para subir no ranking!'
}

const getRankTier = (position) => {
  if (position <= 3) return 'warning'
  if (position <= 10) return 'success'
  if (position <= 50) return 'info'
  if (position <= 100) return 'primary'
  return 'secondary'
}

const getRankTierName = (position) => {
  if (position === 0) return 'Sem rank'
  if (position <= 3) return 'ELITE'
  if (position <= 10) return 'OURO'
  if (position <= 50) return 'PRATA'
  if (position <= 100) return 'BRONZE'
  return 'INICIANTE'
}

const goToRanking = () => {
  router.push('/app/ranking')
}
</script>

<style scoped>
/* ========== CARD BASE ========== */
.ranking-card {
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
}

.ranking-card--light {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.ranking-card--dark {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

.ranking-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(var(--v-theme-warning), 0.15) !important;
}

/* ========== RANK BADGE ========== */
.rank-badge {
  font-weight: 700;
  font-size: 0.875rem;
  box-shadow: 0 2px 8px rgba(var(--v-theme-warning), 0.25);
}

/* ========== POSIÇÃO ========== */
.ranking-number {
  color: rgb(var(--v-theme-warning));
  line-height: 1;
  text-shadow: 0 2px 4px rgba(var(--v-theme-warning), 0.15);
}

/* ========== PROGRESSO ========== */
.ranking-progress {
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.15);
  border-radius: 8px;
  position: relative;
}

.ranking-progress :deep(.v-progress-linear__background),
.ranking-progress :deep(.v-progress-linear__determinate) {
  border-radius: 8px;
}

.progress-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* ========== RANK TIER ========== */
.rank-tier-chip {
  font-weight: 800;
  letter-spacing: 0.5px;
  font-size: 0.65rem;
}

/* ========== CHART ========== */
.ranking-chart {
  position: relative;
  background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.05) 0%, transparent 100%);
  border-radius: 12px;
  padding: 8px;
}

/* ========== TOP USERS LIST ========== */
.top-users-list {
  background: transparent;
  padding: 0;
}

.top-user-item {
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  padding: 8px 12px;
}

.top-user-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

.highlight-user {
  background: linear-gradient(90deg, rgba(var(--v-theme-primary), 0.12) 0%, rgba(var(--v-theme-secondary), 0.12) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.medal-chip {
  font-size: 1rem;
  min-width: 32px;
  justify-content: center;
}

/* ========== CTA BUTTON ========== */
.ranking-cta {
  font-weight: 600;
  border-radius: 10px;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.ranking-cta:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.20);
}

/* ========== ANIMAÇÃO ========== */
.ranking-card {
  animation: fadeSlideIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s backwards;
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
  .ranking-card {
    border-radius: 12px;
  }

  .ranking-number {
    font-size: 2rem !important;
  }

  .top-user-item {
    padding: 6px 8px;
  }

  .medal-chip {
    min-width: 28px;
    font-size: 0.875rem;
  }
}
</style>
