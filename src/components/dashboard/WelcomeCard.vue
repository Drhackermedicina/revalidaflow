<script setup lang="ts">
import { computed } from 'vue';
import { useAppTheme } from '@/composables/useAppTheme';
import { useAuth } from '@/composables/useAuth.js';

interface Props {
  userName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  userName: ''
});

const { isDarkTheme } = useAppTheme();
const { userName: authUserName } = useAuth();

const displayName = computed(() => props.userName || authUserName.value);
const cardClasses = computed(() => [
  'dashboard-card hoverable-card elevation-4',
  isDarkTheme.value ? 'dashboard-card--dark' : 'dashboard-card--light'
]);
</script>

<template>
  <VCard :class="cardClasses" color="surface">
    <VCardItem class="dashboard-card-header bg-primary">
      <VCardTitle class="text-white d-flex align-center">
        <VIcon icon="ri-hand-heart-line" color="#ffd600" size="32" class="me-2" />
        Bem-vindo(a), {{ displayName }}
      </VCardTitle>
    </VCardItem>
    <VCardText>
      <p class="text-body-1 mb-2">
        Sua jornada para a aprovação continua. Explore as novas simulações, acompanhe seu progresso e prepare-se para o sucesso.
      </p>
      <VChip color="success" size="small" class="mb-2">Novo ciclo</VChip>
      <VBtn
        color="primary"
        class="mt-4 dashboard-btn animated-btn"
        to="/app/station-list"
        prepend-icon="ri-arrow-right-line"
        block
        aria-label="Iniciar Nova Simulação"
      >
        Iniciar Nova Simulação
      </VBtn>
    </VCardText>
  </VCard>
</template>

<style scoped>
.dashboard-card {
  border-radius: 18px;
  margin-bottom: 18px;
  transition: box-shadow 0.25s, transform 0.18s;
}

.dashboard-card--light {
  box-shadow: 0 4px 24px 0 rgba(123, 31, 162, 0.08), 0 1.5px 4px 0 rgba(0,0,0,0.04);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--light:hover {
  box-shadow: 0 8px 32px 0 rgba(123, 31, 162, 0.18), 0 3px 8px 0 rgba(0,188,212,0.10);
}

.dashboard-card--dark {
  box-shadow: 0 4px 24px 0 rgba(255, 255, 255, 0.05), 0 1.5px 4px 0 rgba(255, 255, 255, 0.02);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--dark:hover {
  box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.08), 0 3px 8px 0 rgba(123, 31, 162, 0.15);
}

.hoverable-card:hover {
  transform: translateY(-4px) scale(1.015);
}

.dashboard-card-header {
  border-radius: 18px 18px 0 0;
  padding: 18px 20px 12px 20px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
}

.dashboard-btn {
  font-weight: bold;
  letter-spacing: 0.5px;
  border-radius: 8px;
  transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
}

.animated-btn:hover {
  background: linear-gradient(90deg, #00bcd4 0%, #7b1fa2 100%);
  transform: scale(1.06);
  box-shadow: 0 4px 16px 0 rgba(0, 188, 212, 0.18);
}

@media (max-width: 900px) {
  .dashboard-card-header {
    font-size: 1.1rem;
    padding: 14px 12px 10px 12px;
  }
  .dashboard-card {
    border-radius: 12px;
    margin-bottom: 12px;
  }
}

@media (max-width: 600px) {
  .dashboard-card {
    border-radius: 8px;
    margin-bottom: 8px;
    padding: 0 2px;
  }
  .dashboard-card-header {
    border-radius: 8px 8px 0 0;
    padding: 10px 6px 6px 8px;
    font-size: 1rem;
  }
}
</style>