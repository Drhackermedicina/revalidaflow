// Script para diagnosticar e corrigir problemas no ranking
// Execute no console do navegador na página de diagnóstico

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase'
import { logger } from '@/utils/logger.js'

export async function diagnosticarRanking() {
    logger.info('🔍 Iniciando diagnóstico do ranking...')

    try {
        const usuariosRef = collection(db, 'usuarios')
        const snapshot = await getDocs(usuariosRef)

        const problemas = {
            usuariosComNomesEstranhos: [],
            usuariosComDadosDuplicados: [],
            usuariosComRankingInvalido: [],
            totalUsuarios: snapshot.size
        }

        snapshot.forEach((doc) => {
            const data = doc.data()
            const userId = doc.id

            // Verificar nomes estranhos
            const nomeCompleto = `${data.nome || ''} ${data.sobrenome || ''}`.toLowerCase().trim()
            if (nomeCompleto.includes('inferno') ||
                nomeCompleto.includes('test') ||
                nomeCompleto.length > 50 ||
                nomeCompleto.includes('???')) {
                problemas.usuariosComNomesEstranhos.push({
                    id: userId,
                    nome: data.nome,
                    sobrenome: data.sobrenome,
                    ranking: data.ranking
                })
            }

            // Verificar estações duplicadas
            if (data.estacoesConcluidas && Array.isArray(data.estacoesConcluidas)) {
                const estacaoIds = data.estacoesConcluidas.map(e => e.id || e.estacaoId)
                const duplicados = estacaoIds.filter((id, index) => estacaoIds.indexOf(id) !== index)

                if (duplicados.length > 0) {
                    problemas.usuariosComDadosDuplicados.push({
                        id: userId,
                        nome: data.nome,
                        duplicados: duplicados,
                        totalEstacoes: data.estacoesConcluidas.length
                    })
                }
            }

            // Verificar ranking inválido
            if (data.ranking < 0 || data.ranking > 10000 || isNaN(data.ranking)) {
                problemas.usuariosComRankingInvalido.push({
                    id: userId,
                    nome: data.nome,
                    ranking: data.ranking
                })
            }
        })

        logger.info('📊 Resultado do diagnóstico:', problemas)
        return problemas

    } catch (error) {
        logger.error('❌ Erro no diagnóstico:', error)
        return null
    }
}

export async function corrigirDadosCorrompidos() {
    logger.info('🔧 Iniciando correção de dados corrompidos...')

    const problemas = await diagnosticarRanking()

    if (!problemas) return

    // Corrigir usuários com nomes estranhos
    for (const usuario of problemas.usuariosComNomesEstranhos) {
        try {
            await updateDoc(doc(db, 'usuarios', usuario.id), {
                nome: 'Usuário',
                sobrenome: 'Anônimo',
                ranking: 0,
                nivelHabilidade: 0
            })
            logger.info(`✅ Corrigido usuário ${usuario.id}`)
        } catch (error) {
            logger.error(`❌ Erro ao corrigir ${usuario.id}:`, error)
        }
    }

    // Corrigir usuários com dados duplicados
    for (const usuario of problemas.usuariosComDadosDuplicados) {
        try {
            const userDoc = await getDocs(doc(db, 'usuarios', usuario.id))
            const data = userDoc.data()

            // Remover duplicatas
            const estacoesUnicas = []
            const idsVistos = new Set()

            for (const estacao of data.estacoesConcluidas) {
                const id = estacao.id || estacao.estacaoId
                if (!idsVistos.has(id)) {
                    idsVistos.add(id)
                    estacoesUnicas.push(estacao)
                }
            }

            await updateDoc(doc(db, 'usuarios', usuario.id), {
                estacoesConcluidas: estacoesUnicas
            })
            logger.info(`✅ Removidas duplicatas do usuário ${usuario.id}`)
        } catch (error) {
            logger.error(`❌ Erro ao corrigir duplicatas ${usuario.id}:`, error)
        }
    }

    logger.info('🎉 Correção concluída!')
}

// Para usar no console do navegador (método moderno):
// import('./src/utils/rankingDiagnostics.js').then(async (module) => {
//   const result = await module.diagnosticarRanking()
//   console.log(result)
//   // ou
//   await module.corrigirDadosCorrompidos()
// })
