# 🔧 Instruções para Teste de Depuração PEP

## Resumo da Implementação

Foi criado um **sistema completo de depuração** para identificar exatamente onde está a falha na sincronização dos subitens do PEP (Prontuário Eletrônico do Paciente).

### 📋 Componentes Criados

1. **Ferramenta de Debug Web:** `src/debug-pep-sync.html`
2. **Logs de Depuração no Frontend:** `src/pages/SimulationView.vue`
3. **Logs de Depuração no Backend:** `backend/server.js`

## 🎯 Objetivo do Teste

**Responder à pergunta:** "Por que os subitens marcados pelo ator não aparecem para o candidato, mesmo quando os eventos estão sendo emitidos e recebidos?"

## 🚀 Como Usar a Ferramenta de Depuração

### Passo 1: Acessar a Ferramenta de Debug

Abra o arquivo `src/debug-pep-sync.html` no navegador:
```
http://localhost:5173/src/debug-pep-sync.html
```

### Passo 2: Configurar a Simulação

#### Como ATOR:
1. Clique em **"Conectar como Ator"**
2. Configure:
   - **ID da Estação:** `test-station-001`
   - **Session ID:** Será gerado automaticamente
3. Copie o **Session ID** gerado

#### Como CANDIDATO:
1. Clique em **"Conectar como Candidato"**
2. Use o mesmo **Session ID** do ator
3. Aguarde a conexão estabelecida

### Passo 3: Executar o Teste

#### Opção A: Teste Manual
1. **Ator:** Marque alguns itens PEP usando os botões "Marcar Item"
2. **Ator:** Clique em **"🚀 Liberar PEP"**
3. **Ator:** Clique em **"📊 Enviar Scores"**
4. **Candidato:** Verifique se os itens aparecem marcados

#### Opção B: Simulação Automática
1. Clique em **"🚀 Simular Fluxo Completo"**
2. Observe os logs em tempo real

#### Opção C: Auto Teste Contínuo
1. Clique em **"🔄 Auto Teste"**
2. Executa 5 testes automáticos com 15s de intervalo

### Passo 4: Analisar os Logs

O console de depuração mostra em tempo real:

#### 🎭 Visão do Ator
- ✅ Conexão estabelecida
- ✅ Entrou na sessão
- ✅ Marcação de itens PEP
- ✅ Liberação do PEP
- ✅ Envio de scores

#### 🎯 Visão do Candidato
- ✅ Conexão estabelecida
- ✅ Entrou na sessão
- ✅ Recebimento de visibilidade PEP
- ✅ Recebimento de scores e marcações
- ❌ Atualização da interface (ponto crítico)

## 🔍 Pontos Críticos de Monitoramento

### 1. **Frontend → Backend**
```javascript
[PEP_DEBUG] 📤 Payload preparado: {...}
[PEP_DEBUG] ✅ Evento EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE emitido
```

### 2. **Backend → Frontend**
```javascript
[PEP_DEBUG_BACKEND] 📥 Recebido EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE
[PEP_DEBUG_BACKEND] 📤 Enviando CANDIDATE_RECEIVE_UPDATED_SCORES
[PEP_DEBUG_BACKEND] ✅ Evento CANDIDATE_RECEIVE_PEP_VISIBILITY emitido
```

### 3. **Recepção pelo Candidato**
```javascript
[PEP_VISIBILITY] 📥 Evento CANDIDATE_RECEIVE_PEP_VISIBILITY recebido
[PEP_DEBUG] 🎯 SCORES RECEIVED - markedPepItems: {...}
```

## 🎯 Cenários de Teste

### ✅ Cenário 1: Sincronização Normal
- **Esperado:** Candidato recebe marcações imediatamente
- **Log Esperado:** `🎯 SCORES RECEIVED` seguido de visualização

### ❌ Cenário 2: Falha na Sincronização
- **Problema:** Eventos emitidos mas candidato não vê marcações
- **Diagnóstico:** Verificar se `markedPepItems` chega com dados corretos

### 🔄 Cenário 3: Sincronização Tardia
- **Problema:** Dados chegam com delay significativo
- **Diagnóstico:** Verificar ordem dos eventos

## 📊 Indicadores Visuais

### 🟢 Status "Sincronizado"
- Ambos sockets conectados
- Mesmo Session ID
- Indicador verde pulsante

### 🔴 Status "Desincronizado"
- Session IDs diferentes
- Conexões instáveis
- Indicador vermelho pulsante

### 🟡 Status "Aguardando"
- Conexões em andamento
- Indicador amarelo estático

## 🐛 Como Interpretar os Logs

### ❌ Problemas Comuns

#### 1. **Condições não atendidas**
```
[PEP_DEBUG] ❌ Condições NÃO atendidas para emitir evento
  - Socket conectado: false
  - É ator/avaliador: false
  - PEP liberado: false
```
**Solução:** Verificar se `pepReleasedToCandidate.value` é `true`

#### 2. **Session ID não corresponde**
```
[PEP_VISIBILITY] ⚠️ SessionId não corresponde!
  payloadSessionId: "session-123"
  currentSessionId: "session-456"
```
**Solução:** Usar mesmo Session ID em ambos os lados

#### 3. **Payload vazio**
```
[PEP_DEBUG] 📤 Payload preparado: {markedPepItems: {}}
```
**Solução:** Verificar se há itens marcados antes de enviar

### ✅ Sinais de Sucesso

#### 1. **Evento emitido com sucesso**
```
[PEP_DEBUG] ✅ Evento EVALUATOR_SCORES_UPDATED_FOR_CANDIDATE emitido
```

#### 2. **Dados recebidos pelo candidato**
```
[PEP_DEBUG] 🎯 SCORES RECEIVED - markedPepItems: {"item-1": [true, false, true]}
```

## 📱 Teste em Dispositivos Reais

### Simulação Real:
1. **Ator:** Acesse `http://localhost:5173/simulation/test-station-001?role=actor&sessionId=session-123`
2. **Candidato:** Acesse `http://localhost:5173/simulation/test-station-001?role=candidate&sessionId=session-123`

### Console do Navegador:
Abra DevTools (F12) e monitore:
- Aba **Console:** Logs de depuração `[PEP_DEBUG]`
- Aba **Network:** Eventos WebSocket
- Aba **Application:** Session Storage

## 🏁 Conclusão do Teste

### Se funcionar corretamente:
- ✅ Ator marca item → Candidato vê item marcado
- ✅ Logs mostram fluxo completo sem erros
- ✅ Interface atualiza em tempo real

### Se falhar:
- ❌ Identificar onde o fluxo para
- ❌ Verificar se dados chegam ao candidato
- ❌ Analisar se problema é no frontend ou backend

## 📋 Relatório de Resultados

Ao final do teste, clique em **"📥 Baixar Logs"** para obter:
- Estado completo da simulação
- Timeline de eventos
- Dados de debug detalhados
- Informações de diagnóstico

## 🔧 Próximos Passos

Com base nos resultados do teste:

1. **Se problema identificado no frontend:** Corrigir lógica de atualização de interface
2. **Se problema identificado no backend:** Ajustar processamento de eventos
3. **Se problema de timing:** Implementar sincronização adequada
4. **Se problema de dados:** Verificar estrutura de `markedPepItems`

---

**🎯 Objetivo:** Com esta ferramenta, você pode identificar EXATAMENTE onde a sincronização falha e aplicar a correção necessária.
