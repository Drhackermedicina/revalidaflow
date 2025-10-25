/**
 * userRepository.js
 * 
 * Repository pattern para abstração de operações com usuários no Firebase
 * Centraliza operações de usuários, scores e presença online
 */

import { db } from '@/plugins/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  increment
} from 'firebase/firestore'
import { useSmartCache } from '@/composables/useSmartCache'

const COLLECTION_NAME = 'usuarios'
const { getCachedData, invalidateCache } = useSmartCache()

class UserRepository {
  /**
   * Busca dados de um usuário específico
   */
  async getById(userId) {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório')
    }

    return getCachedData(
      `user_${userId}`,
      async () => {
        const docRef = doc(db, COLLECTION_NAME, userId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          throw new Error(`Usuário ${userId} não encontrado`)
        }

        return {
          uid: docSnap.id,
          ...docSnap.data()
        }
      },
      { cacheType: 'users' }
    )
  }

  /**
   * Busca usuários online
   */
  async getOnlineUsers(options = {}) {
    const {
      minutesAgo = 5,
      statusFilter = ['disponivel', 'treinando'],
      maxResults = 50
    } = options

    return getCachedData(
      `users_online_${minutesAgo}_${maxResults}`,
      async () => {
        const timeAgo = new Date(Date.now() - minutesAgo * 60 * 1000)

        const q = query(
          collection(db, COLLECTION_NAME),
          where('status', 'in', statusFilter),
          where('lastActive', '>', timeAgo),
          orderBy('lastActive', 'desc'),
          limit(maxResults)
        )

        const snapshot = await getDocs(q)
        const users = []

        snapshot.forEach(docSnap => {
          const data = docSnap.data()
          users.push({
            uid: docSnap.id,
            nome: data.nome,
            sobrenome: data.sobrenome,
            displayName: data.displayName,
            photoURL: data.photoURL,
            status: data.status,
            lastActive: data.lastActive
          })
        })

        // Filtra apenas usuários realmente online (2 minutos)
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000
        return users.filter(user => {
          const lastActive = user.lastActive
            ? (user.lastActive instanceof Timestamp
              ? user.lastActive.toDate().getTime()
              : new Date(user.lastActive).getTime())
            : 0
          return lastActive > twoMinutesAgo
        })
      },
      { cacheType: 'users', ttl: 1 * 60 * 1000 } // Cache de 1 minuto
    )
  }

  /**
   * Atualiza status de presença do usuário
   */
  async updatePresence(userId, status = 'disponivel') {
    if (!userId) return

    const docRef = doc(db, COLLECTION_NAME, userId)

    try {
      await updateDoc(docRef, {
        status,
        lastActive: serverTimestamp(),
        isOnline: status !== 'offline'
      })

      // Invalida cache do usuário
      invalidateCache(`user_${userId}`)
      invalidateCache('users_online')

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar presença:', error)
      return { success: false, error }
    }
  }

  /**
   * Busca pontuações do usuário em estações
   */
  async getUserScores(userId) {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório')
    }

    return getCachedData(
      `user_scores_${userId}`,
      async () => {
        const userDoc = await this.getById(userId)
        const estacoesConcluidas = userDoc.estacoesConcluidas || []

        const scores = {}
        estacoesConcluidas.forEach(estacao => {
          if (estacao.idEstacao && estacao.nota !== undefined) {
            // Armazena apenas o maior score
            if (!scores[estacao.idEstacao] || estacao.nota > scores[estacao.idEstacao].score) {
              scores[estacao.idEstacao] = {
                score: estacao.nota,
                maxScore: 100,
                date: estacao.data?.toDate ? estacao.data.toDate() : estacao.data,
                nomeEstacao: estacao.nomeEstacao,
                especialidade: estacao.especialidade
              }
            }
          }
        })

        return scores
      },
      { cacheType: 'scores' }
    )
  }

  /**
   * Adiciona nova pontuação de estação ao usuário
   */
  async addStationScore(userId, stationData) {
    if (!userId || !stationData) {
      throw new Error('Dados obrigatórios não fornecidos')
    }

    const docRef = doc(db, COLLECTION_NAME, userId)

    const scoreData = {
      idEstacao: stationData.idEstacao,
      nomeEstacao: stationData.nomeEstacao,
      nota: stationData.nota,
      especialidade: stationData.especialidade,
      data: serverTimestamp(),
      origem: stationData.origem || 'simulation'
    }

    await updateDoc(docRef, {
      estacoesConcluidas: arrayUnion(scoreData),
      totalPontos: increment(stationData.nota),
      estacoesCompletadas: increment(1),
      ultimaAtividade: serverTimestamp()
    })

    // Invalida caches relacionados
    invalidateCache(`user_${userId}`)
    invalidateCache(`user_scores_${userId}`)

    return { success: true }
  }

  /**
   * Busca ranking de usuários
   */
  async getRanking(options = {}) {
    const {
      limit: maxResults = 100,
      orderByField = 'ranking'
    } = options

    return getCachedData(
      `ranking_${orderByField}_${maxResults}`,
      async () => {
        const q = query(
          collection(db, COLLECTION_NAME),
          orderBy(orderByField, 'desc'),
          limit(maxResults)
        )

        const snapshot = await getDocs(q)
        const ranking = []
        let position = 1

        snapshot.forEach(docSnap => {
          const data = docSnap.data()
          ranking.push({
            position: position++,
            uid: docSnap.id,
            nome: data.nome,
            sobrenome: data.sobrenome,
            displayName: data.displayName,
            photoURL: data.photoURL,
            totalPontos: data.ranking || 0,
            estacoesCompletadas: data.estacoesCompletadas || 0,
            nivel: this._calculateLevel(data.ranking || 0)
          })
        })

        return ranking
      },
      { cacheType: 'users', ttl: 5 * 60 * 1000 } // Cache de 5 minutos
    )
  }

  /**
   * Busca estatísticas do usuário
   */
  async getUserStats(userId) {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório')
    }

    return getCachedData(
      `user_stats_${userId}`,
      async () => {
        const userDoc = await this.getById(userId)
        const estacoesConcluidas = userDoc.estacoesConcluidas || []

        const stats = {
          totalEstacoes: estacoesConcluidas.length,
          totalPontos: userDoc.totalPontos || 0,
          mediaNotas: 0,
          melhorNota: 0,
          piorNota: 100,
          porEspecialidade: {},
          porPeriodo: {},
          streak: 0,
          nivel: this._calculateLevel(userDoc.totalPontos || 0)
        }

        // Calcula estatísticas
        let somaNotas = 0
        estacoesConcluidas.forEach(estacao => {
          const nota = estacao.nota || 0
          somaNotas += nota

          if (nota > stats.melhorNota) stats.melhorNota = nota
          if (nota < stats.piorNota) stats.piorNota = nota

          // Por especialidade
          if (estacao.especialidade) {
            if (!stats.porEspecialidade[estacao.especialidade]) {
              stats.porEspecialidade[estacao.especialidade] = {
                total: 0,
                soma: 0,
                media: 0
              }
            }
            stats.porEspecialidade[estacao.especialidade].total++
            stats.porEspecialidade[estacao.especialidade].soma += nota
          }
        })

        // Calcula médias
        if (stats.totalEstacoes > 0) {
          stats.mediaNotas = somaNotas / stats.totalEstacoes

          Object.keys(stats.porEspecialidade).forEach(esp => {
            const data = stats.porEspecialidade[esp]
            data.media = data.soma / data.total
          })
        }

        return stats
      },
      { cacheType: 'users', ttl: 10 * 60 * 1000 } // Cache de 10 minutos
    )
  }

  /**
   * Atualiza dados do perfil do usuário
   */
  async updateProfile(userId, profileData) {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório')
    }

    const docRef = doc(db, COLLECTION_NAME, userId)

    const updateData = {
      ...profileData,
      atualizadoEm: serverTimestamp()
    }

    await updateDoc(docRef, updateData)

    // Invalida cache do usuário
    invalidateCache(`user_${userId}`)

    return { success: true }
  }

  /**
   * Cria ou atualiza usuário (usado no registro/login)
   */
  async createOrUpdate(userId, userData) {
    if (!userId) {
      throw new Error('ID do usuário é obrigatório')
    }

    const docRef = doc(db, COLLECTION_NAME, userId)

    // Verifica se usuário existe
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      // Atualiza usuário existente
      await updateDoc(docRef, {
        ...userData,
        lastLogin: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      })
    } else {
      // Cria novo usuário
      await setDoc(docRef, {
        ...userData,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        lastLogin: serverTimestamp(),
        totalPontos: 0,
        estacoesCompletadas: 0,
        estacoesConcluidas: [],
        status: 'disponivel'
      })
    }

    // Invalida cache
    invalidateCache(`user_${userId}`)

    return { success: true, isNew: !docSnap.exists() }
  }

  /**
   * Limpa cache de usuários
   */
  clearCache() {
    invalidateCache('user')
    invalidateCache('ranking')
    invalidateCache('users_online')
  }

  // --- Métodos Privados ---

  /**
   * Calcula nível do usuário baseado nos pontos
   */
  _calculateLevel(points) {
    if (points < 100) return 1
    if (points < 250) return 2
    if (points < 500) return 3
    if (points < 1000) return 4
    if (points < 2000) return 5
    if (points < 3500) return 6
    if (points < 5000) return 7
    if (points < 7500) return 8
    if (points < 10000) return 9
    return 10
  }
}

// Exporta instância única (Singleton)
export const userRepository = new UserRepository()
export default userRepository
