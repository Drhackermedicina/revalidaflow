<template>
  <div class="station-skeleton-container">
    <v-skeleton-loader
      v-for="n in count"
      :key="n"
      type="list-item-three-line"
      class="mb-2 rounded-lg elevation-1"
      :loading="true"
      height="80"
    >
      <template v-slot:default>
        <!-- Placeholder vazio -->
      </template>
    </v-skeleton-loader>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 5
  }
})
</script>

<style scoped>
.station-skeleton-container {
  padding: 0 16px;
}
</style>
