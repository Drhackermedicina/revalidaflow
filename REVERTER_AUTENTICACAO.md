# Guia para Reverter Desabilitação Temporária da Autenticação do Google

## Resumo do que foi modificado

A autenticação do Google foi temporariamente desabilitada para facilitar o desenvolvimento e testes. As modificações incluem:

1. **Adição de uma flag de controle** (`DISABLE_AUTH: true`) no arquivo de configuração do ambiente
2. **Modificação do router** para pular verificações de autenticação quando a flag está ativa
3. **Modificação do plugin de autenticação** para simular um usuário logado quando a flag está ativa

Essas mudanças permitem que o aplicativo funcione sem exigir login real do usuário, utilizando um usuário mock durante o desenvolvimento.

## Lista completa dos arquivos modificados

1. `src/config/environment.js` - Adicionada flag DISABLE_AUTH
2. `src/plugins/router/index.js` - Adicionada lógica para pular autenticação
3. `src/plugins/auth.js` - Adicionada simulação de usuário logado

## Código antes e depois das modificações

### 1. src/config/environment.js

**Antes (autenticação ativa):**
```javascript
// src/config/environment.js
// Configuração centralizada do ambiente
// ATENÇÃO: Defina todas as chaves no arquivo .env e nunca exponha chaves sensíveis aqui!

export const config = {
  // Backend Configuration
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
    simulationBackendUrl: import.meta.env.VITE_SIMULATION_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3001' : ''), // Adicionado
    timeout: 30000,
    retries: 3
  },

  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  },

  // Environment Info
  environment: {
    mode: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  }
}
```

**Depois (autenticação desabilitada):**
```javascript
// src/config/environment.js
// Configuração centralizada do ambiente
// ATENÇÃO: Defina todas as chaves no arquivo .env e nunca exponha chaves sensíveis aqui!

export const config = {
  // Backend Configuration
  backend: {
    url: import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
    simulationBackendUrl: import.meta.env.VITE_SIMULATION_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3001' : ''), // Adicionado
    timeout: 30000,
    retries: 3
  },

  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
  },

  // Environment Info
  environment: {
    mode: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    // TEMPORÁRIO: Flag para desabilitar autenticação durante desenvolvimento
    // TODO: Remover quando autenticação for reativada
    DISABLE_AUTH: true
  }
}
```

### 2. src/plugins/router/index.js

**Antes (autenticação ativa):**
```javascript
// Guarda de Navegação Global (Async)
router.beforeEach(async (to, from, next) => {
  await waitForAuth()
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!currentUser.value) {
      next('/login')
      return
    }
      const userDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid))
      const user = userDoc.data()
      // Checagem de cadastro completo: documento existe e campos obrigatórios preenchidos
      if (
        !userDoc.exists() ||
        !user?.aceitouTermos ||
        !user?.cpf ||
        !user?.nome ||
        !user?.sobrenome ||
        !user?.cidade ||
        !user?.paisOrigem
      ) {
        // Redirecione para /register se cadastro incompleto
        next('/register')
        return
      }
      // Bloqueio de acesso se trial expirou ou plano vencido
      const agora = new Date()
      if (
        user.plano === 'trial' &&
        new Date(user.trialExpiraEm) < agora
      ) {
        next('/pagamento')
        return
      }
      if (
        user.plano !== 'trial' &&
        user.planoExpiraEm &&
        new Date(user.planoExpiraEm) < agora
      ) {
        next('/pagamento')
        return
      }
  }
  next()
})
```

**Depois (autenticação desabilitada):**
```javascript
// Guarda de Navegação Global (Async)
router.beforeEach(async (to, from, next) => {
  // TEMPORÁRIO: Pular verificações de autenticação se DISABLE_AUTH estiver ativo
  // TODO: Remover quando autenticação for reativada
  if (config.environment.DISABLE_AUTH) {
    next()
    return
  }

  await waitForAuth()
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!currentUser.value) {
      next('/login')
      return
    }
      const userDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid))
      const user = userDoc.data()
      // Checagem de cadastro completo: documento existe e campos obrigatórios preenchidos
      if (
        !userDoc.exists() ||
        !user?.aceitouTermos ||
        !user?.cpf ||
        !user?.nome ||
        !user?.sobrenome ||
        !user?.cidade ||
        !user?.paisOrigem
      ) {
        // Redirecione para /register se cadastro incompleto
        next('/register')
        return
      }
      // Bloqueio de acesso se trial expirou ou plano vencido
      const agora = new Date()
      if (
        user.plano === 'trial' &&
        new Date(user.trialExpiraEm) < agora
      ) {
        next('/pagamento')
        return
      }
      if (
        user.plano !== 'trial' &&
        user.planoExpiraEm &&
        new Date(user.planoExpiraEm) < agora
      ) {
        next('/pagamento')
        return
      }
  }
  next()
})
```

### 3. src/plugins/auth.js

**Antes (autenticação ativa):**
```javascript
// Esta função inicializa o "ouvinte" do Firebase.
// Ela verifica se o usuário está logado ou não e atualiza a variável.
export const initAuthListener = () => {
  return new Promise(resolve => {
    onAuthStateChanged(firebaseAuth, user => {
      currentUser.value = user
      isAuthInitialized = true
      resolve()
    })
  })
}
```

**Depois (autenticação desabilitada):**
```javascript
// Esta função inicializa o "ouvinte" do Firebase.
// Ela verifica se o usuário está logado ou não e atualiza a variável.
export const initAuthListener = () => {
  return new Promise(resolve => {
    // TEMPORÁRIO: Simular usuário logado se DISABLE_AUTH estiver ativo
    // TODO: Remover quando autenticação for reativada
    if (config.environment.DISABLE_AUTH) {
      currentUser.value = {
        uid: 'mock-user-id',
        displayName: 'Usuário Mock',
        email: 'mock@example.com',
        emailVerified: true
      }
      isAuthInitialized = true
      resolve()
      return
    }

    onAuthStateChanged(firebaseAuth, user => {
      currentUser.value = user
      isAuthInitialized = true
      resolve()
    })
  })
}
```

## Passos detalhados para reversão

### Passo 1: Modificar a configuração do ambiente
1. Abra o arquivo `src/config/environment.js`
2. Localize a linha `DISABLE_AUTH: true`
3. Mude para `DISABLE_AUTH: false`

### Passo 2: Limpar comentários temporários (opcional, mas recomendado)
1. No arquivo `src/config/environment.js`, remova as linhas de comentário:
   ```javascript
   // TEMPORÁRIO: Flag para desabilitar autenticação durante desenvolvimento
   // TODO: Remover quando autenticação for reativada
   ```

2. No arquivo `src/plugins/router/index.js`, remova as linhas de comentário:
   ```javascript
   // TEMPORÁRIO: Pular verificações de autenticação se DISABLE_AUTH estiver ativo
   // TODO: Remover quando autenticação for reativada
   ```

3. No arquivo `src/plugins/auth.js`, remova as linhas de comentário:
   ```javascript
   // TEMPORÁRIO: Simular usuário logado se DISABLE_AUTH estiver ativo
   // TODO: Remover quando autenticação for reativada
   ```

### Passo 3: Verificar se a flag DISABLE_AUTH foi removida completamente (opcional)
Se você quiser remover completamente a flag DISABLE_AUTH (já que ela não será mais necessária), você pode:
1. Remover a linha `DISABLE_AUTH: false` do arquivo `src/config/environment.js`
2. Remover todas as referências a `config.environment.DISABLE_AUTH` nos arquivos `src/plugins/router/index.js` e `src/plugins/auth.js`

## Como testar se a reversão funcionou

### Teste 1: Verificar se o login é obrigatório
1. Reinicie o servidor de desenvolvimento (`npm run dev`)
2. Abra o aplicativo em um navegador
3. Tente acessar uma rota protegida (como `/app/dashboard`)
4. **Esperado:** Você deve ser redirecionado para a página de login (`/login`)

### Teste 2: Verificar se o login com Google funciona
1. Na página de login, clique no botão "Entrar com Google"
2. **Esperado:** Uma popup do Google deve abrir para autenticação
3. Complete o login com uma conta Google válida
4. **Esperado:** Você deve ser redirecionado para o dashboard após o login

### Teste 3: Verificar se o logout funciona
1. Faça login normalmente
2. Procure por uma opção de logout no aplicativo
3. Clique em logout
4. **Esperado:** Você deve ser redirecionado para a página de login

### Teste 4: Verificar proteção de rotas
1. Tente acessar diretamente uma URL protegida sem estar logado (ex: `http://localhost:3000/app/dashboard`)
2. **Esperado:** Você deve ser redirecionado para `/login`

## Possíveis problemas e soluções

### Problema: Erro "Firebase configuration is missing"
**Solução:** Verifique se todas as variáveis de ambiente do Firebase estão configuradas no arquivo `.env`:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

### Problema: Popup do Google não abre
**Solução:** Verifique se o domínio está na lista de domínios autorizados no Firebase Console > Authentication > Sign-in method > Google > Authorized domains

### Problema: Erro "auth/popup-blocked"
**Solução:** Certifique-se de que popups não estão bloqueadas no navegador. Desative bloqueadores de popup temporariamente para testar.

### Problema: Usuário não consegue completar cadastro após login
**Solução:** Verifique se o Firestore tem as regras corretas e se a coleção 'usuarios' existe. Verifique também se o usuário tem permissões para escrever no Firestore.

### Problema: Aplicação não carrega após reversão
**Solução:** Limpe o cache do navegador e reinicie o servidor de desenvolvimento. Verifique o console do navegador para erros.

## Instruções para limpeza dos comentários temporários

Como mencionado nos passos detalhados, após confirmar que a autenticação está funcionando corretamente, você pode remover os comentários temporários adicionados durante a desabilitação:

1. **src/config/environment.js**: Remova as linhas 29-31
2. **src/plugins/router/index.js**: Remova as linhas 34-35
3. **src/plugins/auth.js**: Remova as linhas 15-16

Estes comentários foram adicionados apenas para documentar a mudança temporária e podem ser removidos após a estabilização da autenticação.

---

**Nota:** Este documento foi gerado automaticamente baseado na análise do código. Certifique-se de testar todas as funcionalidades após reverter as mudanças para garantir que tudo funciona corretamente.