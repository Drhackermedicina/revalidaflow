<script setup>
import trophy from '@/assets/images/misc/trophy.png';
import { useAdminAuth } from '@/composables/useAdminAuth';
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
import { computed, ref, onMounted } from 'vue';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Verificação de admin
const { isAuthorizedAdmin } = useAdminAuth();

// Firebase
const db = getFirestore();
const auth = getAuth();

// Exibe o menu admin apenas para administradores
const showAdminMenu = computed(() => {
  return isAuthorizedAdmin.value;
})

// Estado do ranking do usuário no sidebar
const rankingPosition = ref('Carregando...');
const rankingMeta = ref(0);
const currentUserId = ref(null);

// Buscar dados do ranking do usuário para o sidebar
async function buscarRankingSidebar() {
  if (!currentUserId.value) return;

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
    const minhaPos = rankingData.findIndex(u => u.id === currentUserId.value);
    if (minhaPos !== -1) {
      rankingPosition.value = `${minhaPos + 1}º Lugar`;
      rankingMeta.value = Math.round((rankingData[minhaPos].nivelHabilidade || 0) * 10);
    } else {
      // Se não está no top 50, buscar dados individuais
      const userDoc = await getDoc(doc(db, 'usuarios', currentUserId.value));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        rankingPosition.value = '50+';
        rankingMeta.value = Math.round((userData.nivelHabilidade || 0) * 10);
      }
    }
  } catch (error) {
    console.error('Erro ao buscar ranking sidebar:', error);
    rankingPosition.value = 'Erro';
    rankingMeta.value = 0;
  }
}

// Monitorar usuário autenticado
onMounted(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserId.value = user.uid;
      buscarRankingSidebar();
    } else {
      rankingPosition.value = 'Faça login';
      rankingMeta.value = 0;
    }
  });

  return () => unsubscribe();
});

const homeLink = {
  title: 'Home',
  icon: 'ri-home-5-fill',
  iconColor: '#00bcd4',
  to: '/app/dashboard',
};

const estacoesLink = {
  title: 'Estações',
  icon: 'ri-hospital-fill',
  iconColor: '#7b1fa2',
  to: '/app/station-list',
};

const questoesLink = {
  title: 'Questões',
  icon: 'ri-file-text-fill',
  iconColor: '#e91e63',
  to: '/app/questoes',
};

const grupoChatLink = {
  title: 'Grupo de Chat',
  icon: 'ri-wechat-fill',
  iconColor: '#43a047',
  to: '/app/chat-group',
};

const buscarUsuariosGroup = {
  title: 'Buscar Usuários',
  icon: 'ri-user-search-fill',
  iconColor: '#ff9800',
  to: '/app/arena/buscar-usuarios',
};

const showCodeDialog = ref(false);
function openCodeDialog() { showCodeDialog.value = true; }
function closeCodeDialog() { showCodeDialog.value = false; }
</script>

<template>
  <VerticalNavLink :item="homeLink" />
  <VerticalNavLink :item="estacoesLink" />
  <VerticalNavLink :item="questoesLink" />
  <VerticalNavLink :item="grupoChatLink" />

  <VerticalNavGroup
    :item="{
      title: 'Ranking Geral',
      icon: 'ri-medal-fill',
      iconColor: '#ffd600',
      to: '/app/ranking',
      group: false, // Remove a seta de expansão
    }"
    @click="$router.push('/app/ranking')"
    style="cursor:pointer;"
    :expandable="false"
  >
    <div class="sidebar-ranking-card d-flex align-center justify-space-between px-3 py-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold mb-1">Sua posição:</div>
        <div class="text-h6" style="color: #7b1fa2; font-weight: bold;">{{ rankingPosition }}</div>
        <div class="text-caption mb-1">{{ rankingMeta }}% de aproveitamento 🚀</div>
      </div>
      <img :src="trophy" width="32" alt="Troféu" style="filter: drop-shadow(0 2px 8px #ffd600);" />
    </div>
  </VerticalNavGroup>

  <VerticalNavGroup
    :item="{
      title: 'Área do Candidato',
      icon: 'ri-user-3-fill',
      iconColor: '#1976d2',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Progresso',
        icon: 'ri-bar-chart-fill',
        iconColor: '#00bcd4',
        to: '/candidato/progresso',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Estatísticas',
        icon: 'ri-pie-chart-2-fill',
        iconColor: '#ff9800',
        to: '/candidato/estatisticas',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Histórico',
        icon: 'ri-history-fill',
        iconColor: '#607d8b',
        to: '/candidato/historico',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Performance',
        icon: 'ri-bar-chart-grouped-fill',
        iconColor: '#43a047',
        to: '/candidato/performance',
      }"
    />
  </VerticalNavGroup>

  <VerticalNavGroup
    :item="{
      title: 'Assinatura',
      icon: 'ri-vip-crown-2-fill',
      iconColor: '#fbc02d',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Renovação',
        icon: 'ri-refresh-fill',
        iconColor: '#00bcd4',
        to: '/pagamento',
      }"
    />
  </VerticalNavGroup>

  <!-- Seção Administração - Visível apenas para admins -->
  <VerticalNavGroup
    v-if="showAdminMenu"
    :item="{
      title: 'Administração',
      icon: 'ri-shield-keyhole-fill',
      iconColor: '#d32f2f',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Painel Admin',
        icon: 'ri-dashboard-fill',
        iconColor: '#1976d2',
        to: '/app/admin',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Upload Estações',
        icon: 'ri-upload-2-fill',
        iconColor: '#388e3c',
        to: '/app/admin-upload',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Reset Usuários',
        icon: 'ri-refresh-fill',
        iconColor: '#f57c00',
        to: '/app/admin-reset-users',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Diagnóstico Ranking',
        icon: 'ri-search-fill',
        iconColor: '#9c27b0',
        to: '/app/diagnostico-ranking',
      }"
    />
      <!-- Admin IA links removidos -->
  </VerticalNavGroup>
</template>
