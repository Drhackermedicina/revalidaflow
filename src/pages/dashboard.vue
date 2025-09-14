<script setup lang="ts">
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { formatarAproveitamento } from '@/@core/utils/format';
import trophy from '@/assets/images/misc/trophy.png';

import { useAppTheme } from '@/composables/useAppTheme';
import { useAuth } from '@/composables/useAuth.js';

const db = getFirestore();
const router = useRouter();
const { theme, isDarkTheme } = useAppTheme();
const { user, userName } = useAuth();

// Computed para detectar tema escuro

// Estado do ranking do usuário
const rankingTitle = ref<string>('Você está no topo! 🏆');
const rankingSubtitle = ref<string>('Ranking Geral dos Usuários');
const rankingValue = ref<string>('-');
const rankingMeta = ref<string>('-');
const rankingBtnText: string = 'Ver Detalhes do Ranking';
const loadingRanking = ref<boolean>(true);
const errorRanking = ref<string>('');


async function buscarRankingUsuario(): Promise<void> {
  loadingRanking.value = true;
  errorRanking.value = '';
  try {
    // Buscar top 50 do ranking geral
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, orderBy('ranking', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const rankingData = [];
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      rankingData.push({
        id: docSnap.id,
        nome: userData.nome || 'Usuário',
        ranking: userData.ranking || 0,
        nivelHabilidade: userData.nivelHabilidade || 0,
      });
    });
    // Encontrar posição do usuário logado
    let posicao = '-';
    let aproveitamento = '-';
    let nome = user.value?.displayName || 'Candidato';
    if (user.value?.uid) {
      const minhaPos = rankingData.findIndex(u => u.id === user.value.uid);
      if (minhaPos !== -1) {
        posicao = `${minhaPos + 1}º Lugar`;
        aproveitamento = formatarAproveitamento(rankingData[minhaPos].nivelHabilidade * 10);
        nome = rankingData[minhaPos].nome;
        rankingTitle.value = `Parabéns, ${nome}!`;
      } else {
        // Se não está no top 50, buscar dados individuais
        const userDoc = await getDoc(doc(db, 'usuarios', user.value.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          posicao = '50+';
          aproveitamento = formatarAproveitamento((userData.nivelHabilidade || 0) * 10);
          nome = userData.nome || nome;
          rankingTitle.value = `Continue avançando, ${nome}!`;
        }
      }
    }
    rankingValue.value = posicao;
    rankingMeta.value = aproveitamento;
  } catch (e) {
    errorRanking.value = 'Erro ao carregar ranking.';
    rankingValue.value = '-';
    rankingMeta.value = '-';
  } finally {
    loadingRanking.value = false;
  }
}

// Função para garantir que o sidebar permaneça sempre aberto
function ensureSidebarOpen(): void {
  const wrapper = document.querySelector('.layout-wrapper');
  if (wrapper) {
    // Remove a classe collapsed se existir, garantindo que o sidebar fique aberto
    wrapper.classList.remove('layout-vertical-nav-collapsed');
  }
}

onMounted(() => {
  buscarRankingUsuario();
  // Garante que o sidebar esteja sempre aberto no dashboard
  ensureSidebarOpen();
});

onUnmounted((): void => {
  // Remove a classe collapsed ao sair da página para evitar conflitos
  const wrapper = document.querySelector('.layout-wrapper');
  wrapper?.classList.remove('layout-vertical-nav-collapsed');
});

function irParaRankingGeral(): void {
  router.push('/app/ranking');
}
</script>

<template>
  <VRow class="match-height dashboard-row">
    <!-- Card de Boas-Vindas -->
    <VCol cols="12" md="6">
      <transition name="fade-slide" appear>
        <VCard 
          :class="[
            'dashboard-card hoverable-card elevation-4',
            isDarkTheme ? 'dashboard-card--dark' : 'dashboard-card--light'
          ]"
          color="surface"
        >
          <VCardItem class="dashboard-card-header bg-primary">
            <VCardTitle class="text-white d-flex align-center">
              <VIcon icon="ri-hand-heart-line" color="#ffd600" size="32" class="me-2" />
              Bem-vindo(a), {{ userName }}
            </VCardTitle>
          </VCardItem>
          <VCardText>
            <p class="text-body-1 mb-2">
              Sua jornada para a aprovação continua. Explore as novas simulações, acompanhe seu progresso e prepare-se para o sucesso.
            </p>
            <VChip color="success" size="small" class="mb-2">Novo ciclo</VChip>
            <VBtn
              color="primary"
              class="mt-4 dashboard-btn animated-btn"
              to="/app/station-list"
              prepend-icon="ri-arrow-right-line"
              block
              aria-label="Iniciar Nova Simulação"
            >
              Iniciar Nova Simulação
            </VBtn>
          </VCardText>
        </VCard>
      </transition>
    </VCol>

    <!-- Ranking do Usuário -->
    <VCol cols="12" md="6">
      <transition name="fade-slide" appear>
        <VCard 
          :class="[
            'dashboard-card hoverable-card elevation-4 ranking-card-model',
            isDarkTheme ? 'dashboard-card--dark' : 'dashboard-card--light'
          ]"
          color="surface"
        >
          <VCardText class="d-flex flex-row align-center justify-space-between">
            <div>
              <h5 class="text-h5 font-weight-bold mb-1">{{ rankingTitle }}</h5>
              <div class="text-body-1 mb-1">{{ rankingSubtitle }}</div>
              <h4 class="text-h4" style="color: #7b1fa2; font-weight: bold;">
                <span v-if="!loadingRanking">{{ rankingValue }}</span>
                <VProgressCircular v-else indeterminate color="primary" size="24" />
              </h4>
              <div class="text-body-1 mb-2">
                <span v-if="!loadingRanking">{{ rankingMeta }}% de aproveitamento <span>🚀</span></span>
                <VProgressCircular v-else indeterminate color="primary" size="18" />
              </div>
              <VBtn color="primary" class="ranking-btn" size="large" prepend-icon="ri-bar-chart-fill" @click="irParaRankingGeral" aria-label="Ver Detalhes do Ranking">
                {{ rankingBtnText }}
              </VBtn>
              <div v-if="errorRanking" class="text-error mt-2">{{ errorRanking }}</div>
            </div>
            <VImg :src="trophy" width="60" alt="Troféu" class="ranking-trophy" />
          </VCardText>
        </VCard>
      </transition>
    </VCol>
  </VRow>
</template>

<style scoped>
.dashboard-row {
  row-gap: 18px;
}

.dashboard-card {
  border-radius: 18px;
  margin-bottom: 18px;
  transition: box-shadow 0.25s, transform 0.18s;
}

/* Estilos específicos para tema claro */
.dashboard-card--light {
  box-shadow: 0 4px 24px 0 rgba(123, 31, 162, 0.08), 0 1.5px 4px 0 rgba(0,0,0,0.04);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--light:hover {
  box-shadow: 0 8px 32px 0 rgba(123, 31, 162, 0.18), 0 3px 8px 0 rgba(0,188,212,0.10);
}

/* Estilos específicos para tema escuro */
.dashboard-card--dark {
  box-shadow: 0 4px 24px 0 rgba(255, 255, 255, 0.05), 0 1.5px 4px 0 rgba(255, 255, 255, 0.02);
  background-color: rgb(var(--v-theme-surface));
}

.dashboard-card--dark:hover {
  box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.08), 0 3px 8px 0 rgba(123, 31, 162, 0.15);
}

.hoverable-card:hover {
  transform: translateY(-4px) scale(1.015);
}
.dashboard-card-header {
  border-radius: 18px 18px 0 0;
  padding: 18px 20px 12px 20px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
}

.dashboard-btn {
  font-weight: bold;
  letter-spacing: 0.5px;
  border-radius: 8px;
  transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
}

.animated-btn:hover {
  background: linear-gradient(90deg, #00bcd4 0%, #7b1fa2 100%);
  transform: scale(1.06);
  box-shadow: 0 4px 16px 0 rgba(0, 188, 212, 0.18);
}
/* Animação de entrada fade-slide */
.fade-slide-enter-active {
  transition: all 0.5s cubic-bezier(.55,0,.1,1);
}
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(.55,0,.1,1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.98);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.98);
}
.ranking-card-model {
  border-radius: 18px;
  padding: 18px 24px;
}

.ranking-trophy {
  position: relative;
  right: 0;
  bottom: 0;
  filter: drop-shadow(0 2px 8px #ffd600);
}

.ranking-btn {
  font-weight: bold;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgba(123, 31, 162, 0.10);
  margin-top: 8px;
}
@media (max-width: 900px) {
  .dashboard-card-header {
    font-size: 1.1rem;
    padding: 14px 12px 10px 12px;
  }
  .dashboard-card {
    border-radius: 12px;
    margin-bottom: 12px;
  }
}
@media (max-width: 600px) {
  .dashboard-row {
    row-gap: 10px;
  }
  .dashboard-card {
    border-radius: 8px;
    margin-bottom: 8px;
    padding: 0 2px;
  }
  .dashboard-card-header {
    border-radius: 8px 8px 0 0;
    padding: 10px 6px 6px 8px;
    font-size: 1rem;
  }
}
</style>
