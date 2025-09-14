<template>
  <v-container 
    :class="[
      'py-6 chat-private-container',
      isDarkTheme ? 'chat-private-container--dark' : 'chat-private-container--light'
    ]"
  >
    <v-row>
      <v-col cols="12">
        <v-card 
          elevation="3" 
          :class="[
            'chat-card d-flex flex-column animate-fade-in',
            isDarkTheme ? 'chat-card--dark' : 'chat-card--light'
          ]"
        >
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-user-3-line" color="primary" size="28" />
            <span class="text-h5 font-weight-bold">Chat Privado</span>
            <span v-if="userName" class="ms-2">com <b>{{ userName }}</b></span>
            <v-spacer />
            <v-btn icon @click="$router.back()"><v-icon icon="ri-arrow-left-line" /></v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="chat-messages flex-grow-1 pa-4">
            <div v-for="message in messages" :key="message.id" class="message-bubble d-flex mb-4" :class="{ 'justify-end': message.senderId === currentUser?.uid }">
              <v-avatar v-if="message.senderPhotoURL" :image="message.senderPhotoURL" size="32" class="me-2" />
              <div class="message-content pa-3 rounded-lg" :class="message.senderId === currentUser?.uid ? 'bg-primary text-white my-message' : 'bg-grey-lighten-4 other-message'">
                <div class="font-weight-medium text-body-2 mb-1" :class="{ 'text-right': message.senderId === currentUser?.uid }">
                  {{ message.senderName }}
                </div>
                <div class="text-body-1 mb-1" v-html="formatMessageText(message.text)"></div>
                <div v-if="hasLinks(message.text)" class="d-flex justify-end mt-2">
                  <v-btn
                    size="x-small"
                    variant="text"
                    @click="copyMessageLinks(message.text)"
                    :color="message.senderId === currentUser?.uid ? 'white' : 'primary'"
                  >
                    <v-icon size="14" class="me-1">ri-clipboard-line</v-icon>
                    Copiar Link
                  </v-btn>
                </div>
                <div class="text-caption text-right" :class="message.senderId === currentUser?.uid ? 'text-white-50' : 'text-medium-emphasis'">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
            </div>
            <div ref="messagesEnd"></div>
          </v-card-text>
          <v-divider />
          <v-card-actions class="pa-4 chat-input-bar">
            <v-text-field
              v-model="newMessage"
              label="Digite sua mensagem..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="chat-input"
              @keydown.enter="sendMessage"
            >
              <template #append-inner>
                <v-btn
                  icon
                  variant="text"
                  color="primary"
                  :disabled="!newMessage.trim()"
                  @click="sendMessage"
                >
                  <v-icon icon="ri-send-plane-line" />
                </v-btn>
              </template>
            </v-text-field>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTheme } from 'vuetify';

const route = useRoute();
const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

const otherUserId = route.params.uid;
const userName = ref('');
const messages = ref([]);
const newMessage = ref('');
const messagesEnd = ref(null);
let unsubscribe = null;
let listenerInitialized = false;

// Busca nome do usuário alvo (corrigido para API v9)
async function fetchUserName() {
  try {
    // Cache simples em memória para evitar leituras repetidas
    if (!window._userNameCache) window._userNameCache = {};
    const cached = window._userNameCache[otherUserId];
    if (cached && (Date.now() - cached.ts) < 30 * 1000) {
      userName.value = cached.name;
      return;
    }

    const userRef = doc(db, 'usuarios', otherUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      userName.value = (userData.nome && userData.sobrenome)
        ? `${userData.nome} ${userData.sobrenome}`
        : userData.displayName || 'Usuário';
      window._userNameCache[otherUserId] = { ts: Date.now(), name: userName.value };
    } else {
      userName.value = 'Usuário não encontrado';
    }
  } catch (error) {
    // Silencioso - removido log para reduzir poluição do console
    userName.value = 'Erro ao carregar usuário';
  }
}

// Função para inicializar o listener de mensagens
function initializeMessageListener() {
  if (!currentUser.value?.uid || listenerInitialized) return;

  listenerInitialized = true;

  // Parar listener anterior se existir
  if (unsubscribe) unsubscribe();

  const chatId = [currentUser.value.uid, otherUserId].sort().join('_');
  const messagesCollectionRef = collection(db, `chatPrivado_${chatId}`);
  // Carregar e ouvir as últimas 100 mensagens em ordem descendente para capturar novas mensagens em tempo real
  const mq = query(messagesCollectionRef, orderBy('timestamp', 'desc'), limit(100));
  unsubscribe = onSnapshot(mq, (snapshot) => {
    // Mapear documentos e reverter para ordem ascendente para exibição correta
    const loadedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    messages.value = loadedMessages.reverse(); // Reverter para ordem cronológica (ascendente)
    nextTick(() => {
      scrollToEnd();
    });
  });
}

onMounted(() => {
  fetchUserName();
});

// Watch para inicializar listener quando currentUser estiver disponível
watch(currentUser, (newUser) => {
  if (newUser?.uid) {
    initializeMessageListener();
  } else {
    // Se usuário deslogar, parar listener
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      listenerInitialized = false;
    }
  }
}, { immediate: true });

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const sendMessage = async () => {
  if (newMessage.value.trim() === '' || !currentUser.value?.uid) return;
  const chatId = [currentUser.value.uid, otherUserId].sort().join('_');
  try {
    await addDoc(collection(db, `chatPrivado_${chatId}`), {
      senderId: currentUser.value.uid,
      senderName: currentUser.value.displayName || 'Anônimo',
      senderPhotoURL: currentUser.value.photoURL || '',
      text: newMessage.value.trim(),
      timestamp: serverTimestamp(),
    });
    newMessage.value = '';
    nextTick(() => {
      scrollToEnd();
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const scrollToEnd = () => {
  if (messagesEnd.value) {
    messagesEnd.value.scrollIntoView({ behavior: 'smooth' });
  }
};

// Função para detectar e formatar links no texto
const formatMessageText = (text) => {
  if (!text) return '';
  
  // Regex para detectar URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  }).replace(/\n/g, '<br>');
};

// Função para verificar se a mensagem contém links
const hasLinks = (text) => {
  if (!text) return false;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
};

// Função para copiar links da mensagem
const copyMessageLinks = async (text) => {
  if (!text) return;
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = text.match(urlRegex);
  
  if (links && links.length > 0) {
    try {
      // Se houver apenas um link, copia diretamente
      if (links.length === 1) {
        await navigator.clipboard.writeText(links[0]);
      } else {
        // Se houver múltiplos links, copia todos separados por quebra de linha
        await navigator.clipboard.writeText(links.join('\n'));
      }
      
      // Aqui você pode adicionar uma notificação de sucesso se desejar
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = links.length === 1 ? links[0] : links.join('\n');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
};
</script>

<style scoped>
/* Container principal - tema claro */
.chat-private-container--light {
  background: rgb(var(--v-theme-background));
}

/* Container principal - tema escuro */
.chat-private-container--dark {
  background: rgb(var(--v-theme-background));
}

/* Chat card - tema claro */
.chat-card--light {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(var(--v-theme-primary), 0.10), 0 1.5px 4px 0 rgba(var(--v-theme-shadow-key-umbra-color), 0.04);
  background: rgb(var(--v-theme-surface));
}

/* Chat card - tema escuro */
.chat-card--dark {
  min-height: 480px;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(var(--v-theme-primary), 0.15), 0 1.5px 4px 0 rgba(var(--v-theme-shadow-key-umbra-color), 0.08);
  background: rgb(var(--v-theme-surface));
}

.chat-messages {
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  border-radius: 12px;
  transition: background 0.3s ease;
}

/* Chat messages - tema claro */
.chat-card--light .chat-messages {
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.05) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
}

/* Chat messages - tema escuro */
.chat-card--dark .chat-messages {
  background: linear-gradient(90deg, rgba(var(--v-theme-warning), 0.1) 0%, rgba(var(--v-theme-primary), 0.1) 100%);
}

.message-bubble {
  transition: transform 0.15s;
}

.message-bubble:hover .message-content {
  transform: scale(1.03);
  box-shadow: 0 2px 12px 0 rgba(var(--v-theme-primary), 0.10);
}
.message-content {
  min-width: 120px;
  max-width: 80vw;
  word-break: break-word;
  box-shadow: 0 2px 8px 0 rgba(var(--v-theme-primary), 0.06);
  transition: box-shadow 0.18s, transform 0.18s, background-color 0.3s ease, color 0.3s ease;
}

/* Minhas mensagens - tema claro */
.chat-card--light .my-message {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

/* Minhas mensagens - tema escuro */
.chat-card--dark .my-message {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-info)) 100%) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

/* Outras mensagens - tema claro */
.chat-card--light .other-message {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Outras mensagens - tema escuro */
.chat-card--dark .other-message {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
}

/* Estilos para links em mensagens */
.message-content :deep(.message-link) {
  color: rgb(var(--v-theme-info)) !important;
  text-decoration: underline;
  word-break: break-all;
  transition: color 0.2s ease;
}

.my-message :deep(.message-link) {
  color: rgba(var(--v-theme-on-primary), 0.8) !important;
}

.my-message :deep(.message-link):hover {
  color: rgb(var(--v-theme-on-primary)) !important;
}

.other-message :deep(.message-link) {
  color: rgb(var(--v-theme-info)) !important;
}

.other-message :deep(.message-link):hover {
  color: rgb(var(--v-theme-info-darken-1)) !important;
}

/* Chat input bar - tema claro */
.chat-card--light .chat-input-bar {
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 0 0 12px 12px;
}

/* Chat input bar - tema escuro */
.chat-card--dark .chat-input-bar {
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 0 0 12px 12px;
}

.chat-input {
  border-radius: 8px;
}
.animate-fade-in {
  animation: fadeInUp 0.7s cubic-bezier(.55,0,.1,1);
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 900px) {
  .chat-card { border-radius: 8px; }
}
@media (max-width: 600px) {
  .chat-private-container { padding: 0 2px; }
  .chat-card { border-radius: 4px; }
  .chat-messages { min-height: 180px; max-height: 220px; }
}
</style>
