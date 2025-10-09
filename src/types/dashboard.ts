/**
 * Tipos TypeScript para o Dashboard
 */

export interface UserStats {
    totalSimulacoes: number
    nivelHabilidade: number
    tempoEstudo: number // em minutos
    streak: number // dias consecutivos
    ranking: number
    rankingPosition?: number
    specialtyStats?: Record<string, SpecialtyScore>
    statistics?: {
        correct?: number
        total?: number
    }
}

export interface SpecialtyScore {
    score: number
    total: number
    name: string
}

export interface RankingUser {
    uid: string
    nome: string
    sobrenome?: string
    displayName?: string
    photoURL?: string
    ranking: number
    nivelHabilidade: number
}

export interface DashboardNotification {
    id: string
    mensagem: string
    tipo: 'info' | 'novidade' | 'aviso' | 'sucesso'
    lida: boolean
    criadoEm: any // Timestamp
    link?: string
}

export interface MiniStat {
    icon: string
    value: string | number
    label: string
    color?: string
}
