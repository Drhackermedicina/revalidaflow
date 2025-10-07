<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { RecentStation } from '../../composables/useRecentStations';
import { useAppTheme } from '@/composables/useAppTheme';

// Props
const props = defineProps<{
  stations: RecentStation[] | null;
  loading: boolean;
}>();

// Emits
const emit = defineEmits(['start-station']);

const { isDarkTheme } = useAppTheme();

// Função para formatar a data de criação
const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'agora mesmo' : `há ${diffInMinutes} minutos`;
    }
    return diffInHours === 1 ? 'há 1 hora' : `há ${diffInHours} horas`;
  } else if (diffInDays === 1) {
    return 'ontem';
  } else if (diffInDays <= 7) {
    return `há ${diffInDays} dias`;
  } else {
    return date.toLocaleDateString('pt-BR');
  }
};

const startStation = (stationId: string) => {
  emit('start-station', stationId);
};

const cardClasses = [
  'dashboard-card hoverable-card elevation-4',
  isDarkTheme.value ? 'dashboard-card--dark' : 'dashboard-card--light'
];
</script>

<template>
  <VCard :class="cardClasses" color="surface">
    <VCardItem class="dashboard-card-header bg-primary">
      <VCardTitle class="text-white d-flex align-center">
        <VIcon icon="ri-time-line" color="#ffd600" size="24" class="me-2" />
        Estações Recentes
      </VCardTitle>
    </VCardItem>
    
    <VCardText>
      <!-- Estado de loading -->
      <div v-if="loading" class="d-flex flex-column align-center justify-center py-8">
        <VProgressCircular indeterminate color="primary" size="40" class="mb-4" />
        <p class="text-body-2 text-medium-emphasis">Carregando estações recentes...</p>
      </div>
      
      <!-- Mensagem quando não há estações -->
      <div v-else-if="!stations || stations.length === 0" class="d-flex flex-column align-center justify-center py-8">
        <VIcon icon="ri-inbox-line" color="medium-emphasis" size="48" class="mb-3" />
        <p class="text-body-1 text-medium-emphasis mb-2">Nenhuma estação nova</p>
        <p class="text-body-2 text-medium-emphasis">As estações adicionadas recentemente aparecerão aqui</p>
      </div>
      
      <!-- Lista de estações recentes -->
      <VList v-else class="pa-0">
        <VListItem
          v-for="station in stations"
          :key="station.id"
          class="mb-2 rounded-lg elevation-1 station-item"
          @click="startStation(station.id)"
        >
          <template #prepend>
            <VIcon color="primary" class="me-3">ri-file-list-3-line</VIcon>
          </template>
          
          <VListItemTitle class="font-weight-bold text-body-1">
            {{ station.titulo }}
          </VListItemTitle>
          
          <VListItemSubtitle class="d-flex align-center mt-1">
            <VChip
              :color="isDarkTheme ? 'primary-darken-1' : 'primary-lighten-1'"
              size="small"
              variant="flat"
              class="me-2"
            >
              {{ station.especialidade }}
            </VChip>
            <span class="text-caption text-medium-emphasis">
              {{ formatRelativeDate(station.createdAt) }}
            </span>
          </VListItemSubtitle>
          
          <template #append>
            <VBtn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="ri-play-line"
              @click.stop="startStation(station.id)"
            >
              Iniciar
            </VBtn>
          </template>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>

<style scoped>
@import '@/styles/dashboard.css';
</style>