<script setup>
import NavItems from '@/layouts/components/NavItems.vue'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'
import GeminiChat from '@/components/GeminiChat.vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
/* GlobalAgentAssistant (legado) removido durante limpeza do agente */

import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

// Estado do chat Gemini
const showGeminiChat = ref(false)

function openGeminiIA() {
  showGeminiChat.value = true
}

const route = useRoute()
const hideMobileNavButton = computed(() => {
  const routeName = route.name
  return routeName === 'station-list' || routeName === 'stations-index'
})
</script>

<template>
  <VerticalNavLayout>
    <template #navbar="{ toggleVerticalOverlayNavActive }">
  <div class="d-flex h-100 align-center w-100 justify-space-between header-bg">
        <!-- Menu hamburguer mobile -->
        <VTooltip v-if="!hideMobileNavButton" location="right">
          <template #activator="{ props }">
            <IconBtn
              class="ms-n3 d-lg-none"
              @click="toggleVerticalOverlayNavActive(true)"
              v-bind="props"
            >
              <VIcon icon="ri-menu-line" aria-label="Abrir menu de navegação" />
            </IconBtn>
          </template>
          Abrir menu
        </VTooltip>

        <!-- Centralizado: Assistente Médico IA otimizado -->
        <div class="d-flex align-center justify-center flex-grow-1">
          <v-btn
            class="mx-2 medical-ai-btn circular-medical-btn"
            @click="openGeminiIA"
            title="Assistente Médico IA - Especialista em Medicina e Revalida"
            aria-label="Abrir assistente médico IA"
          >
            <v-icon size="24" color="white">mdi-robot</v-icon>
          </v-btn>
        </div>

        <div class="d-flex align-center">
          <!-- Sininho -->
          <IconBtn aria-label="Notificações">
            <VIcon icon="ri-notification-line" />
          </IconBtn>

          <!-- Tema claro/escuro -->
          <NavbarThemeSwitcher class="me-2" />

          <!-- Usuário Google -->
          <UserProfile />
        </div>
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

.medical-ai-btn {
  box-shadow: 0 3px 12px rgba(var(--v-theme-primary), 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%) !important;

  &:hover {
    box-shadow: 0 6px 20px rgba(var(--v-theme-primary), 0.4);
    transform: translateY(-3px) scale(1.05);
  }

  &:active {
    transform: translateY(-1px) scale(1.02);
  }
}

.circular-medical-btn {
  padding: 0;
  height: 64px;
  width: 64px;
  min-width: 64px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%) !important;
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }

  &:hover {
    transform: translateY(-3px) scale(1.08);
    box-shadow: 0 8px 25px rgba(var(--v-theme-primary), 0.5);
  }
}



.gemini-label {
  color: #fff !important;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 4px #000, 0 0 2px #00bcd4;
}

.sidebar-header-modern {
  // Fundo removido; agora aplicado ao sidebar inteiro para continuidade
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
  height: 80px; // Reduzido de 100px para 80px para subir a linha inferior
  display: flex;
  align-items: center;
  justify-content: center;
}

// Alinhar o container nav-header com o header horizontal
.nav-header {
  padding: 0 !important;
  margin: 0 !important;
  min-block-size: 80px !important; // Reduzido de 100px para 80px para subir a linha inferior
  display: flex !important;
  align-items: center !important;
}
.sidebar-title {
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 1px 4px #000, 0 0 2px #00bcd4;
}

.lottie-container {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
}
</style>
