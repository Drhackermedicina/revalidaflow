<script setup lang="ts">
import { defineProps, computed } from 'vue';
import { useAppTheme } from '@/composables/useAppTheme';

// Props
const props = defineProps<{
  userName: string;
}>();

const { isDarkTheme } = useAppTheme();

const cardClasses = computed(() => [
  'dashboard-card hoverable-card elevation-4',
  isDarkTheme.value ? 'dashboard-card--dark' : 'dashboard-card--light'
]);
</script>

<template>
  <VCard :class="cardClasses" color="surface">
    <VCardItem class="dashboard-card-header bg-primary">
      <VCardTitle class="text-white d-flex align-center">
        <VIcon icon="ri-hand-heart-line" color="#ffd600" size="24" class="me-2" />
        Bem-vindo(a), {{ userName }}
      </VCardTitle>
    </VCardItem>
    <VCardText>
      <p class="text-body-2 mb-3">
        Sua jornada para a aprovação continua. Explore as novas simulações e acompanhe seu progresso.
      </p>
      <div class="d-flex align-center justify-space-between">
        <VChip color="success" size="small" variant="flat">Novo ciclo</VChip>
        <VBtn
          variant="tonal"
          color="primary"
          to="/app/station-list"
          prepend-icon="ri-arrow-right-line"
          size="small"
          aria-label="Iniciar Nova Simulação"
        >
          Iniciar
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';
</style>