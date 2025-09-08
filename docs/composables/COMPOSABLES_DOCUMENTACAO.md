# 🧠 COMPOSABLES DO PROJETO

Este documento documenta cada composable do projeto RevalidaFlow, explicando sua função, parâmetros e retorno.

Para uma documentação mais completa e detalhada, consulte `docs/COMPOSABLES_DOCUMENTACAO_COMPLETA.md`.

## 📁 Localização
Todos os composables estão localizados em: `src/composables/`

## 📋 Lista de Composables

### 1. `useAdminAuth.js`
**Função:** Verificação de permissões de administrador

**Descrição:** Verifica se o usuário logado tem permissões de administrador baseado em lista de UIDs autorizados.

**Retorno:**
```javascript
{
  isAdmin,           // Computed - true se usuário é admin
  hasAdminRole,      // Computed - true se usuário tem role admin
  isAuthorizedAdmin, // Computed - isAdmin || hasAdminRole
  isLoading          // Ref - true enquanto verifica autenticação
}
```

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

**Retorno:**
```javascript
{
  theme,        // Ref - objeto do tema Vuetify
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

**Retorno:**
```javascript
{
  loading,         // Ref - true durante login
  error,           // Ref - mensagem de erro
  loginComGoogle   // Function - inicia login Google
}
```

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

**Retorno:**
```javascript
{
  loading,                // Ref - true durante registro
  error,                  // Ref - mensagem de erro
  registerUser,           // Function - registra novo usuário
  updateUserData,         // Function - atualiza dados do usuário
  saveUserDataToFirestore // Function - salva dados no Firestore
}
```

**Uso:**
```javascript
import { useRegister } from '@/composables/useRegister'
const { loading, error, registerUser } = useRegister()
```

**Páginas que usam:** register.vue

---

### 6. `useSimulationInvites.js`
**Função:** Gerenciamento de convites de simulação

**Descrição:** Cria e gerencia convites para simulações entre usuários.

**Retorno:**
```javascript
{
  createSimulationInvite,  // Function - cria convite
  sendSimulationInvite,     // Function - envia convite
  acceptInvite,            // Function - aceita convite
  rejectInvite             // Function - rejeita convite
}
```

**Uso:**
```javascript
import { useSimulationInvites } from '@/composables/useSimulationInvites'
const { sendSimulationInvite } = useSimulationInvites()
```

**Páginas que usam:** SimulationView.vue

---

### 7. `useSimulationSocket.ts`
**Função:** Conexão WebSocket para simulações

**Descrição:** Gerencia a conexão em tempo real durante simulações médicas.

**Parâmetros:**
```typescript
interface SimulationSocketOptions {
  stationId: string
  sessionId: string
  userRole: 'ator' | 'candidato'
  currentUser: any
}
```

**Retorno:**
```javascript
{
  socket,              // Ref - instância do socket
  isConnected,         // Computed - true se conectado
  connect,             // Function - conecta ao socket
  disconnect,          // Function - desconecta do socket
  emit,                // Function - emite eventos
  on,                  // Function - escuta eventos
  // Eventos específicos de simulação
  onConnect,
  onDisconnect,
  onPartnerJoined,
  onPartnerLeft,
  onSimulationStart,
  onTimerUpdate,
  onTimerEnd,
  // ... e muitos outros eventos
}
```

**Uso:**
```javascript
import { useSimulationSocket } from '@/composables/useSimulationSocket'
const socketApi = useSimulationSocket({
  stationId: 'estacao-123',
  sessionId: 'sessao-456',
  userRole: 'ator',
  currentUser: user.value
})
```

**Páginas que usam:** SimulationView.vue

---

## 🎯 Padrões de Implementação

### Estrutura Comum
```javascript
export function useNomeDoComposable(parametros) {
  // 1. Estado interno (refs, reactive)
  // 2. Computed properties
  // 3. Funções de negócio
  // 4. Watchers (se necessário)
  // 5. Retorno dos valores/funções públicas
  
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

### Com WebSocket
- `useSimulationSocket.ts` → Socket.IO client

### Com Stores
- Vários composables interagem com Pinia stores

Para documentação completa de cada composable, incluindo código fonte e implementação detalhada, consulte `docs/COMPOSABLES_DOCUMENTACAO_COMPLETA.md`.

Esta documentação serve como referência para desenvolvimento e manutenção dos composables do projeto.