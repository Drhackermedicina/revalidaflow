# Sistema de Marcação do PEP - Documentação Técnica

## Problema Original

### Sintoma
- Títulos do PEP não eram marcados corretamente
- Marcar um subitem desmarcava o título
- Estado de marcação era perdido após operações

### Causa Raiz
O sistema inicial usava `array[-1]` para armazenar o estado de marcação dos títulos. Porém, em JavaScript:

1. **Arrays com índices negativos são propriedades de objeto**, não elementos do array
2. **O spread operator `[...array]` não copia propriedades não-enumeráveis**
3. Quando fazíamos `[...markedPepItems.value[itemId]]`, o índice -1 era perdido

```javascript
// ❌ Problema - índice -1 se perde no spread
const arr = [];
arr[-1] = true;  // Define propriedade, não elemento do array
arr[0] = false;
arr[1] = false;

const copy = [...arr];  // Copia apenas [false, false]
console.log(copy[-1]);  // undefined ❌ - propriedade perdida!
```

## Solução Implementada

### Estratégia: Índice Fixo Alto (999)
Usar um índice numérico alto (999) em vez de -1 para armazenar o estado do título:

```javascript
const TITLE_INDEX = 999;

// Interface externa mantém -1 para simplicidade
function togglePepItemMark(itemId: string, pointIndex: number) {
  // Tradução interna: -1 → 999
  const actualIndex = pointIndex === -1 ? TITLE_INDEX : pointIndex;
  
  // Array agora pode ser copiado com spread operator
  const currentItemMarks = [...markedPepItems.value[itemId]];
  currentItemMarks[actualIndex] = !currentItemMarks[actualIndex];
  
  markedPepItems.value[itemId] = currentItemMarks;
}
```

### Vantagens
✅ Spread operator funciona corretamente  
✅ Títulos e subitens são completamente independentes  
✅ Interface externa permanece limpa (usa -1)  
✅ Conversão é transparente para os componentes  

## Arquivos Modificados

### 1. `src/composables/useSimulationPEP.ts`
**Responsabilidade**: Lógica de negócio e estado

```typescript
const TITLE_INDEX = 999;

function togglePepItemMark(itemId: string, pointIndex: number) {
  // Traduz -1 → 999 internamente
  const actualIndex = pointIndex === -1 ? TITLE_INDEX : pointIndex;
  // ... resto da lógica
}

function isPointMarked(itemId: string, pointIndex: number): boolean {
  const actualIndex = pointIndex === -1 ? TITLE_INDEX : pointIndex;
  return markedPepItems.value[itemId]?.[actualIndex] === true;
}
```

### 2. `src/components/PepSideView.vue`
**Responsabilidade**: Visualização do PEP lateral

```javascript
const TITLE_INDEX = 999;

function itemMarked(item, subIndex = null) {
  // ... validações ...
  
  // Traduz índice -1 para 999
  const actualIndex = subIndex === -1 ? TITLE_INDEX : subIndex;
  return Array.isArray(marks) && !!marks[actualIndex];
}

// Template continua usando -1
// @click="() => handleClick(item, -1)"
```

### 3. `src/components/CandidateChecklist.vue`
**Responsabilidade**: Checklist principal do candidato

```javascript
const TITLE_INDEX = 999;

function isSubItemMarked(itemId, subIndex) {
  // Traduz índice -1 para 999
  const actualIndex = subIndex === -1 ? TITLE_INDEX : subIndex;
  return marks[actualIndex] === true;
}

function isTitleMarked(itemId) {
  return isSubItemMarked(itemId, -1); // Interface externa usa -1
}
```

## Fluxo Completo

```
┌─────────────────────────────────────────┐
│ 1. Usuário clica no título do PEP      │
│    (componente PepSideView ou           │
│     CandidateChecklist)                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. handleClick(item, -1)                │
│    Component passa índice -1 para       │
│    indicar "título"                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. togglePepItemMark(itemId, -1)        │
│    Composable recebe -1                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 4. const actualIndex = -1 === -1        │
│      ? 999 : -1                         │
│    Traduz -1 → 999 internamente         │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 5. currentItemMarks[999] = !value       │
│    Armazena em índice 999 do array     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 6. markedPepItems.value[itemId] =       │
│    currentItemMarks                     │
│    Estado persistido no ref reativo     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 7. itemMarked(item, -1)                 │
│    Component verifica estado com -1     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 8. return marks[999] === true           │
│    Traduz -1 → 999 e retorna estado     │
└─────────────────────────────────────────┘
```

## Estrutura de Dados

```javascript
markedPepItems.value = {
  'item-id-1': [
    false,  // índice 0: subitem (1)
    true,   // índice 1: subitem (2)
    false,  // índice 2: subitem (3)
    // ... índices 3-998 vazios ...
    true    // índice 999: TÍTULO ✅
  ],
  'item-id-2': [
    true,   // índice 0: subitem (1)
    // ... índices 1-998 vazios ...
    false   // índice 999: TÍTULO
  ]
}
```

## Boas Práticas

### ✅ FAÇA
- Use `-1` na interface externa (componentes, templates)
- Traduza `-1` → `999` apenas internamente
- Mantenha a constante `TITLE_INDEX = 999` sincronizada em todos os arquivos
- Documente a conversão em comentários

### ❌ NÃO FAÇA
- Não use `array[-1]` diretamente para armazenar valores importantes
- Não dependa de propriedades de objeto em arrays que serão copiados
- Não esqueça de aplicar a tradução em TODAS as funções de verificação

## Testes Sugeridos

```javascript
// Teste 1: Marcar título não deve afetar subitens
toggle('item-1', -1);  // Marca título
assert(isMarked('item-1', -1) === true);
assert(isMarked('item-1', 0) === false);  // Subitem 0 não afetado

// Teste 2: Marcar subitem não deve afetar título
toggle('item-1', 0);  // Marca subitem 0
assert(isMarked('item-1', 0) === true);
assert(isMarked('item-1', -1) === true);  // Título mantém estado anterior

// Teste 3: Spread operator preserva estado
const original = markedPepItems.value['item-1'];
const copy = [...original];
assert(copy[999] === original[999]);  // Título preservado ✅
```

## Alternativas Consideradas

### Opção 1: Objeto em vez de Array ❌
```javascript
markedPepItems.value[itemId] = {
  title: true,
  items: [false, true, false]
}
```
**Desvantagem**: Requer refatoração completa de toda a lógica existente

### Opção 2: Map em vez de Object ❌
```javascript
const markedPepItems = new Map();
markedPepItems.set('item-1', { title: true, items: [] });
```
**Desvantagem**: Maps não são reativos no Vue 3 sem wrappers especiais

### Opção 3: Índice 999 (ESCOLHIDA) ✅
**Vantagens**:
- Mínima alteração no código existente
- Mantém reatividade do Vue
- Interface externa permanece inalterada
- Spread operator funciona perfeitamente

## Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2025-10-06 | 1.0 | Implementação inicial com índice 999 |
| 2025-10-06 | 1.1 | Adicionado suporte em CandidateChecklist.vue |
| 2025-10-06 | 1.2 | Corrigida função itemMarked em PepSideView.vue |

## Referências

- [MDN - Array Spread Syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [Vue 3 - Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [JavaScript Array vs Object Properties](https://stackoverflow.com/questions/5448545/how-to-use-array-in-javascript)

---

**Autor**: Sistema de Refatoração RevalidaFlow  
**Última Atualização**: 6 de outubro de 2025
