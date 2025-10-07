import { ref } from 'vue';
import { collection, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { currentUser } from '@/plugins/auth';
import { formatarAproveitamento } from '@/@core/utils/format';

// Interface para os dados do ranking
export interface UserRankingData {
  posicao: string;
  aproveitamento: string;
  nome: string;
  titulo: string;
}

// Cache simples em memória
let cacheTimeout: NodeJS.Timeout | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useRanking() {
  const db = getFirestore();
  const rankingData = ref<UserRankingData | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string>('');

  async function fetchRanking(): Promise<void> {
    // Verificar se temos cache válido
    if (rankingData.value && !error.value) {
      return;
    }

    loading.value = true;
    error.value = '';

    try {
      // Obter o ID do usuário logado
      const userId = currentUser.value?.uid;
      
      if (!userId) {
        error.value = 'Usuário não autenticado.';
        return;
      }

      // Buscar top 50 do ranking geral
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, orderBy('ranking', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const rankingList: any[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        rankingList.push({
          id: docSnap.id,
          nome: userData.nome || 'Usuário',
          ranking: userData.ranking || 0,
          nivelHabilidade: userData.nivelHabilidade || 0,
        });
      });
      
      // Encontrar posição do usuário logado
      let posicao = '-';
      let aproveitamento = '-';
      let nome = 'Candidato';
      let titulo = 'Você está no topo! 🏆';
      
      const minhaPos = rankingList.findIndex(u => u.id === userId);
      if (minhaPos !== -1) {
        // Usuário está no top 50
        posicao = `${minhaPos + 1}º Lugar`;
        aproveitamento = formatarAproveitamento(rankingList[minhaPos].nivelHabilidade * 10);
        nome = rankingList[minhaPos].nome;
        titulo = `Parabéns, ${nome}!`;
      } else {
        // Se não está no top 50, buscar dados individuais
        const userDoc = await getDoc(doc(db, 'usuarios', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          posicao = '50+';
          aproveitamento = formatarAproveitamento((userData.nivelHabilidade || 0) * 10);
          nome = userData.nome || nome;
          titulo = `Continue avançando, ${nome}!`;
        }
      }
      
      // Atualizar dados do ranking
      rankingData.value = {
        posicao,
        aproveitamento,
        nome,
        titulo
      };

      // Configurar cache
      if (cacheTimeout) {
        clearTimeout(cacheTimeout);
      }
      cacheTimeout = setTimeout(() => {
        rankingData.value = null;
      }, CACHE_DURATION);
      
    } catch (e: any) {
      error.value = 'Erro ao carregar ranking.';
      console.error('Erro ao buscar ranking:', e);
    } finally {
      loading.value = false;
    }
  }

  return {
    rankingData,
    loading,
    error,
    fetchRanking
  };
}