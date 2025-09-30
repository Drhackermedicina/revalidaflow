# REVALIDAFLOW - Projeto de Simulação de Estações Clínicas

## Visão Geral do Projeto

REVALIDAFLOW é uma aplicação web completa desenvolvida para auxiliar estudantes de medicina na preparação para exames, com foco em simulações de estações clínicas em tempo real. É um monorepo que contém tanto o frontend quanto o backend do projeto:

- **Frontend**: Desenvolvido em Vue.js 3 com Vuetify como framework de UI
- **Backend**: Desenvolvido em Node.js (presumivelmente, localizado na pasta backend)

O objetivo principal é permitir que dois usuários interajam em um cenário simulado, onde um atua como ator/avaliador e o outro como candidato, com duração máxima de 10 minutos por estação.

## Tecnologias Utilizadas

### Frontend
- Vue.js 3 (Composition API)
- Vuetify 3 (framework UI baseado no Material Design)
- Vite (empacotador e servidor de desenvolvimento)
- Pinia (gerenciamento de estado)
- Vue Router (gerenciamento de rotas)
- Firebase (autenticação, banco de dados Firestore, armazenamento)
- Socket.io (comunicação em tempo real)
- Google AI Studio (integração com modelos Gemini para assistência de IA)
- ApexCharts (gráficos)
- TiPTap (editor de texto rico)

### Backend
- Node.js
- Express.js
- Google Cloud Functions/Firebase Functions
- Firebase Admin SDK

### Infraestrutura
- Firebase Hosting (hospedagem do frontend)
- Google Cloud Run (hospedagem do backend)
- Google Firestore (banco de dados NoSQL)
- Firebase Storage (armazenamento de arquivos)
- Firebase Authentication (autenticação de usuários)
- Ollama (para modelos de IA locais)
- Qdrant (banco de dados vetorial)

## Estrutura do Projeto

```
REVALIDAFLOW/
├── backend/                 # Backend (Node.js + Express)
│   ├── config/              # Configurações do backend
│   ├── docs/                # Documentação do backend
│   ├── routes/              # Rotas da API
│   ├── scripts/             # Scripts de deploy
│   ├── utils/               # Funções utilitárias
│   └── ...
├── config/                  # Configurações gerais do projeto
├── docs/                    # Documentação completa do projeto
├── public/                  # Arquivos públicos do frontend
├── scripts/                 # Scripts de desenvolvimento
├── src/                     # Código fonte do frontend (Vue.js)
│   ├── @core               # Componentes e utilitários principais
│   ├── @layouts            # Layouts da aplicação
│   ├── assets/             # Recursos estáticos (imagens, estilos)
│   ├── components/         # Componentes reutilizáveis
│   ├── composables/        # Funções reutilizáveis compostas
│   ├── config/             # Configurações do frontend
│   ├── layouts/            # Layouts específicos
│   ├── pages/              # Páginas da aplicação
│   ├── plugins/            # Plugins do Vue
│   ├── services/           # Serviços (ex: geminiService.js)
│   ├── stores/             # Stores do Pinia
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Funções utilitárias
│   ├── views/              # Views da aplicação
│   ├── App.vue             # Componente raiz
│   └── main.js             # Ponto de entrada da aplicação
├── tests/                   # Testes automatizados
├── .vscode/                 # Configurações do VS Code
├── docker-compose.yml       # Configuração de serviços Docker (Ollama, Qdrant)
├── package.json             # Dependências e scripts
└── README.md                # Documentação principal
```

## Funcionalidades Principais

### Simulação de Estações Clínicas
- Seleção de estações clínicas através de `@src/pages/StationList.vue`
- Modo de estudo para visualização apenas
- Geração de links de convite para iniciar simulações
- Interface diferenciada para ator/avaliador e candidato
- Limite de 10 minutos por estação

### Recursos Adicionais
- Ranking e performance dos usuários
- Histórico de simulações
- Banco de questões comentadas
- Sistema de chat
- Assistente de edição com IA (`@src/components/AIFieldAssistant.vue`)
- Upload de estações em formato JSON
- Painel de administração

## Configuração e Execução

### Pré-requisitos
- Node.js (versão 16 ou superior)
- npm (gerenciador de pacotes do Node.js)
- Firebase CLI

### Configuração Inicial
1. Instalar dependências do frontend: `npm install`
2. Instalar dependências do backend: `cd backend && npm install`
3. Configurar projeto Firebase com Firestore e Hosting
4. Fazer login no Firebase CLI: `firebase login`

### Execução
- Rodar frontend: `npm run dev` (disponível em http://localhost:5173)
- Rodar backend: `cd backend && npm start` (disponível em http://localhost:3000)
- Scripts personalizados em `scripts/` para execução simultânea

## Testes
- Testes automatizados usando Vitest
- Executar testes: `npm test`
- Testes específicos para serviços como `geminiService.test.js`

## Integração com IA
O projeto tem integração avançada com inteligência artificial, incluindo:
- Serviço Gemini (Google AI Studio) para assistência de IA
- Ollama para modelos locais de IA
- Sistema de cache para respostas offline
- Sanitização de dados para proteger informações de pacientes
- Assistente de agente IA global para administradores

## Desafios Atuais
- Custos elevados do backend na Cloud Run
- Inconsistência de dados nas estações clínicas no Firestore
- Necessidade de otimizar requisições durante simulações
- Integração pendente do chat Gemini diretamente na página
- Problemas de filtragem na página de administração

## Convenções de Desenvolvimento
- Uso de composables para lógica reutilizável
- Gerenciamento de estado com Pinia
- Componentes Vue reutilizáveis
- Integração com Firebase para autenticação e banco de dados
- Testes automatizados com Vitest
- Tipos de alias configurados no Vite (ex: @ para src/, @core para src/@core/)

O projeto oferece uma plataforma abrangente para simulação de estações clínicas com recursos de IA avançados e é particularmente útil para estudantes de medicina que se preparam para exames práticos.