# Modelo de Dados: userDescriptiveAnswers

## Visão Geral
A coleção `userDescriptiveAnswers` armazena o histórico de tentativas dos usuários em questões descritivas, incluindo a transcrição do áudio, feedback da IA e métricas relevantes.

## Estrutura do Documento

### Campos Principais
```json
{
  "id": "string", // ID único da tentativa (gerado automaticamente)
  "userId": "string", // UID do usuário autenticado
  "questionId": "string", // ID da questão descritiva respondida
  "transcription": "string", // Texto transcrito do áudio do usuário
  "feedback": "string", // Feedback estruturado gerado pela IA (texto completo)
  "score": "number", // Score de coerência extraído (0-10), null se não identificado
  "duration": "number", // Duração da resposta em segundos (opcional)
  "attemptNumber": "number", // Número da tentativa para esta questão (1, 2, 3...)
  "createdAt": "timestamp", // Data/hora da criação
  "updatedAt": "timestamp", // Data/hora da última atualização
  "metadata": {
    "aiModel": "string", // Modelo da IA usado (ex: "gemini-1.5-flash")
    "temperature": "number", // Temperatura usada na geração
    "maxTokens": "number", // Máximo de tokens configurado
    "processingTime": "number" // Tempo de processamento em ms (opcional)
  }
}
```

### Exemplo de Documento
```json
{
  "id": "attempt_1234567890",
  "userId": "KiSITAxXMAY5uU3bOPW5JMQPent2",
  "questionId": "exemplo-2025-1-pep-001",
  "transcription": "Paciente apresenta dor abdominal intensa no quadrante superior direito, com sinal de Murphy positivo. Suspeito de colecistite aguda. Solicitaria ultrassonografia abdominal e enzimas hepáticas.",
  "feedback": "### Pontos Fortes e Precisão\n- Identificou corretamente a localização da dor\n- Reconheceu o sinal de Murphy positivo\n\n### Pontos a Melhorar (Identificação de Gaps)\n- Não mencionou hipóteses diferenciais\n- Falta detalhar exames complementares\n\n### O Desafio Feynman (Clareza e Simplicidade)\nA explicação poderia ser mais estruturada e simples.\n\n### Score de Coerência e Estrutura (0 a 10)\n7",
  "score": 7,
  "duration": 45,
  "attemptNumber": 1,
  "createdAt": "2025-01-18T12:30:00.000Z",
  "updatedAt": "2025-01-18T12:30:00.000Z",
  "metadata": {
    "aiModel": "gemini-1.5-flash",
    "temperature": 0.7,
    "maxTokens": 2048,
    "processingTime": 2500
  }
}
```

## Regras de Segurança (Firestore Rules)

### Regras Propostas
```javascript
// === RESPOSTAS DESCRITIVAS DOS USUÁRIOS ===
match /userDescriptiveAnswers/{answerId} {
  // Usuários autenticados podem ler apenas seus próprios registros
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;

  // Usuários autenticados podem criar apenas registros para si mesmos
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;

  // Ninguém pode atualizar registros (imutabilidade para integridade do histórico)
  allow update: if false;

  // Ninguém pode deletar registros (preservação do histórico)
  allow delete: if false;
}

// === ACESSO ADMINISTRATIVO ===
match /userDescriptiveAnswers/{answerId} {
  // Administradores podem ler todos os registros para análise/analytics
  allow read: if request.auth != null && hasFullAccess();
}
```

### Justificativa das Regras
- **Leitura restrita**: Cada usuário vê apenas seu próprio histórico de respostas
- **Criação controlada**: Usuários só podem criar registros para si mesmos
- **Imutabilidade**: Registros não podem ser alterados ou deletados para manter integridade do histórico educacional
- **Acesso admin**: Administradores podem acessar todos os dados para análises e relatórios

## Considerações de Design

### Decisões Arquiteturais
1. **Não armazenamento de áudio**: Apenas transcrição é mantida para reduzir custos e complexidade
2. **Score extraído**: Campo numérico separado permite queries e analytics eficientes
3. **Múltiplas tentativas**: Campo `attemptNumber` permite rastrear progresso do usuário
4. **Imutabilidade**: Dados são write-once para garantir integridade do histórico

### Índices Recomendados (Firestore)
- `userId + createdAt` (desc): Histórico cronológico por usuário
- `questionId + attemptNumber` (desc): Últimas tentativas por questão
- `score`: Distribuição de scores para analytics

### Validações no Backend
- `userId`: Deve corresponder ao usuário autenticado
- `questionId`: Deve existir na coleção `descriptiveQuestions`
- `score`: Deve ser número entre 0-10 ou null
- `attemptNumber`: Deve ser incrementado automaticamente por usuário/questão

## Próximos Passos
1. Implementar a lógica de extração do score no serviço de avaliação
2. Atualizar o endpoint `/api/descriptive-questions/:id/evaluate` para persistir dados
3. Criar índices no Firestore
4. Atualizar regras de segurança no projeto