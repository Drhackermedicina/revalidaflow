# 📋 Documentação Completa - GeminiService

## 📝 Visão Geral

O `GeminiService` é um serviço robusto de integração com o Google AI Studio (Gemini) projetado especificamente para correção de texto em estações clínicas de ensino médico. Implementa múltiplas camadas de resiliência incluindo pool de chaves API, fallback automático de modelos e sistema de cache offline.

## 🔄 Mudanças e Novos Métodos Implementados

### ✅ Novos Métodos

#### `testKey(apiKey)`
Testa se uma chave API do Google AI Studio está ativa e funcional.

```javascript
const isActive = await geminiService.testKey('AIzaSy...');
console.log(isActive ? 'Chave ativa' : 'Chave inativa');
```

#### `testModel()`
Testa se o modelo Gemini está funcionando corretamente usando uma requisição simples.

```javascript
const isWorking = await geminiService.testModel();
console.log(isWorking ? 'Modelo funcionando' : 'Modelo com problemas');
```

### 🔧 Melhorias Implementadas

#### Sistema de Cache Offline
- **Implementação**: Map interno que armazena respostas bem-sucedidas
- **Funcionamento**: Quando todas as chaves API falham, retorna resposta em cache
- **Chave**: Combinação de `prompt:context`

#### Fallback Automático de Modelo
- **Cenário**: Erro de cota (429) ou indisponibilidade do modelo lite
- **Ação**: Automaticamente muda para `gemini-2.0-flash` (mais robusto)
- **Reset**: Reinicia contador de tentativas e índice de chaves

#### Pool Rotativo de Chaves API
- **Quantidade**: Até 7 chaves configuráveis via variáveis de ambiente
- **Rotação**: Ciclo automático entre chaves válidas
- **Validação**: Remove automaticamente chaves inválidas do pool

#### Sanitização de Dados Identificadores
- **Proteção**: Remove nomes próprios, idades específicas, procedências
- **Aplicação**: Automática em todas as respostas do Gemini
- **Campos especiais**: Verificação extra para `descricaoCasoCompleta`

## ⚙️ Como Usar os Novos Recursos

### Testando Chaves API

```javascript
import { geminiService } from '@/services/geminiService';

// Testar uma chave específica
const keyValid = await geminiService.testKey('SUA_CHAVE_API');
if (!keyValid) {
  console.error('Chave API inválida ou expirada');
}
```

### Testando o Modelo

```javascript
// Testar se o serviço está operacional
const modelWorking = await geminiService.testModel();
if (!modelWorking) {
  console.warn('Modelo Gemini com problemas - usando cache offline');
}
```

### Requisições com Fallback

```javascript
// O fallback acontece automaticamente
const result = await geminiService.makeRequest(
  'Seu prompt aqui',
  'Contexto adicional',
  12, // maxRetries
  'chat' // tipo: 'chat', 'edit', ou 'context'
);
```

## 🔑 Carregamento de Chaves do .env

O serviço carrega automaticamente as chaves API das seguintes variáveis de ambiente:

```env
VITE_GOOGLE_API_KEY_1=AIzaSy...
VITE_GOOGLE_API_KEY_2=AIzaSy...
VITE_GOOGLE_API_KEY_3=AIzaSy...
VITE_GOOGLE_API_KEY_6=AIzaSy...
VITE_GOOGLE_API_KEY_7=AIzaSy...
VITE_GOOGLE_API_KEY_8=AIzaSy...
```

**Nota**: Chaves vazias são automaticamente filtradas do pool.

## 📊 Tipos de Requisição

### `chat` (Padrão)
- **Modelo**: `gemini-2.0-flash-lite`
- **Uso**: Conversas gerais, respostas criativas
- **Temperatura**: 0.7 (mais criativo)

### `edit`
- **Modelo**: `gemini-2.0-flash-lite`
- **Uso**: Correções de texto, edições estruturadas
- **Temperatura**: 0.5 (balanceado)

### `context`
- **Modelo**: `gemini-2.5-flash` (sempre)
- **Uso**: Geração de contexto de estações clínicas
- **Temperatura**: 0.5 (balanceado)

## 💾 Sistema de Cache

### Funcionamento
- **Armazenamento**: Map interno com chave `prompt:context`
- **Persistência**: Durante a sessão da aplicação
- **Fallback**: Ativado quando todas as chaves API falham

### Benefícios
- **Continuidade**: Aplicação funciona mesmo sem internet/API
- **Performance**: Respostas instantâneas para prompts repetidos
- **Confiabilidade**: Nunca falha completamente

### Limitações
- **Escopo**: Apenas para a sessão atual
- **Capacidade**: Limitado pela memória do navegador
- **Atualização**: Não reflete mudanças no modelo Gemini

## 🚀 Guia de Migração

### Código Existente
Se você estava usando chamadas diretas para Gemini:

```javascript
// ❌ Código antigo (sem resiliência)
const response = await fetch(`${endpoint}/gemini-pro:generateContent?key=${apiKey}`, {
  // ... configuração
});
```

### Novo Código Recomendado
```javascript
// ✅ Novo código (com todas as melhorias)
import { geminiService } from '@/services/geminiService';

const result = await geminiService.makeRequest(
  'Seu prompt',
  'Contexto opcional',
  12, // tentativas
  'chat' // tipo
);
```

### Migração Passo a Passo

1. **Importe o serviço**:
   ```javascript
   import { geminiService } from '@/services/geminiService';
   ```

2. **Substitua chamadas diretas**:
   ```javascript
   // Antes
   const response = await callGeminiAPI(prompt);

   // Depois
   const result = await geminiService.makeRequest(prompt, context, maxRetries, type);
   ```

3. **Ajuste parâmetros**:
   - Adicione contexto quando disponível
   - Defina o tipo apropriado (`chat`, `edit`, `context`)
   - Configure `maxRetries` conforme necessário

4. **Remova tratamento manual de erros**:
   - O serviço já trata fallbacks automaticamente
   - Cache offline é usado quando apropriado

## 🔧 Troubleshooting

### Problema: "Gemini falhou após todas as tentativas"

**Possíveis causas**:
- Todas as chaves API estão inválidas ou expiradas
- Não há cache disponível para o prompt
- Problema de conectividade com Google AI Studio

**Soluções**:
1. Verifique se as chaves API no `.env` são válidas
2. Teste individualmente: `await geminiService.testKey(chave)`
3. Verifique conectividade de internet
4. Aguarde alguns minutos (possível bloqueio temporário)

### Problema: "Chave API inválida detectada"

**Causa**: Uma ou mais chaves no pool estão expiradas ou incorretas.

**Solução**:
```javascript
// Teste todas as chaves
for (let i = 1; i <= 7; i++) {
  const key = import.meta.env[`VITE_GOOGLE_API_KEY_${i}`];
  if (key) {
    const valid = await geminiService.testKey(key);
    console.log(`Chave ${i}: ${valid ? 'Válida' : 'Inválida'}`);
  }
}
```

### Problema: Respostas em cache sendo usadas inesperadamente

**Causa**: Cache está sendo usado quando deveria usar Gemini.

**Verificação**:
```javascript
// Verifique quantas chaves válidas existem
const totalKeys = geminiService.apiKeys.length;
const invalidKeys = geminiService.invalidKeys.size;
console.log(`Chaves válidas: ${totalKeys - invalidKeys}`);
```

### Problema: Modelo não responde corretamente

**Solução**:
```javascript
// Teste o modelo
const working = await geminiService.testModel();
if (!working) {
  console.error('Modelo com problemas - verifique chaves API');
}
```

### Problema: Dados identificadores não estão sendo removidos

**Causa**: Texto pode conter padrões não previstos na sanitização.

**Verificação**: Revise o método `sanitizeText()` e adicione novos padrões se necessário.

### Problema: Fallback de modelo não funciona

**Sintomas**: Continua falhando mesmo com mudança de modelo.

**Causa**: Pode ser erro de chave API, não de cota.

**Solução**: Verifique logs para confirmar se é erro de cota (429) ou chave inválida (400).

## 📈 Configurações Avançadas

### Max Output Tokens
Configurável via `.env`:
```env
VITE_GEMINI_MAX_OUTPUT_TOKENS=4096
```
- **Padrão**: 4096 tokens
- **Máximo**: 8192 tokens
- **Mínimo**: 1 token

### Temperatura por Tipo
- **Chat**: 0.7 (mais criativo)
- **Edit/Context**: 0.5 (mais consistente)

### Safety Settings
Aplicadas automaticamente em todas as requisições:
- Harassment: BLOCK_MEDIUM_AND_ABOVE
- Hate Speech: BLOCK_MEDIUM_AND_ABOVE
- Explicit Content: BLOCK_MEDIUM_AND_ABOVE
- Dangerous Content: BLOCK_MEDIUM_AND_ABOVE

## 🔍 Monitoramento e Logs

O serviço gera logs detalhados para debugging:

```
🤖 GeminiService: Inicializado com X chaves API
🤖 Tentativa Y: modelo com chave Z (W chaves inválidas)
📱 Usando resposta do cache offline
❌ Chave API inválida detectada: removendo do pool
```

## 🎯 Exemplos Práticos

### Correção de Campo
```javascript
const correctedText = await geminiService.correctField(
  'descricaoCasoCompleta',
  currentText,
  'Remova dados identificadores',
  stationContext
);
```

### Geração de Contexto
```javascript
const context = await geminiService.generateStationContext({
  tituloEstacao: 'Estação de Pediatria',
  especialidade: 'Pediatria',
  nivelDificuldade: 'Intermediário',
  tempoDuracaoMinutos: 15,
  descricaoCasoCompleta: '...',
  tarefasPrincipais: '...'
});
```

### Correção de Item de Array
```javascript
const correctedItem = await geminiService.correctArrayItem(
  'informacoesVerbaisSimulado',
  0, // primeiro item
  currentItemText,
  'Melhore a clareza',
  stationContext
);
```

## 📚 Referências

- [Google AI Studio Documentation](https://makersuite.google.com/app/apikey)
- [Gemini API Reference](https://ai.google.dev/docs)
- [Firebase Functions (se aplicável)](https://firebase.google.com/docs/functions)

---

**Última atualização**: Dezembro 2024
**Versão do serviço**: 2.0.0
**Compatibilidade**: Vue 3 + Vite