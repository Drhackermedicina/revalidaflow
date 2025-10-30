# Guia Rápido: Avaliação Automática por IA

## 🚀 Como Usar

### Para Candidatos:

1. **Durante a Simulação:**
   - Realize a simulação normalmente com o ator
   - O sistema captura automaticamente o histórico de conversa (quando integrado com Speech-to-Text)

2. **Ao Final da Simulação:**
   - Um diálogo aparece: "Deseja receber uma avaliação automática por IA?"
   - Clique em **"Avaliar minha performance"**
   - Aguarde enquanto a IA analisa sua conversa (5-15 segundos)
   - Veja o feedback detalhado com:
     - Pontos fortes
     - Pontos de melhoria
     - Recomendações para OSCE
     - Indicadores críticos

3. **Visualizar Resultados:**
   - Role a página para ver o card de feedback da IA
   - Expanda as seções para ver detalhes
   - Compare com a avaliação do examinador (se disponível)

---

## 🔧 Como Funciona (Técnico)

### Fluxo de Dados:

```
┌─────────────────────────────────────────────────────────┐
│ 1. DURANTE A SIMULAÇÃO                                  │
├─────────────────────────────────────────────────────────┤
│ Candidato fala → Backend captura → Emite Socket.IO     │
│                                                          │
│ SERVER_AI_TRANSCRIPT_UPDATE → Frontend adiciona ao      │
│                                conversationHistory       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. AO ACEITAR AVALIAÇÃO POR IA                          │
├─────────────────────────────────────────────────────────┤
│ handleAIEvaluationAccept()                               │
│   ↓                                                      │
│ syncConversationHistory() ← Solicita histórico completo │
│   ↓                                                      │
│ Backend envia SERVER_AI_TRANSCRIPT_SYNC                 │
│   ↓                                                      │
│ Frontend popula conversationHistory                      │
│   ↓                                                      │
│ runAiEvaluation() ← Envia para /ai-chat/evaluate-pep    │
│   ↓                                                      │
│ IA Gemini analisa conversa + checklist PEP              │
│   ↓                                                      │
│ Retorna scores + justificativas + performance summary   │
│   ↓                                                      │
│ Frontend exibe SimulationAiFeedbackCard                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Estrutura do Histórico de Conversa

```javascript
conversationHistory = [
  {
    role: 'candidate',          // ou 'actor', 'ai_actor'
    content: 'Bom dia, doutor.', // Texto da fala
    timestamp: '2025-10-30T10:15:00.000Z',
    speakerId: 'user123',
    speakerName: 'João Silva'
  },
  {
    role: 'actor',
    content: 'Olá, estou com dor no peito.',
    timestamp: '2025-10-30T10:15:05.000Z',
    speakerId: 'user456',
    speakerName: 'Maria Santos'
  }
  // ...mais entradas
]
```

---

## 🎯 Formato da Avaliação Retornada

```javascript
aiEvaluationResult = {
  scores: {
    'item-1': 2.00,  // Pontuação adequada
    'item-2': 1.50,  // Pontuação parcial
    'item-3': 0.00   // Pontuação inadequada
  },
  total: 3.50,
  details: [
    {
      itemId: 'item-1',
      pontuacao: 2.00,
      observacao: 'O médico investigou DUM, G/P/A (3/3 itens gineco-obstétricos)'
    }
  ],
  performance: {
    visaoGeral: 'Performance geral do candidato...',
    pontosFortes: [
      'Anamnese estruturada seguindo roteiro do PEP',
      'Comunicação clara e empática'
    ],
    pontosDeMelhoria: [
      'Não investigou antecedentes familiares (PEP item 2)',
      'Exame físico incompleto'
    ],
    recomendacoesOSCE: [
      'Revisar protocolo de atendimento obstétrico',
      'Praticar roteiro semiológico completo'
    ],
    indicadoresCriticos: [
      'Não verificou sinais vitais (segurança do paciente)'
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Problema: "Não há histórico de conversa para avaliar"

**Causa:** Sistema de transcrição não está capturando as falas

**Soluções:**
1. Verificar se Socket está conectado:
   ```javascript
   // No console do navegador
   console.log('Socket conectado:', socketRef.value?.connected);
   ```

2. Enviar transcrição manual para teste:
   ```javascript
   socketRef.value.emit('CLIENT_AI_TRANSCRIPT_ENTRY', {
     text: 'Teste de transcrição manual',
     role: 'candidate',
     timestamp: new Date().toISOString()
   });
   ```

3. Verificar logs no console:
   ```
   [CONVERSATION_HISTORY] 📝 Nova transcrição recebida
   ```

---

### Problema: "Timeout ao aguardar sincronização"

**Causa:** Backend não respondeu em 5 segundos

**Soluções:**
1. Verificar se backend está online
2. Verificar logs do backend para erros
3. Tentar novamente clicando em "Avaliar minha performance"

---

### Problema: Avaliação retorna apenas zeros

**Causa:** IA não encontrou evidências na conversa

**Soluções:**
1. Verificar se histórico foi sincronizado:
   ```javascript
   console.log('Histórico:', conversationHistory.value);
   ```

2. Verificar se conversação tem conteúdo relevante
3. Backend pode estar usando fallback devido a erro na IA

---

## 📊 Logs para Debugging

### Habilitar logs detalhados:

No console do navegador, antes de iniciar a simulação:
```javascript
localStorage.setItem('debug', 'conversation,ia-evaluation');
```

### Logs esperados:

**Durante captura:**
```
[CONVERSATION_HISTORY] 📝 Nova transcrição recebida
  - role: candidate
  - speakerId: user123
  - textLength: 45
```

**Durante sincronização:**
```
[CONVERSATION_HISTORY] 📡 Solicitando sincronização de histórico...
[CONVERSATION_HISTORY] 🔄 Sincronização de histórico recebida (12 entries)
[CONVERSATION_HISTORY] ✅ Histórico sincronizado com sucesso (12 entries)
```

**Durante avaliação:**
```
[IA_EVALUATION] 🤖 Candidato aceitou avaliação por IA, iniciando...
[IA_EVALUATION] 🔄 Sincronizando histórico de conversa antes da avaliação...
[IA_EVALUATION] ✅ Histórico sincronizado (12 entries)
[IA_EVALUATION] ✅ Avaliação por IA concluída com sucesso
  - scoresCount: 8
  - totalScore: 12.5
  - conversationEntries: 12
```

---

## 🔗 Links Úteis

- **Análise Completa:** [`ANALISE_AVALIACAO_IA_PEP.md`](./ANALISE_AVALIACAO_IA_PEP.md)
- **Detalhes de Implementação:** [`IMPLEMENTACAO_CONVERSATION_HISTORY.md`](./IMPLEMENTACAO_CONVERSATION_HISTORY.md)
- **Código Frontend:** `src/pages/SimulationView.vue` (linhas 390-481, 851-897)
- **Código Backend:** `backend/routes/aiChat.js` (linhas 1311-1643)

---

## ❓ FAQ

### A avaliação por IA substitui a do examinador?
Não. É um feedback complementar para ajudar o candidato a identificar pontos de melhoria.

### Quanto tempo leva a avaliação?
Entre 5-15 segundos, dependendo do tamanho do checklist PEP.

### Posso recusar a avaliação por IA?
Sim, basta clicar em "Não, obrigado" no diálogo.

### A avaliação é salva?
Atualmente não. Ela é exibida apenas na sessão atual.

### Posso reavaliar depois?
Não no momento. A avaliação só pode ser solicitada uma vez ao final da simulação.

---

## 🎓 Próximas Melhorias Planejadas

1. **Captura automática de áudio** com Speech-to-Text
2. **Salvar avaliações no Firestore** para histórico
3. **Comparação entre avaliação IA vs Humana**
4. **Feedback em tempo real** durante a simulação
5. **Exportar relatório PDF** com resultados

---

**Última atualização:** 30/10/2025

