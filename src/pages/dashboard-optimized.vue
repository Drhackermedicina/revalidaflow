<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { useRanking } from '@/composables/useRanking';
import { useAuth } from '@/composables/useAuth.js';
import WelcomeCard from '@/components/dashboard/WelcomeCard.vue';
import RankingCard from '@/components/dashboard/RankingCard.vue';

import '@/styles/dashboard-styles.css';

const router = useRouter();
const { user } = useAuth();
const {
  rankingTitle,
  rankingSubtitle,
  rankingValue,
  rankingMeta,
  loadingRanking,
  errorRanking,
  buscarRankingUsuario
} = useRanking();

// Função para garantir que o sidebar permaneça sempre aberto
function ensureSidebarOpen(): void {
  const wrapper = document.querySelector('.layout-wrapper');
  if (wrapper) {
    wrapper.classList.remove('layout-vertical-nav-collapsed');
  }
}

function irParaRankingGeral(): void {
  router.push('/app/ranking');
}

onMounted(() => {
  buscarRankingUsuario(user.value?.uid);
  ensureSidebarOpen();
});

onUnmounted((): void => {
  const wrapper = document.querySelector('.layout-wrapper');
  wrapper?.classList.remove('layout-vertical-nav-collapsed');
});
</script>

<template>
  <VRow class="match-height dashboard-row">
    <!-- Card de Boas-Vindas -->
    <VCol cols="12" md="6">
      <transition name="fade-slide" appear>
        <WelcomeCard />
      </transition>
    </VCol>

    <!-- Ranking do Usuário -->
    <VCol cols="12" md="6">
      <transition name="fade-slide" appear>
        <RankingCard
          :ranking-title="rankingTitle"
          :ranking-subtitle="rankingSubtitle"
          :ranking-value="rankingValue"
          :ranking-meta="rankingMeta"
          :loading-ranking="loadingRanking"
          :error-ranking="errorRanking"
          @navigate-to-ranking="irParaRankingGeral"
        />
      </transition>
    </VCol>
  </VRow>
</template>

<style scoped>
.dashboard-row {
  row-gap: 18px;
}
</style>