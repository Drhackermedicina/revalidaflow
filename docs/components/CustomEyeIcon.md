# CustomEyeIcon

## Descrição

O `CustomEyeIcon` é um componente de ícone de olho personalizado com design geométrico moderno, desenvolvido para substituir os ícones padrão `ri-eye-line` e `ri-eye-off-line` no projeto RevalidaFlow. O componente possui suporte a temas claro e escuro, animações sutis e transições suaves entre os estados de olho aberto e fechado.

## Características

- Design geométrico moderno exclusivo
- Suporte a temas claro e escuro do Vuetify
- Animações suaves de hover e transição
- Responsivo e acessível
- Cores dinâmicas baseadas no tema atual
- Animação de piscar no estado fechado

## Propriedades (Props)

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `isOpen` | `Boolean` | `true` | Controla se o olho está aberto (true) ou fechado (false) |
| `size` | `Number` | `24` | Define o tamanho do ícone em pixels. Recomendado: 32px para máxima visibilidade |
| `color` | `String` | `null` | Cor personalizada (opcional). Se não definida, usa a cor primária do tema |

## Eventos

O componente não emite eventos.

## Instalação e Uso

### Importação

```vue
<script setup>
import CustomEyeIcon from '@/components/CustomEyeIcon.vue'
</script>
```

### Uso Básico

```vue
<template>
  <!-- Olho aberto (padrão) -->
  <CustomEyeIcon />
  
  <!-- Olho fechado -->
  <CustomEyeIcon :is-open="false" />
  
  <!-- Tamanho personalizado (padrão recomendado) -->
    <CustomEyeIcon :size="32" />
  
  <!-- Cor personalizada -->
  <CustomEyeIcon color="#ff6b6b" />
</template>
```

### Uso com Vuetify

```vue
<template>
  <!-- Em botões -->
  <VBtn icon variant="text" @click="togglePassword">
    <CustomEyeIcon :is-open="showPassword" />
  </VBtn>
  
  <!-- Em campos de senha com slots -->
  <VTextField
    :type="showPassword ? 'text' : 'password'"
    label="Senha"
  >
    <template #append-inner>
      <VBtn
        icon
        variant="text"
        size="small"
        @click="showPassword = !showPassword"
      >
        <CustomEyeIcon :is-open="showPassword" :size="32" />
      </VBtn>
    </template>
  </VTextField>
</template>
```

### Exemplo com Estado Reactivo

```vue
<script setup>
import { ref } from 'vue'
import CustomEyeIcon from '@/components/CustomEyeIcon.vue'

const showPassword = ref(false)
const showPEP = ref(true)
</script>

<template>
  <div>
    <!-- Toggle de senha -->
    <VBtn @click="showPassword = !showPassword">
      <CustomEyeIcon :is-open="showPassword" />
      <span class="ml-2">{{ showPassword ? 'Ocultar' : 'Mostrar' }} Senha</span>
    </VBtn>
    
    <!-- Toggle de PEP -->
    <VBtn @click="showPEP = !showPEP">
      <CustomEyeIcon :is-open="showPEP" />
      <span class="ml-2">{{ showPEP ? 'Ocultar' : 'Mostrar' }} PEP</span>
    </VBtn>
  </div>
</template>
```

## Estilo e Design

### Cores

O componente utiliza cores dinâmicas do Vuetify:

- **Cor primária**: `rgb(var(--v-theme-primary))`
- **Cor de hover**: `rgba(var(--v-theme-primary), 0.8)`
- **Cor de foco**: `rgba(var(--v-theme-primary), 0.3)`

### Animações

O componente inclui as seguintes animações:

1. **Hover**: Transformação de escala e ajuste de opacidade
2. **Transição**: Suave transição entre estados aberto/fechado (0.3s)
3. **Piscar**: Animação de piscar no estado fechado (2s infinita)

### Design Geométrico

O ícone possui um design moderno com:
- Forma geométrica simplificada
- Linhas limpas e contemporâneas
- Proporções equilibradas
- Visual consistente em diferentes tamanhos
- Otimizado para 32px em campos de senha e botões para máxima visibilidade

## Acessibilidade

O componente é acessível por padrão:
- Possui `aria-hidden="true"` quando usado em elementos decorativos
- Mantém contraste adequado em ambos os temas
- Suporta navegação por teclado quando integrado com elementos interativos

## Implementação Técnica

O componente utiliza:
- Vue 3 Composition API com `<script setup>`
- SVG inline para melhor performance
- CSS variables do Vuetify para tema dinâmico
- Transições CSS para animações suaves

## Localização dos Arquivos

- Componente principal: `src/components/CustomEyeIcon.vue`
- Documentação: `docs/components/CustomEyeIcon.md`

## Substituições Realizadas

O componente substituiu os seguintes ícones no projeto:

1. **ActorScriptPanel.vue**: Ícones de mostrar/ocultar PEP (32px) e impressos (32px)
2. **AccountSettingsSecurity.vue**: Ícones dos campos de senha (32px)
3. **Historico.vue**: Ícone de visualização de simulações (32px)

## Recomendações de Tamanho

- **Campos de senha**: 32px (padrão recomendado para máxima visibilidade)
- **Botões em tabelas**: 32px (padrão recomendado para melhor acessibilidade)
- **Botões grandes**: 32px (padrão recomendado)
- **Botões pequenos**: 24px (quando espaço for limitado)
- **Uso geral**: 32px (tamanho padrão recomendado)
- **Mobile**: 32px (para facilitar toque em telas sensíveis)

## Testes

Para testar o componente:

```bash
# Iniciar desenvolvimento
npm run dev

# Testar em ambos os temas
# 1. Alterne entre tema claro e escuro
# 2. Verifique as cores dinâmicas
# 3. Teste as animações de hover
# 4. Verifique as transições entre estados
```

## Contribuição

Para modificar o componente:

1. Mantenha a consistência com o design geométrico atual
2. Preserve as animações suaves
3. Teste em ambos os temas (claro/escuro)
4. Mantenha a acessibilidade
5. Atualize esta documentação se necessário

## Changelog

### v1.1.0
- Aumento do tamanho padrão de 24px para 32px para melhor visibilidade
- Adição de CSS forçados para garantir tamanho em containers Vuetify
- Melhoria na acessibilidade com ícones maiores

### v1.0.0
- Implementação inicial do componente
- Design geométrico moderno
- Suporte a temas claro e escuro
- Animações de hover e transição
- Substituição dos ícones ri-eye-line e ri-eye-off-line