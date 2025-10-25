/**
 * Script standalone para recalcular rankings
 * Execute com: node scripts/recalculateRankings.js
 */

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Carregar variáveis de ambiente do .env
function loadEnv() {
    try {
        const envContent = readFileSync('.env', 'utf8')
        const envVars = {}

        envContent.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=')
            if (key && valueParts.length > 0) {
                const cleanKey = key.trim()
                const cleanValue = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
                envVars[cleanKey] = cleanValue
            }
        })

        // Aplicar ao process.env
        Object.assign(process.env, envVars)
        console.log('✅ Arquivo .env carregado com sucesso')
    } catch (error) {
        console.error('❌ Erro ao carregar .env:', error.message)
    }
}

// Carregar .env antes de qualquer coisa
loadEnv()

// Configuração Firebase Admin (usa credenciais de admin)
console.log('🔍 Verificando variáveis de ambiente...')
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ OK' : '❌ MISSING')
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ OK' : '❌ MISSING')
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ OK' : '❌ MISSING')

const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL
}

console.log('🔧 Service Account criado:', {
    project_id: serviceAccount.project_id,
    client_email: serviceAccount.client_email,
    private_key_length: serviceAccount.private_key?.length
})

// Inicializar Firebase Admin
const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
})

const db = getFirestore(app)

/**
 * Calcula a pontuação de ranking baseada nas estações concluídas
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
    const rankingScore = totalScore + (averageScore * estacoesConcluidas.length * 0.5)

    return Math.round(rankingScore)
}

/**
 * Recalcula o ranking de todos os usuários
 */
async function recalculateAllRankings() {
    console.log('🔄 Iniciando recálculo de rankings...')

    try {
        const usersRef = db.collection('usuarios')
        const snapshot = await usersRef.get()

        let updatedCount = 0
        let errorCount = 0

        console.log(`📊 Processando ${snapshot.size} usuários...`)

        for (const userDoc of snapshot.docs) {
            try {
                const userData = userDoc.data()
                const estacoesConcluidas = userData.estacoesConcluidas || []

                // Calcular nova pontuação de ranking
                const newRanking = calculateRankingScore(estacoesConcluidas)

                // Atualizar documento do usuário
                await db.collection('usuarios').doc(userDoc.id).update({
                    ranking: newRanking,
                    rankingLastUpdated: new Date()
                })

                updatedCount++

                // Log a cada 10 usuários
                if (updatedCount % 10 === 0) {
                    console.log(`✅ Processados ${updatedCount}/${snapshot.size} usuários`)
                }

            } catch (error) {
                console.error(`❌ Erro ao atualizar ${userDoc.id}:`, error.message)
                errorCount++
            }
        }

        console.log(`\n🎉 Recálculo concluído!`)
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
        console.error('❌ Erro geral no recálculo:', error.message)
        return {
            success: false,
            error: error.message
        }
    }
}

// Executar automaticamente
console.log('🚀 Iniciando script de recálculo de rankings...')
recalculateAllRankings()
    .then(result => {
        if (result.success) {
            console.log('✅ Script executado com sucesso!')
            process.exit(0)
        } else {
            console.error('❌ Script falhou:', result.error)
            process.exit(1)
        }
    })
    .catch(error => {
        console.error('❌ Erro fatal:', error)
        process.exit(1)
    })
