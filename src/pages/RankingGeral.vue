<template>
  <VContainer class="py-6">
    <VCard class="elevation-4">
      <VCardTitle class="text-h5 font-weight-bold d-flex align-center">
        <VIcon icon="ri-bar-chart-fill" color="#ffd600" size="28" class="me-2" />
        Ranking Geral dos Candidatos
      </VCardTitle>
      <VCardText>
        <RankingView />
      </VCardText>
    </VCard>
  </VContainer>
</template>

<script setup>
import RankingView from './RankingView.vue';
</script>
