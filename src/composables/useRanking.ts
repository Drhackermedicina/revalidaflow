import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { ref } from 'vue';
import { formatarAproveitamento } from '@/@core/utils/format';

interface RankingData {
  id: string;
  nome: string;
  ranking: number;
  nivelHabilidade: number;
}

export function useRanking() {
  const db = getFirestore();
  const rankingTitle = ref<string>('Você está no topo! 🏆');
  const rankingSubtitle = ref<string>('Ranking Geral dos Usuários');
  const rankingValue = ref<string>('-');
  const rankingMeta = ref<string>('-');
  const loadingRanking = ref<boolean>(true);
  const errorRanking = ref<string>('');

  async function buscarRankingUsuario(userId?: string): Promise<void> {
    loadingRanking.value = true;
    errorRanking.value = '';
    
    try {
      // Buscar top 50 do ranking geral
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, orderBy('ranking', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const rankingData: RankingData[] = [];
      
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
      let nome = 'Candidato';
      
      if (userId) {
        const minhaPos = rankingData.findIndex(u => u.id === userId);
        if (minhaPos !== -1) {
          posicao = `${minhaPos + 1}º Lugar`;
          aproveitamento = formatarAproveitamento(rankingData[minhaPos].nivelHabilidade * 10);
          nome = rankingData[minhaPos].nome;
          rankingTitle.value = `Parabéns, ${nome}!`;
        } else {
          // Se não está no top 50, buscar dados individuais
          const userDoc = await getDoc(doc(db, 'usuarios', userId));
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

  function resetRanking(): void {
    rankingTitle.value = 'Você está no topo! 🏆';
    rankingValue.value = '-';
    rankingMeta.value = '-';
    loadingRanking.value = true;
    errorRanking.value = '';
  }

  return {
    rankingTitle,
    rankingSubtitle,
    rankingValue,
    rankingMeta,
    loadingRanking,
    errorRanking,
    buscarRankingUsuario,
    resetRanking
  };
}