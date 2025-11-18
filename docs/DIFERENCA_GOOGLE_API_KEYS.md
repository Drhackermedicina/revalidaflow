# 🔑 Diferença entre GOOGLE_API_KEY e VITE_GOOGLE_API_KEY

Guia explicativo sobre a diferença entre as variáveis de ambiente e onde são usadas no código.

---

## 📊 Diferença Principal

### `GOOGLE_API_KEY_X` (Backend)
- **Uso:** Apenas no **backend** (Node.js/Express)
- **Formato:** `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY_2`, etc.
- **Acesso:** Via `process.env.GOOGLE_API_KEY_X`
- **Exposição:** ❌ NÃO expostas ao frontend (segurança)

### `VITE_GOOGLE_API_KEY_X` (Frontend)
- **Uso:** Apenas no **frontend** (Vue.js/Vite)
- **Formato:** `VITE_GOOGLE_API_KEY_1`, `VITE_GOOGLE_API_KEY_2`, etc.
- **Acesso:** Via `import.meta.env.VITE_GOOGLE_API_KEY_X`
- **Exposição:** ⚠️ **SIM, expostas ao frontend** (embutidas no bundle)

---

## ⚠️ Por Que o Prefixo `VITE_`?

No Vite, apenas variáveis com prefixo `VITE_` são expostas ao frontend:

```javascript
// .env
VITE_GOOGLE_API_KEY_1=AIzaSy...  ✅ Será exposta ao frontend
GOOGLE_API_KEY_1=AIzaSy...       ❌ NÃO será exposta (apenas backend)
```

**Motivo de Segurança:**
- Chaves no frontend são **visíveis** no código JavaScript do navegador
- Qualquer pessoa pode ver as chaves no DevTools
- Chaves do backend ficam **ocultas** (apenas no servidor)

---

## 📍 Onde São Usadas

### 🔵 FRONTEND (Vue.js/Vite)

#### 1. **`src/services/geminiService.js`**
   - **Chaves usadas:** `VITE_GEMINI_API_KEY` e `VITE_GOOGLE_API_KEY_X`
   - **Propósito:** Serviço de correção de texto para estações clínicas
   - **Modelo:** `gemini-2.5-flash`
   - **Como carrega:**
   ```javascript
   // Tenta VITE_GEMINI_API_KEY primeiro
   const apiKeyFromEnv = import.meta.env.VITE_GEMINI_API_KEY;
   
   // Fallback: VITE_GOOGLE_API_KEY_X
   const fallbackKeys = Object.keys(import.meta.env)
     .filter(key => key.startsWith('VITE_GOOGLE_API_KEY_'))
     .map(key => import.meta.env[key]);
   ```

#### 2. **`src/composables/useMedicalChat.js`**
   - **Usa:** `geminiService` (que usa `VITE_GOOGLE_API_KEY_X`)
   - **Componente:** `GeminiChat.vue`
   - **Propósito:** Chat médico com IA

#### 3. **`src/composables/useAiChat.js`**
   - **Não usa diretamente:** Envia requisições para o backend via `backendUrl`
   - **Componente:** Usado em `SimulationViewAI.vue`
   - **Observação:** As chamadas de IA são feitas via backend (mais seguro)

#### 4. **`src/composables/useCandidateAudioTranscription.js`**
   - **Não usa chaves do frontend:** Envia áudio para o backend
   - **Backend processa:** `backend/services/geminiAudioTranscription.js`
   - **Observação:** Transcrição é feita no backend, não no frontend

#### 5. **`src/composables/useAiEvaluation.js`**
   - **Não usa chaves do frontend:** Envia dados para o backend
   - **Backend processa:** `backend/routes/aiSimulation.js` ou `backend/services/geminiEvaluationService.js`
   - **Observação:** Avaliação é feita no backend

---

### 🟢 BACKEND (Node.js/Express)

#### 1. **`backend/services/geminiAudioTranscription.js`**
   - **Chaves usadas:** `GOOGLE_API_KEY_X` e `GEMINI_API_KEY`
   - **Propósito:** Transcrição de áudio do candidato
   - **Modelo:** `gemini-2.0-flash-exp`
   - **Como carrega:**
   ```javascript
   // Chaves dedicadas ao serviço de áudio
   if (process.env.GEMINI_API_KEY) keys.add(process.env.GEMINI_API_KEY)
   if (process.env.GEMINI_API_KEY_2) keys.add(process.env.GEMINI_API_KEY_2)
   // ...
   
   // Chaves globais
   for (const key of collectKeys('GOOGLE_API_KEY_')) {
     keys.add(key)
   }
   ```
   - **Fallback:** Sistema automático que tenta todas as chaves em sequência

#### 2. **`backend/services/geminiEvaluationService.js`**
   - **Chaves usadas:** `GOOGLE_API_KEY_1` ou `GOOGLE_API_KEY`
   - **Propósito:** Avaliação de respostas descritivas
   - **Modelo:** `gemini-1.5-flash`
   - **Como carrega:**
   ```javascript
   const API_KEY = process.env.GOOGLE_API_KEY_1 || process.env.GOOGLE_API_KEY;
   ```

#### 3. **`backend/routes/aiChat.js`**
   - **Chaves usadas:** `GOOGLE_API_KEY_X`
   - **Propósito:** Chat com IA para simulações
   - **Modelo:** Vários modelos Gemini
   - **Como carrega:**
   ```javascript
   const envKeys = Object.keys(process.env)
     .filter(name => name.startsWith('GOOGLE_API_KEY_') && process.env[name])
     .map(name => ({
       index: Number.parseInt(name.replace('GOOGLE_API_KEY_', ''), 10) || 0,
       value: process.env[name]
     }))
     .filter(item => !Number.isNaN(item.index) && item.index > 0)
     .sort((a, b) => a.index - b.index);
   ```

#### 4. **`backend/utils/geminiApiManager.js`**
   - **Chaves usadas:** `GOOGLE_API_KEY_X` (índices 1-7 para chaves gratuitas, 8+ para pagas)
   - **Propósito:** Gerenciamento de quota e fallback de múltiplas chaves
   - **Modelo:** `gemini-2.5-flash`
   - **Como carrega:**
   ```javascript
   // Chaves gratuitas (1-7)
   for (let index = 1; index <= 7; index++) {
     const keyEnv = `GOOGLE_API_KEY_${index}`;
     const key = process.env[keyEnv];
     // ...
   }
   
   // Chaves pagas (8+)
   for (let index = 8; index <= 20; index++) {
     const keyEnv = `GOOGLE_API_KEY_${index}`;
     const key = process.env[keyEnv];
     // ...
   }
   ```

---

## 🔍 Resumo de Uso por Arquivo

### Frontend
| Arquivo | Usa Chaves? | Quais? | Para Quê? |
|---------|-------------|--------|-----------|
| `src/services/geminiService.js` | ✅ Sim | `VITE_GOOGLE_API_KEY_X` | Correção de texto |
| `src/composables/useMedicalChat.js` | ✅ Sim (indireto) | Via `geminiService` | Chat médico |
| `src/composables/useAiChat.js` | ❌ Não | N/A | Usa backend |
| `src/composables/useCandidateAudioTranscription.js` | ❌ Não | N/A | Usa backend |
| `src/composables/useAiEvaluation.js` | ❌ Não | N/A | Usa backend |
| `SimulationViewAI.vue` | ❌ Não | N/A | Usa backend via `useAiChat` |
| `SimulationView.vue` | ❌ Não | N/A | Usa backend |
| `GeminiChat.vue` | ✅ Sim (indireto) | Via `useMedicalChat` → `geminiService` | Chat médico |

### Backend
| Arquivo | Usa Chaves? | Quais? | Para Quê? |
|---------|-------------|--------|-----------|
| `backend/services/geminiAudioTranscription.js` | ✅ Sim | `GOOGLE_API_KEY_X`, `GEMINI_API_KEY_X` | Transcrição de áudio |
| `backend/services/geminiEvaluationService.js` | ✅ Sim | `GOOGLE_API_KEY_1`, `GOOGLE_API_KEY` | Avaliação de respostas |
| `backend/routes/aiChat.js` | ✅ Sim | `GOOGLE_API_KEY_X` | Chat com IA |
| `backend/utils/geminiApiManager.js` | ✅ Sim | `GOOGLE_API_KEY_X` | Gerenciamento de quota |

---

## 🎯 Estratégia de Uso

### Por Que Ter Ambas?

1. **Backend (`GOOGLE_API_KEY_X`):**
   - ✅ Mais seguro (não exposto ao cliente)
   - ✅ Usado para operações sensíveis:
     - Transcrição de áudio
     - Avaliação de respostas
     - Chat com IA durante simulações

2. **Frontend (`VITE_GOOGLE_API_KEY_X`):**
   - ⚠️ Menos seguro (exposto no bundle)
   - ✅ Usado apenas para:
     - Correção de texto (funcionalidade administrativa)
     - Chat médico geral (não sensível)

### Recomendação

**Para novos recursos:**
- ✅ Prefira usar **backend** (mais seguro)
- ❌ Evite usar chaves no frontend quando possível
- ✅ Use frontend apenas para funcionalidades não críticas

---

## 📝 Chaves Atuais (Após Limpeza)

### Válidas no `.env`:

**Backend:**
- `GOOGLE_API_KEY_1=AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U`
- `GOOGLE_API_KEY_2=AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4`

**Frontend:**
- `VITE_GOOGLE_API_KEY_1=AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U`
- `VITE_GOOGLE_API_KEY_2=AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4`
- `VITE_GOOGLE_API_KEY_3=AIzaSyB7Pm5fFzuSxxLI4ogBgJoUxukDW-wCP4g`
- `VITE_GOOGLE_API_KEY_6=AIzaSyDAbZJiK4EaTJkMfl3D0kreBPxFuoEuAUY`

**Nota:** Algumas chaves aparecem em ambas (mesmo valor), o que é normal para compartilhar entre frontend e backend.

---

## 🔐 Considerações de Segurança

### ⚠️ Aviso Importante

**Chaves `VITE_GOOGLE_API_KEY_X` são públicas:**
- Qualquer pessoa pode abrir o DevTools e ver as chaves
- Elas estão embutidas no JavaScript do bundle
- Não use chaves com quota ilimitada ou muito caras no frontend

### ✅ Boas Práticas

1. **Use backend quando possível:**
   - Transcrição de áudio → Backend
   - Avaliação de respostas → Backend
   - Chat durante simulações → Backend

2. **Frontend apenas para funcionalidades não críticas:**
   - Correção de texto (admin) → Frontend OK
   - Chat médico geral → Frontend OK

3. **Monitore uso das chaves:**
   - Verifique quotas regularmente
   - Remova chaves inválidas (já feito via script)

---

## 📚 Referências

- **Script de Teste:** `scripts/testar-chaves-gemini.cjs`
- **Limpeza Realizada:** `docs/RESUMO_LIMPEZA_CHAVES_GEMINI.md`
- **Configuração Frontend:** `src/config/environment.js`
- **Documentação Vite:** https://vitejs.dev/guide/env-and-mode.html

---

**Última atualização:** 2025-11-03  
**Versão:** 1.0.0







