// Diagnóstico completo do Firebase
import { firebaseAuth as auth, db } from '@/plugins/firebase'
import { collection, getDocs, limit, query } from 'firebase/firestore'

export async function runFirebaseDiagnostic() {
  console.log('🔍 INICIANDO DIAGNÓSTICO FIREBASE...')
  console.log('=' .repeat(50))
  
  try {
    // 1. Verificar autenticação
    console.log('👤 1. VERIFICANDO AUTENTICAÇÃO:')
    console.log('   Current User:', auth.currentUser)
    console.log('   UID:', auth.currentUser?.uid)
    console.log('   Email:', auth.currentUser?.email)
    console.log('   Auth State:', !!auth.currentUser)
    
    if (!auth.currentUser) {
      console.error('❌ USUÁRIO NÃO AUTENTICADO!')
      return { success: false, error: 'Usuário não autenticado' }
    }
    
    // 2. Verificar conexão com Firestore
    console.log('\n📊 2. TESTANDO CONEXÃO FIRESTORE:')
    
    // Teste básico de conexão
    const testCollection = collection(db, 'estacoes_clinicas')
    console.log('   Collection reference criada:', !!testCollection)
    
    // 3. Tentar ler dados (com limite para não sobrecarregar)
    console.log('\n📖 3. TENTANDO LER DADOS:')
    
    const testQuery = query(testCollection, limit(5))
    console.log('   Query criada:', !!testQuery)
    
    const snapshot = await getDocs(testQuery)
    console.log('   Snapshot obtido:', !!snapshot)
    console.log('   Número de documentos:', snapshot.size)
    console.log('   Documentos vazios?', snapshot.empty)
    
    if (snapshot.size > 0) {
      console.log('✅ SUCESSO! Dados acessíveis')
      
      // Mostrar primeiros dados para debug
      const firstDoc = snapshot.docs[0]
      console.log('   Primeiro documento ID:', firstDoc.id)
      console.log('   Campos do primeiro documento:', Object.keys(firstDoc.data()))
      
      return { 
        success: true, 
        totalDocs: snapshot.size,
        sampleData: firstDoc.data()
      }
    } else {
      console.warn('⚠️ Coleção existe mas está vazia')
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
  
  console.log('🧪 TESTANDO MÚLTIPLAS COLEÇÕES:')
  
  for (const collName of collections) {
    try {
      const testQuery = query(collection(db, collName), limit(1))
      const snapshot = await getDocs(testQuery)
      
      console.log(`   ${collName}: ${snapshot.size} documentos ✅`)
    } catch (error) {
      console.error(`   ${collName}: ERRO - ${error.message} ❌`)
    }
  }
}
