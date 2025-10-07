# PROPOSTA COMPLETA DE INTEGRAÇÃO DO DASHBOARD

## 1. ANÁLISE DOS COMPONENTES DE ESTATÍSTICAS

### 1.1 Estatisticas.vue
**Funcionalidades identificadas:**
- Pontuação média por simulação (nivelHabilidade * 10)
- Melhor pontuação obtida
- Desempenho por área (gráfico de barras horizontais)
- Visualizações com VueApexCharts (radialBar e bar)

**Dados importantes:**
```javascript
// Pontuação média
const averageScore = computed(() => {
  const nivel = userData.value?.nivelHabilidade;
  return nivel !== undefined ? Math.round(nivel * 10) : 0;
});

// Melhor pontuação
const bestScore = computed(() => {
  const estacoes = userData.value?.estacoesConcluidas || [];
  const notas = estacoes.map(estacao => estacao.nota || 0);
  return notas.length ? Math.max(...notas) : 0;
});
```

### 1.2 PerformanceView.vue
**Funcionalidades identificadas:**
- Simulações concluídas (contador)
- Média de notas
- Cálculo de streak (dias consecutivos)
- Histórico de evolução com gráfico
- Lista detalhada de atividades

**Dados importantes:**
```javascript
// Contador de simulações
const simulations = computed(() => userData.value?.estacoesConcluidas?.length ?? 0);

// Cálculo de streak
const streak = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas || [];
  // Lógica complexa para calcular dias consecutivos
});
```

### 1.3 Progresso.vue
**Funcionalidades identificadas:**
- Progresso geral (baseado em estações concluídas)
- Progresso por módulo/especialidade
- Barras de progresso lineares
- Mapeamento de especialidades

**Dados importantes:**
```javascript
// Progresso geral
const overallProgress = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas?.length || 0;
  return Math.min((concluidas / 50) * 100, 100);
});
```

### 1.4 Historico.vue
**Funcionalidades identificadas:**
- Tabela com histórico de simulações
- Formatação de datas
- Classificação por cores según desempenho
- Ordenação por data (mais recente primeiro)

## 2. PROPOSTA DE NOVOS CARDS PARA O DASHBOARD

### 2.1 Estrutura Geral do Novo Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│  CARD BOAS-VINDAS    │    CARD RANKING ATUAL   │  CARD STREAK│
│  (existente)         │    (existente)          │  (novo)     │
├─────────────────────────────────────────────────────────────┤
│  CARD ESTATÍSTICAS   │    CARD PROGRESSO       │  CARD NOVAS │
│  RESUMIDAS (novo)    │    GERAL (novo)         │  ESTAÇÕES   │
├─────────────────────────────────────────────────────────────┤
│  CARD PRÓXIMAS       │    CARD ÚLTIMAS         │             │
│  SIMULAÇÕES (novo)   │    ATIVIDADES (novo)    │             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Card de Estatísticas Resumidas

**Objetivo:** Apresentar métricas chave de forma visual e compacta
**Dados exibidos:**
- Pontuação média (círculo de progresso)
- Melhor pontuação (círculo de progresso)
- Total de simulações concluídas
- Taxa de aproveitamento geral

**Layout:**
```vue
<VCard class="estatisticas-resumidas-card">
  <VCardTitle>
    <VIcon icon="ri-bar-chart-line" />
    Suas Estatísticas
  </VCardTitle>
  <VCardText>
    <VRow>
      <VCol cols="6">
        <div class="stat-circle">
          <VueApexCharts 
            type="radialBar" 
            :options="radialOptions" 
            :series="[averageScore]" 
            height="120"
          />
          <span class="stat-label">Média</span>
        </div>
      </VCol>
      <VCol cols="6">
        <div class="stat-circle">
          <VueApexCharts 
            type="radialBar" 
            :options="radialOptions" 
            :series="[bestScore]" 
            height="120"
          />
          <span class="stat-label">Recorde</span>
        </div>
      </VCol>
    </VRow>
    <VRow class="mt-2">
      <VCol cols="6">
        <div class="stat-item">
          <span class="stat-value">{{ simulationsCount }}</span>
          <span class="stat-label">Simulações</span>
        </div>
      </VCol>
      <VCol cols="6">
        <div class="stat-item">
          <span class="stat-value">{{ overallProgress }}%</span>
          <span class="stat-label">Progresso</span>
        </div>
      </VCol>
    </VRow>
  </VCardText>
</VCard>
```

### 2.3 Card de Progresso Geral

**Objetivo:** Mostrar avanço visual do usuário na plataforma
**Dados exibidos:**
- Barra de progresso principal (baseada em estações concluídas)
- Progresso por especialidade (mini barras)
- Meta semanal/mensal
- Tempo de estudo dedicado

**Layout:**
```vue
<VCard class="progresso-geral-card">
  <VCardTitle>
    <VIcon icon="ri-trophy-line" />
    Seu Progresso
  </VCardTitle>
  <VCardText>
    <div class="progress-main">
      <VProgressLinear
        :model-value="overallProgress"
        color="primary"
        height="24"
        rounded
      >
        <template #default="{ value }">
          <strong>{{ Math.ceil(value) }}% Completo</strong>
        </template>
      </VProgressLinear>
    </div>
    
    <div class="progress-modules mt-4">
      <div v-for="module in topModules" :key="module.name" class="module-progress">
        <span class="module-name">{{ module.name }}</span>
        <VProgressLinear
          :model-value="module.progress"
          color="info"
          height="8"
          rounded
        />
      </div>
    </div>
    
    <div class="progress-meta mt-3">
      <VChip size="small" color="success">
        <VIcon icon="ri-fire-line" />
        {{ streak }} dias seguidos
      </VChip>
    </div>
  </VCardText>
</VCard>
```

### 2.4 Card de Novas Estações

**Objetivo:** Destacar conteúdo novo e engajar usuários
**Dados exibidos:**
- Contador de estações adicionadas recentemente (últimos 7 dias)
- Lista das 3 estações mais recentes
- Indicador visual de novidade
- Link rápido para acessar novas estações

**Layout:**
```vue
<VCard class="novas-estacoes-card">
  <VCardTitle>
    <VIcon icon="ri-sparkling-line" />
    Novas Simulações
    <VChip color="error" size="small" class="ml-2">
      {{ newStationsCount }} Novas
    </VChip>
  </VCardTitle>
  <VCardText>
    <div v-if="newStations.length > 0">
      <VList density="compact">
        <VListItem
          v-for="station in newStations.slice(0, 3)"
          :key="station.id"
          :to="`/app/simulation/${station.id}`"
          class="new-station-item"
        >
          <template #prepend>
            <VIcon icon="ri-add-circle-line" color="success" />
          </template>
          <VListItemTitle>{{ station.tituloEstacao }}</VListItemTitle>
          <VListItemSubtitle>{{ station.especialidade }}</VListItemSubtitle>
          <template #append>
            <VChip size="x-small" color="info">Novo</VChip>
          </template>
        </VListItem>
      </VList>
      
      <VBtn
        variant="outlined"
        size="small"
        block
        class="mt-2"
        to="/app/station-list?filter=new"
      >
        Ver todas as novidades
      </VBtn>
    </div>
    
    <div v-else class="text-center py-4">
      <VIcon icon="ri-information-line" size="32" color="grey" />
      <p class="text-body-2 mt-2">Nenhuma novidade esta semana</p>
    </div>
  </VCardText>
</VCard>
```

### 2.5 Card de Próximas Simulações Sugeridas

**Objetivo:** Guiar usuário para próximos passos de estudo
**Dados exibidos:**
- Simulações recomendadas baseadas em desempenho
- Áreas com menor pontuação
- Sequência lógica de aprendizado
- Dificuldade sugerida

**Layout:**
```vue
<VCard class="proximas-simulacoes-card">
  <VCardTitle>
    <VIcon icon="ri-lightbulb-line" />
    Próximos Passos
  </VCardTitle>
  <VCardText>
    <div v-if="suggestedStations.length > 0">
      <VAlert
        type="info"
        variant="tonal"
        class="mb-3"
      >
        Baseado no seu desempenho, recomendamos focar em:
      </VAlert>
      
      <VList density="compact">
        <VListItem
          v-for="station in suggestedStations.slice(0, 3)"
          :key="station.id"
          :to="`/app/simulation/${station.id}`"
          class="suggested-station"
        >
          <template #prepend>
            <VIcon 
              :icon="getDifficultyIcon(station.dificuldade)" 
              :color="getDifficultyColor(station.dificuldade)"
            />
          </template>
          <VListItemTitle>{{ station.tituloEstacao }}</VListItemTitle>
          <VListItemSubtitle>
            {{ station.especialidade }} • {{ station.dificuldade }}
          </VListItemSubtitle>
          <template #append>
            <VBtn
              icon="ri-play-circle-line"
              variant="text"
              color="primary"
              size="small"
            />
          </template>
        </VListItem>
      </VList>
    </div>
    
    <div v-else class="text-center py-4">
      <VIcon icon="ri-graduation-cap-line" size="32" color="grey" />
      <p class="text-body-2 mt-2">Complete mais simulações para receber recomendações</p>
    </div>
  </VCardText>
</VCard>
```

### 2.6 Card de Últimas Atividades

**Objetivo:** Histórico rápido das atividades recentes
**Dados exibidos:**
- Últimas 5 simulações concluídas
- Pontuação obtida
- Data da atividade
- Status de conclusão

**Layout:**
```vue
<VCard class="ultimas-atividades-card">
  <VCardTitle>
    <VIcon icon="ri-history-line" />
    Suas Atividades Recentes
  </VCardTitle>
  <VCardText>
    <VTimeline density="compact" side="end">
      <VTimelineItem
        v-for="activity in recentActivities"
        :key="activity.id"
        :dot-color="getActivityColor(activity.score)"
        size="small"
      >
        <template #opposite>
          <span class="text-caption">{{ formatDate(activity.date) }}</span>
        </template>
        <div>
          <div class="text-body-2">{{ activity.title }}</div>
          <div class="text-caption">
            Pontuação: 
            <VChip
              :color="getScoreColor(activity.score)"
              size="x-small"
              class="ml-1"
            >
              {{ activity.score }}
            </VChip>
          </div>
        </div>
      </VTimelineItem>
    </VTimeline>
    
    <VBtn
      variant="text"
      size="small"
      block
      class="mt-2"
      to="/app/candidato/historico"
    >
      Ver histórico completo
    </VBtn>
  </VCardText>
</VCard>
```

## 3. CARD DE NOVAS ESTAÇÕES - ESTRATÉGIA DE DADOS

### 3.1 Obtenção de Dados de Estações Recentes

**Estratégia de consulta Firestore:**
```javascript
// Composable para estações recentes
export function useRecentStations() {
  const newStations = ref([])
  const loading = ref(false)
  
  async function fetchRecentStations() {
    loading.value = true
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    try {
      const stationsQuery = query(
        collection(db, 'estacoes_clinicas'),
        where('criadoEmTimestamp', '>=', sevenDaysAgo),
        orderBy('criadoEmTimestamp', 'desc'),
        limit(10)
      )
      
      const snapshot = await getDocs(stationsQuery)
      newStations.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Erro ao buscar estações recentes:', error)
    } finally {
      loading.value = false
    }
  }
  
  return {
    newStations,
    loading,
    fetchRecentStations
  }
}
```

### 3.2 Cache e Otimização

**Estratégia de cache:**
```javascript
// Cache para estações recentes (24h)
const CACHE_KEY = 'recent_stations'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

export function useCachedRecentStations() {
  const { getCachedData, setCachedData } = useCacheManager()
  
  async function getRecentStations() {
    // Verificar cache primeiro
    const cached = getCachedData(CACHE_KEY)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    
    // Buscar dados frescos
    const { fetchRecentStations } = useRecentStations()
    const stations = await fetchRecentStations()
    
    // Salvar no cache
    setCachedData(CACHE_KEY, {
      data: stations,
      timestamp: Date.now()
    })
    
    return stations
  }
}
```

## 4. MELHORIAS VISUAIS E LAYOUT RESPONSIVO

### 4.1 Sistema de Grid Otimizado

**Estrutura responsiva:**
```vue
<template>
  <VContainer fluid class="dashboard-container">
    <VRow class="dashboard-grid">
      <!-- Cards Principais (Desktop: 4-4-4, Mobile: 12-12-12) -->
      <VCol 
        cols="12" 
        md="4" 
        v-for="card in mainCards" 
        :key="card.id"
        class="dashboard-col"
      >
        <component :is="card.component" v-bind="card.props" />
      </VCol>
      
      <!-- Cards Secundários (Desktop: 6-6, Mobile: 12-12) -->
      <VCol 
        cols="12" 
        md="6" 
        v-for="card in secondaryCards" 
        :key="card.id"
        class="dashboard-col"
      >
        <component :is="card.component" v-bind="card.props" />
      </VCol>
      
      <!-- Cards Terciários (Desktop: 12, Mobile: 12) -->
      <VCol cols="12">
        <component :is="tertiaryCard.component" v-bind="tertiaryCard.props" />
      </VCol>
    </VRow>
  </VContainer>
</template>
```

### 4.2 Animações e Micro-interações

**CSS para animações:**
```scss
// Animações de entrada
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Classes de animação
.dashboard-card {
  animation: slideInUp 0.5s ease-out;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
}

.stat-value {
  animation: fadeInScale 0.6s ease-out 0.2s both;
}

// Stagger animation para cards
.dashboard-col {
  &:nth-child(1) { animation-delay: 0.1s; }
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.3s; }
  &:nth-child(4) { animation-delay: 0.4s; }
}
```

### 4.3 Sistema de Cores e Tema

**Variáveis CSS para tema:**
```scss
:root {
  // Cores primárias do dashboard
  --dashboard-primary: #7b1fa2;
  --dashboard-secondary: #00bcd4;
  --dashboard-success: #4caf50;
  --dashboard-warning: #ff9800;
  --dashboard-error: #f44336;
  
  // Gradientes
  --gradient-primary: linear-gradient(135deg, #7b1fa2 0%, #00bcd4 100%);
  --gradient-success: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
  
  // Sombras
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.12);
  
  // Bordas e raio
  --border-radius-card: 16px;
  --border-radius-small: 8px;
}

[data-theme="dark"] {
  --dashboard-primary: #9c27b0;
  --dashboard-secondary: #03a9f4;
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
  --shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

## 5. INTEGRAÇÃO TÉCNICA

### 5.1 Composables Necessários

**useDashboardData.js**
```javascript
import { ref, computed, onMounted } from 'vue'
import { useFirebaseData } from '@/composables/useFirebaseData'
import { useRecentStations } from '@/composables/useRecentStations'
import { useStationRecommendations } from '@/composables/useStationRecommendations'

export function useDashboardData() {
  const { userData, loading: loadingUserData } = useFirebaseData()
  const { newStations, loading: loadingStations, fetchRecentStations } = useRecentStations()
  const { recommendations, loading: loadingRecommendations } = useStationRecommendations()
  
  // Estatísticas resumidas
  const averageScore = computed(() => {
    const nivel = userData.value?.nivelHabilidade
    return nivel !== undefined ? Math.round(nivel * 10) : 0
  })
  
  const bestScore = computed(() => {
    const estacoes = userData.value?.estacoesConcluidas || []
    const notas = estacoes.map(estacao => estacao.nota || 0)
    return notas.length ? Math.max(...notas) : 0
  })
  
  const simulationsCount = computed(() => 
    userData.value?.estacoesConcluidas?.length || 0
  )
  
  const overallProgress = computed(() => {
    const concluidas = userData.value?.estacoesConcluidas?.length || 0
    return Math.min((concluidas / 50) * 100, 100)
  })
  
  const streak = computed(() => {
    // Lógica de cálculo de streak do PerformanceView.vue
    const concluidas = userData.value?.estacoesConcluidas || []
    if (!concluidas.length) return 0
    
    let streakCount = 0
    let lastDate = null
    
    concluidas
      .map(item => {
        if (item.data?.toDate) return item.data.toDate()
        if (item.data instanceof Date) return item.data
        if (typeof item.data === 'string' || typeof item.data === 'number') 
          return new Date(item.data)
        return null
      })
      .filter(Boolean)
      .sort((a, b) => b - a)
      .forEach(date => {
        if (!lastDate) {
          streakCount = 1
          lastDate = date
        } else {
          const diff = (lastDate - date) / (1000 * 60 * 60 * 24)
          if (diff <= 1.5) {
            streakCount++
            lastDate = date
          }
        }
      })
    
    return streakCount
  })
  
  // Atividades recentes
  const recentActivities = computed(() => {
    const concluidas = userData.value?.estacoesConcluidas || []
    return concluidas
      .slice(-5)
      .reverse()
      .map(estacao => ({
        id: estacao.estacaoId,
        title: estacao.nomeEstacao || 'Simulação',
        score: estacao.nota || 0,
        date: estacao.data || new Date(),
        especialidade: estacao.especialidade
      }))
  })
  
  // Módulos principais
  const topModules = computed(() => {
    const stats = userData.value?.statistics
    if (!stats) return []
    
    return Object.entries(stats)
      .filter(([key]) => key !== 'geral')
      .slice(0, 3)
      .map(([key, dados]) => ({
        name: getModuleName(key),
        progress: Math.min((dados.mediaNotas || 0) * 10, 100)
      }))
  })
  
  // Estado de loading geral
  const loading = computed(() => 
    loadingUserData.value || 
    loadingStations.value || 
    loadingRecommendations.value
  )
  
  // Inicialização
  onMounted(() => {
    fetchRecentStations()
  })
  
  return {
    // Dados
    userData,
    newStations,
    recommendations,
    
    // Estatísticas
    averageScore,
    bestScore,
    simulationsCount,
    overallProgress,
    streak,
    recentActivities,
    topModules,
    
    // Estado
    loading,
    
    // Métodos
    fetchRecentStations
  }
}

function getModuleName(key) {
  const names = {
    'clinica-medica': 'Clínica Médica',
    'cirurgia': 'Cirurgia',
    'pediatria': 'Pediatria',
    'ginecologia-obstetricia': 'Ginecologia',
    'medicina-preventiva': 'Medicina Preventiva'
  }
  return names[key] || key
}
```

**useStationRecommendations.js**
```javascript
import { ref, computed } from 'vue'
import { useStationData } from '@/composables/useStationData'
import { useFirebaseData } from '@/composables/useFirebaseData'

export function useStationRecommendations() {
  const { stations } = useStationData()
  const { userData } = useFirebaseData()
  const recommendations = ref([])
  const loading = ref(false)
  
  async function generateRecommendations() {
    loading.value = true
    try {
      const stats = userData.value?.statistics || {}
      const completedStations = userData.value?.estacoesConcluidas || []
      const completedIds = new Set(completedStations.map(s => s.estacaoId))
      
      // Encontrar áreas com menor desempenho
      const weakAreas = Object.entries(stats)
        .filter(([key]) => key !== 'geral')
        .sort(([,a], [,b]) => (a.mediaNotas || 0) - (b.mediaNotas || 0))
        .slice(0, 2)
        .map(([key]) => key)
      
      // Filtrar estações não completadas nas áreas fracas
      const recommended = stations.value
        .filter(station => 
          !completedIds.has(station.idEstacao) &&
          weakAreas.includes(station.especialidade)
        )
        .slice(0, 5)
        .map(station => ({
          ...station,
          dificuldade: calculateDifficulty(station, stats[station.especialidade])
        }))
      
      recommendations.value = recommended
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error)
    } finally {
      loading.value = false
    }
  }
  
  function calculateDifficulty(station, areaStats) {
    const baseScore = areaStats?.mediaNotas || 0
    if (baseScore < 0.5) return 'Fácil'
    if (baseScore < 0.7) return 'Médio'
    return 'Difícil'
  }
  
  return {
    recommendations,
    loading,
    generateRecommendations
  }
}
```

### 5.2 Otimização de Queries Firestore

**Estratégia de consulta otimizada:**
```javascript
// Queries otimizadas para o dashboard
export function useOptimizedDashboardQueries() {
  const db = getFirestore()
  
  // Busca em lote de dados necessários
  async function fetchDashboardData(userId) {
    const batch = []
    
    // 1. Dados do usuário
    batch.push(getDoc(doc(db, 'usuarios', userId)))
    
    // 2. Estações recentes (com cache)
    const recentStationsQuery = query(
      collection(db, 'estacoes_clinicas'),
      where('criadoEmTimestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      orderBy('criadoEmTimestamp', 'desc'),
      limit(5)
    )
    batch.push(getDocs(recentStationsQuery))
    
    // 3. Ranking do usuário (top 50)
    const rankingQuery = query(
      collection(db, 'usuarios'),
      orderBy('ranking', 'desc'),
      limit(50)
    )
    batch.push(getDocs(rankingQuery))
    
    // Executar todas as queries em paralelo
    const [userDoc, stationsSnapshot, rankingSnapshot] = await Promise.all(batch)
    
    return {
      userData: userDoc.data(),
      recentStations: stationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      rankingData: rankingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }
  }
  
  return {
    fetchDashboardData
  }
}
```

## 6. NOVA ESTRUTURA DO DASHBOARD

### 6.1 Layout Completo

```vue
<template>
  <div class="dashboard-enhanced">
    <!-- Header com informações do usuário -->
    <div class="dashboard-header">
      <VRow>
        <VCol cols="12">
          <div class="header-content">
            <h1 class="dashboard-title">
              Bem-vindo(a), {{ userName }}! 
              <VChip color="success" size="small" class="ml-2">
                Nível {{ userLevel }}
              </VChip>
            </h1>
            <p class="dashboard-subtitle">
              Sua jornada para a aprovação continua. Vamos alcançar seus objetivos juntos!
            </p>
          </div>
        </VCol>
      </VRow>
    </div>
    
    <!-- Cards Principais -->
    <VRow class="dashboard-main-cards">
      <!-- Card de Boas-Vindas (existente) -->
      <VCol cols="12" md="6" lg="4">
        <WelcomeCard />
      </VCol>
      
      <!-- Card de Ranking (existente) -->
      <VCol cols="12" md="6" lg="4">
        <RankingCard />
      </VCol>
      
      <!-- Card de Streak (novo) -->
      <VCol cols="12" md="6" lg="4">
        <StreakCard :streak="streak" />
      </VCol>
    </VRow>
    
    <!-- Cards de Estatísticas e Progresso -->
    <VRow class="dashboard-stats-cards">
      <!-- Card de Estatísticas Resumidas -->
      <VCol cols="12" md="6" lg="4">
        <EstatisticasResumidasCard
          :average-score="averageScore"
          :best-score="bestScore"
          :simulations-count="simulationsCount"
          :overall-progress="overallProgress"
        />
      </VCol>
      
      <!-- Card de Progresso Geral -->
      <VCol cols="12" md="6" lg="4">
        <ProgressoGeralCard
          :progress="overallProgress"
          :modules="topModules"
          :streak="streak"
        />
      </VCol>
      
      <!-- Card de Novas Estações -->
      <VCol cols="12" md="6" lg="4">
        <NovasEstacoesCard
          :stations="newStations"
          :loading="loadingStations"
        />
      </VCol>
    </VRow>
    
    <!-- Cards de Recomendações e Atividades -->
    <VRow class="dashboard-recommendations">
      <!-- Card de Próximas Simulações -->
      <VCol cols="12" md="6">
        <ProximasSimulacoesCard
          :recommendations="recommendations"
          :loading="loadingRecommendations"
        />
      </VCol>
      
      <!-- Card de Últimas Atividades -->
      <VCol cols="12" md="6">
        <UltimasAtividadesCard
          :activities="recentActivities"
        />
      </VCol>
    </VRow>
    
    <!-- Footer do Dashboard -->
    <VRow class="dashboard-footer">
      <VCol cols="12">
        <div class="footer-content">
          <p class="text-caption text-medium-emphasis">
            Última atualização: {{ lastUpdate }} • 
            <VBtn variant="text" size="x-small" @click="refreshData">
              <VIcon icon="ri-refresh-line" />
              Atualizar dados
            </VBtn>
          </p>
        </div>
      </VCol>
    </VRow>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDashboardData } from '@/composables/useDashboardData'
import { useAuth } from '@/composables/useAuth'

// Componentes dos cards
import WelcomeCard from '@/components/dashboard/WelcomeCard.vue'
import RankingCard from '@/components/dashboard/RankingCard.vue'
import StreakCard from '@/components/dashboard/StreakCard.vue'
import EstatisticasResumidasCard from '@/components/dashboard/EstatisticasResumidasCard.vue'
import ProgressoGeralCard from '@/components/dashboard/ProgressoGeralCard.vue'
import NovasEstacoesCard from '@/components/dashboard/NovasEstacoesCard.vue'
import ProximasSimulacoesCard from '@/components/dashboard/ProximasSimulacoesCard.vue'
import UltimasAtividadesCard from '@/components/dashboard/UltimasAtividadesCard.vue'

// Data e composables
const { userName } = useAuth()
const {
  userData,
  newStations,
  recommendations,
  averageScore,
  bestScore,
  simulationsCount,
  overallProgress,
  streak,
  recentActivities,
  topModules,
  loading
} = useDashboardData()

const lastUpdate = ref(new Date().toLocaleString('pt-BR'))

// Nível do usuário baseado em progresso
const userLevel = computed(() => {
  const progress = overallProgress.value
  if (progress < 20) return 'Iniciante'
  if (progress < 40) return 'Estudante'
  if (progress < 60) return 'Intermediário'
  if (progress < 80) return 'Avançado'
  return 'Mestre'
})

// Refresh dos dados
async function refreshData() {
  await fetchRecentStations()
  await generateRecommendations()
  lastUpdate.value = new Date().toLocaleString('pt-BR')
}

onMounted(() => {
  // Dados já são carregados pelo composable
})
</script>

<style scoped>
.dashboard-enhanced {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.dashboard-header {
  margin-bottom: 24px;
}

.header-content {
  padding: 24px;
  background: var(--gradient-primary);
  border-radius: var(--border-radius-card);
  color: white;
}

.dashboard-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.dashboard-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
}

.dashboard-main-cards,
.dashboard-stats-cards,
.dashboard-recommendations {
  margin-bottom: 24px;
}

.dashboard-col {
  margin-bottom: 16px;
}

.footer-content {
  text-align: center;
  padding: 16px;
  border-top: 1px solid rgba(var(--v-theme-outline), 0.12);
}

/* Responsividade */
@media (max-width: 960px) {
  .dashboard-title {
    font-size: 1.5rem;
  }
  
  .dashboard-subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 600px) {
  .header-content {
    padding: 16px;
  }
  
  .dashboard-title {
    font-size: 1.25rem;
  }
}
</style>
```

## 7. IMPLEMENTAÇÃO PRÁTICA

### 7.1 Exemplo de Card Completo

**EstatisticasResumidasCard.vue**
```vue
<template>
  <VCard 
    class="estatisticas-resumidas-card hoverable-card"
    :class="{ 'card-loading': loading }"
    elevation="4"
  >
    <VCardItem class="card-header">
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="ri-bar-chart-line" color="primary" size="24" />
        <span class="font-weight-bold">Suas Estatísticas</span>
      </VCardTitle>
    </VCardItem>
    
    <VCardText class="card-content">
      <VRow v-if="!loading">
        <!-- Gráficos circulares -->
        <VCol cols="6">
          <div class="stat-circle-container">
            <VueApexCharts
              type="radialBar"
              height="120"
              :options="averageChartOptions"
              :series="[averageScore]"
              class="stat-chart"
            />
            <div class="stat-label">
              <span class="label-text">Média Geral</span>
              <span class="label-value">{{ averageScore }}%</span>
            </div>
          </div>
        </VCol>
        
        <VCol cols="6">
          <div class="stat-circle-container">
            <VueApexCharts
              type="radialBar"
              height="120"
              :options="bestChartOptions"
              :series="[bestScore]"
              class="stat-chart"
            />
            <div class="stat-label">
              <span class="label-text">Recorde</span>
              <span class="label-value">{{ bestScore }}%</span>
            </div>
          </div>
        </VCol>
        
        <!-- Estatísticas numéricas -->
        <VCol cols="6">
          <div class="stat-number">
            <VIcon icon="ri-play-circle-line" color="info" size="20" />
            <div class="number-content">
              <span class="number-value">{{ simulationsCount }}</span>
              <span class="number-label">Simulações</span>
            </div>
          </div>
        </VCol>
        
        <VCol cols="6">
          <div class="stat-number">
            <VIcon icon="ri-trophy-line" color="warning" size="20" />
            <div class="number-content">
              <span class="number-value">{{ overallProgress }}%</span>
              <span class="number-label">Progresso</span>
            </div>
          </div>
        </VCol>
      </VRow>
      
      <!-- Loading state -->
      <div v-else class="loading-container">
        <VProgressCircular indeterminate color="primary" size="48" />
        <p class="mt-2 text-body-2">Carregando estatísticas...</p>
      </div>
    </VCardText>
  </VCard>
</template>

<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useTheme } from 'vuetify'

const props = defineProps({
  averageScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  simulationsCount: { type: Number, default: 0 },
  overallProgress: { type: Number, default: 0 },
  loading: { type: Boolean, default: false }
})

const theme = useTheme()

// Opções para gráfico de média
const averageChartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: { enabled: true },
    background: 'transparent'
  },
  plotOptions: {
    radialBar: {
      hollow: { size: '60%' },
      dataLabels: {
        name: { show: false },
        value: {
          offsetY: 5,
          fontSize: '16px',
          fontWeight: 600,
          color: theme.global.current.value.colors.primary
        }
      },
      track: {
        background: 'rgba(var(--v-theme-primary), 0.1)'
      }
    }
  },
  stroke: { lineCap: 'round' },
  colors: [theme.global.current.value.colors.primary],
  labels: ['Média']
}))

// Opções para gráfico de recorde
const bestChartOptions = computed(() => ({
  chart: {
    type: 'radialBar',
    sparkline: { enabled: true },
    background: 'transparent'
  },
  plotOptions: {
    radialBar: {
      hollow: { size: '60%' },
      dataLabels: {
        name: { show: false },
        value: {
          offsetY: 5,
          fontSize: '16px',
          fontWeight: 600,
          color: theme.global.current.value.colors.warning
        }
      },
      track: {
        background: 'rgba(var(--v-theme-warning), 0.1)'
      }
    }
  },
  stroke: { lineCap: 'round' },
  colors: [theme.global.current.value.colors.warning],
  labels: ['Recorde']
}))
</script>

<style scoped>
.estatisticas-resumidas-card {
  border-radius: var(--border-radius-card);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.estatisticas-resumidas-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
}

.card-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05) 0%, rgba(var(--v-theme-secondary), 0.05) 100%);
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.card-content {
  padding: 20px;
}

.stat-circle-container {
  position: relative;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-chart {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.stat-label {
  position: relative;
  z-index: 1;
  text-align: center;
}

.label-text {
  display: block;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 4px;
}

.label-value {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.stat-number {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: var(--border-radius-small);
  margin-top: 8px;
}

.number-content {
  display: flex;
  flex-direction: column;
}

.number-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1;
}

.number-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 2px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.card-loading {
  pointer-events: none;
  opacity: 0.7;
}

/* Responsividade */
@media (max-width: 600px) {
  .card-content {
    padding: 16px;
  }
  
  .stat-circle-container {
    height: 100px;
  }
  
  .number-value {
    font-size: 1.1rem;
  }
}
</style>
```

### 7.2 Estilos Otimizados

**dashboard-enhanced.scss**
```scss
// Variáveis do dashboard
$dashboard-radius: 16px;
$dashboard-radius-small: 8px;
$dashboard-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

// Mixins para cards
@mixin dashboard-card {
  border-radius: $dashboard-radius;
  transition: $dashboard-transition;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

@mixin card-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.12);
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

// Classes base
.dashboard-enhanced {
  .hoverable-card {
    @include dashboard-card;
  }
  
  .card-header {
    @include card-header;
  }
  
  // Animações de entrada
  .dashboard-col {
    animation: slideInUp 0.5s ease-out;
    
    @for $i from 1 through 6 {
      &:nth-child(#{$i}) {
        animation-delay: #{$i * 0.1}s;
      }
    }
  }
}

// Animações
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

// Estados especiais
.stat-highlight {
  animation: pulse 2s infinite;
}

.loading-skeleton {
  background: linear-gradient(90deg, 
    rgba(var(--v-theme-surface-variant), 0.3) 25%, 
    rgba(var(--v-theme-surface-variant), 0.1) 50%, 
    rgba(var(--v-theme-surface-variant), 0.3) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// Tema escuro
[data-theme="dark"] {
  .dashboard-enhanced {
    .hoverable-card {
      border-color: rgba(255, 255, 255, 0.08);
      
      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
    }
  }
}

// Responsividade
@media (max-width: 960px) {
  .dashboard-enhanced {
    .dashboard-col {
      animation-delay: 0s !important;
    }
  }
}

@media (max-width: 600px) {
  $dashboard-radius: 12px;
  
  .dashboard-enhanced {
    .hoverable-card {
      border-radius: $dashboard-radius;
      margin-bottom: 12px;
    }
    
    .card-header {
      padding: 12px 16px;
    }
  }
}
```

## 8. CONCLUSÃO

Esta proposta transforma o dashboard atual em uma experiência completa e envolvente, proporcionando:

### 8.1 Benefícios Principais
- **Visão 360°**: Todas as informações importantes em um único lugar
- **Engajamento**: Cards dinâmicos que incentivam o uso contínuo
- **Personalização**: Recomendações baseadas no desempenho individual
- **Novidades**: Destaque para conteúdo novo mantendo o interesse
- **Progresso**: Visualização clara do avanço na jornada de aprendizado

### 8.2 Vantagens Técnicas
- **Performance**: Lazy loading e cache otimizado
- **Escalabilidade**: Arquitetura modular com composables reutilizáveis
- **Manutenibilidade**: Componentes isolados e bem documentados
- **Responsividade**: Experiência consistente em todos os dispositivos
- **Acessibilidade**: Estrutura semântica e navegação por teclado

### 8.3 Próximos Passos
1. Implementar os composables de dados otimizados
2. Criar os componentes de cards individuais
3. Integrar com o layout responsivo
4. Adicionar animações e micro-interações
5. Implementar sistema de cache
6. Testar performance e usabilidade
7. Coletar feedback dos usuários
8. Iterar com melhorias baseadas no uso

Esta proposta estabelece uma base sólida para um dashboard moderno, eficiente e centrado no usuário, servindo como verdadeira porta de entrada para a plataforma RevalidaFlow.