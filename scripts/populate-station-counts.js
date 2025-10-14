/**
 * populate-station-counts.js
 *
 * Script one-time para popular contagens de estações no Firestore
 * Cria documento _metadata/station_counts com contagens por categoria
 *
 * Uso: node scripts/populate-station-counts.js
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Helpers de classificação (copiados de useStationFilteringOptimized.js)
function isINEPStation(station) {
  const idEstacao = station.idEstacao || ''
  return idEstacao.startsWith('INEP') || (idEstacao.startsWith('REVALIDA_') && !idEstacao.startsWith('REVALIDA_FACIL'))
}

function isRevalidaFacilStation(station) {
  const idEstacao = station.idEstacao || ''
  return idEstacao.startsWith('REVALIDA_FACIL')
}

function getINEPPeriod(station) {
  const idEstacao = station.idEstacao || ''
  if (!isINEPStation(station)) return null

  // Extrair período do idEstacao (ex: INEP_2024_2 → 2024.2)
  const match = idEstacao.match(/(?:INEP|REVALIDA)_(\d{4})(?:_(\d))?/)
  if (match) {
    const year = match[1]
    const subPeriod = match[2]
    return subPeriod ? `${year}.${subPeriod}` : year
  }

  // Fallback: usar campo inepPeriod se existir
  if (station.inepPeriod) {
    return station.inepPeriod
  }

  return null
}

function normalizeText(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getRevalidaFacilSpecialty(station) {
  const idEstacao = station.idEstacao || ''
  const normalized = normalizeText(idEstacao)

  if (normalized.includes('clinica_medica')) return 'clinica-medica'
  if (normalized.includes('cirurgia')) return 'cirurgia'
  if (normalized.includes('pediatria')) return 'pediatria'
  if (normalized.includes('go')) return 'ginecologia'
  if (normalized.includes('preventiva')) return 'preventiva'
  if (normalized.includes('procedimentos')) return 'procedimentos'

  // Fallback: usar campo especialidade
  const especialidade = normalizeText(station.especialidade || '')

  if (especialidade.includes('clinica') && especialidade.includes('medica')) return 'clinica-medica'
  if (especialidade.includes('cirurgia')) return 'cirurgia'
  if (especialidade.includes('ginecologia') || especialidade.includes('obstetricia')) return 'ginecologia'
  if (especialidade.includes('pediatria')) return 'pediatria'
  if (especialidade.includes('preventiva') || especialidade.includes('familia')) return 'preventiva'
  if (especialidade.includes('procedimento')) return 'procedimentos'

  return 'geral'
}

// Função principal
async function populateStationCounts() {
  console.log('🚀 Iniciando contagem de estações...\n')

  try {
    // 1. Buscar todas as estações
    console.log('📥 Buscando todas as estações do Firestore...')
    const stationsRef = collection(db, 'estacoes_clinicas')
    const snapshot = await getDocs(stationsRef)

    const totalStations = snapshot.size
    console.log(`✅ Encontradas ${totalStations} estações\n`)

    if (totalStations === 0) {
      console.error('❌ Nenhuma estação encontrada! Verifique a coleção "estacoes_clinicas"')
      return
    }

    // 2. Processar e contar
    console.log('🔢 Processando e contando por categoria...\n')

    const counts = {
      total: totalStations,
      inep: {},
      revalidaFacil: {
        'clinica-medica': 0,
        'cirurgia': 0,
        'pediatria': 0,
        'ginecologia': 0,
        'preventiva': 0,
        'procedimentos': 0,
        'geral': 0
      },
      metadata: {
        lastUpdate: new Date(),
        version: '1.0',
        generatedBy: 'populate-station-counts.js'
      }
    }

    let inepCount = 0
    let revalidaFacilCount = 0
    let unclassifiedCount = 0

    snapshot.forEach((docSnap) => {
      const data = docSnap.data()
      const station = {
        id: docSnap.id,
        idEstacao: data.idEstacao,
        especialidade: data.especialidade,
        inepPeriod: data.inepPeriod
      }

      if (isINEPStation(station)) {
        // Estação INEP
        inepCount++
        const period = getINEPPeriod(station)

        if (period) {
          counts.inep[period] = (counts.inep[period] || 0) + 1
        } else {
          console.warn(`⚠️  Estação INEP sem período identificável: ${station.idEstacao}`)
          counts.inep['sem-periodo'] = (counts.inep['sem-periodo'] || 0) + 1
        }

      } else if (isRevalidaFacilStation(station)) {
        // Estação Revalida Fácil
        revalidaFacilCount++
        const specialty = getRevalidaFacilSpecialty(station)
        counts.revalidaFacil[specialty] = (counts.revalidaFacil[specialty] || 0) + 1

      } else {
        // Não classificada
        unclassifiedCount++
        console.warn(`⚠️  Estação não classificada: ${station.idEstacao}`)
      }
    })

    // 3. Mostrar resumo
    console.log('📊 RESUMO DA CONTAGEM:\n')
    console.log(`  Total de estações: ${totalStations}`)
    console.log(`  ├─ INEP: ${inepCount}`)
    console.log(`  ├─ Revalida Fácil: ${revalidaFacilCount}`)
    console.log(`  └─ Não classificadas: ${unclassifiedCount}\n`)

    console.log('  INEP por período:')
    const inepPeriods = Object.keys(counts.inep).sort().reverse()
    inepPeriods.forEach(period => {
      console.log(`    - ${period}: ${counts.inep[period]}`)
    })

    console.log('\n  Revalida Fácil por especialidade:')
    Object.entries(counts.revalidaFacil).forEach(([specialty, count]) => {
      if (count > 0) {
        console.log(`    - ${specialty}: ${count}`)
      }
    })

    // 4. Salvar no Firestore
    console.log('\n💾 Salvando no Firestore (_metadata/station_counts)...')

    const metadataRef = doc(db, '_metadata', 'station_counts')
    await setDoc(metadataRef, {
      ...counts,
      metadata: {
        ...counts.metadata,
        lastUpdate: serverTimestamp()
      }
    })

    console.log('✅ Contagens salvas com sucesso!\n')

    // 5. Verificar documento criado
    console.log('🔍 Verificando documento criado...')
    const { getDoc } = await import('firebase/firestore')
    const docSnap = await getDoc(metadataRef)

    if (docSnap.exists()) {
      console.log('✅ Documento _metadata/station_counts criado e acessível!')
      console.log('\n📄 Conteúdo:')
      console.log(JSON.stringify(docSnap.data(), null, 2))
    } else {
      console.error('❌ Erro: Documento não foi criado corretamente')
    }

    console.log('\n🎉 Processo concluído com sucesso!')
    console.log('\n📝 Próximos passos:')
    console.log('  1. Verificar no Firebase Console: Firestore → _metadata → station_counts')
    console.log('  2. Implementar fetchStationCounts() em useStationData.js')
    console.log('  3. Atualizar StationList.vue para usar contagens')

  } catch (error) {
    console.error('\n❌ ERRO ao popular contagens:', error)
    console.error('Detalhes:', error.message)

    if (error.code === 'permission-denied') {
      console.error('\n⚠️  Erro de permissão! Verifique as regras do Firestore:')
      console.error('   - A coleção _metadata deve permitir write')
      console.error('   - Você deve estar autenticado como admin')
    }

    process.exit(1)
  }
}

// Executar
populateStationCounts()
  .then(() => {
    console.log('\n✨ Script finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  })
