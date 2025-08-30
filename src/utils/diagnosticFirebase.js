// Diagnóstico completo do Firebase
import { firebaseAuth as auth, db } from '@/plugins/firebase'
import { collection, getDocs, limit, query } from 'firebase/firestore'

export async function runFirebaseDiagnostic() {
  
  try {
    // 1. Verificar autenticação
    
    if (!auth.currentUser) {
      console.error('❌ USUÁRIO NÃO AUTENTICADO!')
      return { success: false, error: 'Usuário não autenticado' }
    }
    
    // 2. Verificar conexão com Firestore
    
    // Teste básico de conexão
    const testCollection = collection(db, 'estacoes_clinicas')
    
    // 3. Tentar ler dados (com limite para não sobrecarregar)
    
    const testQuery = query(testCollection, limit(5))
    
    const snapshot = await getDocs(testQuery)
    
    if (snapshot.size > 0) {
      
      // Mostrar primeiros dados para debug
      const firstDoc = snapshot.docs[0]
      
      return { 
        success: true, 
        totalDocs: snapshot.size,
        sampleData: firstDoc.data()
      }
    } else {
      return { success: true, totalDocs: 0 }
    }
    
  } catch (error) {
    console.error('❌ ERRO NO DIAGNÓSTICO:')
    console.error('   Tipo do erro:', error.constructor.name)
    console.error('   Código do erro:', error.code)
    console.error('   Mensagem:', error.message)
    console.error('   Stack trace:', error.stack)
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      type: error.constructor.name
    }
  }
}

// Função para testar diferentes coleções
export async function testMultipleCollections() {
  const collections = ['estacoes_clinicas', 'usuarios', 'questoes']
  
  
  for (const collName of collections) {
    try {
      const testQuery = query(collection(db, collName), limit(1))
      const snapshot = await getDocs(testQuery)
      
    } catch (error) {
      console.error(`   ${collName}: ERRO - ${error.message} ❌`)
    }
  }
}
