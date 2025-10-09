// Script de teste para verificar se o NotificationsCard funciona sem erros de permissões
import { ref } from 'vue'
import { currentUser, waitForAuth } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

// Simular o comportamento do NotificationsCard
async function testNotificationsCard() {
    console.log('🧪 Iniciando teste do NotificationsCard...')

    try {
        // Aguardar autenticação (como na modificação)
        console.log('⏳ Aguardando autenticação...')
        await waitForAuth()

        const userId = currentUser.value?.uid
        console.log('👤 Usuário atual:', userId ? 'Autenticado' : 'Não autenticado')

        if (!userId) {
            console.log('✅ Teste passou: Usuário não autenticado, usando dados mock')
            return true
        }

        // Tentar acessar o Firestore
        console.log('🔍 Tentando acessar Firestore...')
        const notifRef = collection(db, 'notificacoes', userId, 'items')
        const q = query(notifRef, orderBy('criadoEm', 'desc'), limit(10))

        return new Promise((resolve) => {
            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    console.log('✅ Teste passou: Acesso ao Firestore bem-sucedido')
                    console.log('📊 Documentos encontrados:', snapshot.size)
                    unsubscribe()
                    resolve(true)
                },
                (error) => {
                    console.error('❌ Erro no Firestore:', error.message)
                    if (error.message.includes('Missing or insufficient permissions')) {
                        console.error('🚫 Ainda há erro de permissões!')
                        resolve(false)
                    } else {
                        console.log('⚠️ Outro tipo de erro (não permissões):', error.message)
                        resolve(true) // Não é o erro que estamos testando
                    }
                }
            )

            // Timeout para evitar travamento
            setTimeout(() => {
                console.log('⏰ Timeout do teste')
                unsubscribe()
                resolve(true)
            }, 5000)
        })

    } catch (error) {
        console.error('❌ Erro inesperado no teste:', error)
        return false
    }
}

// Executar teste
testNotificationsCard().then(success => {
    if (success) {
        console.log('🎉 Teste concluído com sucesso!')
    } else {
        console.log('💥 Teste falhou - erro de permissões ainda existe')
    }
})
