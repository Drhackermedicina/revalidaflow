// scripts/migrateDatabaseAuth.js
// Script de migração que funciona através da interface web
// Este script deve ser executado no console do navegador com usuário logado

console.log('🔧 Script de Migração - Executar no Console do Navegador')
console.log('📋 Instruções:')
console.log('1. Abra o app no navegador')
console.log('2. Faça login como administrador')
console.log('3. Abra as ferramentas de desenvolvedor (F12)')
console.log('4. Cole este código no console e execute')
console.log('')
console.log('━'.repeat(50))

// Código para colar no console do navegador:
const migrationScript = `
// === SCRIPT DE MIGRAÇÃO HÍBRIDA ===
(async function() {
  console.log('🚀 Iniciando migração...')
  
  // Verificar se Firebase está disponível
  if (typeof db === 'undefined') {
    console.error('❌ Firebase não encontrado! Certifique-se de estar logado no app.')
    return
  }
  
  const collectionName = 'estacoes_clinicas'
  let processedCount = 0
  let updatedCount = 0
  let errorCount = 0
  
  try {
    // Buscar todas as estações
    console.log('📡 Buscando estações...')
    const snapshot = await db.collection(collectionName).get()
    
    console.log(\`📊 Encontradas \${snapshot.docs.length} estações\`)
    
    // Processar cada estação
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data()
        const updates = {}
        let needsUpdate = false
        
        // Verificar criadoEmTimestamp
        if (!data.criadoEmTimestamp) {
          updates.criadoEmTimestamp = firebase.firestore.Timestamp.now()
          needsUpdate = true
        }
        
        // Verificar atualizadoEmTimestamp
        if (!data.atualizadoEmTimestamp) {
          updates.atualizadoEmTimestamp = data.criadoEmTimestamp || firebase.firestore.Timestamp.now()
          needsUpdate = true
        }
        
        // Verificar hasBeenEdited
        if (typeof data.hasBeenEdited !== 'boolean') {
          const criado = data.criadoEmTimestamp
          const atualizado = data.atualizadoEmTimestamp
          
          if (criado && atualizado) {
            const criadoTime = criado.toDate().getTime()
            const atualizadoTime = atualizado.toDate().getTime()
            updates.hasBeenEdited = atualizadoTime > criadoTime
          } else {
            updates.hasBeenEdited = false
          }
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
          await docSnapshot.ref.update(updates)
          updatedCount++
          const updateFields = Object.keys(updates).join(', ')
          console.log(\`✅ \${docSnapshot.id}: \${updateFields}\`)
        } else {
          console.log(\`⏭️ \${docSnapshot.id}: já normalizado\`)
        }
        
        processedCount++
        
        // Pausa pequena para não sobrecarregar
        if (processedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (docError) {
        console.error(\`❌ Erro em \${docSnapshot.id}:\`, docError.message)
        errorCount++
      }
    }
    
    console.log('━'.repeat(50))
    console.log('🎉 MIGRAÇÃO CONCLUÍDA!')
    console.log(\`📊 Processados: \${processedCount}\`)
    console.log(\`✅ Atualizados: \${updatedCount}\`)
    console.log(\`❌ Erros: \${errorCount}\`)
    console.log(\`📈 Taxa de sucesso: \${((updatedCount/processedCount)*100).toFixed(1)}%\`)
    
  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message)
  }
})()
`

console.log('\n📋 CÓDIGO PARA COLAR NO CONSOLE:')
console.log('━'.repeat(50))
console.log(migrationScript)
console.log('━'.repeat(50))

// Exportar também como função se estiver sendo importado
export function runMigrationInBrowser() {
  eval(migrationScript)
}
