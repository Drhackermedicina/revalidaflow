<template>
  <v-overlay :model-value="loading" class="global-loader" persistent>
    <v-progress-circular indeterminate color="primary" size="64" />
  </v-overlay>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)

// Export method para ser controlado externamente pelo router guard principal
function setLoading(value) {
  loading.value = value
}

// Expor método para uso externo
defineExpose({
  setLoading
})
</script>

<style scoped>
.global-loader {
  z-index: 9999;
}
</style>
