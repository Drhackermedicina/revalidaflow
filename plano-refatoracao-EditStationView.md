# Plano de Ação: Refatoração de Estilos em `EditStationView.vue`

**Objetivo:** Substituir estilos CSS com cores hardcoded por variáveis de tema do Vuetify para garantir consistência visual e legibilidade nos temas claro e escuro.

---

### 1. Estratégia Geral

A abordagem principal consiste em eliminar todas as cores fixas (hexadecimais, RGB) do arquivo `<style>` e do `<template>`, substituindo-as por variáveis de tema do Vuetify. Isso centraliza o controle dos estilos no sistema de temas do Vuetify, permitindo que o componente se adapte automaticamente.

**Exemplos de Variáveis a serem utilizadas:**
*   `rgb(var(--v-theme-surface))` para fundos de contêineres principais.
*   `rgb(var(--v-theme-background))` para o fundo geral da página.
*   `rgb(var(--v-theme-on-surface))` para texto sobre superfícies.
*   `rgb(var(--v-theme-primary))` para elementos de ação primários.
*   `rgb(var(--v-theme-secondary))` para elementos secundários.
*   `rgb(var(--v-theme-error))` para botões de exclusão e mensagens de erro.
*   `rgb(var(--v-theme-success))` para ações de sucesso.
*   `rgb(var(--v-theme-info))` para elementos informativos.
*   `rgb(var(--v-theme-border))` para bordas.

---

### 2. Refatoração da Seção `<style>`

A seguir, a lista de seletores CSS que precisam de atenção, com a devida substituição recomendada.

#### **Botões:**
| Seletor | Propriedade | Valor Atual (Exemplo) | Ação Proposta (Substituir por) |
| :--- | :--- | :--- | :--- |
| `.ai-bulk-button`, `.save-manual-button` | `background-color` | `#28a745` | `rgb(var(--v-theme-success))` |
| `.download-button`, `.download-all-button` | `background-color` | `#17a2b8` | `rgb(var(--v-theme-info))` |
| `.delete-button`, `.remove-item-button`, `.remove-item-button-small` | `background-color` | `#dc3545` | `rgb(var(--v-theme-error))` |
| `.add-item-button`, `.add-item-button-small` | `background-color` | `#007bff` | `rgb(var(--v-theme-primary))` |
| `.floating-save-btn` | `background-color` | `#28a745` | `rgb(var(--v-theme-success))` |
| `.floating-undo-btn` | `background-color` | `#6c757d` | `rgb(var(--v-theme-secondary))` |

#### **Contêineres e Seções:**
| Seletor | Propriedade | Valor Atual (Exemplo) | Ação Proposta (Substituir por) |
| :--- | :--- | :--- | :--- |
| `.tab-content .card`, `.dynamic-item-group`, `.dialog-content`, `.edit-status-card` | `background-color` | `#ffffff`, `#f9f9f9` | `rgb(var(--v-theme-surface))` |
| `.dynamic-item-group-nested` | `background-color` | `#e0e0e0` | `rgb(var(--v-theme-background))` |
| `.pontuacoes-group`, `.info-verbal-item`, `.upload-section`, `.feedback-section` | `border` / `border-color` | `#e0e0e0` | `rgb(var(--v-theme-border))` |
| `.secao-header` | `background-color` | `#f8f9fa` | `rgb(var(--v-theme-surface-variant))` |
| `.position-button.active` | `background-color` | `#007bff` | `rgb(var(--v-theme-primary))` |

#### **Texto e Títulos:**
| Seletor | Propriedade | Valor Atual (Exemplo) | Ação Proposta (Substituir por) |
| :--- | :--- | :--- | :--- |
| `.tab-content .card h3`, `h4`, `h5`, `h6`, `legend` | `color` | `#34495e`, `#0056b3` | `rgb(var(--v-theme-on-surface))` |
| `manual-form label` | `color` | `#34495e` | `rgb(var(--v-theme-on-surface-variant))` |

#### **Mensagens de Status:**
| Seletor | Propriedade | Ação Proposta |
| :--- | :--- | :--- |
| `.status-message-internal.info` | `background-color`, `color` | Usar `rgb(var(--v-theme-info))` e `rgb(var(--v-theme-on-info))` |
| `.sucesso` | `background-color`, `color` | Usar `rgb(var(--v-theme-success))` e `rgb(var(--v-theme-on-success))` |
| `.erro` | `background-color`, `color` | Usar `rgb(var(--v-theme-error))` e `rgb(var(--v-theme-on-error))` |
| `.alerta-pontuacao-total` | `background-color`, `color` | Usar `rgb(var(--v-theme-warning))` e `rgb(var(--v-theme-on-warning))` |

---

### 3. Simplificação do Template (`<template>`)

*   **Remover Classes Condicionais:** Procure e remova todas as ocorrências de classes condicionais baseadas em `isDarkTheme`. Por exemplo:
    ```html
    <!-- ANTES -->
    <div :class="[isDarkTheme ? 'container--dark' : 'container--light']"></div>

    <!-- DEPOIS -->
    <div class="container"></div>
    ```
    As classes `...--dark` e `...--light` correspondentes na seção `<style>` devem ser removidas, pois a tematização será gerenciada pelas variáveis CSS.

*   **Remover Estilos Inline:** Identifique e remova todos os estilos `style` inline que definem cores, como `style="color:#666;"`.

---

### 4. Revisão dos Inputs e Componentes de Formulário

*   **Remover Estilos de Inputs:** Remova as seguintes regras da seção `<style>` para permitir que os campos de formulário herdem os estilos padrão do tema do Vuetify:
    ```css
    input[type="text"],
    input[type="number"],
    input[type="url"],
    textarea,
    select {
        background-color: white; /* REMOVER */
        color: #495057; /* REMOVER */
        border: 1px solid #ced4da; /* REMOVER */
    }
    ```
    Os componentes `v-text-field`, `v-textarea`, etc., do Vuetify já possuem estilos temáticos integrados.

---

### 5. Validação Final

Após aplicar todas as alterações, realize os seguintes testes:

1.  **Teste no Tema Claro:** Verifique se todos os textos são legíveis, os botões têm cores corretas e os contêineres têm o fundo esperado.
2.  **Teste no Tema Escuro:** Alterne para o tema escuro e repita a verificação. Preste atenção especial ao contraste entre texto e fundo.
3.  **Verifique a Funcionalidade:** Certifique-se de que a remoção das classes condicionais não quebrou nenhuma funcionalidade ou estilo dependente.

Este plano garante uma refatoração completa e sistemática, resultando em um componente robusto e visualmente consistente.