# 📁 ESTRUTURA DO PROJETO REVALIDAFLOW

Este documento fornece uma visão detalhada da estrutura atual do projeto RevalidaFlow, incluindo a organização de pastas, arquivos principais e a função de cada componente.

## 📂 Nova Estrutura Organizada

Para informações sobre a organização geral das pastas, veja `docs/ESTRUTURA_ORGANIZADA.md`.

## 🗺️ Visão Geral da Estrutura Atual

```
REVALIDAFLOW/
├── backend/                 # Backend (Node.js + Express)
│   ├── config/              # Configurações do backend
│   ├── docs/                # Documentação do backend
│   ├── routes/              # Rotas da API
│   ├── scripts/             # Scripts de deploy
│   ├── utils/               # Funções utilitárias
│   └── ...                  # Outros arquivos do backend
├── config/                  # Configurações gerais do projeto
├── docs/                    # Documentação completa do projeto
├── public/                  # Arquivos públicos do frontend
├── scripts/                 # Scripts de desenvolvimento
├── src/                     # Código fonte do frontend (Vue.js)
├── tests/                   # Testes automatizados
├── .roo/                    # Regras para agentes AI
├── .vscode/                 # Configurações do VS Code
├── auto-imports.d.ts        # Tipos auto-gerados
├── components.d.ts          # Tipos de componentes
├── index.html               # Ponto de entrada HTML
├── package-lock.json        # Bloqueio de versões
├── package.json             # Dependências e scripts
└── README.md                # Documentação principal
```
│   ├── @layouts/            # Layouts da aplicação
│   ├── assets/              # Imagens, estilos e recursos
│   ├── components/          # Componentes reutilizáveis
│   ├── composables/         # Funções reutilizáveis (lógica)
│   ├── config/              # Configurações da aplicação
│   ├── layouts/             # Estruturas de layout
│   ├── pages/               # Páginas da aplicação
│   ├── plugins/             # Configurações de bibliotecas
│   ├── services/            # Conexão com APIs e serviços
│   ├── stores/              # Gerenciamento de estado (Pinia)
│   ├── utils/               # Funções utilitárias
│   └── views/               # Views da aplicação
├── tests/                   # Testes automatizados
├── public/                  # Arquivos públicos
└── Arquivos de configuração e scripts
```

## 🎯 Estrutura Detalhada

### 📁 `backend/` - Backend (Node.js + Express)

**Função:** Gerencia a lógica do servidor, conexões em tempo real e APIs.

**Arquivos principais:**
- `server.js` - Servidor principal
- `cache.js` - Sistema de cache otimizado
- `routes/` - Rotas da API
- `test-server.js` - Servidor de teste

**Tecnologias:**
- Node.js
- Express
- Socket.IO
- Firebase Admin

### 📁 `src/` - Frontend (Vue.js)

#### 📁 `@core/` e `@layouts/`
**Função:** Componentes e layouts base do template Materio Vue

#### 📁 `assets/`
**Função:** Recursos estáticos da aplicação
- Imagens
- Estilos CSS/SCSS
- Fontes

#### 📁 `components/`
**Função:** Componentes reutilizáveis da interface

**Componentes importantes:**
- `AIFieldAssistant.vue` - Assistente de IA para campos de texto
- `TiptapEditor.vue` - Editor de texto rico
- `GlobalLoader.vue` - Carregador global
- `ChatNotificationFloat.vue` - Notificações de chat

#### 📁 `composables/`
**Função:** Funções reutilizáveis de lógica de negócio (Reactivo)

**Documentação detalhada:** Veja `COMPOSABLES_DOCUMENTACAO.md` para detalhes completos de cada composable.

**Composables principais:**
1. `useAdminAuth.js` - Verificação de permissões de administrador
2. `useAppTheme.ts` - Gerenciamento do tema da aplicação
3. `useAuth.js` - Autenticação de usuários
4. `useLoginAuth.js` - Autenticação via Google
5. `useRegister.js` - Registro de novos usuários
6. `useSimulationInvites.js` - Gerenciamento de convites de simulação
7. `useSimulationSocket.ts` - Conexão WebSocket para simulações

#### 📁 `config/`
**Função:** Configurações da aplicação
- `environment.js` - Variáveis de ambiente

#### 📁 `layouts/`
**Função:** Estruturas de layout da aplicação
- Layout padrão
- Layout em branco (para login/registro)

#### 📁 `pages/`
**Função:** Páginas principais da aplicação

**Páginas importantes:**
- `login.vue` e `register.vue` - Autenticação
- `dashboard.vue` - Painel principal
- `SimulationView.vue` - Simulação médica (parte principal)
- `EditStationView.vue` - Edição de estações
- `AdminView.vue` - Painel administrativo
- `ChatPrivateView.vue` - Chat privado
- `StationList.vue` - Lista de estações

#### 📁 `plugins/`
**Função:** Configurações de bibliotecas externas

**Plugins principais:**
- `firebase.js` - Configuração do Firebase
- `auth.js` - Sistema de autenticação
- `pinia.js` - Gerenciamento de estado
- `socket.js` - Conexão WebSocket
- `router/` - Sistema de rotas

#### 📁 `services/`
**Função:** Conexão com APIs e inteligência artificial

**Services principais:**
1. `geminiService.js` - Integração com Google Gemini AI
2. `memoryService.js` - Gerenciamento de memórias de simulação
3. `stationEvaluationService.js` - Avaliação de estações
4. `adminAgentService.js` - Funções administrativas
5. `aiGuidelines.js` - Diretrizes para IA
6. `agentAssistantService.js` - Serviços do assistente AI

#### 📁 `stores/`
**Função:** Gerenciamento de estado global (Pinia)

**Stores principais:**
1. `userStore.js` - Informações do usuário logado
2. `notificationStore.js` - Notificações do sistema
3. `privateChatStore.js` - Estado do chat privado

#### 📁 `utils/`
**Função:** Funções utilitárias

**Utils importantes:**
- `simulationUtils.ts` - Funções para formatação de simulações
- `backendUrl.js` - Configuração da URL do backend
- `cacheManager.js` - Gerenciamento de cache local

### 📁 `tests/`
**Função:** Testes automatizados

**Estrutura:**
- `unit/` - Testes unitários
- `integration/` - Testes de integração
- `e2e/` - Testes end-to-end

### 📁 `public/`
**Função:** Arquivos públicos servidos diretamente

## 🔌 Fluxo de Funcionamento

### 1. **Autenticação**
```
Login/Registro → useLoginAuth/useRegister → Firebase Auth → useAuth → UserStore
```

### 2. **Simulações**
```
StationList → SimulationView → useSimulationSocket → WebSocket (backend) → Socket.IO
```

### 3. **Administração**
```
AdminView → useAdminAuth → AdminAgentService → Firebase/Firestore
```

### 4. **Chat**
```
ChatPrivateView → PrivateChatStore → useWebSocket → Socket.IO (backend)
```

## 🛠️ Scripts Disponíveis

### Desenvolvimento
- `iniciar-dev.bat` - Inicia frontend e backend
- `menu-dev.bat` - Menu interativo de desenvolvimento
- `rodar-testes.bat` - Executa testes automatizados

### Deploy
- `npm run build` - Compila para produção
- `npm run firebase:deploy` - Deploy no Firebase

## 🎯 Componentes Críticos

### `SimulationView.vue`
**Função:** Página principal de simulações
**Importância:** Core da aplicação
**Conexões:** WebSocket, Firebase, Services de IA

### `useSimulationSocket.ts`
**Função:** Gerencia conexão em tempo real
**Importância:** Essencial para simulações
**Tecnologia:** Socket.IO

### `geminiService.js`
**Função:** Integração com IA do Google
**Importância:** Diferencial competitivo
**Recursos:** Geração de conteúdo, correção, sugestões

## 📊 Resumo Técnico

**Frontend:**
- Framework: Vue 3 + Composition API
- UI: Vuetify 3
- State Management: Pinia
- Routing: Vue Router
- Build Tool: Vite

**Backend:**
- Runtime: Node.js
- Framework: Express
- Real-time: Socket.IO
- Database: Firebase/Firestore

**Testes:**
- Framework: Vitest
- Environment: JSDOM
- Coverage: Istanbul

Esta estrutura suporta uma aplicação complexa de simulações médicas com:
- Autenticação segura
- Comunicação em tempo real
- Integração com IA
- Gerenciamento de conteúdo
- Sistema de administração