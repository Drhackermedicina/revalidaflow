/**
 * Script para recalcular e atualizar o ranking de todos os usuários
 * baseado nas pontuações reais das estações concluídas
 */

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../plugins/firebase.js'

/**
 * Calcula a pontuação de ranking baseada nas estações concluídas
 * @param {Array} estacoesConcluidas - Array de estações concluídas
 * @returns {number} - Pontuação calculada
 */
function calculateRankingScore(estacoesConcluidas) {
    if (!estacoesConcluidas || estacoesConcluidas.length === 0) {
        return 0
    }

    // Calcular pontuação total: soma de todas as notas das estações
    const totalScore = estacoesConcluidas.reduce((sum, station) => sum + (station.nota || 0), 0)

    // Calcular média das notas
    const averageScore = totalScore / estacoesConcluidas.length

    // Fórmula de ranking: pontuação total + (média * número de estações * peso)
    // Isso dá mais valor para usuários que fazem mais estações com boas notas
    const rankingScore = totalScore + (averageScore * estacoesConcluidas.length * 0.5)

    return Math.round(rankingScore)
}

/**
 * Recalcula o ranking de todos os usuários
 */
export async function recalculateAllRankings() {
    console.log('🔄 Iniciando recálculo de rankings...')

    try {
        const usersRef = collection(db, 'usuarios')
        const snapshot = await getDocs(usersRef)

        let updatedCount = 0
        let errorCount = 0

        for (const userDoc of snapshot.docs) {
            try {
                const userData = userDoc.data()
                const estacoesConcluidas = userData.estacoesConcluidas || []

                // Calcular nova pontuação de ranking
                const newRanking = calculateRankingScore(estacoesConcluidas)

                // Atualizar documento do usuário
                await updateDoc(doc(db, 'usuarios', userDoc.id), {
                    ranking: newRanking,
                    rankingLastUpdated: new Date()
                })

                updatedCount++
                console.log(`✅ ${userData.nome || userDoc.id}: ${newRanking} pontos`)

            } catch (error) {
                console.error(`❌ Erro ao atualizar ${userDoc.id}:`, error)
                errorCount++
            }
        }

        console.log(`\n📊 Recálculo concluído:`)
        console.log(`   ✅ Usuários atualizados: ${updatedCount}`)
        console.log(`   ❌ Erros: ${errorCount}`)
        console.log(`   📈 Total processado: ${snapshot.size}`)

        return {
            success: true,
            updated: updatedCount,
            errors: errorCount,
            total: snapshot.size
        }

    } catch (error) {
        console.error('❌ Erro geral no recálculo:', error)
        return {
            success: false,
            error: error.message
        }
    }
}

// Função para executar via console do navegador
export async function runRankingRecalculation() {
    const result = await recalculateAllRankings()

    if (result.success) {
        alert(`Ranking recalculado com sucesso!\n\nUsuários atualizados: ${result.updated}\nErros: ${result.errors}`)
    } else {
        alert(`Erro no recálculo: ${result.error}`)
    }

    return result
}

// Para uso no Node.js (backend)
if (typeof window === 'undefined') {
    // Executar automaticamente se for Node.js
    recalculateAllRankings()
        .then(result => {
            console.log('Recálculo concluído:', result)
            process.exit(result.success ? 0 : 1)
        })
        .catch(error => {
            console.error('Erro fatal:', error)
            process.exit(1)
        })
}
