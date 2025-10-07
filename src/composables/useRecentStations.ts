import { ref } from 'vue';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/plugins/firebase';

// Interface para os dados da estação
export interface RecentStation {
  id: string;
  titulo: string;
  especialidade: string;
  createdAt: Date;
}

// Cache em memória para as estações recentes
let cacheData: RecentStation[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora em milissegundos

// O composable
export function useRecentStations() {
  // Estado reativo
  const recentStations = ref<RecentStation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Função para verificar se o cache é válido
  const isCacheValid = (): boolean => {
    if (!cacheData || !cacheTimestamp) return false;
    return Date.now() - cacheTimestamp < CACHE_DURATION;
  };

  // Função para buscar estações recentes
  const fetchRecentStations = async (): Promise<void> => {
    // Verificar se o cache é válido
    if (isCacheValid()) {
      recentStations.value = [...cacheData!];
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // Calcular a data de 7 dias atrás
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

      // Criar a consulta para buscar estações dos últimos 7 dias
      // Nota: Usando 'estacoes_clinicas' conforme verificado no projeto
      const stationsQuery = query(
        collection(db, 'estacoes_clinicas'),
        where('criadoEmTimestamp', '>=', sevenDaysAgoTimestamp),
        orderBy('criadoEmTimestamp', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(stationsQuery);
      const stations: RecentStation[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Verificar se os campos necessários existem
        if (data.tituloEstacao && data.especialidade && data.criadoEmTimestamp) {
          stations.push({
            id: doc.id,
            titulo: data.tituloEstacao,
            especialidade: data.especialidade,
            createdAt: data.criadoEmTimestamp.toDate()
          });
        }
      });

      // Atualizar o estado e o cache
      recentStations.value = stations;
      cacheData = [...stations];
      cacheTimestamp = Date.now();

    } catch (err) {
      console.error('Erro ao buscar estações recentes:', err);
      error.value = 'Falha ao carregar estações recentes. Tente novamente mais tarde.';
      
      // Em caso de erro, tentar usar dados em cache se disponíveis
      if (cacheData) {
        recentStations.value = [...cacheData];
        error.value = 'Usando dados em cache. Falha ao carregar estações recentes.';
      }
    } finally {
      loading.value = false;
    }
  };

  // Função para limpar o cache manualmente
  const clearCache = (): void => {
    cacheData = null;
    cacheTimestamp = null;
  };

  return {
    recentStations,
    loading,
    error,
    fetchRecentStations,
    clearCache
  };
}