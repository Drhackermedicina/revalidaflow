<script setup>
import { VIcon } from 'vuetify/components/VIcon';
import { VTooltip } from 'vuetify/components/VTooltip';
defineProps({
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
            :aria-label="item.title"
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

  // Garantir que o ícone fique visível quando o link está ativo
  .nav-link > a.router-link-active,
  .nav-link > a.router-link-exact-active {
    .nav-item-icon,
    .v-icon {
      color: rgb(var(--v-theme-on-primary)) !important;
    }
  }
}
</style>
