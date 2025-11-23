# 🔌 API Endpoints Documentation - REVALIDAFLOW

## 📊 Resumo Executivo

Documentação completa dos endpoints de API do backend REVALIDAFLOW.

**Data da Análise**: 2025-11-23
**Total de Endpoints**: 25+ endpoints
**Categorias Principais**: 5 categorias funcionais
**Stack**: Node.js + Express + Firebase + Socket.IO

---

## 🗂️ Estrutura de API

### **Categorias de Endpoints**
1. **Chat com IA** - Comunicação com paciente virtual
2. **Simulação Médica** - Controle de simulações clínicas
3. **Transcrição de Áudio** - Processamento de áudio para texto
4. **Questões Descritivas** - Sistema de avaliação descritiva
5. **Controle de Acesso** - Autenticação e assinaturas

---

## 🤖 Chat com IA (aiChat.js)

### **Endpoints Principais**

#### **POST /ai-chat/chat**
Comunicação com paciente virtual via Gemini AI.

```javascript
// Request
{
  "message": "Paciente está queixando de dor torácica",
  "stationData": {
    "titulo": "Emergência Cardiológica",
    "roteiroAtor": "...",
    "padraoEsperadoProcedimento": {...},
    "materiaisDisponiveis": {...}
  },
  "conversationHistory": [...],
  "sessionId": "session_123"
}

// Response
{
  "response": "Entendi. Pode me descrever melhor a dor?",
  "releasedMaterial": null,
  "metadata": {
    "model": "gemini-pro",
    "responseTime": 1.2,
    "tokensUsed": 45
  }
}
```

#### **POST /ai-chat/evaluate-pep**
Avaliação automática do PEP (Padrão Esperado de Procedimento).

```javascript
// Request
{
  "stationData": {...},
  "checklistData": {
    "itensAvaliacao": [...]
  },
  "conversationHistory": [...],
  "sessionId": "session_123"
}

// Response
{
  "evaluation": {
    "score": 85,
    "feedback": "Boa avaliação, mas poderia...",
    "items": [
      {
        "id": "item_1",
        "score": 8,
        "feedback": "Identificou corretamente..."
      }
    ]
  },
  "metadata": {
    "model": "gemini-pro",
    "evaluationTime": 2.1
  }
}
```

#### **GET /ai-chat/status**
Status das chaves API e_health check.

```javascript
// Response
{
  "status": "healthy",
  "apiKeys": [
    {
      "index": 1,
      "status": "active",
      "lastUsed": "2025-11-23T20:15:00Z",
      "requestCount": 145
    }
  ],
  "totalRequests": 1234,
  "averageResponseTime": 1.8
}
```

---

## 🏥 Simulação Médica (aiSimulation.js)

### **Endpoints Principais**

#### **POST /ai-simulation/start**
Inicia nova sessão de simulação.

```javascript
// Request
{
  "stationId": "station_456",
  "userId": "user_789",
  "duration": 10,
  "candidateId": "user_101",
  "simulationType": "standard"
}

// Response
{
  "sessionId": "session_abc123",
  "stationData": {...},
  "availableMaterials": [...],
  "metadata": {
    "createdAt": "2025-11-23T20:15:00Z",
    "expiresAt": "2025-11-23T20:25:00Z"
  }
}
```

#### **POST /ai-simulation/message**
Processa mensagem durante simulação.

```javascript
// Request
{
  "sessionId": "session_abc123",
  "message": "Preciso verificar os sinais vitais",
  "userRole": "actor",
  "timestamp": "2025-11-23T20:16:00Z"
}

// Response
{
  "response": "Os sinais vitais estão estáveis...",
  "releasedMaterial": {
    "id": "exame_fisico",
    "title": "Exame Físico",
    "content": "..."
  },
  "metadata": {
    "processingTime": 0.8
  }
}
```

#### **POST /ai-simulation/evaluate-pep**
Avaliação final da simulação.

```javascript
// Request
{
  "sessionId": "session_abc123",
  "checklistData": {...},
  "conversationHistory": [...],
  "stationData": {...}
}

// Response
{
  "evaluation": {
    "totalScore": 82,
    "maxScore": 100,
    "performance": {
      "clinical_reasoning": 85,
      "communication": 78,
      "technical_skills": 83
    },
    "feedback": "Desempenho bom...",
    "recommendations": [...]
  }
}
```

---

## 🎙️ Transcrição de Áudio (audioTranscription.js)

### **Endpoints Principais**

#### **POST /api/audio-transcription/transcribe**
Transcreve arquivo de áudio para texto.

```javascript
// Request (multipart/form-data)
{
  "audio": File,
  "options": {
    "language": "pt-BR",
    "enhance": true,
    "punctuation": true
  }
}

// Response
{
  "transcript": "Paciente relata dor torácica há 2 horas...",
  "confidence": 0.95,
  "metadata": {
    "duration": 45.2,
    "sampleRate": 16000,
    "language": "pt-BR",
    "model": "speech-to-text-v2"
  }
}
```

#### **POST /api/audio-transcription/transcribe-chunks**
Transcreve múltiplos chunks de áudio (streaming).

```javascript
// Request
{
  "chunks": [
    {
      "data": "base64_audio_chunk_1",
      "sequence": 1
    }
  ],
  "sessionId": "session_123",
  "options": {
    "interimResults": true
  }
}

// Response
{
  "transcripts": [
    {
      "sequence": 1,
      "text": "Paciente...",
      "confidence": 0.92,
      "isFinal": false
    }
  ],
  "sessionId": "session_123"
}
```

#### **GET /api/audio-transcription/capabilities**
Informações sobre capacidades de transcrição.

```javascript
// Response
{
  "supportedFormats": [
    "wav", "mp3", "ogg", "webm", "flac"
  ],
  "languages": ["pt-BR", "en-US"],
  "maxDuration": 300,
  "streaming": true,
  "enhancement": true
}
```

---

## 📝 Questões Descritivas (descriptiveQuestions.js)

### **Endpoints Principais**

#### **GET /api/descriptive-questions**
Lista todas as questões descritivas.

```javascript
// Query Parameters
{
  "page": 1,
  "limit": 20,
  "specialty": "clinica_medica",
  "difficulty": "medium"
}

// Response
{
  "questions": [
    {
      "id": "q_123",
      "title": "Caso Clínico: Dor Abdominal",
      "specialty": "clinica_medica",
      "difficulty": "medium",
      "statement": "Paciente de 45 anos...",
      "createdAt": "2025-11-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "pages": 5
  }
}
```

#### **POST /api/descriptive-questions**
Cria nova questão descritiva (admin).

```javascript
// Request
{
  "title": "Caso Clínico: Dispneia",
  "specialty": "clinica_medica",
  "difficulty": "hard",
  "statement": "Paciente apresenta...",
  "expectedAnswer": "Avaliação inicial deve...",
  "items": [
    {
      "description": "Identifica sinais de gravidade",
      "points": 10
    }
  ]
}

// Response (201 Created)
{
  "id": "q_124",
  "title": "Caso Clínico: Dispneia",
  "createdAt": "2025-11-23T20:15:00Z"
}
```

#### **POST /api/descriptive-questions/:id/evaluate**
Avalia resposta do usuário à questão descritiva.

```javascript
// Request (multipart/form-data)
{
  "answer": "Texto da resposta do usuário",
  "audio": File, // opcional
  "questionId": "q_123"
}

// Response
{
  "evaluation": {
    "score": 75,
    "maxScore": 100,
    "feedback": "Boa análise, mas poderia...",
    "items": [
      {
        "description": "Identifica sinais de gravidade",
        "userScore": 8,
        "maxScore": 10,
        "feedback": "Identificou corretamente..."
      }
    ]
  },
  "metadata": {
    "evaluatedAt": "2025-11-23T20:15:00Z",
    "evaluator": "ai_gemini"
  }
}
```

---

## 🔐 Controle de Acesso (accessControl.js)

### **Endpoints Principais**

#### **POST /api/invites**
Cria novo convite de acesso.

```javascript
// Request
{
  "createdBy": "admin_123",
  "recipientEmail": "user@example.com",
  "plan": "monthly",
  "durationDays": 30,
  "maxUses": 1,
  "message": "Convite especial..."
}

// Response
{
  "inviteId": "invite_abc123",
  "inviteCode": "WXYZ123456",
  "expiresAt": "2025-12-23T20:15:00Z",
  "maxUses": 1,
  "usesRemaining": 1
}
```

#### **POST /api/subscriptions**
Cria nova assinatura de acesso.

```javascript
// Request
{
  "userId": "user_789",
  "plan": "monthly",
  "paymentMethod": "credit_card",
  "startDate": "2025-11-23"
}

// Response
{
  "subscriptionId": "sub_456",
  "plan": "monthly",
  "status": "active",
  "currentPeriodStart": "2025-11-23T00:00:00Z",
  "currentPeriodEnd": "2025-12-23T00:00:00Z",
  "features": [
    "full_simulation_access",
    "ai_evaluation",
    "unlimited_sessions"
  ]
}
```

#### **GET /api/access-status/:userId**
Verifica status de acesso do usuário.

```javascript
// Response
{
  "userId": "user_789",
  "accessLevel": "premium",
  "subscription": {
    "plan": "monthly",
    "status": "active",
    "expiresAt": "2025-12-23T00:00:00Z"
  },
  "features": {
    "canCreateSimulations": true,
    "canUseAI": true,
    "maxSessionsPerDay": 50
  },
  "invites": {
    "available": 3,
    "used": 2
  }
}
```

---

## 🛡️ Middleware de Autenticação

### **Middleware Firebase**
Todos os endpoints protegidos usam autenticação Firebase:

```javascript
// Headers obrigatórios
{
  "Authorization": "Bearer <firebase_jwt_token>",
  "Content-Type": "application/json"
}

// Claims customizados no token
{
  "uid": "user_789",
  "email": "user@example.com",
  "role": "user|moderator|admin",
  "subscription": "basic|premium",
  "permissions": ["can_simulate", "can_eval"]
}
```

### **Rate Limiting**
Configuração de rate limiting por endpoint:

```javascript
// Limites configurados
const rateLimits = {
  "ai-chat": {
    "windowMs": 60000,    // 1 minuto
    "max": 30,            // 30 requisições
    "message": "Muitas requisições de chat"
  },
  "transcription": {
    "windowMs": 60000,    // 1 minuto
    "max": 10,            // 10 transcrições
    "message": "Limite de transcrição excedido"
  },
  "simulation": {
    "windowMs": 3600000,  // 1 hora
    "max": 100,           // 100 simulações
    "message": "Limite de simulações excedido"
  }
};
```

---

## 🔌 Integração WebSocket (Socket.IO)

### **Eventos de Simulação**

#### **Cliente → Servidor**
```javascript
// Conectar à sala de simulação
socket.emit('JOIN_SIMULATION_ROOM', {
  "sessionId": "session_123",
  "userRole": "actor|candidate"
});

// Iniciar simulação
socket.emit('CLIENT_START_SIMULATION', {
  "sessionId": "session_123"
});

// Enviar mensagem
socket.emit('CLIENT_CHAT_MESSAGE', {
  "sessionId": "session_123",
  "message": "Paciente apresenta...",
  "userRole": "actor"
});

// Sincronizar timer
socket.emit('CLIENT_TIMER_SYNC_REQUEST', {
  "sessionId": "session_123"
});
```

#### **Servidor → Cliente**
```javascript
// Timer atualizado
socket.on('SERVER_TIMER_UPDATE', {
  "remainingTime": 480,  // segundos
  "isRunning": true
});

// Material liberado
socket.on('SERVER_MATERIAL_RELEASED', {
  "materialId": "exame_fisico",
  "title": "Exame Físico",
  "content": "..."
});

// Parceiro pronto
socket.on('SERVER_PARTNER_READY', {
  "userId": "user_789",
  "userRole": "candidate",
  "isReady": true
});

// Avaliação recebida
socket.on('SERVER_EVALUATION_COMPLETED', {
  "evaluation": {...},
  "totalScore": 85
});
```

---

## 📊 Métricas e Monitoramento

### **Health Check Endpoint**
```javascript
GET /api/health

// Response
{
  "status": "healthy",
  "timestamp": "2025-11-23T20:15:00Z",
  "version": "2.1.0",
  "services": {
    "database": "connected",
    "ai": "operational",
    "storage": "available",
    "redis": "connected"
  },
  "metrics": {
    "uptime": 86400,
    "requestsToday": 12345,
    "activeSessions": 67,
    "errorRate": 0.02
  }
}
```

### **Logging Estruturado**
```javascript
// Padrão de logs
{
  "timestamp": "2025-11-23T20:15:00Z",
  "level": "info|warn|error",
  "service": "ai-chat|simulation|transcription",
  "endpoint": "/ai-chat/chat",
  "userId": "user_789",
  "sessionId": "session_123",
  "duration": 1234,
  "statusCode": 200,
  "message": "Chat response generated successfully"
}
```

---

## 🔐 Segurança

### **Validações Implementadas**
- ✅ **JWT Token Verification**: Firebase Auth tokens
- ✅ **Role-Based Access Control**: Permissões por role
- ✅ **Rate Limiting**: Limites por endpoint
- ✅ **Input Sanitization**: Limpeza de inputs
- ✅ **CORS Configuration**: Domínios permitidos
- ✅ **SQL Injection Protection**: Firestore queries
- ✅ **File Upload Validation**: Tamanho e formato

### **Headers de Segurança**
```javascript
// Headers implementados
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "default-src 'self'"
}
```

---

## 🚀 Performance

### **Cache Strategy**
```javascript
// Níveis de cache implementados
1. Memory Cache (Node.js) - Dados frequentes
2. Redis Cache (Production) - Compartilhado entre instâncias
3. Firebase Cache - Persistência de sessões
```

### **Optimizações**
- ✅ **Connection Pooling**: Firestore connections
- ✅ **Batch Operations**: Múltiplas operações juntas
- ✅ **Lazy Loading**: Carregamento sob demanda
- ✅ **Compression**: Gzip responses
- ✅ **CDN Integration**: Assets estáticos

---

## 🎯 Conclusão

### **Pontos Fortes**
- ✅ **API RESTful**: Estrutura consistente
- ✅ **WebSocket Real-time**: Comunicação instantânea
- ✅ **Integração IA**: Gemini API robusta
- ✅ **Segurança**: Múltiplas camadas
- ✅ **Monitoramento**: Logs e métricas
- ✅ **Performance**: Cache e otimizações

### **Oportunidades**
- 🚀 **API Versioning**: Controle de versões
- 🚀 **GraphQL**: Queries mais eficientes
- 🚀 **Webhooks**: Notificações assíncronas
- 🚀 **Rate Limiting Avançado**: Limites dinâmicos
- 🚀 **API Documentation**: OpenAPI/Swagger

---

**Documentação de API concluída com sucesso!** 🎉

*Total de 25+ endpoints documentados em 5 categorias principais*