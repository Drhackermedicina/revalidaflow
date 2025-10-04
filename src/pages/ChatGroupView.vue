<template>
  <v-container 
    :class="[
      'py-6 chat-group-container',
      isDarkTheme ? 'chat-group-container--dark' : 'chat-group-container--light'
    ]"
  >
    <v-row>
      <!-- Usuários Online -->
      <v-col cols="12" md="4">
        <v-card 
          elevation="3" 
          :class="[
            'users-card animate-fade-in',
            isDarkTheme ? 'users-card--dark' : 'users-card--light'
          ]"
        >
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-group-line" color="primary" size="24" />
            <span class="text-h6 font-weight-bold">Usuários Online</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <template v-if="loadingUsers">
              <div class="d-flex justify-center align-center py-6">
                <v-progress-circular indeterminate color="primary" size="32" />
                <span class="ms-3">Carregando...</span>
              </div>
            </template>
            <template v-else-if="errorUsers">
              <div class="d-flex justify-center align-center py-6">
                <v-icon icon="ri-error-warning-line" color="error" size="28" class="me-2" />
                <span class="text-error">{{ errorUsers }}</span>
              </div>
            </template>
            <template v-else-if="users.length === 0">
              <div class="d-flex justify-center align-center py-6">
                <v-icon icon="ri-user-off-line" color="grey" size="28" class="me-2" />
                <span class="text-medium-emphasis">Nenhum usuário online.</span>
              </div>
            </template>
            <v-list class="py-0" v-else>
              <v-list-item v-for="user in users" :key="user.uid" class="py-2 user-list-item">
                <template #prepend>
                  <v-avatar :image="getUserAvatar(user)" size="40" class="user-avatar elevation-2" />
                </template>
                <v-list-item-title class="font-weight-medium">
                  <span class="user-name-link" @click="openPrivateChat(user)" style="cursor:pointer; color:#7b1fa2; text-decoration:underline;">
                    {{ (user.nome && user.sobrenome) ? user.nome + ' ' + user.sobrenome : user.displayName || 'Usuário sem nome' }}
                  </span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-medium-emphasis">{{ user.status }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Chat em Grupo -->
      <v-col cols="12" md="8">
        <v-card 
          elevation="3" 
          :class="[
            'chat-card d-flex flex-column animate-fade-in',
            isDarkTheme ? 'chat-card--dark' : 'chat-card--light'
          ]"
        >
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="ri-wechat-line" color="primary" size="28" />
            <span class="text-h5 font-weight-bold">Chat em Grupo</span>
            <!-- Botão de teste para limpeza (apenas para admins) -->
            <v-spacer />
            <v-btn 
              v-if="(currentUser?.uid || '').trim() === 'KiSITAxXMAY5uU3bOPW5JMQPent2'"
              icon
              variant="text"
              color="warning"
              size="small"
              @click="cleanOldMessages"
              title="Testar limpeza de mensagens antigas"
            >
              <v-icon icon="ri-delete-bin-line" />
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text class="chat-messages flex-grow-1 pa-4">
            <div v-for="message in messages" :key="message.id" class="message-bubble d-flex mb-4" :class="{ 'justify-end': (message.senderId || '') === (currentUser?.uid || '') }">
              <v-avatar v-if="message.senderPhotoURL" :image="message.senderPhotoURL" size="32" class="me-2" />
              <div 
                :class="[
                  'message-content pa-3 rounded-lg',
                  message.senderId === currentUser?.uid 
                    ? 'bg-primary text-white my-message' 
                    : isDarkTheme 
                      ? 'other-message--dark' 
                      : 'other-message--light'
                ]"
              >
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
          <v-card-actions 
            :class="[
              'pa-4 chat-input-bar',
              isDarkTheme ? 'chat-input-bar--dark' : 'chat-input-bar--light'
            ]"
          >
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
    <!-- Snackbar para nova mensagem -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { addDoc, collection, deleteDoc, getDocs, limit, onSnapshot, orderBy, query, where, Unsubscribe } from 'firebase/firestore';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

// Tipagens locais
interface User {
  uid: string;
  nome?: string;
  sobrenome?: string;
  displayName?: string;
  photoURL?: string;
  avatar?: string;
  status?: string;
}

interface Message {
  id: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  text?: string;
  timestamp?: any;
}

const users = ref<User[]>([]);
const loadingUsers = ref<boolean>(true);
const errorUsers = ref<string>('');
const messages = ref<Message[]>([]);
const newMessage = ref<string>('');
const messagesEnd = ref<HTMLElement | null>(null);
const router = useRouter();
const snackbar = ref<{ show: boolean; text: string; color: string }>({ show: false, text: '', color: 'primary' });
const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

// Listener de usuários online
let unsubscribeUsers: Unsubscribe | null = null;
let unsubscribeMessages: Unsubscribe | null = null;

function getUserAvatar(user: User) {
  // Se for o usuário logado, prioriza o photoURL do auth
  if (user.uid === currentUser.value?.uid && currentUser.value?.photoURL) {
    return currentUser.value.photoURL;
  }
  return user.photoURL || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || user.displayName || 'User')}`;
}

function openPrivateChat(user: User) {
  if (!user.uid || user.uid === currentUser.value?.uid) return;
  // Exemplo: navega para rota de chat privado (ajuste conforme sua estrutura de rotas)
  router.push({ name: 'ChatPrivateView', params: { uid: user.uid } });
}

// Função para limpar mensagens antigas (mais de 24 horas)
const cleanOldMessages = async () => {
  try {
    // Calcular 24 horas atrás
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    // Buscar mensagens antigas
    const messagesRef = collection(db, 'chatMessages');
    const oldMessagesQuery = query(
      messagesRef, 
      where('timestamp', '<', twentyFourHoursAgo)
    );
    
    const querySnapshot = await getDocs(oldMessagesQuery);
    
    if (querySnapshot.empty) {
      return;
    }
    
    // Remover mensagens em lote
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref) as Promise<void>);
    });
    
    await Promise.all(deletePromises);
    
  } catch (error) {
    // Silenciosamente falha sem mostrar erro ao usuário
  }
};

// Configurar limpeza automática a cada 24 horas
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

const startAutoCleanup = () => {
  // Limpar interval anterior se existir
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  // Executar limpeza imediatamente
  cleanOldMessages();
  
  // Configurar para executar a cada 24 horas (86400000 ms)
  cleanupInterval = setInterval(() => {
    cleanOldMessages();
  }, 24 * 60 * 60 * 1000);
};

const stopAutoCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Listener de usuários online
onMounted(() => {
  // Iniciar limpeza automática de mensagens antigas
  startAutoCleanup();

  const usersCollectionRef = collection(db, 'usuarios');
  // SOLUÇÃO: Remover orderBy para evitar necessidade de índice composto
  // A consulta funciona sem orderBy e retorna os usuários corretos
  const q = query(usersCollectionRef, where('status', 'in', ['disponivel', 'treinando']), limit(100));

  unsubscribeUsers = onSnapshot(q, (snapshot) => {
    users.value = snapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) } as User));
    loadingUsers.value = false;
  }, (error) => {
    errorUsers.value = 'Erro ao buscar usuários: ' + (error as Error).message;
    loadingUsers.value = false;
  });

  // Listener de mensagens do grupo
  const messagesCollectionRef = collection(db, 'chatMessages');
  // Obter apenas as últimas mensagens (query desc + limit) e inverter para exibir asc
  const mq = query(messagesCollectionRef, orderBy('timestamp', 'desc'), limit(200));
  unsubscribeMessages = onSnapshot(mq, (snapshot) => {
    const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Message)).reverse();
    // Detecta nova mensagem recebida (não enviada pelo usuário atual)
    if (messages.value.length > 0 && newMessages.length > messages.value.length) {
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg.senderId !== currentUser.value?.uid) {
        snackbar.value = {
          show: true,
          text: `Nova mensagem de ${lastMsg.senderName || 'Usuário'}`,
          color: 'primary',
        };
      }
    }
    messages.value = newMessages;
    nextTick(() => {
      scrollToEnd();
    });
  });

  // Removido: Status é gerenciado globalmente pelo App.vue
});

onUnmounted(() => {
  // Parar limpeza automática
  stopAutoCleanup();
  
  if (unsubscribeUsers) unsubscribeUsers();
  if (unsubscribeMessages) unsubscribeMessages();
  // Removido: Status é gerenciado globalmente pelo App.vue
});

const sendMessage = async () => {
  if (newMessage.value.trim() === '' || !currentUser.value) return;
  await addDoc(collection(db, 'chatMessages'), {
    senderId: currentUser.value.uid,
    senderName: currentUser.value.displayName || 'Anônimo',
    senderPhotoURL: currentUser.value.photoURL || '',
    text: newMessage.value.trim(),
    timestamp: new Date(),
  });
  newMessage.value = '';
  nextTick(() => {
    scrollToEnd();
  });
};

const formatTime = (timestamp: any): string => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const scrollToEnd = () => {
  if (messagesEnd.value && typeof messagesEnd.value.scrollIntoView === 'function') {
    messagesEnd.value.scrollIntoView({ behavior: 'smooth' } as ScrollIntoViewOptions);
  }
};

// Função para detectar e formatar links no texto
const formatMessageText = (text?: string) => {
  if (!text) return '';
  
  // Regex para detectar URLs (http/https)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
  }).replace(/\n/g, '<br>');
};

// Função para verificar se a mensagem contém links
const hasLinks = (text?: string) => {
  if (!text) return false;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
};

// Função para copiar links da mensagem
const copyMessageLinks = async (text?: string) => {
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
/* Container base com transições suaves para troca de tema */
.chat-group-container--light {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

.chat-group-container--dark {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}

/* Card de usuários com tema adaptativo */
.users-card--light,
.users-card--dark {
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
}

/* Card de chat com tema adaptativo */
.chat-card--light,
.chat-card--dark {
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

/* Lista de usuários */
.user-list-item {
  border-radius: 8px;
  margin-bottom: 2px;
  transition: background 0.18s;
}

.user-list-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.user-avatar {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.20);
}

/* Área de mensagens */
.chat-messages {
  min-height: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: rgba(var(--v-theme-primary), 0.02);
  border-radius: 12px;
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
  transition: box-shadow 0.18s, transform 0.18s;
}

.my-message {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}

.other-message--light {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
}

.other-message--dark {
  background: rgba(var(--v-theme-surface-bright), 0.15) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.24) !important;
}

/* Estilos para links em mensagens */
.message-content :deep(.message-link) {
  color: rgb(var(--v-theme-primary)) !important;
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

.other-message--light :deep(.message-link),
.other-message--dark :deep(.message-link) {
  color: rgb(var(--v-theme-primary)) !important;
}

.other-message--light :deep(.message-link):hover,
.other-message--dark :deep(.message-link):hover {
  color: rgba(var(--v-theme-primary), 0.8) !important;
}

/* Barra de input do chat */
.chat-input-bar--light {
  background: rgba(var(--v-theme-surface-bright), 0.5);
  border-radius: 0 0 12px 12px;
}

.chat-input-bar--dark {
  background: rgba(var(--v-theme-surface-dim), 0.8);
  border-radius: 0 0 12px 12px;
}

.chat-input {
  border-radius: 8px;
}

/* Animações */
.animate-fade-in {
  animation: fadeInUp 0.7s cubic-bezier(.55,0,.1,1);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsividade */
@media (max-width: 900px) {
  .users-card--light, .users-card--dark,
  .chat-card--light, .chat-card--dark { 
    border-radius: 8px; 
  }
}

@media (max-width: 600px) {
  .chat-group-container--light,
  .chat-group-container--dark { 
    padding: 0 2px; 
  }
  .users-card--light, .users-card--dark,
  .chat-card--light, .chat-card--dark { 
    border-radius: 4px; 
  }
  .chat-messages { 
    min-height: 180px; 
    max-height: 220px; 
  }
}

.user-name-link:hover {
  text-decoration: underline;
  color: rgb(var(--v-theme-secondary));
}
</style>
