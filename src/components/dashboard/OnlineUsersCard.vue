<script setup lang="ts">
import { defineProps } from 'vue';
import { useAppTheme } from '@/composables/useAppTheme';

// Props
defineProps<{
  userCount: number;
  loading: boolean;
}>();

const { isDarkTheme } = useAppTheme();

const cardClasses = [
  'dashboard-card hoverable-card elevation-4',
  isDarkTheme.value ? 'dashboard-card--dark' : 'dashboard-card--light'
];
</script>

<template>
  <VCard :class="cardClasses" color="surface">
    <VCardItem class="dashboard-card-header bg-primary">
      <VCardTitle class="text-white d-flex align-center">
        <VIcon icon="ri-user-3-line" color="#ffd600" size="24" class="me-2" />
        Usuários Online
      </VCardTitle>
    </VCardItem>
    
    <VCardText class="d-flex flex-column align-center justify-center py-8">
      <!-- Estado de loading -->
      <div v-if="loading" class="text-center">
        <VProgressCircular indeterminate color="primary" size="40" class="mb-4" />
        <p class="text-body-2 text-medium-emphasis">Carregando...</p>
      </div>
      
      <!-- Conteúdo quando carregado -->
      <div v-else class="text-center">
        <div class="position-relative mb-4">
          <VIcon icon="ri-user-3-fill" color="success" size="64" />
          <VIcon 
            icon="ri-checkbox-blank-circle-fill" 
            color="success" 
            size="16" 
            class="online-indicator"
          />
        </div>
        <div class="text-h4 font-weight-bold text-success mb-2">
          {{ userCount }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          usuários ativos agora
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}
</style>