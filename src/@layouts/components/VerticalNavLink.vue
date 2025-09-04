<script setup>
import { VIcon } from 'vuetify/components/VIcon';
import { VTooltip } from 'vuetify/components/VTooltip';
const props = defineProps({
  item: {
    type: null,
    required: true,
  },
})
</script>

<template>
  <li
    class="nav-link"
    :class="{ disabled: item.disable }"
  >
    <Component
      :is="item.to ? 'RouterLink' : 'a'"
      :to="item.to"
      :href="item.href"
      :target="item.target"
    >
      <VTooltip location="right">
        <template #activator="{ props }">
          <VIcon
            v-bind="props"
            :icon="item.icon || 'ri-checkbox-blank-circle-line'"
            class="nav-item-icon"
            :color="item.iconColor || undefined"
            aria-hidden="true"
          />
        </template>
        {{ item.title }}
      </VTooltip>
      <!-- 👉 Title -->
      <span class="nav-item-title">
        {{ item.title }}
      </span>
      <span
        class="nav-item-badge"
        :class="item.badgeClass"
      >
        {{ item.badgeContent }}
      </span>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link a {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
}
</style>
