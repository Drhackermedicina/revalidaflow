import { currentUser } from '@/plugins/auth'
import { db } from '@/plugins/firebase'
import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

let unsubscribeList = []

export function usePrivateChatNotification() {
  const route = useRoute()

  function startListener() {
    if (!currentUser.value?.uid) return
    
    console.log('🚀 Iniciando listener de chat privado para usuário:', currentUser.value.uid)
    
    // Limpar listeners anteriores
    unsubscribeList.forEach(unsub => unsub())
    unsubscribeList = []
    
    const userUid = currentUser.value.uid
    
    // Evita criar N listeners (um por outro usuário) — isso dispara muitas leituras.
    // Estratégia: buscar apenas um conjunto limitado de usuários ativos (top 20 por lastActive)
    // e só criar listeners para esses; para chats adicionais, o desenvolvedor pode ativar manualmente.
    getDocs(query(collection(db, 'usuarios'), orderBy('lastActive', 'desc'), limit(20))).then(snapshot => {
      snapshot.forEach(doc => {
        const otherUid = doc.id
        if (otherUid !== userUid) {
          const chatId = [userUid, otherUid].sort().join('_')
          const col = collection(db, `chatPrivado_${chatId}`)
          const q = query(col, orderBy('timestamp', 'desc'), limit(1))

          let lastMessageId = null
          let isFirstLoad = true

          // Listener limitado que puxa apenas a última mensagem — reduz leituras no snapshot
          const unsubscribe = onSnapshot(q, (snap) => {
            const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            if (messages.length === 0) return

            const lastMsg = messages[0]
            if (isFirstLoad) {
              lastMessageId = lastMsg.id
              isFirstLoad = false
              return
            }

            if (lastMessageId && lastMessageId !== lastMsg.id && lastMsg.senderId !== userUid) {
              if (route.name !== 'ChatPrivateView' || route.params.uid !== otherUid) {
                window.dispatchEvent(new CustomEvent('privateChatNotification', {
                  detail: {
                    senderId: lastMsg.senderId,
                    senderName: lastMsg.senderName || 'Usuário',
                    senderPhotoURL: lastMsg.senderPhotoURL || null,
                    text: lastMsg.text,
                    timestamp: lastMsg.timestamp,
                    otherUserId: otherUid
                  }
                }))
              }
            }

            if (messages.length > 0) {
              lastMessageId = messages[0].id
            }
          }, (error) => {
            // Silencioso
          })

          unsubscribeList.push(unsubscribe)
        }
      })
    }).catch(error => {
      // Silencioso
    })
  }

  function stopListener() {
    unsubscribeList.forEach(unsub => unsub())
    unsubscribeList = []
  }

  onMounted(() => {
    if (currentUser.value?.uid) {
      startListener()
    }
  })

  onUnmounted(() => {
    stopListener()
  })

  return {
    startListener,
    stopListener
  }
}
