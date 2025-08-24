// scripts/migrateDatabase.js
import { initializeApp } from 'firebase/app'
import {
    collection,
    doc,
    getDocs,
    getFirestore,
    limit,
    query,
    startAfter,
    Timestamp,
    updateDoc
} from 'firebase/firestore'

// Configuração do Firebase (usando Web SDK)
const firebaseConfig = {
  apiKey: "AIzaSyDuakOooHv9a5slO0I3o3gttSBlSXD0aWw",
  authDomain: "revalida-companion.firebaseapp.com",
  projectId: "revalida-companion",
  storageBucket: "revalida-companion.firebasestorage.app",
  messagingSenderId: "772316263153",
  appId: "1:772316263153:web:d0af4ecc404b6ca16a2f50"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log('🔧 Iniciando script de migração...')
console.log('📋 Configuração:', {
  projectId: 'revalida-companion'
})

// Função para normalizar timestamps
function normalizeTimestamp(value) {
  if (!value) return null
  
  try {
    // Se já é um Timestamp do Firestore
    if (value && typeof value.toDate === 'function') {
      return value
    }
    
    // Se é um objeto Date
    if (value instanceof Date) {
      return Timestamp.fromDate(value)
    }
    
    // Se é uma string de data
    if (typeof value === 'string') {
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : Timestamp.fromDate(date)
    }
    
    // Se é um número (timestamp Unix)
    if (typeof value === 'number') {
      let date
      // Se parece ser timestamp em segundos
      if (value < 10000000000) {
        date = new Date(value * 1000)
      } else {
        // Se parece ser timestamp em milissegundos
        date = new Date(value)
      }
      return Timestamp.fromDate(date)
    }
    
    return null
  } catch (error) {
    console.warn('⚠️ Erro ao normalizar timestamp:', error)
    return null
  }
}

// Função para migrar estações
async function migrateStations() {
  console.log('🚀 Iniciando migração de estações...')
  
  let processedCount = 0
  let updatedCount = 0
  let errorCount = 0
  let lastDoc = null
  const batchSize = 10
  
  const collectionName = 'estacoes_clinicas' // Nome correto da coleção
  
  do {
    try {
      console.log(`📄 Processando lote ${Math.floor(processedCount / batchSize) + 1}...`)
      
      // Buscar lote de documentos usando Web SDK
      let queryRef = query(
        collection(db, collectionName),
        limit(batchSize)
      )
      
      if (lastDoc) {
        queryRef = query(queryRef, startAfter(lastDoc))
      }
      
      const snapshot = await getDocs(queryRef)
      
      if (snapshot.empty) {
        console.log('✅ Todos os documentos foram processados')
        break
      }
      
      console.log(`📄 Processando ${snapshot.docs.length} documentos...`)
      
      // Processar cada documento individualmente
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data()
          const updates = {}
          let needsUpdate = false
          
          // Normalizar criadoEmTimestamp
          if (data.criadoEmTimestamp) {
            const normalized = normalizeTimestamp(data.criadoEmTimestamp)
            if (normalized) {
              updates.criadoEmTimestamp = normalized
              needsUpdate = true
            }
          } else if (!data.criadoEmTimestamp) {
            // Adicionar criadoEmTimestamp se não existir
            updates.criadoEmTimestamp = Timestamp.now()
            needsUpdate = true
          }
          
          // Normalizar atualizadoEmTimestamp
          if (data.atualizadoEmTimestamp) {
            const normalized = normalizeTimestamp(data.atualizadoEmTimestamp)
            if (normalized) {
              updates.atualizadoEmTimestamp = normalized
              needsUpdate = true
            }
          } else if (!data.atualizadoEmTimestamp) {
            // Usar criadoEmTimestamp como atualizadoEmTimestamp se não existir
            updates.atualizadoEmTimestamp = updates.criadoEmTimestamp || Timestamp.now()
            needsUpdate = true
          }
          
          // Adicionar campos de sistema híbrido se não existirem
          if (!data.hasBeenEdited) {
            // Se criadoEm e atualizadoEm são diferentes, foi editada
            const criado = updates.criadoEmTimestamp || data.criadoEmTimestamp
            const atualizado = updates.atualizadoEmTimestamp || data.atualizadoEmTimestamp
            
            if (criado && atualizado) {
              const criadoTime = criado.toDate ? criado.toDate().getTime() : criado.getTime()
              const atualizadoTime = atualizado.toDate ? atualizado.toDate().getTime() : atualizado.getTime()
              updates.hasBeenEdited = atualizadoTime > criadoTime
              needsUpdate = true
            } else {
              updates.hasBeenEdited = false
              needsUpdate = true
            }
          }
          
          // Adicionar editHistory vazio se não existir
          if (!data.editHistory) {
            updates.editHistory = []
            needsUpdate = true
          }
          
          // Adicionar totalEdits se não existir
          if (typeof data.totalEdits !== 'number') {
            updates.totalEdits = data.editHistory ? data.editHistory.length : 0
            needsUpdate = true
          }
          
          // Adicionar criadoPor se não existir
          if (!data.criadoPor) {
            updates.criadoPor = 'sistema_migracao'
            needsUpdate = true
          }
          
          // Atualizar documento se necessário
          if (needsUpdate) {
            const docRef = doc(db, collectionName, docSnapshot.id)
            await updateDoc(docRef, updates)
            updatedCount++
            
            const updateFields = Object.keys(updates).join(', ')
            console.log(`✅ ${docSnapshot.id}: ${updateFields}`)
          } else {
            console.log(`⏭️ ${docSnapshot.id}: já normalizado`)
          }
          
          processedCount++
          
        } catch (docError) {
          console.error(`❌ Erro ao processar ${docSnapshot.id}:`, docError.message)
          errorCount++
        }
      }
      
      // Preparar para próximo lote
      lastDoc = snapshot.docs[snapshot.docs.length - 1]
      
      console.log(`📊 Lote concluído: ${updatedCount}/${processedCount} atualizados`)
      
      // Pausa para não sobrecarregar o Firestore
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Erro no lote:`, error.message)
      errorCount++
      
      // Se muitos erros, parar migração
      if (errorCount > 10) {
        console.error('🛑 Muitos erros, parando migração')
        break
      }
      
      // Pausa maior em caso de erro
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  } while (lastDoc)
  
  return { processedCount, updatedCount, errorCount }
}

// Função para validar migração
async function validateMigration() {
  console.log('🔍 Validando migração...')
  
  const collectionName = 'estacoes_clinicas'
  const snapshot = await getDocs(query(collection(db, collectionName), limit(20)))
  
  let validCount = 0
  let invalidCount = 0
  const issues = []
  
  snapshot.forEach(doc => {
    const data = doc.data()
    const docIssues = []
    
    // Validar campos obrigatórios
    if (!data.criadoEmTimestamp || typeof data.criadoEmTimestamp.toDate !== 'function') {
      docIssues.push('criadoEmTimestamp inválido')
    }
    
    if (!data.atualizadoEmTimestamp || typeof data.atualizadoEmTimestamp.toDate !== 'function') {
      docIssues.push('atualizadoEmTimestamp inválido')
    }
    
    if (typeof data.hasBeenEdited !== 'boolean') {
      docIssues.push('hasBeenEdited ausente')
    }
    
    if (!Array.isArray(data.editHistory)) {
      docIssues.push('editHistory inválido')
    }
    
    if (typeof data.totalEdits !== 'number') {
      docIssues.push('totalEdits inválido')
    }
    
    if (docIssues.length === 0) {
      validCount++
    } else {
      invalidCount++
      issues.push({ id: doc.id, issues: docIssues })
    }
  })
  
  console.log(`✅ Documentos válidos: ${validCount}`)
  console.log(`❌ Documentos com problemas: ${invalidCount}`)
  
  if (issues.length > 0) {
    console.log('🔍 Problemas encontrados:')
    issues.forEach(issue => {
      console.log(`  • ${issue.id}: ${issue.issues.join(', ')}`)
    })
  }
  
  return { validCount, invalidCount, issues }
}

// Script principal
async function main() {
  try {
    console.log('🎯 Script de migração do sistema híbrido')
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}`)
    console.log('━'.repeat(50))
    
    // Executar migração
    const migrationResult = await migrateStations()
    
    console.log('━'.repeat(50))
    console.log('⏳ Aguardando propagação dos dados...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Validar resultados
    const validationResult = await validateMigration()
    
    console.log('━'.repeat(50))
    console.log('🎉 MIGRAÇÃO CONCLUÍDA!')
    console.log('📊 RESUMO FINAL:')
    console.log(`   Documentos processados: ${migrationResult.processedCount}`)
    console.log(`   Documentos atualizados: ${migrationResult.updatedCount}`)
    console.log(`   Erros de migração: ${migrationResult.errorCount}`)
    console.log(`   Documentos válidos: ${validationResult.validCount}`)
    console.log(`   Documentos com problemas: ${validationResult.invalidCount}`)
    
    const successRate = validationResult.validCount / (validationResult.validCount + validationResult.invalidCount) * 100
    console.log(`   Taxa de sucesso: ${successRate.toFixed(1)}%`)
    
    process.exit(validationResult.invalidCount === 0 ? 0 : 1)
    
  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Executar script
main()
