# 🎨 Guia Rápido - Tokens Modernos

## 📚 Referência Rápida de Classes Utilitárias

### 💎 Glassmorphism

```vue
<!-- Card básico com efeito vidro -->
<div class="rf-glass-card">
  Conteúdo
</div>

<!-- Card com blur mais forte -->
<div class="rf-glass-card-strong">
  Conteúdo
</div>
```

---

### ✨ Efeitos de Hover

```vue
<!-- Elevação no hover -->
<div class="rf-hover-lift">
  Card que sobe no hover
</div>

<!-- Elevação sutil -->
<div class="rf-hover-lift-subtle">
  Elevação menor
</div>

<!-- Scale no hover -->
<div class="rf-hover-scale">
  Card que cresce
</div>

<!-- Glow no hover -->
<div class="rf-hover-glow">
  Card com brilho
</div>
```

---

### 🎬 Animações

```vue
<!-- Shimmer (brilho deslizante) -->
<div class="rf-animated-shimmer">
  Brilho contínuo
</div>

<!-- Glare (reflexo no hover) -->
<button class="rf-animated-glare">
  Reflexo ao passar mouse
</button>

<!-- Pulse (pulsação) -->
<div class="rf-animated-pulse">
  Pulsação contínua
</div>

<!-- Float (flutuação) -->
<div class="rf-animated-float">
  Movimento vertical suave
</div>
```

---

### 🌈 Gradientes de Texto

```vue
<!-- Gradiente primário (roxo) -->
<h1 class="rf-text-gradient-primary">
  Título com Gradiente
</h1>

<!-- Gradiente accent (rosa) -->
<h2 class="rf-text-gradient-accent">
  Subtítulo Colorido
</h2>
```

---

### 🎨 Backgrounds com Gradiente

```vue
<!-- Gradiente primário -->
<div class="rf-bg-gradient-primary">
  Fundo roxo
</div>

<!-- Gradiente accent -->
<div class="rf-bg-gradient-accent">
  Fundo rosa
</div>

<!-- Gradiente success -->
<div class="rf-bg-gradient-success">
  Fundo azul-verde
</div>
```

---

### 💡 Overlays de Luz

```vue
<!-- Overlay de luz (esquerda inferior) -->
<div class="rf-light-overlay">
  <p>Conteúdo com iluminação</p>
</div>

<!-- Overlay alternativo (direita superior) -->
<div class="rf-light-overlay-alt">
  <p>Conteúdo com iluminação</p>
</div>
```

---

### 🏷️ Badges e Chips

```vue
<!-- Badge moderno com animação -->
<span class="rf-badge-modern">
  Novo
</span>

<!-- Chip com glassmorphism -->
<span class="rf-chip-glass">
  Premium
</span>
```

---

## 🎯 Tokens CSS (Variáveis)

### Gradientes
```scss
var(--rf-gradient-primary)        // Roxo
var(--rf-gradient-accent)         // Rosa
var(--rf-gradient-success)        // Azul-verde
var(--rf-gradient-warning)        // Verde-ciano
```

### Glassmorphism
```scss
var(--rf-glass-bg)               // Fundo translúcido
var(--rf-glass-border)           // Borda translúcida
var(--rf-glass-blur)             // Blur padrão (20px)
var(--rf-glass-blur-strong)      // Blur forte (30px)
var(--rf-glass-blur-subtle)      // Blur sutil (10px)
```

### Sombras
```scss
var(--rf-shadow-card)            // Sombra de card
var(--rf-shadow-card-hover)      // Sombra no hover
var(--rf-shadow-hero)            // Sombra grande
var(--rf-shadow-primary)         // Sombra colorida (roxo)
var(--rf-shadow-success)         // Sombra colorida (verde)
```

### Bordas
```scss
var(--rf-radius-sm)              // 12px
var(--rf-radius-md)              // 16px
var(--rf-radius-lg)              // 20px
var(--rf-radius-xl)              // 24px
var(--rf-radius-2xl)             // 28px
var(--rf-radius-full)            // 9999px (circular)
```

### Transições
```scss
var(--rf-transition-fast)        // 0.2s
var(--rf-transition-normal)      // 0.3s
var(--rf-transition-slow)        // 0.5s
var(--rf-ease-smooth)            // cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 🔥 Exemplos Práticos

### Card Completo Moderno
```vue
<template>
  <div class="modern-card rf-glass-card rf-hover-lift rf-animated-shimmer">
    <div class="card-icon rf-animated-float">
      <v-icon icon="ri-star-line" size="48" />
    </div>
    <h3 class="rf-text-gradient-primary">Título</h3>
    <p>Descrição do card</p>
    <v-btn class="rf-animated-glare">
      Ação
    </v-btn>
  </div>
</template>

<style scoped>
.modern-card {
  padding: 2rem;
  text-align: center;
}

.card-icon {
  margin-bottom: 1rem;
}
</style>
```

### Botão com Efeitos
```vue
<template>
  <button class="custom-btn rf-animated-glare rf-hover-lift">
    <v-icon icon="ri-rocket-line" />
    Começar Agora
  </button>
</template>

<style scoped>
.custom-btn {
  background: var(--rf-gradient-primary);
  color: white;
  padding: 1rem 2rem;
  border-radius: var(--rf-radius-full);
  border: none;
  box-shadow: var(--rf-shadow-primary);
  transition: all var(--rf-transition-normal) var(--rf-ease-smooth);
  cursor: pointer;
}

.custom-btn:hover {
  box-shadow: var(--rf-shadow-primary-hover);
}
</style>
```

### Hero Section
```vue
<template>
  <section class="hero rf-light-overlay">
    <div class="hero-content rf-glass-card">
      <h1 class="rf-text-gradient-primary rf-animated-shimmer">
        Bem-vindo ao RevalidaFlow
      </h1>
      <p>Sua plataforma de treinamento médico</p>
      <div class="hero-stats">
        <span class="rf-badge-modern rf-animated-pulse">
          500+ Estações
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.hero-content {
  max-width: 600px;
  padding: 3rem;
  text-align: center;
}

.hero-stats {
  margin-top: 2rem;
}
</style>
```

---

## 🎨 Combinações Recomendadas

### Card Interativo
```
rf-glass-card + rf-hover-lift + rf-animated-shimmer
```

### Botão Moderno
```
rf-animated-glare + rf-hover-lift-subtle
```

### Título Impactante
```
rf-text-gradient-primary + rf-animated-shimmer
```

### Badge Chamativo
```
rf-badge-modern + rf-animated-pulse
```

### Section com Profundidade
```
rf-light-overlay + rf-glass-card-strong
```

---

## ⚠️ Boas Práticas

### ✅ Fazer
- Combinar no máximo 3 classes utilitárias por elemento
- Usar `rf-hover-*` apenas em elementos interativos
- Aplicar animações sutis em elementos secundários
- Testar em dark mode sempre
- Verificar performance em mobile

### ❌ Evitar
- Usar múltiplas animações no mesmo elemento
- Aplicar blur excessivo (>30px)
- Combinar `rf-animated-shimmer` com `rf-animated-glare`
- Usar animações em listas longas
- Esquecer fallbacks para navegadores antigos

---

## 🌙 Dark Mode

Todos os tokens adaptam-se automaticamente:

```vue
<!-- Funciona em ambos os temas -->
<div class="rf-glass-card">
  Conteúdo adaptável
</div>
```

Tokens que mudam automaticamente:
- `--rf-glass-bg`
- `--rf-glass-border`
- `--rf-shadow-card`
- `--rf-shadow-hero`

---

## 📱 Responsividade

Classes já incluem media queries:

```scss
// Desktop: efeitos completos
// Mobile (≤768px): efeitos reduzidos automaticamente
```

Para customizar:
```scss
@media (max-width: 768px) {
  .meu-elemento {
    // Ajustes mobile
  }
}
```

---

## 🚀 Performance

### Otimizações Implementadas
- ✅ Animações com `transform` e `opacity`
- ✅ `will-change` evitado (overhead)
- ✅ Blur limitado em mobile
- ✅ Animações desabilitadas em `prefers-reduced-motion`

### Monitorar
```javascript
// Chrome DevTools > Performance
// Verificar FPS durante animações
// Objetivo: 60 FPS constante
```

---

## 🔗 Links Úteis

- [Documentação Completa](./MELHORIAS_VISUAIS_STATIONLIST.md)
- [Tokens CSS](../src/assets/styles/modern-tokens.scss)
- [Componentes Exemplo](../src/components/station/)

---

**Última Atualização**: Novembro 2025

