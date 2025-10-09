<template>
  <v-card class="mb-4" elevation="2">
    <v-card-title>
      <span class="text-h6">{{ title }}</span>
    </v-card-title>
    <v-card-text>
      <slot />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
/* Estilos customizados se necessário */
</style>
