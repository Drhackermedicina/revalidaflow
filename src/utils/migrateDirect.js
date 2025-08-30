// src/utils/migrateDirect.js
// Script de migração para executar diretamente no app Vue

import { db } from '@/plugins/firebase'
import {
    collection,
    doc,
    getDocs,
    Timestamp,
    updateDoc
} from 'firebase/firestore'

export async function runDatabaseMigration() {
  
  const collectionName = 'estacoes_clinicas'
  let processedCount = 0
  let updatedCount = 0
  let errorCount = 0
  
  try {
    // Buscar todas as estações
    const snapshot = await getDocs(collection(db, collectionName))
    
    
    // Processar cada estação
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()
        const updates = {}
        let needsUpdate = false
        
        // Função para normalizar timestamp
        function normalizeTimestamp(value) {
          if (!value) return null
          
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
            if (value < 10000000000) {
              date = new Date(value * 1000) // segundos
            } else {
              date = new Date(value) // milissegundos
            }
            return Timestamp.fromDate(date)
          }
          
          return null
        }
        
        // Normalizar criadoEmTimestamp
        if (data.criadoEmTimestamp) {
          const normalized = normalizeTimestamp(data.criadoEmTimestamp)
          if (normalized && normalized !== data.criadoEmTimestamp) {
            updates.criadoEmTimestamp = normalized
            needsUpdate = true
          }
        } else {
          updates.criadoEmTimestamp = Timestamp.now()
          needsUpdate = true
        }
        
        // Normalizar atualizadoEmTimestamp
        if (data.atualizadoEmTimestamp) {
          const normalized = normalizeTimestamp(data.atualizadoEmTimestamp)
          if (normalized && normalized !== data.atualizadoEmTimestamp) {
            updates.atualizadoEmTimestamp = normalized
            needsUpdate = true
          }
        } else {
          updates.atualizadoEmTimestamp = updates.criadoEmTimestamp || Timestamp.now()
          needsUpdate = true
        }
        
        // Verificar hasBeenEdited - lógica melhorada
        if (typeof data.hasBeenEdited !== 'boolean') {
          // Verificar se a estação foi realmente editada baseado no conteúdo
          let wasEdited = false
          
          // 1. Verificar se tem histórico de edições
          if (data.editHistory && Array.isArray(data.editHistory) && data.editHistory.length > 0) {
            wasEdited = true
          }
          
          // 2. Verificar se os timestamps indicam edição (diferença > 5 segundos)
          if (!wasEdited) {
            const criado = updates.criadoEmTimestamp || data.criadoEmTimestamp
            const atualizado = updates.atualizadoEmTimestamp || data.atualizadoEmTimestamp
            
            if (criado && atualizado) {
              const criadoTime = criado.toDate().getTime()
              const atualizadoTime = atualizado.toDate().getTime()
              const diffSeconds = (atualizadoTime - criadoTime) / 1000
              wasEdited = diffSeconds > 5 // Só considera editado se passou mais de 5 segundos
            }
          }
          
          // 3. Verificar indicadores de conteúdo personalizado
          if (!wasEdited) {
            // Se tem conteúdo não padrão, provavelmente foi editada
            const hasCustomContent = 
              (data.descricao && data.descricao.length > 50) ||
              (data.objetivo && data.objetivo.length > 50) ||
              (data.material && data.material.length > 20) ||
              (data.avaliacaoTemplate && data.avaliacaoTemplate.length > 100) ||
              (data.observacoes && data.observacoes.length > 10) ||
              (data.tags && Array.isArray(data.tags) && data.tags.length > 0)
            
            if (hasCustomContent) {
              wasEdited = true
            }
          }
          
          updates.hasBeenEdited = wasEdited
          needsUpdate = true
        }
        
        // Verificar editHistory
        if (!Array.isArray(data.editHistory)) {
          updates.editHistory = []
          needsUpdate = true
        }
        
        // Verificar totalEdits
        if (typeof data.totalEdits !== 'number') {
          updates.totalEdits = data.editHistory ? data.editHistory.length : 0
          needsUpdate = true
        }
        
        // Verificar criadoPor
        if (!data.criadoPor) {
          updates.criadoPor = 'sistema_migracao'
          needsUpdate = true
        }
        
        // Atualizar se necessário
        if (needsUpdate) {
          const docRef = doc(db, collectionName, docSnapshot.id)
          await updateDoc(docRef, updates)
          updatedCount++
          
          const updateFields = Object.keys(updates).join(', ')
        } else {
        }
        
        processedCount++
        
        // Pausa pequena para não sobrecarregar
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (docError) {
        console.error(`❌ Erro em ${docSnapshot.id}:`, docError.message)
        errorCount++
      }
    }
    
    
    const successRate = ((updatedCount / processedCount) * 100).toFixed(1)
    
    return {
      processedCount,
      updatedCount,
      errorCount,
      successRate: parseFloat(successRate)
    }
    
  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message)
    throw error
  }
}
