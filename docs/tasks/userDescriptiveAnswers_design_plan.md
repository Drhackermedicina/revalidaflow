# Plano de Design: userDescriptiveAnswers

## Status da Tarefa
✅ **Concluído**: Design da coleção userDescriptiveAnswers no Firestore

## Resumo do Modelo de Dados
- **Coleção**: `userDescriptiveAnswers`
- **Propósito**: Armazenar histórico de tentativas em questões descritivas
- **Campos principais**: userId, questionId, transcription, feedback, score, duration, attemptNumber
- **Segurança**: Usuários lêem apenas seus dados; admins têm acesso total; registros são imutáveis

## Regras de Segurança Propostas
Como o modo Architect não permite edição direta de `firestore.rules`, as regras foram documentadas em `docs/data-models/userDescriptiveAnswers.md`. Elas seguem o padrão do projeto:
- Leitura restrita aos próprios registros
- Criação apenas para si mesmo
- Imutabilidade (sem update/delete)
- Acesso admin para analytics

## Arquivos Criados/Modificados
- ✅ `docs/data-models/userDescriptiveAnswers.md` - Documentação completa do modelo

## Próximos Passos (Implementação)
1. Atualizar `firestore.rules` com as novas regras de segurança
2. Implementar extração do score no serviço `geminiEvaluationService.js`
3. Modificar endpoint `/api/descriptive-questions/:id/evaluate` para persistir dados
4. Criar índices no Firestore para queries eficientes
5. Testar integração completa

## Decisões de Design
- **Sem armazenamento de áudio**: Apenas transcrição para reduzir custos
- **Score extraído**: Campo numérico separado para analytics
- **Múltiplas tentativas**: Campo attemptNumber para rastrear progresso
- **Imutabilidade**: Dados write-once para integridade histórica

O design está completo e pronto para implementação. Você aprova este modelo de dados?