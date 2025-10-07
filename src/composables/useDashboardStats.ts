import { ref, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useAuth } from '@/composables/useAuth';

// Interfaces para os dados
export interface DashboardStats {
  averageScore: number;
  bestScore: number;
  streak: number;
  overallProgress: number;
  performanceByArea: PerformanceArea[];
  simulationsHistory: SimulationHistoryItem[];
}

export interface PerformanceArea {
  name: string;
  score: number;
}

export interface SimulationHistoryItem {
  id: string;
  date: string;
  type: string;
  score: number;
  status: string;
}

// Cache em memória
let cacheTimestamp = 0;
let cachedStats: DashboardStats | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Mapeamento de especialidades
const especialidadeNomes = {
  'clinica-medica': 'Clínica Médica',
  'cirurgia': 'Cirurgia Geral',
  'pediatria': 'Pediatria',
  'ginecologia-obstetricia': 'Ginecologia e Obstetrícia',
  'medicina-preventiva': 'Medicina Preventiva',
};

// O composable
export function useDashboardStats() {
  const { user } = useAuth();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const stats = ref<DashboardStats | null>(null);

  // Função para calcular a pontuação média
  const calculateAverageScore = (userData: any): number => {
    // Se tiver nível de habilidade, usa ele
    if (userData.nivelHabilidade !== undefined) {
      return Math.round(userData.nivelHabilidade * 10);
    }
    
    // Se tiver estatísticas gerais, usa a média
    if (userData.statistics?.geral?.mediaNotas !== undefined) {
      return Math.min(Math.round(userData.statistics.geral.mediaNotas * 10), 100);
    }
    
    // Se tiver estações concluídas, calcula a média
    if (userData.estacoesConcluidas?.length) {
      const notas = userData.estacoesConcluidas.map((estacao: any) => estacao.nota || 0);
      return notas.length ? Math.round(notas.reduce((sum: number, nota: number) => sum + nota, 0) / notas.length) : 0;
    }
    
    return 0;
  };

  // Função para calcular a melhor pontuação
  const calculateBestScore = (userData: any): number => {
    if (!userData.estacoesConcluidas?.length) return 0;
    
    const notas = userData.estacoesConcluidas.map((estacao: any) => estacao.nota || 0);
    return notas.length ? Math.max(...notas) : 0;
  };

  // Função para calcular o streak de dias de estudo
  const calculateStreak = (userData: any): number => {
    const concluidas = userData.estacoesConcluidas || [];
    if (!concluidas.length) return 0;

    let streakCount = 0;
    let lastDate = null;

    concluidas
      .map((item: any) => {
        if (item.data?.toDate) return item.data.toDate();
        if (item.data instanceof Date) return item.data;
        if (typeof item.data === 'string' || typeof item.data === 'number') return new Date(item.data);
        return null;
      })
      .filter(Boolean)
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())
      .forEach((date: Date) => {
        if (!lastDate) {
          streakCount = 1;
          lastDate = date;
        } else {
          const diff = (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
          if (diff <= 1.5) {
            streakCount++;
            lastDate = date;
          }
        }
      });

    return streakCount;
  };

  // Função para calcular o progresso geral
  const calculateOverallProgress = (userData: any): number => {
    const concluidas = userData.estacoesConcluidas?.length || 0;
    // Estimativa baseada em estações concluídas (assumindo ~50 estações totais)
    return Math.min((concluidas / 50) * 100, 100);
  };

  // Função para calcular o desempenho por área
  const calculatePerformanceByArea = (userData: any): PerformanceArea[] => {
    const stats = userData.statistics;
    if (!stats) {
      return Object.values(especialidadeNomes).map(nome => ({
        name: nome,
        score: 0
      }));
    }

    const areas = Object.entries(stats)
      .filter(([key]) => key !== 'geral' && especialidadeNomes[key as keyof typeof especialidadeNomes])
      .map(([key, dados]) => ({
        name: especialidadeNomes[key as keyof typeof especialidadeNomes],
        score: Math.min(Math.round(((dados as any).mediaNotas || 0) * 10), 100)
      }));

    return areas.length ? areas : Object.values(especialidadeNomes).map(nome => ({
      name: nome,
      score: 0
    }));
  };

  // Função para extrair o histórico de simulações
  const extractSimulationsHistory = (userData: any): SimulationHistoryItem[] => {
    if (!userData.estacoesConcluidas?.length) return [];

    return userData.estacoesConcluidas.map((estacao: any, index: number) => {
      let dateStr = '';
      if (estacao.data?.toDate) {
        dateStr = estacao.data.toDate().toLocaleDateString();
      } else if (estacao.data instanceof Date) {
        dateStr = estacao.data.toLocaleDateString();
      } else if (typeof estacao.data === 'string' || typeof estacao.data === 'number') {
        dateStr = new Date(estacao.data).toLocaleDateString();
      }

      return {
        id: estacao.id || `sim-${index}`,
        date: dateStr,
        type: estacao.tipo || 'Estação',
        score: estacao.nota || 0,
        status: estacao.status || 'Concluída'
      };
    });
  };

  // Função principal para buscar e processar os dados
  const fetchStats = async (): Promise<void> => {
    if (!user.value?.uid) {
      error.value = 'Usuário não autenticado';
      return;
    }

    // Verificar se o cache ainda é válido
    const now = Date.now();
    if (cachedStats && (now - cacheTimestamp) < CACHE_DURATION) {
      stats.value = cachedStats;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'usuarios', user.value.uid));

      if (!userDoc.exists()) {
        error.value = 'Dados do usuário não encontrados';
        return;
      }

      const userData = userDoc.data();

      // Processar os dados
      const processedStats: DashboardStats = {
        averageScore: calculateAverageScore(userData),
        bestScore: calculateBestScore(userData),
        streak: calculateStreak(userData),
        overallProgress: calculateOverallProgress(userData),
        performanceByArea: calculatePerformanceByArea(userData),
        simulationsHistory: extractSimulationsHistory(userData)
      };

      // Atualizar o cache
      cachedStats = processedStats;
      cacheTimestamp = now;
      
      // Atualizar o estado reativo
      stats.value = processedStats;
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
      error.value = 'Erro ao carregar estatísticas do dashboard';
    } finally {
      loading.value = false;
    }
  };

  // Limpar cache
  const clearCache = (): void => {
    cacheTimestamp = 0;
    cachedStats = null;
  };

  return {
    stats,
    loading,
    error,
    fetchStats,
    clearCache
  };
}