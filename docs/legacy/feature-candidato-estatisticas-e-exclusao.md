# Área do Candidato – Histórico de Estações (IA) e Exclusão do Sorteio Surpresa

Este documento descreve a implementação para:
- Salvar as estações treinadas por IA pelo usuário autenticado.
- Exibir essas estações nas estatísticas do usuário (“Área do Candidato”).
- Excluir do sorteio surpresa as estações já avaliadas pelo candidato.

## Visão Geral

- Escopo: Fluxo de simulação com IA (SimulationViewAI) e páginas da Área do Candidato.
- Persistência: Backend + Firestore (ou a fonte de dados já usada) para armazenar o histórico por usuário/estação.
- Critério de exclusão: estação considerada “já avaliada” quando houver avaliação concluída (manual ou IA) para aquela sessão/usuário.

## Objetivos

1. Registrar cada simulação com IA associando `userId`, `stationId`, `sessionId`, timestamps e status.
2. Quando avaliação for concluída, marcar o registro como `evaluated: true` e, opcionalmente, incluir resumo de pontuação.
3. Exibir na “Área do Candidato” um painel com:
   - Lista de estações concluídas/avaliadas (com data, pontuação, tempo, quantos impressos foram liberados).
   - Contadores agregados (total treinado, total avaliado, média de pontuação, etc.).
4. Atualizar o algoritmo de sorteio surpresa para ignorar estações com `evaluated: true` para o `userId` atual.

## Modelo de Dados (sugestão)

Coleção: `ai_training_sessions` (ou `user_station_history`)
- `userId: string`
- `stationId: string`
- `sessionId: string`
- `startedAt: ISO string`
- `endedAt: ISO string | null`
- `durationSec: number`
- `messages: number` (histórico de conversa)
- `materialsReleased: number`
- `evaluated: boolean` (default false)
- `evaluation`: { `totalScore?: number`, `detailsRef?: string`, `mode?: 'ia' | 'manual'` }
- `stationTitle?: string` (para exibição rápida)
- `period?: string` (ano/edição)

Observação: manter os dados essenciais localmente no documento para reduzir joins na UI. O payload completo de avaliação já é salvo em `avaliacoes_ai`; podemos referenciar por ID.

## Backend – Novos Endpoints

1. `POST /ai-chat/session-start`
   - Body: `{ stationId, stationTitle?, period?, sessionId }`
   - Auth: obrigatória (Firebase token).
   - Ação: cria/atualiza documento com `startedAt`, `evaluated: false`.

2. `POST /ai-chat/session-end`
   - Body: `{ stationId, sessionId, messages, materialsReleased, endedAt }`
   - Auth: obrigatória.
   - Ação: atualiza doc com métricas finais e `durationSec`.

3. `POST /ai-chat/session-evaluated`
   - Body: `{ stationId, sessionId, totalScore?, detailsRef?, mode }`
   - Auth: obrigatória.
   - Ação: marca `evaluated: true` e preenche `evaluation`.

4. (Opcional) `GET /ai-chat/user-history`
   - Query: `?limit=…`
   - Retorna as últimas N estações do usuário (para área do candidato).

Validação: todas as rotas usam `verifyAuth`/`optionalAuth` do projeto e conferem `req.user.uid`.

## Frontend – Pontos de Integração

1. `SimulationViewAI.vue`
   - Ao iniciar simulação (após `startSimulation()`/countdown): chamar `/ai-chat/session-start`.
   - Ao finalizar simulação (watch `simulationEnded`): chamar `/ai-chat/session-end` com métricas (mensagens, materiais liberados, duração, timestamps).
   - Ao concluir avaliação (quando `evaluationSubmittedByCandidate` ou retorno do `useAiEvaluation`): chamar `/ai-chat/session-evaluated` com score/refs.

2. “Área do Candidato” (view a identificar)
   - Consumir `GET /ai-chat/user-history` (ou consultar direto no Firestore) para exibir lista + métricas agregadas.
   - UI: tabela/lista com filtros por período e badges de status (concluída/avaliada).

## Exclusão do Sorteio Surpresa

- Onde aplicar: na função que seleciona/sorteia a próxima estação para o candidato (serviço/repositório responsável).
- Lógica: consultar histórico do usuário e filtrar estações cuja `evaluated === true` para o `userId` atual.
- Fallback: se todas as estações já foram avaliadas, escolher aleatória mas exibir aviso “todas já avaliadas”.

## Regras de Segurança e Firestore

- Firestore Security Rules: garantir que o usuário só consiga ler/escrever seus próprios documentos de `ai_training_sessions`.
- Backend valida token e `userId` para cada escrita.

## Telemetria e Observabilidade

- Logar criação/atualização de sessões no backend (chave: `userId+stationId+sessionId`).
- (Opcional) painel simples de admin/monitoramento com totais por período.

## Plano de Entrega

1. Backend – Criar rotas, validação de auth, integração com Firestore.
2. Frontend – Chamadas nos pontos do ciclo de vida da simulação; ajuste na “Área do Candidato”.
3. Seleção – Atualizar algoritmo do sorteio para excluir `evaluated: true`.
4. Testes – Unitários (serviços) e e2e simples para fluxo completo.
5. Documentação – Atualizar readme/setups específicos.

## Tarefas e Subtarefas

### A. Backend
- [ ] A1 Criar rota `POST /ai-chat/session-start` (auth + persistência).
- [ ] A2 Criar rota `POST /ai-chat/session-end` (auth + persistência de métricas).
- [ ] A3 Criar rota `POST /ai-chat/session-evaluated` (auth + marcação evaluated).
- [ ] A4 (Opcional) `GET /ai-chat/user-history` com paginação.
- [ ] A5 Regras Firestore e testes manuais com tokens válidos.

### B. Frontend – SimulationViewAI
- [ ] B1 Integrar `session-start` no início da simulação (após countdown).
- [ ] B2 Integrar `session-end` no watcher `simulationEnded` com métricas.
- [ ] B3 Integrar `session-evaluated` após conclusão da avaliação (IA/manual).
- [ ] B4 Tratar erros de rede sem interromper UX (log e retry leve).

### C. Área do Candidato
- [ ] C1 Criar/ajustar serviço para buscar histórico (via backend ou Firestore direto).
- [ ] C2 Implementar UI: tabela/lista + agregados (contadores e média).
- [ ] C3 Links para detalhes (ex.: abrir avaliação salva se aplicável).

### D. Sorteio Surpresa
- [ ] D1 Identificar o ponto de sorteio e injetar filtro por `evaluated: true` do usuário.
- [ ] D2 Caso sem candidatos restantes, fallback + aviso.

### E. Testes e Documentação
- [ ] E1 Testes unitários dos serviços frontend/backend (mock auth e Firestore).
- [ ] E2 Testes manuais ponta a ponta com um usuário de teste.
- [ ] E3 Atualizar documentação (README/guia da Área do Candidato/segurança).

## Edge Cases

- Usuário interrompe simulação sem terminar: manter `evaluated: false` com `endedAt` nulo.
- Usuário repete a mesma estação várias vezes: manter múltiplas sessões, mas só excluir do sorteio quando houver pelo menos uma `evaluated: true`.
- Alterações no conteúdo da estação: manter o vínculo por `stationId` (não por título).

---

> Após aprovação deste plano, implementaremos primeiro as rotas do backend e os ganchos no `SimulationViewAI.vue`, em seguida a UI da Área do Candidato e, por fim, o filtro do sorteio surpresa.
