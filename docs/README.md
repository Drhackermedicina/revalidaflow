# 📚 Documentação do REVALIDAFLOW

Bem-vindo à documentação técnica completa do REVALIDAFLOW!

Esta pasta contém toda a documentação viva do projeto, incluindo PRD (Product Requirements Document), tracking de features, changelog, guias técnicos, arquitetura e testes.

---

## 📖 Índice Rápido

- [📄 PRD e Documentação Viva](#-prd-e-documentacao-viva)
- [🔍 Análise e Code Review](#-analise-e-code-review)
- [🏗️ Arquitetura](#-arquitetura)
- [🧠 Composables](#-composables)
- [📘 Guias Técnicos](#-guias-tecnicos)
- [🧪 Testes](#-testes)
- [⚙️ Desenvolvimento](#-desenvolvimento)
- [📋 Templates](#-templates)
- [🛠️ Configurações](#-configuracoes)

---

## 📄 PRD e Documentação Viva

### Documentos Principais

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [PRD_REVALIDAFLOW.md](./PRD_REVALIDAFLOW.md) | Product Requirements Document completo (90+ páginas) | 🟢 Ativo |
| [FEATURES_TRACKING.md](./FEATURES_TRACKING.md) | Tracking de features implementadas vs planejadas (13 implementadas) | 🟢 Ativo |
| [CHANGELOG_PRD.md](./CHANGELOG_PRD.md) | Histórico de mudanças no PRD | 🟢 Ativo |
| [COMO_USAR_PRD_SYSTEM.md](./COMO_USAR_PRD_SYSTEM.md) | Guia completo de uso do sistema de documentação viva | 🟢 Ativo |
| [.prd-metadata.json](./.prd-metadata.json) | Metadados auto-gerados (contadores, versão, estatísticas) | 🤖 Auto |

**Estatísticas Atuais (2025-10-12):**
- 📄 Páginas: 28
- 🧩 Componentes: 44
- 🧠 Composables: 44
- 🔌 Services: 9
- 💾 Stores: 3
- 📊 Linhas de código (estimado): 16.600

---

## 🔍 Análise e Code Review

**Análise Completa de Código (2025-10-14)**: Auditoria técnica abrangente de todo o codebase.

### Executive Summaries

| Documento | Descrição | Score |
|-----------|-----------|-------|
| [analysis/BACKEND_EXECUTIVE_SUMMARY.md](./analysis/BACKEND_EXECUTIVE_SUMMARY.md) | Análise completa backend (14 arquivos, 4.500 LOC) | 🔴 3.5/10 |
| [analysis/FRONTEND_EXECUTIVE_SUMMARY.md](./analysis/FRONTEND_EXECUTIVE_SUMMARY.md) | Análise estratégica frontend (258 arquivos) | ⚠️ 7/10 |
| [MASTER_REFACTORING_TASKS.md](./MASTER_REFACTORING_TASKS.md) | Roadmap completo de refatoração (453.5h) | 📋 Task List |

### Principais Descobertas

**Backend (Production Readiness: 3/10)** 🔴:
- ❌ **P0 CRÍTICO**: Nenhuma autenticação em endpoints
- ❌ **P0 CRÍTICO**: Rate limiters não aplicados (apesar de configurados!)
- ❌ **P0 CRÍTICO**: Nomes de collections Firestore incorretos no cache
- ⚠️ **P0**: Sessions in-memory (não escalável)
- ⚠️ Arquivos com SQL em projeto Firestore (erro arquitetural)
- **Vulnerabilidade de custo**: $100-1000/dia se abusado
- **Débito técnico**: 237.5h (~6 semanas)

**Frontend (Production Readiness: 7/10)** ⚠️:
- ✅ **Excelente**: Composables bem organizados (40+)
- ✅ **Excelente**: Vue 3 Composition API patterns
- ✅ **Ótimo**: StationList refatorada 2300 → 530 linhas
- ⚠️ **P0**: UIDs de admin hardcoded (inseguro)
- ⚠️ **P1**: SimulationView.vue ainda com 1175 linhas
- ⚠️ **P1**: Cobertura de testes mínima (3 arquivos)
- **Débito técnico**: 216h (~5 semanas)

### Análises Individuais de Arquivos

**Backend**: `analysis/file-analysis/backend/`
- `server.js` (1275 linhas) - Socket.IO + Express
- `cache.js` (296 linhas) - Bug crítico de collections
- `aiChat.js` (1126 linhas) - AI sem autenticação
- `rateLimiter.js` - Excelente mas não usado
- E mais 10 arquivos analisados

**Frontend**: Análise estratégica focada em:
- SimulationView.vue (1175 linhas)
- StationList.vue (530 linhas)
- Padrões de composables
- Arquitetura Vue 3

### Roadmap de Refatoração

**Total**: 453.5 horas (~11.5 semanas para 1 dev)

**Sprint 1 (Semana 1)**: Segurança Crítica - 30h
- Implementar autenticação Firebase
- Aplicar rate limiters
- Corrigir nomes de collections no cache
- Remover UIDs hardcoded

**Sprints 2-3 (Semanas 2-3)**: Escalabilidade - 80h
- Migrar sessions para Firestore
- Implementar cache distribuído (Redis)
- Testar deploy multi-instância

**Sprints 4-5 (Semanas 4-5)**: Frontend & Testes - 80h
- Completar sistema de roles
- Cobertura de testes >70%
- Lógica de reconexão Socket.IO

**Sprints 6-8 (Semanas 6-8)**: Arquitetura - 120h
- Extrair handlers Socket.IO
- Dividir aiChat.js em serviços
- Extrair composables de SimulationView

**Sprints 9-10 (Semanas 9-10)**: Performance - 80h
- Otimização de bundle
- Pipeline de otimização de imagens
- Service worker PWA

### Quick Wins (Fazer Hoje)

```bash
# 1. Corrigir collections no cache (15 min)
# backend/cache.js: 'users' → 'usuarios', 'stations' → 'estacoes_clinicas'

# 2. Aplicar rate limiters (1 hora)
# backend/server.js: adicionar generalLimiter, aiLimiter

# 3. Remover arquivos não usados (20 min)
rm backend/config/firebase.js backend/routes/gemini.js

# 4. Logger de produção (2 horas)
# Criar src/utils/logger.js e substituir console.log
```

### Métricas de Sucesso

**Após Fase 1 (Security)**:
- [ ] Todos endpoints com autenticação
- [ ] Rate limiters ativos
- [ ] Zero hardcoded admin checks
- [ ] >50 testes passando

**Após Fase 3 (Scalability)**:
- [ ] Multi-instance deploy OK
- [ ] Cache distribuído
- [ ] Zero data loss em restart

**Após Fase 5 (Complete)**:
- [ ] Cobertura testes >70%
- [ ] Production readiness 9/10
- [ ] Bundle size <2MB
- [ ] Lighthouse >90

---

## 🏗️ Arquitetura

| Documento | Descrição |
|-----------|-----------|
| [architecture/ESTRUTURA_ATUAL.md](./architecture/ESTRUTURA_ATUAL.md) | Estrutura detalhada do projeto (frontend + backend) |
| [architecture/ESTRUTURA_ORGANIZADA.md](./architecture/ESTRUTURA_ORGANIZADA.md) | Nova organização planejada de pastas e arquivos |

**O que encontrar:**
- Visão geral das pastas `src/`, `backend/`, `tests/`
- Fluxo de funcionamento (autenticação, simulações, chat, admin)
- Componentes críticos e suas conexões
- Resumo técnico da stack

---

## 🧠 Composables

| Documento | Descrição |
|-----------|-----------|
| [composables/COMPOSABLES_DOCUMENTACAO.md](./composables/COMPOSABLES_DOCUMENTACAO.md) | Documentação resumida de cada composable (44 composables) |
| [composables/COMPOSABLES_DOCUMENTACAO_COMPLETA.md](./composables/COMPOSABLES_DOCUMENTACAO_COMPLETA.md) | Documentação completa com código fonte |

**Principais composables documentados:**
- `useAuth.js` - Autenticação
- `useSimulationSocket.ts` - WebSocket em tempo real
- `useSimulationInvites.js` - Convites de simulação
- `useAdminAuth.js` - Permissões de administrador
- E 40+ outros composables

---

## 📘 Guias Técnicos

| Documento | Descrição |
|-----------|-----------|
| [guides/PROJECT_OVERVIEW.md](./guides/PROJECT_OVERVIEW.md) | Visão geral completa do projeto REVALIDAFLOW |
| [guides/AGENTS.md](./guides/AGENTS.md) | Documentação sobre agentes AI |
| [guides/GEMINI.md](./guides/GEMINI.md) | Integração com Google Gemini AI |
| [guides/GEMINI_CHAT_SETUP.md](./guides/GEMINI_CHAT_SETUP.md) | Setup do chat Gemini |
| [guides/GEMINI_SERVICE_CHANGES.md](./guides/GEMINI_SERVICE_CHANGES.md) | Mudanças no serviço Gemini |
| [guides/AUTH_DEBUG_IMPROVEMENTS.md](./guides/AUTH_DEBUG_IMPROVEMENTS.md) | Melhorias de debug de autenticação |
| [guides/FRONTEND_NOTES.md](./guides/FRONTEND_NOTES.md) | Notas técnicas do frontend |
| [guides/PAYMENT_INTEGRATION.md](./guides/PAYMENT_INTEGRATION.md) | Integração de pagamentos (planejado) |
| [guides/PEP_MARKING_SYSTEM.md](./guides/PEP_MARKING_SYSTEM.md) | Sistema de marcação PEP |
| [guides/PEP_REFACTORING_SUMMARY.md](./guides/PEP_REFACTORING_SUMMARY.md) | Resumo da refatoração PEP |

---

## 🧪 Testes

| Documento | Descrição |
|-----------|-----------|
| [GUIA_TESTES.md](./GUIA_TESTES.md) | Guia completo de testes (Vitest + Playwright) |
| [testing/TESTES_GUIA_COMPLETO.md](./testing/TESTES_GUIA_COMPLETO.md) | Guia detalhado de testes com exemplos práticos |

**O que encontrar:**
- Como escrever testes unitários (Vitest)
- Como escrever testes E2E (Playwright)
- Exemplos práticos do RevalidaFlow
- Boas práticas e debugging
- Scripts de teste disponíveis

---

## ⚙️ Desenvolvimento

| Documento | Descrição |
|-----------|-----------|
| [development/DEVELOPMENT_HISTORY.md](./development/DEVELOPMENT_HISTORY.md) | Histórico de desenvolvimento do projeto |
| [development/SCRIPTS_DESENVOLVIMENTO.md](./development/SCRIPTS_DESENVOLVIMENTO.md) | Guia completo dos scripts disponíveis |

**Scripts principais:**
```bash
npm run dev                 # Servidor de desenvolvimento
npm run build              # Build para produção
npm run test               # Rodar testes
npm run update-prd         # Atualizar documentação
npm run backend:local      # Rodar backend local
```

---

## 📋 Templates

| Documento | Descrição |
|-----------|-----------|
| [templates/feature-template.md](./templates/feature-template.md) | Template completo para documentar novas features |

**Quando usar:**
- Ao implementar nova funcionalidade
- Ao planejar features futuras
- Para documentar decisões técnicas

---

## 🛠️ Configurações

| Documento | Descrição |
|-----------|-----------|
| [SENTRY_SETUP.md](./SENTRY_SETUP.md) | Configuração do Sentry para monitoramento de erros |
| [metodo de ensino prova descritiva.md](./metodo%20de%20ensino%20prova%20descritiva.md) | Metodologia de ensino para prova descritiva |

---

## 🚀 Como Usar Esta Documentação

### 1. Atualizar Documentação (Sistema Vivo)

#### Opção A: Script Automático (Recomendado)
```bash
npm run update-prd
```

#### Opção B: Comando Claude Code
```bash
/update-prd
```

#### Opção C: Git Hook Automático
O sistema detecta mudanças automaticamente ao fazer `git commit` e exibe lembretes para atualizar o PRD.

### 2. Criar Nova Feature

1. Copie `templates/feature-template.md`
2. Preencha todas as seções
3. Implemente a feature
4. Execute `npm run update-prd`
5. Atualize o `CHANGELOG_PRD.md`

### 3. Buscar Informação

**Por categoria:**
- Dúvida sobre estrutura do projeto → `architecture/`
- Entender um composable → `composables/`
- Como testar algo → `testing/` ou `GUIA_TESTES.md`
- Setup de integração → `guides/`

**Por funcionalidade:**
- Use Ctrl+F neste README para buscar keywords
- Consulte o índice de cada documento

---

## 📊 Status do Projeto

**Versão do PRD:** 1.0.0
**Última atualização:** 2025-10-14
**Features implementadas:** 13/13 (100%)
**Features planejadas Q1 2025:** 12

**Stack Tecnológico:**
- Frontend: Vue.js 3 + Vuetify 3 + Pinia
- Backend: Node.js + Express + Socket.IO
- Database: Google Firestore
- AI: Google Gemini
- Hosting: Firebase + Google Cloud Run

**Production Readiness:**
- Backend: 🔴 3.5/10 (Necessário Sprint 1 de segurança)
- Frontend: ⚠️ 7/10 (Funcional, precisa otimização)
- Overall: ⚠️ 5/10 (Ver análise completa em `analysis/`)

---

## 🤝 Contribuindo

Ao adicionar/modificar funcionalidades:

1. ✅ Atualize a documentação relevante
2. ✅ Execute `npm run update-prd` para atualizar contadores
3. ✅ Adicione entrada no `CHANGELOG_PRD.md`
4. ✅ Escreva/atualize testes
5. ✅ Revise `FEATURES_TRACKING.md` se aplicável

---

## 📞 Suporte

Dúvidas sobre a documentação? Consulte:
- [COMO_USAR_PRD_SYSTEM.md](./COMO_USAR_PRD_SYSTEM.md) para detalhes do sistema de documentação
- [guides/PROJECT_OVERVIEW.md](./guides/PROJECT_OVERVIEW.md) para visão geral completa

---

**Última sincronização:** 2025-10-14
**Documentos totais:** 30+ arquivos
**Sistema de documentação:** ✅ Ativo e funcionando
**Análise de código:** ✅ Completa (Backend + Frontend + Master Task List)
