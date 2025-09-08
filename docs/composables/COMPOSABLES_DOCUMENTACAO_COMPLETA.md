# 🧠 COMPOSABLES DO PROJETO REVALIDAFLOW

Este documento fornece uma documentação detalhada de cada composable do projeto RevalidaFlow, explicando sua função, parâmetros, retorno e uso.

## 📁 Localização
Todos os composables estão localizados em: `src/composables/`

## 📋 Lista de Composables

### 1. `useAdminAuth.js`
**Função:** Verificação de permissões de administrador

**Descrição:** Verifica se o usuário logado tem permissões de administrador baseado em lista de UIDs autorizados.

**Importações:**
```javascript
import { currentUser } from '@/plugins/auth'
import { computed, ref, watch } from 'vue'
```

**Função Principal:**
```javascript
export function useAdminAuth()
```

**Retorno:**
```javascript
{
  isAdmin,           // Computed - true se usuário é admin (verifica UIDs)
  hasAdminRole,      // Computed - true se usuário tem role admin
  isAuthorizedAdmin, // Computed - isAdmin || hasAdminRole
  isLoading          // Ref - true enquanto verifica autenticação
}
```

**Detalhes de Implementação:**
- Lista de administradores definida por UIDs específicos
- Suporte para verificação por role futura
- Loading state para aguardar carregamento do usuário
- Watch para atualizar estado quando currentUser muda

**Uso:**
```javascript
import { useAdminAuth } from '@/composables/useAdminAuth'
const { isAuthorizedAdmin, isLoading } = useAdminAuth()
```

**Páginas que usam:** AdminResetUsers.vue, NavItems.vue

---

### 2. `useAppTheme.ts`
**Função:** Gerenciamento do tema da aplicação (claro/escuro)

**Descrição:** Controla o tema da interface e persiste a preferência do usuário.

**Importações:**
```typescript
import { computed } from 'vue'
import { useTheme } from 'vuetify'
```

**Função Principal:**
```typescript
export function useAppTheme()
```

**Retorno:**
```javascript
{
  theme,        // Objeto do tema Vuetify
  isDarkTheme   // Computed - true se tema escuro
}
```

**Uso:**
```javascript
import { useAppTheme } from '@/composables/useAppTheme'
const { theme, isDarkTheme } = useAppTheme()
```

**Páginas que usam:** dashboard.vue

---

### 3. `useAuth.js`
**Função:** Autenticação de usuários

**Descrição:** Fornece informações do usuário logado e nome de exibição.

**Importações:**
```javascript
import { currentUser } from '@/plugins/auth'
import { computed } from 'vue'
```

**Função Principal:**
```javascript
export function useAuth()
```

**Retorno:**
```javascript
{
  user,      // Computed - objeto do usuário atual
  userName   // Computed - nome do usuário ou 'Candidato'
}
```

**Uso:**
```javascript
import { useAuth } from '@/composables/useAuth'
const { user, userName } = useAuth()
```

**Páginas que usam:** dashboard.vue, questoes.vue

---

### 4. `useLoginAuth.js`
**Função:** Autenticação via Google

**Descrição:** Gerencia o processo de login com conta Google.

**Importações:**
```javascript
import { firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
```

**Função Principal:**
```javascript
export function useLoginAuth()
```

**Retorno:**
```javascript
{
  loading,         // Ref - true durante login
  error,           // Ref - mensagem de erro
  loginComGoogle   // Function - inicia login Google
}
```

**Funções Internas:**
- `loginComGoogle()` - Realiza autenticação com Google

**Uso:**
```javascript
import { useLoginAuth } from '@/composables/useLoginAuth'
const { loading, error, loginComGoogle } = useLoginAuth()
```

**Páginas que usam:** login.vue

---

### 5. `useRegister.js`
**Função:** Registro de novos usuários

**Descrição:** Gerencia o processo de registro de novos usuários no sistema.

**Importações:**
```javascript
import { aplicarMascaraCPF, validarCPF } from '@/@core/utils/cpf'
import { db, firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
```

**Função Principal:**
```javascript
export function useRegister()
```

**Retorno:**
```javascript
{
  loading,                // Ref - true durante registro
  error,                  // Ref - mensagem de erro
  usuarioGoogle,          // Ref - usuário do Google
  form,                   // Ref - formulário de registro
  loginComGoogle,         // Function - login com Google
  salvarUsuarioFirestore, // Function - salva dados no Firestore
  aplicarMascaraCPF       // Function - máscara para CPF
}
```

**Funções Internas:**
- `loginComGoogle()` - Login com conta Google
- `salvarUsuarioFirestore()` - Salva dados no Firestore
- `aplicarMascaraCPF()` - Aplica máscara de CPF

**Uso:**
```javascript
import { useRegister } from '@/composables/useRegister'
const { loading, error, loginComGoogle, salvarUsuarioFirestore } = useRegister()
```

**Páginas que usam:** register.vue

---

### 6. `useSimulationInvites.js`
**Função:** Gerenciamento de convites de simulação

**Descrição:** Cria e gerencia convites para simulações entre usuários.

**Importações:**
```javascript
import { ref } from 'vue'
import { db } from '@/plugins/firebase.js'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useNotificationStore } from '@/stores/notificationStore'
```

**Função Principal:**
```javascript
export function useSimulationInvites()
```

**Retorno:**
```javascript
{
  sendSimulationInvite,  // Function - envia convite
  isProcessingInvite     // Ref - true durante processamento
}
```

**Funções Internas:**
- `sendSimulationInvite()` - Envia convite via múltiplos canais
- `sendChatInvite()` - Envia mensagem especial no chat
- `saveInviteToFirebase()` - Salva convite persistente

**Parâmetros de sendSimulationInvite:**
```javascript
{
  candidateUid,      // UID do candidato
  candidateName,     // Nome do candidato
  inviteLink,        // Link do convite
  stationTitle,      // Título da estação
  duration,          // Duração (opcional, padrão 10)
  meetLink,          // Link do Google Meet (opcional)
  senderName,        // Nome do remetente
  senderUid          // UID do remetente
}
```

**Uso:**
```javascript
import { useSimulationInvites } from '@/composables/useSimulationInvites'
const { sendSimulationInvite, isProcessingInvite } = useSimulationInvites()
```

**Páginas que usam:** SimulationView.vue

---

### 7. `useSimulationSocket.ts`
**Função:** Conexão WebSocket para simulações

**Descrição:** Gerencia a conexão em tempo real durante simulações médicas.

**Importações:**
```typescript
import { io, Socket } from 'socket.io-client'
import { ref, onBeforeUnmount } from 'vue'
```

**Interface:**
```typescript
interface SimulationSocketOptions {
  backendUrl: string
  sessionId: string
  userId: string
  role: string
  stationId: string
  displayName?: string
}
```

**Função Principal:**
```typescript
export function useSimulationSocket(options: SimulationSocketOptions)
```

**Retorno:**
```javascript
{
  socket,              // Ref - instância do socket
  connectionStatus,    // Ref - status da conexão
  connect,             // Function - conecta ao socket
  disconnect           // Function - desconecta do socket
}
```

**Funções Internas:**
- `connect()` - Estabelece conexão WebSocket
- `disconnect()` - Encerra conexão WebSocket

**Uso:**
```typescript
import { useSimulationSocket } from '@/composables/useSimulationSocket'
const { socket, connectionStatus, connect, disconnect } = useSimulationSocket({
  backendUrl: 'http://localhost:3000',
  sessionId: 'sessao-123',
  userId: 'usuario-456',
  role: 'ator',
  stationId: 'estacao-789'
})
```

**Páginas que usam:** SimulationView.vue

## 🎯 Padrões de Implementação

### Estrutura Comum
```javascript
export function useNomeDoComposable(parametros) {
  // 1. Estado interno (refs, reactive)
  // 2. Computed properties
  // 3. Funções de negócio
  // 4. Watchers (se necessário)
  // 5. Cleanup (se necessário)
  // 6. Retorno dos valores/funções públicas
  
  return {
    // valores e funções exportados
  }
}
```

### Boas Práticas
1. **Reatividade:** Usar refs e computed do Vue
2. **Isolamento:** Cada composable deve ter responsabilidade única
3. **Tipagem:** Usar TypeScript quando possível
4. **Documentação:** Comentar funções complexas
5. **Testabilidade:** Facilitar testes unitários
6. **Limpeza:** Usar onBeforeUnmount para cleanup

## 🧪 Testabilidade

Cada composable foi projetado para ser facilmente testável:
- Dependências injetadas via imports
- Estado encapsulado
- Funções puras quando possível
- Retorno estruturado

## 🔄 Integrações

### Com Firebase
- `useAuth.js` → auth plugin
- `useRegister.js` → Firebase Auth + Firestore
- `useSimulationInvites.js` → Firestore

### Com WebSocket
- `useSimulationSocket.ts` → Socket.IO client

### Com Stores
- `useSimulationInvites.js` → notificationStore

## 📊 Resumo Técnico

| Composable | Função Principal | Tecnologias | Complexidade |
|------------|------------------|-------------|--------------|
| useAdminAuth.js | Verificação de admin | Vue, Firebase | Média |
| useAppTheme.ts | Gerenciamento de tema | Vue, Vuetify | Baixa |
| useAuth.js | Autenticação de usuário | Vue, Firebase | Baixa |
| useLoginAuth.js | Login com Google | Vue, Firebase | Média |
| useRegister.js | Registro de usuário | Vue, Firebase | Alta |
| useSimulationInvites.js | Convites de simulação | Vue, Firebase | Média |
| useSimulationSocket.ts | WebSocket para simulações | Vue, Socket.IO | Média |

Esta documentação serve como referência para desenvolvimento e manutenção dos composables do projeto.