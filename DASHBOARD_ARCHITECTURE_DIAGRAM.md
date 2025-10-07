# DIAGRAMA DE ARQUITETURA DO DASHBOARD

## VISÃO GERAL DA ESTRUTURA

```mermaid
graph TB
    subgraph "Dashboard Enhanced"
        Header[Header Dashboard]
        MainCards[Cards Principais]
        StatsCards[Cards de Estatísticas]
        RecCards[Cards de Recomendações]
        Footer[Footer Dashboard]
    end
    
    subgraph "Cards Principais"
        Welcome[Card Boas-Vindas]
        Ranking[Card Ranking]
        Streak[Card Streak]
    end
    
    subgraph "Cards de Estatísticas"
        EstRes[Card Estatísticas Resumidas]
        Progress[Card Progresso Geral]
        NewStations[Card Novas Estações]
    end
    
    subgraph "Cards de Recomendações"
        NextSim[Card Próximas Simulações]
        Recent[Card Últimas Atividades]
    end
    
    Header --> MainCards
    MainCards --> StatsCards
    StatsCards --> RecCards
    RecCards --> Footer
    
    MainCards --> Welcome
    MainCards --> Ranking
    MainCards --> Streak
    
    StatsCards --> EstRes
    StatsCards --> Progress
    StatsCards --> NewStations
    
    RecCards --> NextSim
    RecCards --> Recent
```

## FLUXO DE DADOS

```mermaid
graph LR
    subgraph "Fontes de Dados"
        Firestore[(Firestore)]
        Cache[(Cache Local)]
        Auth[(Auth Service)]
    end
    
    subgraph "Composables"
        DashboardData[useDashboardData]
        FirebaseData[useFirebaseData]
        RecentStations[useRecentStations]
        StationRec[useStationRecommendations]
        CacheManager[useCacheManager]
    end
    
    subgraph "Componentes Dashboard"
        Dashboard[Dashboard.vue]
        Cards[Cards Components]
    end
    
    Firestore --> FirebaseData
    Cache --> CacheManager
    Auth --> FirebaseData
    
    FirebaseData --> DashboardData
    RecentStations --> DashboardData
    StationRec --> DashboardData
    CacheManager --> DashboardData
    
    DashboardData --> Dashboard
    Dashboard --> Cards
```

## ESTRUTURA DE COMPONENTES

```mermaid
graph TD
    Dashboard[Dashboard.vue] --> WelcomeCard[WelcomeCard.vue]
    Dashboard --> RankingCard[RankingCard.vue]
    Dashboard --> StreakCard[StreakCard.vue]
    Dashboard --> EstatisticasCard[EstatisticasResumidasCard.vue]
    Dashboard --> ProgressoCard[ProgressoGeralCard.vue]
    Dashboard --> NovasEstacoesCard[NovasEstacoesCard.vue]
    Dashboard --> ProximasSimulacoesCard[ProximasSimulacoesCard.vue]
    Dashboard --> UltimasAtividadesCard[UltimasAtividadesCard.vue]
    
    EstatisticasCard --> ApexCharts[VueApexCharts]
    ProgressoCard --> VProgressLinear[VProgressLinear]
    NovasEstacoesCard --> VList[VList]
    ProximasSimulacoesCard --> VAlert[VAlert]
    UltimasAtividadesCard --> VTimeline[VTimeline]
```

## LAYOUT RESPONSIVO

```mermaid
graph LR
    subgraph "Desktop lg 12+"
        Row1[Row 1: 4-4-4]
        Row2[Row 2: 4-4-4]
        Row3[Row 3: 6-6]
    end
    
    subgraph "Tablet md 9-12"
        Row1M[Row 1: 6-6]
        Row2M[Row 2: 6-6]
        Row3M[Row 3: 6-6]
        Row4M[Row 4: 12]
    end
    
    subgraph "Mobile xs 6"
        Row1S[Row 1: 12]
        Row2S[Row 2: 12]
        Row3S[Row 3: 12]
        Row4S[Row 4: 12]
        Row5S[Row 5: 12]
        Row6S[Row 6: 12]
    end
```

## ESTRATÉGIA DE CACHE

```mermaid
sequenceDiagram
    participant User as Usuário
    participant Dashboard as Dashboard
    participant Cache as Cache Manager
    participant Firestore as Firestore
    
    User->>Dashboard: Acessa Dashboard
    Dashboard->>Cache: Verifica dados em cache
    
    alt Cache válido (24h)
        Cache-->>Dashboard: Retorna dados cacheados
        Dashboard-->>User: Exibe dashboard rapidamente
    else Cache inválido ou inexistente
        Dashboard->>Firestore: Busca dados frescos
        Firestore-->>Dashboard: Retorna dados atualizados
        Dashboard->>Cache: Salva no cache
        Dashboard-->>User: Exibe dashboard atualizado
    end
```

## PERFORMANCE E OTIMIZAÇÃO

```mermaid
graph TB
    subgraph "Estratégias de Performance"
        LazyLoading[Lazy Loading]
        BatchQueries[Batch Queries]
        Memoization[Memoization]
        Debounce[Debounce]
        VirtualScroll[Virtual Scroll]
    end
    
    subgraph "Técnicas Implementadas"
        ComponentLazy[Componentes lazy-loaded]
        DataBatch[Queries em lote]
        ComputedMemo[Computed properties]
        SearchDebounce[Debounce em buscas]
        ListVirtual[Virtualização de listas]
    end
    
    LazyLoading --> ComponentLazy
    BatchQueries --> DataBatch
    Memoization --> ComputedMemo
    Debounce --> SearchDebounce
    VirtualScroll --> ListVirtual
```

## ESTADOS DA APLICAÇÃO

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Loaded
    Loading --> Error
    
    Loaded --> Refreshing
    Refreshing --> Loaded
    Refreshing --> Error
    
    Error --> Retry
    Retry --> Loading
    
    Loaded --> [*]
    Error --> [*]
```

## MAPA DE INTERAÇÕES

```mermaid
journey
    title Jornada do Usuário no Dashboard
    section Acesso
      Acesso inicial: 5: Usuário
      Carregamento: 3: Sistema
      Exibição: 5: Usuário
    section Interação
      Visualiza estatísticas: 5: Usuário
      Clica em nova estação: 4: Usuário
      Acessa recomendações: 4: Usuário
    section Navegação
      Ver histórico: 3: Usuário
      Inicia simulação: 5: Usuário
      Retorna ao dashboard: 4: Usuário
```

## INTEGRAÇÃO COM TEMA

```mermaid
graph LR
    subgraph "Sistema de Tema"
        Vuetify[Vuetify Theme]
        CSSVars[CSS Variables]
        ThemeConfig[useThemeConfig]
    end
    
    subgraph "Componentes"
        Cards[Dashboard Cards]
        Charts[Charts Components]
        UI[UI Elements]
    end
    
    Vuetify --> ThemeConfig
    ThemeConfig --> CSSVars
    CSSVars --> Cards
    CSSVars --> Charts
    CSSVars --> UI
```

## ESTRUTURA DE DADOS

```mermaid
erDiagram
    USUARIO {
        string uid
        string nome
        number nivelHabilidade
        number ranking
        array estacoesConcluidas
        object statistics
    }
    
    ESTACAO {
        string id
        string idEstacao
        string tituloEstacao
        string especialidade
        timestamp criadoEmTimestamp
    }
    
    ESTATISTICAS {
        number mediaNotas
        number melhorNota
        number totalSimulacoes
        number streak
        object porEspecialidade
    }
    
    USUARIO ||--o{ ESTACAO : conclui
    USUARIO ||--|| ESTATISTICAS : possui