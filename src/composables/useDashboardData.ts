import { ref, computed } from 'vue'
import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import type { UserStats, RankingUser } from '@/types/dashboard'

/**
 * Composable para gerenciar dados centralizados do Dashboard
 * Carrega informações do usuário e ranking geral
 */
export const useDashboardData = () => {
    const loading = ref(true)
    const error = ref<string>('')
    const userData = ref<UserStats | null>(null)
    const rankingData = ref<RankingUser[]>([])

    /**
     * Carrega todos os dados do dashboard em paralelo
     */
    const loadDashboardData = async () => {
        if (!currentUser.value?.uid) {
            error.value = 'Usuário não autenticado'
            loading.value = false
            return
        }

        loading.value = true
        error.value = ''

        try {
            // Carregar dados do usuário e ranking em paralelo
            const [userDoc, rankingSnapshot] = await Promise.all([
                getDoc(doc(db, 'usuarios', currentUser.value.uid)),
                getDocs(query(collection(db, 'usuarios'), orderBy('ranking', 'desc'), limit(50)))
            ])

            if (userDoc.exists()) {
                userData.value = userDoc.data() as UserStats
            } else {
                error.value = 'Dados do usuário não encontrados'
            }

            // Processar ranking
            rankingData.value = rankingSnapshot.docs.map((doc) => ({
                uid: doc.id,
                ...(doc.data() as Omit<RankingUser, 'uid'>)
            }))

            // Calcular posição do usuário no ranking
            if (userData.value) {
                const userPosition = rankingData.value.findIndex(u => u.uid === currentUser.value.uid)
                userData.value.rankingPosition = userPosition >= 0 ? userPosition + 1 : 0
            }

        } catch (err) {
            console.error('Erro ao carregar dados do dashboard:', err)
            error.value = 'Erro ao carregar dados. Tente novamente.'
        } finally {
            loading.value = false
        }
    }

    // Computed properties para dados do usuário
    const userName = computed(() => {
        if (userData.value?.nome) {
            return `${userData.value.nome} ${userData.value.sobrenome || ''}`.trim()
        }
        return currentUser.value?.displayName || 'Candidato'
    })

    const userPhoto = computed(() =>
        userData.value?.photoURL || currentUser.value?.photoURL || ''
    )

    const streakDays = computed(() => userData.value?.streak || 0)

    const totalSimulations = computed(() => userData.value?.totalSimulacoes || 0)

    const averageScore = computed(() => {
        const nivel = userData.value?.nivelHabilidade || 0
        return Math.round(nivel * 10) // Convertendo para escala 0-100
    })

    const studyTime = computed(() => {
        const minutos = userData.value?.tempoEstudo || 0
        const horas = Math.floor(minutos / 60)
        const minutosRestantes = minutos % 60

        if (horas > 0) {
            return `${horas}h ${minutosRestantes}min`
        }
        return `${minutosRestantes}min`
    })

    const studyHours = computed(() => {
        const minutos = userData.value?.tempoEstudo || 0
        return Math.floor(minutos / 60)
    })

    // Computed properties para ranking
    const rankingPosition = computed(() => userData.value?.rankingPosition || 0)

    const rankingScore = computed(() => userData.value?.ranking || 0)

    const top3Users = computed(() => rankingData.value.slice(0, 3))

    const top10Users = computed(() => rankingData.value.slice(0, 10))

    return {
        // Estado
        loading,
        error,
        userData,
        rankingData,

        // Métodos
        loadDashboardData,

        // Dados do usuário
        userName,
        userPhoto,
        streakDays,
        totalSimulations,
        averageScore,
        studyTime,
        studyHours,

        // Dados de ranking
        rankingPosition,
        rankingScore,
        top3Users,
        top10Users
    }
}
