<script setup>
import NavItems from '@/layouts/components/NavItems.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import GeminiChat from '@/components/GeminiChat.vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
/* GlobalAgentAssistant (legado) removido durante limpeza do agente */

import { ref } from 'vue'

// Função exemplo para abrir Google Meet
function openGoogleMeet() {
  window.open('https://meet.google.com/new', '_blank')
}

// Estado do chat Gemini
const showGeminiChat = ref(false)

function openGeminiIA() {
  showGeminiChat.value = true
}
</script>

<template>
  <VerticalNavLayout>
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center w-100 justify-space-between">
        <!-- Menu hamburguer mobile -->
        <VTooltip location="right">
          <template #activator="{ props }">
            <IconBtn
              class="ms-n3 d-lg-none"
              @click="toggleVerticalOverlayNavActive(true)"
              v-bind="props"
            >
              <VIcon icon="ri-menu-line" aria-hidden="true" />
            </IconBtn>
          </template>
          Abrir menu
        </VTooltip>

        <!-- Centralizado: Apenas Gemini IA com imagem -->
        <div class="d-flex align-center justify-center flex-grow-1">
          <v-btn
            class="mx-2 gemini-btn"
            style="border: none; background: linear-gradient(90deg, #7b1fa2 0%, #00bcd4 100%); color: #fff; font-weight: bold; letter-spacing: 0.5px; text-shadow: 0 1px 4px #000, 0 0 2px #00bcd4;"
            @click="openGeminiIA"
          >
            <img src="/src/assets/images/svg/google-gemini-icon.webp" alt="Gemini IA" style="height: 28px; width: 28px; margin-right: 10px; border-radius: 50%; box-shadow: 0 0 8px #00bcd4; background: #fff;" />
            <span class="gemini-label">Gemini IA</span>
          </v-btn>
        </div>

        <div class="d-flex align-center">
          <!-- Sininho -->
          <IconBtn>
            <VIcon icon="ri-notification-line" aria-hidden="true" />
          </IconBtn>

          <!-- Tema claro/escuro -->
          <NavbarThemeSwitcher class="me-2" />

          <!-- Usuário Google -->
          <UserProfile />
        </div>
      </div>
    </template>

    <template #vertical-nav-header="{ toggleIsOverlayNavActive }">
      <div class="sidebar-header-modern d-flex align-center justify-center py-4">
        <VTooltip location="right">
          <template #activator="{ props }">
            <IconBtn
              class="d-block d-lg-none ms-2"
              @click="toggleIsOverlayNavActive(false)"
              v-bind="props"
            >
              <VIcon icon="ri-close-line" aria-hidden="true" />
            </IconBtn>
          </template>
          Fechar menu
        </VTooltip>
      </div>
    </template>

    <template #vertical-nav-content>
      <NavItems />
    </template>

    <slot />

    <!-- Agente Global removido (legado) -->

    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>

  <!-- Diálogo do Chat Gemini -->
  <VDialog
    v-model="showGeminiChat"
    max-width="800px"
    fullscreen
    scrollable
  >
    <GeminiChat
      :is-open="showGeminiChat"
      @close="showGeminiChat = false"
    />
  </VDialog>
</template>

<style lang="scss" scoped>
.meta-key {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  block-size: 1.5625rem;
  line-height: 1.3125rem;
  padding-block: 0.125rem;
  padding-inline: 0.25rem;
}

.app-logo {
  display: flex;
  align-items: center;
  column-gap: 0.75rem;

  .app-logo-title {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.75rem;
    text-transform: uppercase;
  }
}

.app-logo-img {
  height: 40px; /* Tamanho da imagem */
  width: auto; /* Manter proporção */
}

.gemini-btn {
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 15%);
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    background: linear-gradient(90deg, #00bcd4 0%, #7b1fa2 100%);
    box-shadow: 0 4px 16px 0 rgba(0, 188, 212, 25%);
    transform: translateY(-2px) scale(1.04);
  }
}

.gemini-label {
  color: #fff !important;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 4px #000, 0 0 2px #00bcd4;
}

.sidebar-header-modern {
  background: linear-gradient(90deg, #7b1fa2 0%, #00bcd4 100%);
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
}
.sidebar-title {
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 1px 4px #000, 0 0 2px #00bcd4;
}
</style>
