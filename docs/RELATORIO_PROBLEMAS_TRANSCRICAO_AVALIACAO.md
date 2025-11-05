# 🔍 Relatório Detalhado: Problemas de Transcrição e Avaliação

**Data:** 2025-11-03  
**Status:** ❌ **CRÍTICO - Serviço de Transcrição Indisponível**

---

## 📋 Sumário Executivo

O sistema está apresentando falhas críticas na transcrição de áudio (erro 503) e possíveis problemas na avaliação inteligente do PEP. O backend não consegue inicializar o serviço de transcrição devido a um erro de leitura de propriedades.

---

## 🚨 PROBLEMA 1: Erro 503 na Transcrição de Áudio

### **Sintomas:**
- Frontend recebe `HTTP 503: Service Unavailable` ao tentar transcrever áudio
- Erro no backend: `Cannot read properties of undefined (reading 'length')`
- Múltiplas tentativas de transcrição falhando consecutivamente

### **Localização:**
- **Frontend:** `src/composables/useCandidateAudioTranscription.js` (linha 92-98)
- **Backend:** `backend/routes/audioTranscription.js` (linha 198-222)
- **Serviço:** `backend/services/geminiAudioTranscription.js`

### **Causa Raiz:**
O endpoint `/api/audio-transcription/test` está falhando porque o método `getGeminiAudioTranscription()` está tentando acessar `transcriptionService.apiKeys.length`, mas `apiKeys` não existe no objeto retornado.

**Código problemático:**
```javascript
// backend/routes/audioTranscription.js (linha 205)
keysLoaded: transcriptionService.apiKeys.length, // ❌ apiKeys não existe
```

**Solução Aplicada:**
O serviço `geminiAudioTranscription.js` usa `keyPool` internamente, não `apiKeys`. Foi adicionado método `getKeyStats()` para expor estatísticas corretas.

### **Fluxo de Transcrição Atual:**

1. **Frontend captura áudio:**
   - `useCandidateAudioTranscription.js` captura chunks de 10 segundos
   - Envia para `/api/audio-transcription/transcribe` via FormData

2. **Backend processa:**
   - `audioTranscription.js` recebe o arquivo
   - Chama `getGeminiAudioTranscription().transcribeAudio()`
   - Serviço carrega chaves do `.env` e faz fallback automático

3. **Problema:**
   - Serviço não inicializa corretamente se não houver chaves válidas
   - Erro não é tratado adequadamente no endpoint `/test`

### **Correções Necessárias:**

✅ **JÁ CORRIGIDO:**
- Adicionado método `getKeyStats()` em `geminiAudioTranscription.js`
- Atualizado endpoint `/test` para usar `getKeyStats()` em vez de `apiKeys`

⚠️ **A VERIFICAR:**
- Verificar se backend está rodando e carregou as chaves do `.env`
- Confirmar que pelo menos uma chave Gemini está válida
- Testar endpoint `/api/audio-transcription/test` após reiniciar backend

---

## 🚨 PROBLEMA 2: Transcrição Interrompida (Apenas Primeira Frase)

### **Sintomas:**
- Usuário relata que apenas a primeira frase é transcrita
- Gravação contínua funciona (84 segundos registrados)
- Múltiplos chunks de áudio são gerados, mas transcrições falham

### **Análise do Código:**

**Frontend (`useCandidateAudioTranscription.js`):**
```javascript
// Linha 244: Chunks de 10 segundos
mediaRecorder.value.start(10000);

// Linha 206-221: Handler para chunks
mediaRecorder.value.ondataavailable = (event) => {
  if (event.data && event.data.size > 0) {
    audioChunks.value.push(event.data);
    transcriptionQueue.value.push(event.data);
    processTranscriptionQueue(); // Processa imediatamente
  }
};
```

**Problema Identificado:**
- Cada chunk de 10 segundos é adicionado à fila e processado imediatamente
- Se a primeira transcrição falha (503), as subsequentes também falham
- Não há retry automático ou tratamento de erros persistentes

### **Causa Provável:**
1. Backend está retornando 503 para todas as requisições
2. Fallback não está funcionando (todas as chaves podem estar inválidas/quota excedida)
3. Serviço de transcrição não inicializa corretamente

### **Solução Recomendada:**
1. ✅ Verificar se backend está rodando: `npm run backend:local`
2. ✅ Testar endpoint: `GET http://localhost:3000/api/audio-transcription/test`
3. ✅ Verificar logs do backend para erros de inicialização
4. ✅ Adicionar retry com backoff exponencial no frontend
5. ✅ Melhorar tratamento de erros para não bloquear fila

---

## 📊 LÓGICA ATUAL: Avaliação Inteligente do PEP

### **Fluxo Completo:**

#### **1. Frontend (`useAiEvaluation.js`):**

```javascript
// Linha 67-147: Função principal
async function runAiEvaluation() {
  // 1. Valida se há itens de avaliação
  if (!checklistData.value?.itensAvaliacao?.length) {
    return null;
  }

  // 2. Prepara payload
  const payload = {
    sessionId,
    stationData,
    conversationHistory,
    checklistData,
    releasedData
  };

  // 3. Chama backend
  const response = await fetch(`${backendUrl}/ai-chat/evaluate-pep`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // 4. Processa resposta
  const aiEvaluation = await response.json();
  const result = processAIEvaluation(aiEvaluation.evaluation);

  // 5. Retorna resultado com metadata
  return {
    ...result,
    metadata: aiEvaluation.metadata
  };
}
```

#### **2. Backend (`backend/routes/aiChat.js`):**

**Endpoint:** `POST /ai-chat/evaluate-pep` (linha 1356)

**Fluxo:**
1. Recebe `stationData`, `conversationHistory`, `checklistData`
2. Constrói prompt detalhado com:
   - Conversa completa formatada
   - Itens do checklist com critérios de pontuação
   - Instruções de formatação JSON estrita
3. Chama Gemini API via `AIChatManager.getActiveKey()`
4. Processa resposta e extrai JSON
5. Retorna avaliação estruturada

**Prompt Construído:**
```
Você é um avaliador médico especializado em provas OSCE.
Analise a conversa e avalie cada item do PEP.

CONVERSA COMPLETA:
[formato: 1. Médico: texto, 2. Paciente: texto]

ITENS DO CHECKLIST:
--- ITEM 1 ---
Descrição: ...
✅ ADEQUADO (X pts): critério
⚠️ PARCIALMENTE ADEQUADO (Y pts): critério
❌ INADEQUADO (Z pts): critério

FORMATO DE RESPOSTA (JSON estrito):
{
  "items": [
    {"pontuacao": 2.00, "justificativa": "..."},
    ...
  ],
  "performance": {
    "visaoGeral": "...",
    "pontosFortes": ["..."],
    "pontosDeMelhoria": ["..."],
    "recomendacoesOSCE": ["..."],
    "indicadoresCriticos": ["..."]
  }
}
```

#### **3. Processamento da Resposta (`useAiEvaluation.js`):**

**Função `processAIEvaluation()` (linha 150-243):**

1. **Tenta parsear JSON** da resposta
2. **Se for objeto com chaves itemId:**
   - Calcula pontuação baseado em array de booleanos
   - Ratio >= 0.75 → `adequadoPts`
   - Ratio >= 0.35 → `parcialPts`
   - Caso contrário → `inadequadoPts`
3. **Se for array de items:**
   - Extrai pontuação e justificativa de cada item
4. **Se for texto simples:**
   - Usa regex para extrair pontuações: `/(\d+)\)\s*([0-9]+(?:\.[0-9]+)?)/g`
   - Mapeia para itens do checklist
5. **Normaliza performance summary:**
   - Sanitiza texto (remove "ausente")
   - Valida arrays
   - Adiciona fallbacks se campos vazios

**Fallback Automático:**
Se tudo falhar, usa `autoEvaluatePEPFallback()`:
- Conta mensagens do candidato no histórico
- >= 6 mensagens → `adequadoPts`
- >= 3 mensagens → `parcialPts`
- Caso contrário → `inadequadoPts`

---

## 📊 LÓGICA ATUAL: Feedback Inteligente da Estação

### **Componente:** `SimulationAiFeedbackCard.vue`

**Props:**
- `feedback`: Objeto com feedback da IA
- `scores`: Pontuações por item
- `totalScore`: Pontuação total
- `details`: Array de detalhes por item
- `metadata`: Metadados (timestamp, autor, etc.)

**Estrutura do Feedback:**
```javascript
{
  visaoGeral: "Resumo geral da performance",
  pontosFortes: ["Item 1", "Item 2"],
  pontosDeMelhoria: ["Item 3", "Item 4"],
  recomendacoesOSCE: ["Recomendação 1"],
  indicadoresCriticos: ["Critério crítico 1"]
}
```

**Seções Agrupadas:**
1. **Investigação Clínica:**
   - Anamnese - tópicos essenciais
   - Antecedentes relevantes
   - Sinais vitais prioritários
   - Exame físico direcionado

2. **Propedêutica Complementar:**
   - Exames laboratoriais
   - Exames de imagem
   - Outros exames

3. **Conduta Terapêutica:**
   - Hipótese diagnóstica
   - Tratamento medicamentoso
   - Orientações ao paciente

---

## 🔧 CORREÇÕES APLICADAS

### ✅ **1. Serviço de Transcrição (`geminiAudioTranscription.js`):**
- Adicionado método `getKeyStats()` para expor estatísticas
- Melhorado tratamento de erros com fallback automático
- Suporte a múltiplas chaves com rotação
- **Corrigido:** Inicialização lazy com tratamento de exceções
- **Adicionado:** Função `resetInstance()` para resetar instância em caso de erro

### ✅ **2. Endpoint de Teste (`audioTranscription.js`):**
- Atualizado para usar `getKeyStats()` em vez de `apiKeys.length`
- **Corrigido:** Tratamento de exceção quando serviço não inicializa
- Adicionado stack trace em desenvolvimento para debug
- Retorna mensagem de erro clara quando chaves não estão configuradas

### ✅ **3. Endpoint de Transcrição (`audioTranscription.js`):**
- **Corrigido:** Tratamento de exceção quando serviço não inicializa
- Retorna erro 503 com mensagem clara quando chaves não estão configuradas
- Logs melhorados para diagnóstico

### ✅ **4. Endpoint de Health Check (`audioTranscription.js`):**
- **Corrigido:** Tratamento de exceção quando serviço não inicializa
- Retorna status 'unhealthy' com detalhes quando chaves não estão configuradas

### ✅ **5. Serviço de Avaliação (`geminiEvaluationService.js`):**
- Implementado fallback automático com múltiplas chaves
- Adicionado método `getGeminiKeyStats()` para diagnóstico
- Melhorado tratamento de erros (quota, chave inválida, etc.)

---

## 🚨 PROBLEMAS PENDENTES

### **1. Backend não está inicializando corretamente:**
- **Ação:** Verificar se backend está rodando
- **Comando:** `npm run backend:local`
- **Verificar:** Logs de inicialização do serviço de transcrição

### **2. Chaves API podem estar inválidas:**
- **Ação:** Testar todas as chaves Gemini
- **Comando:** `node scripts/testar-chaves-gemini.cjs`
- **Verificar:** `.env` tem chaves válidas

### **3. Frontend não tem retry automático:**
- **Ação:** Adicionar retry com backoff exponencial
- **Arquivo:** `src/composables/useCandidateAudioTranscription.js`
- **Melhoria:** Não bloquear fila se uma transcrição falhar

### **4. Logs insuficientes:**
- **Ação:** Adicionar mais logs no backend para diagnóstico
- **Arquivo:** `backend/routes/audioTranscription.js`
- **Melhoria:** Logar erro completo quando inicialização falha

---

## 📝 RECOMENDAÇÕES

### **Imediatas:**
1. ✅ Reiniciar backend: `npm run backend:local`
2. ✅ Testar endpoint: `GET http://localhost:3000/api/audio-transcription/test`
3. ✅ Verificar logs do backend durante tentativa de transcrição
4. ✅ Verificar se `.env` tem chaves Gemini válidas

### **Curto Prazo:**
1. Adicionar retry automático no frontend
2. Melhorar tratamento de erros na fila de transcrição
3. Adicionar health check endpoint mais detalhado
4. Implementar cache de transcrições para evitar reprocessamento

### **Longo Prazo:**
1. Implementar WebSocket para transcrição em tempo real
2. Adicionar métricas de performance (tempo de transcrição, taxa de sucesso)
3. Implementar sistema de filas para processar transcrições de forma assíncrona
4. Adicionar suporte a múltiplos formatos de áudio

---

## 🔍 PRÓXIMOS PASSOS

1. **Verificar Backend:**
   ```powershell
   # Verificar se está rodando
   Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
   
   # Testar serviço de transcrição
   Invoke-RestMethod -Uri "http://localhost:3000/api/audio-transcription/test" -Method GET
   ```

2. **Verificar Chaves:**
   ```bash
   node scripts/testar-chaves-gemini.cjs
   ```

3. **Verificar Logs:**
   - Abrir terminal onde backend está rodando
   - Tentar transcrição no frontend
   - Observar logs de erro no backend

4. **Testar Transcrição Manual:**
   - Usar Postman ou curl para enviar áudio
   - Verificar resposta do backend

---

**Gerado em:** 2025-11-03  
**Versão:** 1.0

