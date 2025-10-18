# 🎨 Landing Page Templates - REVALIDAFLOW

Este diretório contém **3 templates profissionais** completamente diferentes para a landing page do REVALIDAFLOW. Cada template mantém a mesma lógica e componentes Vue, alterando apenas os estilos SCSS.

---

## 📦 Templates Disponíveis

### 1️⃣ **Medical Excellence** - Profissional e Confiável
**Pasta:** `templates/1-medical-excellence/`

**Identidade Visual:**
- 🎨 **Cores:** Azul marinho profissional (#0F172A), Cyan médico (#06B6D4), Verde saúde (#10B981)
- 🎯 **Estilo:** Corporativo, clean, confiável
- 💼 **Público:** Médicos sérios buscando preparação profissional
- ✨ **Destaques:**
  - Split diagonal no hero
  - Bento grid assimétrico para features
  - Stats bar flutuante
  - Glassmorphism sutil
  - Tabela de preços comparativa

**Quando usar:** Para transmitir credibilidade, profissionalismo e confiança médica.

---

### 2️⃣ **Tech Forward** - Moderno e Inovador
**Pasta:** `templates/2-tech-forward/`

**Identidade Visual:**
- 🎨 **Cores:** Gradientes vibrantes (Indigo #6366F1, Violeta #8B5CF6, Cyan #06B6D4)
- 🎯 **Estilo:** Tecnológico, dinâmico, futurista
- 💼 **Público:** Médicos tech-savvy que valorizam inovação
- ✨ **Destaques:**
  - Gradient mesh animado no fundo
  - Cards 3D flutuantes com glow neon
  - Partículas e animações sutis
  - Bordas com gradiente rotativo
  - Layout masonry para depoimentos

**Quando usar:** Para destacar recursos de IA, tecnologia e inovação da plataforma.

---

### 3️⃣ **Clean Swiss** - Minimalista e Elegante
**Pasta:** `templates/3-clean-swiss/`

**Identidade Visual:**
- 🎨 **Cores:** Preto (#000), Branco (#FFF), Verde médico (#059669)
- 🎯 **Estilo:** Minimalista, Swiss Design, elegante
- 💼 **Público:** Médicos que valorizam simplicidade e clareza
- ✨ **Destaques:**
  - Tipografia gigante (120px+)
  - Espaço em branco massivo (80%)
  - Scroll horizontal para features
  - Zero sombras e efeitos
  - Foco em conteúdo, não decoração

**Quando usar:** Para comunicação direta, sem distrações, focada no essencial.

---

## 🚀 Como Usar os Templates

### Opção 1: Alterar Import no LandingPage.vue

No arquivo `src/pages/landing/LandingPage.vue`, altere o import do CSS:

```vue
<!-- Opção 1: Medical Excellence -->
<style scoped lang="scss">
@import './styles/templates/1-medical-excellence/landing.scss';
</style>

<!-- Opção 2: Tech Forward -->
<style scoped lang="scss">
@import './styles/templates/2-tech-forward/landing.scss';
</style>

<!-- Opção 3: Clean Swiss -->
<style scoped lang="scss">
@import './styles/templates/3-clean-swiss/landing.scss';
</style>
```

### Opção 2: Criar Variantes da Landing Page

Você pode criar 3 versões diferentes:

```
src/pages/landing/
├── LandingPageMedical.vue     (usa template 1)
├── LandingPageTech.vue        (usa template 2)
├── LandingPageClean.vue       (usa template 3)
```

E configurar rotas no Vue Router para cada uma:

```javascript
{
  path: '/landing-medical',
  component: () => import('@/pages/landing/LandingPageMedical.vue')
},
{
  path: '/landing-tech',
  component: () => import('@/pages/landing/LandingPageTech.vue')
},
{
  path: '/landing-clean',
  component: () => import('@/pages/landing/LandingPageClean.vue')
}
```

---

## 📝 Ajustes Necessários

### 1. Remover Feynman Section

O componente `FeynmanSection.vue` foi **removido** do template pois a funcionalidade não está implementada ainda.

**Altere `LandingPage.vue`:**

```vue
<template>
  <div class="landing-page">
    <LandingHeader />
    <HeroSection id="home" />
    <FeaturesGrid id="features" />
    
    <!-- REMOVA ESTA LINHA -->
    <!-- <FeynmanSection id="feynman" /> -->
    
    <PhasesTabs id="phases" />
    <TestimonialsCarousel id="testimonials" />
    <PricingCards id="pricing" />
    <FAQAccordion id="faq" />
    <LandingFooter />
  </div>
</template>
```

### 2. Atualizar features.js

O arquivo `data/features.js` foi atualizado para remover referências ao Feynman e incluir apenas funcionalidades 100% implementadas.

---

## 🎨 Customização

### Alterar Cores

Cada template tem um arquivo `_variables.scss` onde todas as cores estão definidas:

```scss
// Exemplo: templates/1-medical-excellence/_variables.scss
$primary-cyan: #06B6D4;  // Altere aqui para mudar a cor primária
$primary-green: #10B981; // Cor de sucesso/destaque
```

### Alterar Tipografia

```scss
// _variables.scss
$font-heading: 'Inter', sans-serif;  // Fonte dos títulos
$font-body: 'Inter', sans-serif;     // Fonte do corpo
```

### Alterar Espaçamentos

```scss
// _variables.scss
$section-padding-desktop: 8rem;  // Espaçamento entre seções
$space-xl: 2rem;                 // Espaçamento padrão grande
```

---

## 🧪 Testando os Templates

### 1. Desenvolvimento Local

```bash
npm run dev
```

Acesse `http://localhost:5173` e navegue até a landing page.

### 2. Build de Produção

```bash
npm run build
npm run preview
```

### 3. A/B Testing

Para fazer A/B testing de qual template converte melhor:

1. Configure uma ferramenta de A/B testing (Google Optimize, VWO, etc.)
2. Crie variantes da página com cada template
3. Monitore métricas:
   - Taxa de clique no CTA
   - Tempo na página
   - Taxa de conversão para cadastro

---

## 📊 Comparação Rápida

| Feature | Medical Excellence | Tech Forward | Clean Swiss |
|---------|-------------------|--------------|-------------|
| **Cores** | Azul/Cyan/Verde | Gradientes vibrantes | Preto/Branco |
| **Animações** | Moderadas | Intensas | Mínimas |
| **Estilo** | Profissional | Tecnológico | Minimalista |
| **Complexidade** | Média | Alta | Baixa |
| **Performance** | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡⚡ |
| **Conversão esperada** | Alta (confiança) | Alta (inovação) | Alta (clareza) |

---

## 🐛 Troubleshooting

### Templates não aplicando

1. Verifique se o caminho do `@import` está correto
2. Limpe o cache do Vite: `rm -rf node_modules/.vite`
3. Reinicie o servidor de desenvolvimento

### Estilos conflitando

1. Certifique-se de importar apenas **um** template por vez
2. Remova o import do `landing.scss` antigo se existir
3. Use `scoped` no `<style>` tag

### Fontes não carregando

1. Verifique se as fontes estão no `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## 📚 Referências

- [Inter Font](https://rsms.me/inter/)
- [Remix Icon](https://remixicon.com/)
- [CSS Gradient Generator](https://cssgradient.io/)
- [Coolors Palette Generator](https://coolors.co/)

---

## 🤝 Contribuindo

Para adicionar um novo template:

1. Crie uma pasta `templates/4-seu-nome/`
2. Copie a estrutura de arquivos de um template existente
3. Personalize as variáveis, mixins e estilos
4. Atualize este README com as informações do novo template

---

## 📄 Licença

Estes templates são parte do projeto REVALIDAFLOW e seguem a mesma licença do projeto principal.

---

**Última atualização:** Outubro 2025
**Autor:** Equipe REVALIDAFLOW
