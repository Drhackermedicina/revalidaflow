# Análise da Árvore de Fontes - Revalida Flow

## Estrutura do Projeto

**Tipo de Repositório:** Multi-part (Frontend + Backend)
**Data da Análise:** 2025-11-23T22:17:01.461Z
**Nível de Scan:** Rápido (baseado em padrões)

## Visão Geral

O Revalida Flow é uma aplicação full-stack para estudantes de medicina focada em simulações de estações clínicas em tempo real. O projeto consiste em duas partes principais que se comunicam através de APIs REST.

---

## Parte 1: Frontend Web Vue.js

### Diretório Raiz: `src/`

#### 🏗️ Estrutura Principal
```
src/
├── @core/                    # Helpers UI do BMad
├── @layouts/                  # Layouts compartilhados
├── assets/                    # Recursos estáticos
├── components/                 # Componentes Vue reutilizáveis
├── composables/               # Lógica reativa de composição (Pinia)
├── config/                    # Configuração da aplicação
├── layouts/                    # Layouts Vue específicos
├── pages/                      # Páginas legadas (migradas)
├── plugins/                    # Plugins do Vite
├── repositories/               # Camada de dados
├── services/                   # Camada de serviços
├── stores/                     # Estado global (Pinia)
├── types/                      # Definições TypeScript
├── utils/                      # Utilitários compartilhados
├── views/                      # Views principais (telas atuais)
├── App.vue                    # Componente raiz da aplicação
└── main.js                   # Ponto de entrada da aplicação
```

#### 📋 Arquivos Chave Identificados
- **package.json** - Manifesto do projeto Vue.js
- **vite.config.js** - Configuração do build tool Vite
- **vue.config.js** - Configuração do Vue.js
- **main.js** - Ponto de entrada principal
- **jsconfig.json** - Configuração TypeScript

#### 🎯 Tecnologias Detectadas
- **Framework:** Vue.js 3.5.21
- **Linguagem:** JavaScript/TypeScript
- **Build Tool:** Vite
- **UI Library:** Vuetify
- **State Management:** Pinia
- **Database:** Firebase (cliente)
- **HTTP Client:** Axios

---

## Parte 2: Backend Node.js Express

### Diretório Raiz: `backend/`

#### 🏗️ Estrutura Principal
```
backend/
├── app/                      # Aplicação Express principal
├── config/                    # Configurações do backend
├── middleware/                 # Middlewares Express
├── routes/                     # Definições de rotas da API
├── services/                   # Lógica de negócio
├── src/                        # Código-fonte do backend
├── utils/                      # Utilitários do backend
├── cache.js                   # Sistema de cache
├── Dockerfile                  # Configuração Docker
├── server.js                  # Ponto de entrada do servidor
└── package.json              # Manifesto do backend
```

#### 📋 Arquivos Chave Identificados
- **package.json** - Manifesto Node.js do backend
- **server.js** - Servidor Express principal
- **Dockerfile** - Configuração Docker para deploy
- **.env.example** - Template de variáveis de ambiente

#### 🎯 Tecnologias Detectadas
- **Framework:** Express.js 4.18.2
- **Linguagem:** JavaScript
- **Database:** Firebase (Admin SDK)
- **Cloud Platform:** Google Cloud Platform
- **Authentication:** CORS, dotenv
- **HTTP Server:** Express
- **Additional:** Socket.io, Jest (testes)

---

## 📊 Padrões de Integração

#### Comunicação Frontend ↔ Backend
- **API REST:** O frontend se comunica com o backend através de APIs RESTful
- **Firebase:** Ambas as partes utilizam Firebase para autenticação e banco de dados
- **WebSocket:** Socket.io configurado para comunicação em tempo real

---

## 🚀 Padrões de Desenvolvimento e Deploy

#### Scripts Principais
```bash
# Frontend
npm run dev          # Desenvolvimento local
npm run dev:cloud     # Desenvolvimento em modo produção
npm run build          # Build para distribuição
npm run build:prod     # Build produção otimizado

# Backend
npm run dev:local     # Desenvolvimento local
npm run dev:cloud     # Desenvolvimento em modo produção
npm start              # Inicia servidor Express
npm run test           # Executa testes Jest
```

#### 📦 Configurações de Deploy
- **Docker:** Dockerfile disponível para containerização
- **Cloud Run:** Scripts específicos para deploy no Google Cloud Run
- **Firebase:** Configuração para deploy estático + Cloud Functions
- **CI/CD:** Possui estrutura para GitHub Actions

---

## 📈 Arquivos de Configuração Importantes

### Frontend
- **vite.config.js** - Configuração do Vite com plugins Vue e otimizações
- **.env.local** - Variáveis de ambiente locais (não versionado)
- **jsconfig.json** - Configuração TypeScript com aliases para imports limpas

### Backend
- **.env** - Variáveis de ambiente (não versionado)
- **firebase.json** - Configurações do projeto Firebase
- **firestore.rules** - Regras de segurança do Firestore
- **storage.rules** - Regras de segurança do Storage

---

## 🎯 Próximos Passos para Documentação Completa

Para uma documentação abrangente do Revalida Flow, recomendamos:

1. **Documentação de API** - Mapear todos os endpoints REST existentes
2. **Modelos de Dados** - Documentar schemas do Firebase e estruturas de dados
3. **Arquitetura de Componentes** - Catalogar componentes Vue reutilizáveis
4. **Guia de Desenvolvimento** - Documentar setup completo de ambiente
5. **Integração e Deploy** - Detalhar processos de CI/CD e deploy automatizado

---

*Última atualização:* 2025-11-23T22:17:01.461Z*