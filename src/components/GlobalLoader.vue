<template>
  <v-overlay :model-value="loading" class="global-loader" persistent>
    <v-progress-circular indeterminate color="primary" size="64" />
  </v-overlay>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const loading = ref(false)
const router = useRouter()

// Mostra loader durante navegação
router.beforeEach((to, from, next) => {
  loading.value = true
  next()
})
router.afterEach(() => {
  loading.value = false
})
</script>

<style scoped>
.global-loader {
  z-index: 9999;
}
</style>
