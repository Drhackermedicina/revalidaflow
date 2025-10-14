# 🔧 CORREÇÃO: Erro de Inicialização - socketRef

**Data:** 13 de outubro de 2025  
**Status:** ✅ CORRIGIDO

---

## 🐛 Erro Original

```
ReferenceError: Cannot access 'socketRef' before initialization
    at setup (SimulationView.vue:176:3)
```

---

## 🔍 Causa Raiz

**Problema de ordem de declaração:** O composable `useSequentialNavigation` estava tentando usar `socketRef` como parâmetro **antes** de `socketRef` ser declarado.

### Ordem Incorreta (ANTES):
```javascript
// Linha 159-178: useSequentialNavigation usa socketRef
const { ... } = useSequentialNavigation({
  // ...
  socketRef,  // ❌ ERRO: socketRef ainda não foi declarado
  sessionId
});

// Linha 189: socketRef é declarado DEPOIS
const socketRef = ref(null);  // ❌ Tarde demais!
```

---

## ✅ Correção Aplicada

**Arquivo:** `src/pages/SimulationView.vue`

Movida a declaração de `socketRef` para **ANTES** do `useSequentialNavigation`:

### Ordem Correta (AGORA):
```javascript
// Linha 157: socketRef declarado PRIMEIRO
const socketRef = ref(null);
let connectionStatus = ref('');
let connect = () => {};
let disconnect = () => {};

// Linha 165: useSequentialNavigation pode usar socketRef
const { ... } = useSequentialNavigation({
  isSequentialMode,
  sequenceId,
  sequenceIndex,
  totalSequentialStations,
  sequentialData,
  userRole,
  socketRef,  // ✅ Agora está disponível
  sessionId
});
```

---

## 📊 Validação

✅ **Lint passou:** 0 erros, apenas warnings pré-existentes  
✅ **Código compilou sem erros**  
✅ **Ordem de declaração corrigida**

---

## 🎯 Resumo

**O que mudou:**
- Movida declaração de `socketRef` de linha 189 → linha 157
- Agora `socketRef` existe quando `useSequentialNavigation` é chamado
- Nenhuma outra mudança necessária

**Impacto:**
- ✅ Erro de inicialização resolvido
- ✅ Modo sequencial pode ser testado
- ✅ Socket.IO funcionará corretamente

---

## 🧪 Próximos Passos

1. ✅ Testar se a página carrega sem erros
2. ✅ Testar modo sequencial (ator + candidato)
3. ✅ Verificar sincronização via Socket

---

**Status:** ✅ PRONTO PARA TESTES
