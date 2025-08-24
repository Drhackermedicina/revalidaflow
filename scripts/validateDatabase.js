// scripts/validateDatabase.js
import { initializeApp } from 'firebase/app'
import {
    collection,
    getDocs,
    getFirestore,
    limit,
    query
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

async function validateDatabase() {
  console.log('🔍 VALIDAÇÃO COMPLETA DO BANCO DE DADOS')
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}`)
  console.log('━'.repeat(60))
  
  try {
    const collectionName = 'estacoes_clinicas'
    
    // Buscar amostras de estações usando Web SDK
    const stationsSnapshot = await getDocs(query(
      collection(db, collectionName),
      limit(50)
    ))
    
    let totalStations = 0
    let validStations = 0
    let modernSystem = 0
    let legacySystem = 0
    let hybridSystem = 0
    let noSystem = 0
    let issuesFound = []
    
    console.log(`📊 Analisando ${stationsSnapshot.docs.length} estações...`)
    console.log()
    
    stationsSnapshot.forEach(doc => {
      const data = doc.data()
      totalStations++
      
      const validation = {
        id: doc.id,
        title: data.tituloEstacao || 'Sem título',
        valid: true,
        issues: [],
        system: 'unknown'
      }
      
      // Detectar tipo de sistema
      if (data.editHistory && Array.isArray(data.editHistory)) {
        validation.system = 'modern'
        modernSystem++
      } else if (data.criadoEmTimestamp && data.atualizadoEmTimestamp) {
        validation.system = 'hybrid'
        hybridSystem++
      } else if (data.dataCadastro || data.dataUltimaAtualizacao) {
        validation.system = 'legacy'
        legacySystem++
      } else {
        validation.system = 'none'
        noSystem++
      }
      
      // Validar criadoEmTimestamp
      if (!data.criadoEmTimestamp || typeof data.criadoEmTimestamp.toDate !== 'function') {
        validation.valid = false
        validation.issues.push('criadoEmTimestamp inválido')
      }
      
      // Validar atualizadoEmTimestamp
      if (!data.atualizadoEmTimestamp || typeof data.atualizadoEmTimestamp.toDate !== 'function') {
        validation.valid = false
        validation.issues.push('atualizadoEmTimestamp inválido')
      }
      
      // Validar hasBeenEdited
      if (typeof data.hasBeenEdited !== 'boolean') {
        validation.valid = false
        validation.issues.push('hasBeenEdited ausente')
      }
      
      // Validar editHistory
      if (!Array.isArray(data.editHistory)) {
        validation.valid = false
        validation.issues.push('editHistory inválido')
      }
      
      // Validar totalEdits
      if (typeof data.totalEdits !== 'number') {
        validation.valid = false
        validation.issues.push('totalEdits inválido')
      }
      
      // Validar campos básicos
      if (!data.tituloEstacao || typeof data.tituloEstacao !== 'string') {
        validation.valid = false
        validation.issues.push('tituloEstacao inválido')
      }
      
      if (!data.especialidade || typeof data.especialidade !== 'string') {
        validation.valid = false
        validation.issues.push('especialidade inválida')
      }
      
      // Validar criadoPor
      if (!data.criadoPor || typeof data.criadoPor !== 'string') {
        validation.valid = false
        validation.issues.push('criadoPor ausente')
      }
      
      if (validation.valid) {
        validStations++
      } else {
        issuesFound.push(validation)
      }
    })
    
    // Estatísticas por sistema
    console.log('📈 DISTRIBUIÇÃO POR SISTEMA:')
    console.log(`   🆕 Sistema Moderno: ${modernSystem} (${((modernSystem/totalStations)*100).toFixed(1)}%)`)
    console.log(`   🔄 Sistema Híbrido: ${hybridSystem} (${((hybridSystem/totalStations)*100).toFixed(1)}%)`)
    console.log(`   📚 Sistema Legacy: ${legacySystem} (${((legacySystem/totalStations)*100).toFixed(1)}%)`)
    console.log(`   ❌ Sem Sistema: ${noSystem} (${((noSystem/totalStations)*100).toFixed(1)}%)`)
    console.log()
    
    // Relatório de validação
    console.log('📋 RELATÓRIO DE VALIDAÇÃO:')
    console.log(`   ✅ Estações válidas: ${validStations}/${totalStations}`)
    console.log(`   ❌ Estações com problemas: ${issuesFound.length}`)
    console.log(`   📊 Taxa de sucesso: ${((validStations / totalStations) * 100).toFixed(2)}%`)
    console.log()
    
    if (issuesFound.length > 0) {
      console.log('🔍 PROBLEMAS ENCONTRADOS:')
      issuesFound.slice(0, 10).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.title} (${issue.id}):`)
        console.log(`   Sistema: ${issue.system}`)
        issue.issues.forEach(problem => {
          console.log(`   • ${problem}`)
        })
        console.log()
      })
      
      if (issuesFound.length > 10) {
        console.log(`... e mais ${issuesFound.length - 10} documentos com problemas`)
        console.log()
      }
    }
    
    // Recomendações
    console.log('💡 RECOMENDAÇÕES:')
    if (legacySystem > 0) {
      console.log(`   • Execute migração para ${legacySystem} estações legacy`)
    }
    if (noSystem > 0) {
      console.log(`   • Corrija ${noSystem} estações sem sistema de timestamps`)
    }
    if (issuesFound.length > 0) {
      console.log(`   • Resolva ${issuesFound.length} problemas de validação`)
    }
    if (validStations === totalStations) {
      console.log('   • ✨ Base de dados está completamente normalizada!')
    }
    
    console.log()
    console.log('🎉 Validação concluída!')
    
    return { 
      totalStations, 
      validStations, 
      issuesFound,
      modernSystem,
      legacySystem,
      hybridSystem,
      noSystem
    }
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error.message)
    throw error
  }
}

// Executar validação
validateDatabase()
  .then(result => {
    const exitCode = result.issuesFound.length === 0 ? 0 : 1
    console.log(`\n🏁 Saindo com código: ${exitCode}`)
    process.exit(exitCode)
  })
  .catch(error => {
    console.error('❌ ERRO FATAL:', error.message)
    process.exit(1)
  })
