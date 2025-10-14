# Plano de Trabalho Autônomo

## Etapa 1 — Diagnóstico
- [x] Mapear fluxo atual do modo sequencial (frontend e backend)
- [x] Identificar pontos críticos causadores de desconexão (sessionId, sockets, navegação)

## Etapa 2 — Refatoração
- [x] Padronizar uso de um `sessionId` compartilhado em toda a sequência
- [x] Ajustar navegação sequencial no frontend para reaproveitar a sessão
- [x] Atualizar backend para propagar `sessionId` correto nos eventos Socket.IO
- [x] Simplificar conexão WebSocket removendo duplicidades

## Etapa 3 — Validação
- [ ] Executar testes manuais (ator + candidato) cobrindo avanço sequencial
- [ ] Rodar `npm run build` e checagens relevantes
- [ ] Registrar resultados e próximos passos
