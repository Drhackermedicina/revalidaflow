<template>
  <v-breadcrumbs :items="breadcrumbs" class="app-breadcrumbs px-4 py-2" divider="/">
    <template #prepend>
      <v-icon color="primary">ri-home-line</v-icon>
    </template>
  </v-breadcrumbs>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(r => r.name && r.path !== '/')
  return matched.map(r => ({
    title: r.meta?.breadcrumb || r.meta?.title || r.name,
    to: r.path !== route.path ? r.path : undefined
  }))
})
</script>

<style scoped>
.app-breadcrumbs {
  background: rgba(var(--v-theme-surface), 0.9);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 1.05rem;
}
</style>
