# Guia Rápido de Teste: Modo Sequencial

**Status**: ✅ Pronto para testar  
**Correção aplicada**: Delay de 500ms antes de navegação

---

## 🎯 O Que Foi Corrigido

### Problema
Socket do ator desconectava **ANTES** de processar o evento SERVER_SEQUENTIAL_ADVANCE, resultando em:
- URL sem sessionId (undefined)
- Candidato criando sessão sozinho
- Ator não conseguindo conectar
- Sincronização quebrada

### Solução
Aumentado delay de **100ms → 500ms** antes de navegar, garantindo que:
- Evento seja recebido
- sessionId seja gerado
- Logs sejam exibidos
- **ENTÃO** navegação acontece

---

## 🧪 Como Testar

### Preparação

1. **Certifique-se de que o backend está rodando**:
   ```powershell
   cd backend
   npm start
   ```

2. **Inicie o frontend**:
   ```powershell
   npm run dev
   ```

3. **Abra duas janelas do navegador** (ou uma normal + uma anônima):
   - Janela 1: **Ator**
   - Janela 2: **Candidato**

---

### Teste Básico (3 Estações)

#### Passo 1: Criar Sequência

1. **Ator**: Faça login
2. Navegue para **Simulações → Criar Sequência**
3. Selecione **3 estações** diferentes
4. Clique em **"Iniciar Sequência"**

#### Passo 2: Convidar Candidato

1. **Ator**: Copie o link de convite exibido
2. **Candidato**: Abra o link em outra janela/navegador
3. **Candidato**: Faça login

#### Passo 3: Estação 1

**Verifique nos consoles de ambos**:

```bash
# ATOR
[WebSocket] 🔌 Conectando - actor - Session: session_xxx
[Sequential] 📥 Modo sequencial ativado - Index: 0 / 3

# CANDIDATO
[WebSocket] 🔌 Conectando - candidate - Session: session_xxx (MESMO ID!)
[Sequential] 📥 Modo sequencial ativado - Index: 0 / 3
```

**Ações**:
- ✅ Verifique que ambos conectaram (indicador verde)
- ✅ **Candidato** clica **"Estou Pronto"** (MANUALMENTE)
- ✅ Simulação inicia automaticamente
- ✅ Execute a simulação normalmente
- ✅ **Ator** termina clicando **"Terminar Simulação"**

#### Passo 4: Transição 1 → 2

**🔍 PONTO CRÍTICO - Verifique os logs**:

```bash
# ATOR (DEVE APARECER!)
[Sequential] 📥 Avançando - Index: 1

# CANDIDATO (DEVE APARECER!)
[Sequential] 📥 Avançando - Index: 1
```

**O que deve acontecer**:
- ✅ Ambas as páginas aguardam ~500ms
- ✅ Ambos navegam automaticamente para a estação 2
- ✅ URLs de ambos contêm `sessionId=session_yyy` (NÃO undefined!)

**❌ O que NÃO deve acontecer**:
- ❌ Ator com URL sem sessionId
- ❌ Mensagem "Aguardando parceiro..."
- ❌ Candidato conectado sozinho

#### Passo 5: Estação 2

**Verifique nos consoles**:

```bash
# ATOR
[WebSocket] 🔌 Conectando - actor - Session: session_yyy (NOVO ID!)
[Sequential] 📥 Modo sequencial ativado - Index: 1 / 3
[AUTO-READY] ✅ Ator/Avaliador marcando-se como pronto automaticamente

# CANDIDATO
[WebSocket] 🔌 Conectando - candidate - Session: session_yyy (DIFERENTE, mas SINCRONIZADO!)
[Sequential] 📥 Modo sequencial ativado - Index: 1 / 3
```

**Ações**:
- ✅ Verifique que ambos conectaram na MESMA sessão
- ✅ Ator já está pronto (auto-ready)
- ✅ **Candidato** clica **"Estou Pronto"** (MANUALMENTE)
- ✅ Simulação inicia
- ✅ Execute e termine

#### Passo 6: Transição 2 → 3

**Verifique os logs novamente**:

```bash
[Sequential] 📥 Avançando - Index: 2
```

**O que deve acontecer**:
- ✅ Ambos navegam para estação 3
- ✅ URLs com sessionId (não undefined)
- ✅ Sincronização mantida

#### Passo 7: Estação 3

**Mesma verificação**:
- ✅ Ambos conectam
- ✅ Auto-ready para ator
- ✅ Candidato clica manualmente
- ✅ Simulação final completa
- ✅ Sequência encerrada com sucesso! 🎉

---

## 🚨 Problemas a Observar

### ❌ Ator com sessionId undefined

**Sintoma**: URL do ator na estação 2 é `/simulation/station2?role=actor&...` (sem sessionId)

**Causa**: Socket desconectou antes de receber evento (delay insuficiente)

**Verificação**: Console do ator NÃO mostra log `[Sequential] 📥 Avançando`

**Solução**: Se isso acontecer, aumentar delay de 500ms para 750ms ou 1000ms

### ❌ Candidato cria sessão sozinho

**Sintoma**: Ator vê "Aguardando parceiro..." na estação 2

**Causa**: Ator não navegou corretamente (sessionId undefined)

**Verificação**: Ator não conectou na mesma sessão que candidato

**Solução**: Verificar logs do backend para confirmar desconexão prematura

### ❌ Auto-ready no candidato

**Sintoma**: Candidato marca "Estou Pronto" automaticamente

**Causa**: Lógica de auto-ready incorreta

**Verificação**: Console do candidato mostra `[AUTO-READY]` (não deveria)

**Solução**: Verificar condição em setupSession (linha ~985)

---

## 📊 Logs do Backend Esperados

### ✅ Logs Corretos

```bash
# Criação da sessão na estação 1
[SESSION] ✅ Sessão criada: session_xxx
[SOCKET] 🔗 Participante conectou: actor (socketId: abc123)
[SOCKET] 🔗 Participante conectou: candidate (socketId: def456)

# Transição para estação 2
[SEQUENTIAL] 📤 Emitindo ACTOR_ADVANCE_SEQUENTIAL
[SEQUENTIAL] 📤 Emitindo para actor: socketId abc123
[SEQUENTIAL] 📤 Emitindo para candidate: socketId def456
[SEQUENTIAL] ✅ Evento SERVER_SEQUENTIAL_ADVANCE emitido

# IMPORTANTE: Aguardar ~500ms

[DESCONEXÃO] Cliente desconectado: abc123, Razão: transport close
[DESCONEXÃO] Cliente desconectado: def456, Razão: transport close

# Conexões na estação 2
[SESSION] ✅ Sessão criada: session_yyy
[SOCKET] 🔗 Participante conectou: actor (socketId: ghi789)
[SOCKET] 🔗 Participante conectou: candidate (socketId: jkl012)
```

### ❌ Logs Problemáticos

```bash
# Desconexão IMEDIATA (antes do delay)
[SEQUENTIAL] 📤 Emitindo para actor: socketId abc123
[DESCONEXÃO] Cliente desconectado: abc123, Razão: transport close  ← MUITO RÁPIDO!
```

Se isso acontecer, o delay não está funcionando corretamente.

---

## 📋 Checklist de Sucesso

Marque conforme testa:

### Estação 1
- [ ] Ator conecta com sessionId
- [ ] Candidato conecta com MESMO sessionId
- [ ] Ambos veem indicador verde (conectado)
- [ ] Candidato clica "Estou Pronto" manualmente
- [ ] Simulação inicia automaticamente
- [ ] Simulação completa normalmente

### Transição 1 → 2
- [ ] Console do ATOR mostra `[Sequential] 📥 Avançando - Index: 1`
- [ ] Console do CANDIDATO mostra `[Sequential] 📥 Avançando - Index: 1`
- [ ] Delay visível (~500ms)
- [ ] Ambos navegam automaticamente

### Estação 2
- [ ] URL do ATOR contém `sessionId=session_yyy` (NÃO undefined)
- [ ] URL do CANDIDATO contém `sessionId=session_zzz`
- [ ] Ambos conectam na MESMA sessão (indicador verde)
- [ ] Ator está pronto automaticamente
- [ ] Candidato clica "Estou Pronto" manualmente
- [ ] Simulação funciona normalmente

### Transição 2 → 3
- [ ] Logs de "Avançando" aparecem para ambos
- [ ] Navegação automática ocorre

### Estação 3
- [ ] URLs com sessionId válido
- [ ] Conexão sincronizada
- [ ] Simulação final completa
- [ ] Sequência encerrada com sucesso

---

## 💡 Dicas de Troubleshooting

### Limpar Cache

Se houver comportamento estranho, limpe:

```javascript
// Console do navegador (F12)
sessionStorage.clear();
localStorage.clear();
```

Depois recarregue a página.

### Verificar Rede

Abra DevTools (F12) → Aba **Network** → Filtro **WS** (WebSocket)

Verifique:
- ✅ Conexão WebSocket estabelecida
- ✅ Mensagens sendo trocadas
- ❌ Desconexões frequentes

### Latência de Rede

Se estiver testando em rede lenta, considere aumentar delay:

```javascript
// SimulationView.vue, linha ~750
setTimeout(() => {
  window.location.replace(routeData.href);
}, 1000); // ← Aumentar para 1000ms em redes lentas
```

---

## 📞 Reportar Problemas

Se algo não funcionar, **copie e cole**:

1. **Logs completos do console** (ambos ator e candidato)
2. **Logs do backend** (últimos 50 linhas)
3. **URLs das páginas** (mostre se tem ou não sessionId)
4. **Screenshots** (se possível)

---

**Última atualização**: 13/10/2025  
**Testado em**: Aguardando validação do usuário
