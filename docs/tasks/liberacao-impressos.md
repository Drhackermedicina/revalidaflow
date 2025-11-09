# Plano de Tarefas – Ajustes na Liberação de Impressos

> **Importante:** só atualizar o status quando o usuário autorizar. Até lá, os itens permanecem pendentes.

## Visão Geral

- **Objetivo**: garantir que impressos sejam liberados apenas quando o candidato mencionar o título (ou parte literal dele) e documentar o processo.
- **Responsável**: _(preencher quando houver designação)_

## Tarefas

### 1. Documentação e Planejamento
- [ ] 1.1 Revisar e validar o documento `docs/impressos-liberacao-propostas.md`.
- [ ] 1.2 Receber feedback do usuário sobre as propostas (1, 2, 3 e 5).

### 2. Implementação da Proposta 1 (Frontend)
- [ ] 2.1 Ajustar `useAiChat` para matching apenas pelo título (ignorando palavras genéricas).
- [ ] 2.2 Atualizar a resposta automática para “\<Título> liberado”.
- [ ] 2.3 Testar manualmente com diferentes frases (com e sem o título).
- [ ] 2.4 Registrar evidências (logs, prints ou descrição dos testes).

### 3. Avaliação Backend (Proposta 2)
- [ ] 3.1 Decidir se a lógica migrará para `/ai-chat/chat`.
- [ ] 3.2 Mapear alterações necessárias no backend (rotas, payloads, logs).
- [ ] 3.3 Estimar esforço/custos antes de iniciar qualquer implementação.

### 4. Slugs e Matching Canônico (Proposta 3)
- [ ] 4.1 Definir formato de slug e como será armazenado (Firestore ou derivado no backend).
- [ ] 4.2 Planejar migração dos impressos existentes.
- [ ] 4.3 Atualizar a lógica de matching para usar slugs (quando aprovado).

### 5. Documentação e Testes (Proposta 5)
- [ ] 5.1 Criar guia “Como nomear impressos para a IA”.
- [ ] 5.2 Adicionar testes unitários para o matching.
- [ ] 5.3 Incorporar testes no pipeline (Vitest ou similar).

---

_Atualize cada item apenas quando o usuário solicitar. Este arquivo serve como checklist oficial das ações relacionadas à liberação de impressos._
