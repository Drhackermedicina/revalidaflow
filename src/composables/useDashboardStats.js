import { computed } from 'vue'

/**
 * Composable para calcular estatísticas derivadas do dashboard
 * Recebe userData como parâmetro para calcular métricas complexas
 */
export const useDashboardStats = (userData) => {
    /**
     * Taxa de acerto geral (%)
     */
    const accuracyRate = computed(() => {
        const stats = userData.value?.statistics
        if (!stats || !stats.total || stats.total === 0) {
            return 0
        }
        const rate = ((stats.correct || 0) / stats.total) * 100
        return Math.round(rate)
    })

    /**
     * Especialidade com melhor desempenho
     */
    const topSpecialty = computed(() => {
        const specialties = userData.value?.specialtyStats
        if (!specialties || Object.keys(specialties).length === 0) {
            return 'Cardiologia' // Valor padrão
        }

        const sorted = Object.entries(specialties)
            .map(([name, data]) => ({
                name,
                score: data.score,
                total: data.total,
                percentage: data.total > 0 ? (data.score / data.total) * 100 : 0
            }))
            .sort((a, b) => b.percentage - a.percentage)

        return sorted[0]?.name || 'Cardiologia'
    })

    /**
     * Progresso até o próximo nível de ranking (%)
     */
    const rankingProgress = computed(() => {
        const current = userData.value?.ranking || 0
        if (current === 0) return 0

        // Calcular próximo milestone (a cada 100 pontos)
        const nextMilestone = Math.ceil(current / 100) * 100
        const progress = ((current % 100) / 100) * 100

        return Math.round(progress)
    })

    /**
     * Próximo milestone de ranking
     */
    const nextRankingMilestone = computed(() => {
        const current = userData.value?.ranking || 0
        return Math.ceil(current / 100) * 100
    })

    /**
     * Pontos faltando para próximo nível
     */
    const pointsToNextLevel = computed(() => {
        const current = userData.value?.ranking || 0
        const next = nextRankingMilestone.value
        return Math.max(0, next - current)
    })

    /**
     * Histórico de ranking (simulado para sparkline)
     * Em produção, isso viria de uma coleção 'rankingHistory'
     */
    const rankingHistory = computed(() => {
        const current = userData.value?.ranking || 0
        if (current === 0) return [0, 0, 0, 0, 0, 0, 0]

        // Simular dados dos últimos 7 dias com pequenas variações
        const history = []
        let base = Math.max(0, current - 50)

        for (let i = 0; i < 7; i++) {
            const variation = Math.random() * 20 - 5 // -5 a +15
            base += variation
            history.push(Math.round(base))
        }

        // Garantir que o último valor seja o atual
        history[6] = current

        return history
    })

    /**
     * Nível de habilidade formatado
     */
    const skillLevel = computed(() => {
        const nivel = userData.value?.nivelHabilidade || 0

        if (nivel < 3) return { label: 'Iniciante', color: 'info' }
        if (nivel < 6) return { label: 'Intermediário', color: 'primary' }
        if (nivel < 8) return { label: 'Avançado', color: 'success' }
        return { label: 'Expert', color: 'warning' }
    })

    /**
     * Estatísticas formatadas para mini cards
     */
    const miniStats = computed(() => [
        {
            icon: 'ri-bar-chart-line',
            value: userData.value?.totalSimulacoes || 0,
            label: 'Simulações',
            color: 'primary'
        },
        {
            icon: 'ri-trophy-line',
            value: `${Math.round((userData.value?.nivelHabilidade || 0) * 10)}%`,
            label: 'Média',
            color: 'success'
        },
        {
            icon: 'ri-time-line',
            value: `${Math.floor((userData.value?.tempoEstudo || 0) / 60)}h`,
            label: 'Estudo',
            color: 'warning'
        }
    ])

    return {
        accuracyRate,
        topSpecialty,
        rankingProgress,
        nextRankingMilestone,
        pointsToNextLevel,
        rankingHistory,
        skillLevel,
        miniStats
    }
}