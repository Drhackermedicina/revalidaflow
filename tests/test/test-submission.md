# Teste de Submissão de Avaliação - Candidato

## Checklist de Teste

### 1. Preparação
- [ ] Iniciar o backend local: `cd backend && npm start`
- [ ] Iniciar o frontend: `npm run dev`
- [ ] Abrir dois navegadores (um para avaliador, outro para candidato)

### 2. Como Avaliador/Ator
- [ ] Acessar a lista de estações
- [ ] Selecionar um candidato (se necessário)
- [ ] Escolher uma estação
- [ ] Gerar link de convite
- [ ] Copiar o link

### 3. Como Candidato
- [ ] Abrir o link de convite em outro navegador
- [ ] Clicar em "Estou Pronto"
- [ ] Aguardar o avaliador clicar em "Estou Pronto"
- [ ] Aguardar início da simulação

### 4. Durante a Simulação
**Avaliador:**
- [ ] Liberar impressos (se houver)
- [ ] Aguardar fim da simulação
- [ ] Liberar o PEP
- [ ] Atribuir notas

**Candidato:**
- [ ] Visualizar impressos liberados
- [ ] Aguardar fim da simulação
- [ ] Visualizar o PEP quando liberado
- [ ] Verificar notas recebidas

### 5. Submissão Final (APENAS CANDIDATO)
- [ ] Verificar que o botão "Submeter Avaliação Final" aparece apenas para o candidato
- [ ] Clicar em "Submeter Avaliação Final"
- [ ] Verificar notificação de sucesso
- [ ] Verificar que o botão desaparece após submissão

### 6. Verificação no Console (F12)

**Console do Candidato deve mostrar:**
```
[DEBUG] submitEvaluation: Iniciando submissão
[DEBUG] submitEvaluation: userRole = candidate
[DEBUG] submitEvaluation: socket.connected = true
[DEBUG] submitEvaluation: Emitindo CANDIDATE_SUBMIT_EVALUATION
[DEBUG] submitEvaluation: Evento emitido com sucesso
[SUBMIT] Confirmação recebida do servidor
```

**Console do Avaliador deve mostrar:**
```
[SUBMIT] Candidato submeteu avaliação: {candidateId: ..., totalScore: ...}
```

### 7. Verificação no Backend
O terminal do backend deve mostrar:
```
[SUBMIT] Candidato xxx submeteu avaliação para estação yyy
[SUBMIT] Total Score: z.zz
[SUBMIT] Notificado avaliador sobre submissão
```

## Problemas Resolvidos
✅ Warnings "computed value is readonly" - Não devem mais aparecer
✅ Erro "Não foi possível submeter avaliação" - Deve funcionar corretamente
✅ Botão de submissão só aparece para candidato
✅ Sincronização correta entre frontend e backend
✅ Notificações funcionando para ambas as partes

## Logs de Debug
Se encontrar problemas, verifique:
1. Console do navegador (F12)
2. Terminal do backend
3. Network tab para ver as mensagens WebSocket