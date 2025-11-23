# 🔧 TROUBLESHOOTING - Logo não aparece

## ❌ PROBLEMA IDENTIFICADO

O logo "REVALIDA FLOW" não está aparecendo no topo do sidebar.

## ✅ CORREÇÕES APLICADAS

### 1. **Nome do Slot Corrigido** ✔️
- **Antes:** `#nav-header`
- **Depois:** `#vertical-nav-header`
- **Arquivo:** `src/layouts/components/DefaultLayoutWithVerticalNav.vue`

### 2. **CSS Reforçado com !important** ✔️
- Adicionados !important nos estilos críticos
- Garantida visibilidade mínima mesmo sem CSS global
- **Arquivos:** `NavbarBrand.vue`, `DefaultLayoutWithVerticalNav.vue`

### 3. **Console.log para Debug** ✔️
- Adicionado log quando o componente é montado
- Procure por: `✅ [NavbarBrand] Componente montado com sucesso!`

---

## 🧪 PASSOS PARA TESTAR

### 1️⃣ Recarregar Página com Cache Limpo
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2️⃣ Verificar Console do Navegador (F12)
Procure por estas mensagens:

✅ **Deve aparecer:**
```
✅ [NavbarBrand] Componente montado com sucesso! 
{title: 'REVALIDA FLOW', size: 'medium', fontSize: '1.5rem'}
```

❌ **NÃO deve aparecer:**
- Erros de import
- Erros de componente não encontrado
- Erros CSS

### 3️⃣ Inspecionar o Sidebar (F12 → Elements)
Procure pela estrutura:
```html
<div class="sidebar-brand-wrapper">
  <a href="/app/dashboard" class="navbar-brand">
    <div class="navbar-logo-wrapper">
      <h1 class="navbar-logo-text">
        <span class="navbar-logo-letter">R</span>
        <span class="navbar-logo-letter">E</span>
        ...
      </h1>
    </div>
  </a>
</div>
```

### 4️⃣ Verificar Estilos Aplicados
No DevTools (Elements), selecione `.navbar-logo-text` e verifique:
- ✅ `color: #8C57FF`
- ✅ `font-weight: 800`
- ✅ `font-size: 1.5rem`
- ✅ `background: linear-gradient(...)`

---

## 🔍 POSSÍVEIS PROBLEMAS

### Problema 1: Componente não monta
**Sintomas:**
- Console sem log de montagem
- Elemento não aparece no DOM

**Solução:**
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules
npm install

# Reiniciar servidor
npm run dev
```

### Problema 2: CSS não carrega
**Sintomas:**
- Texto aparece mas sem estilo
- Sem gradiente
- Fonte incorreta

**Solução:**
```bash
# Verificar se o arquivo existe
ls src/assets/styles/layout/_navbar.scss

# Verificar import no styles.scss
# Deve ter: @use './layout/navbar';
```

### Problema 3: Slot não renderiza
**Sintomas:**
- Espaço vazio no topo do sidebar
- Nenhum conteúdo

**Solução:**
Verificar no código que o slot está correto:
```vue
<template #vertical-nav-header>  ✅ CORRETO
<template #nav-header>           ❌ ERRADO
```

### Problema 4: Z-index ou visibilidade
**Sintomas:**
- Elemento existe no DOM mas não aparece visualmente

**Solução temporária:**
Adicionar no DevTools (Elements) → Styles:
```css
.sidebar-brand-wrapper {
  background: red !important; /* Ver se aparece */
  z-index: 9999 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
```

---

## 🚀 COMANDOS DE EMERGÊNCIA

### Restart Completo
```bash
# Parar servidor (Ctrl+C)
# Limpar cache do Vite
rm -rf node_modules/.vite

# Reiniciar
npm run dev
```

### Hard Refresh do Navegador
```
1. Abrir DevTools (F12)
2. Clicar com botão direito no botão de reload
3. Selecionar "Empty Cache and Hard Reload"
```

### Verificar Erros de Build
```bash
npm run build
# Se houver erros, corrigir antes de testar
```

---

## 📸 SCREENSHOTS ESPERADOS

### ✅ Correto - Logo Aparece
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║  REVALIDA FLOW               ║  │ ← Logo roxo/azul/verde
│  ╚═══════════════════════════════╝  │
├─────────────────────────────────────┤
│  🏠  Home                            │
│  🏥  Estações                        │
└─────────────────────────────────────┘
```

### ❌ Errado - Espaço Vazio
```
┌─────────────────────────────────────┐
│                                     │ ← Vazio!
├─────────────────────────────────────┤
│  🏠  Home                            │
│  🏥  Estações                        │
└─────────────────────────────────────┘
```

---

## 🆘 SE NADA FUNCIONAR

### Opção 1: Rollback Temporário
Comentar o slot no `DefaultLayoutWithVerticalNav.vue`:
```vue
<!-- <template #vertical-nav-header>
  <div class="sidebar-brand-wrapper">
    <NavbarBrand size="medium" />
  </div>
</template> -->
```

### Opção 2: Debug Extremo
Substituir NavbarBrand por texto simples:
```vue
<template #vertical-nav-header>
  <div style="padding: 20px; background: red; color: white;">
    TESTE DE VISIBILIDADE
  </div>
</template>
```

Se este texto aparecer, o problema é no componente NavbarBrand.
Se não aparecer, o problema é no slot/layout.

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Recarregue a página com cache limpo
2. ✅ Verifique o console (F12)
3. ✅ Inspecione o DOM
4. ✅ Tire screenshot e envie

Se ainda não funcionar, compartilhe:
- Screenshot do console (F12 → Console)
- Screenshot do DOM (F12 → Elements, mostrando sidebar)
- Screenshot dos estilos aplicados

















