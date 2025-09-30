# Plano de Ação: Correção de Estilos Globais e Refatoração

**Objetivo:** Corrigir problemas de legibilidade de texto, especialmente em texto selecionado, e continuar a refatoração para eliminar cores `hardcoded`, garantindo consistência visual nos temas claro e escuro.

---

### Etapas do Plano

1.  **[ ] Criar Arquivo de Sobrescrita Global:**
    *   Criar um novo arquivo em `src/assets/styles/_overrides.scss` para centralizar as correções de estilo globais.

2.  **[ ] Corrigir Estilo de Seleção de Texto (`::selection`):**
    *   No arquivo `_overrides.scss`, adicionar uma regra para `::selection` que utilize as variáveis de tema do Vuetify, garantindo alto contraste.
    *   **Exemplo de código:**
        ```scss
        ::selection {
          background-color: rgb(var(--v-theme-primary));
          color: rgb(var(--v-theme-on-primary));
        }
        ```

3.  **[ ] Aumentar Opacidade do Texto:**
    *   No mesmo arquivo `_overrides.scss`, sobrescrever as variáveis de opacidade de ênfase do Vuetify para melhorar a legibilidade do texto.
    *   **Exemplo de código:**
        ```scss
        :root {
          --v-high-emphasis-opacity: 0.95;
          --v-medium-emphasis-opacity: 0.75;
          --v-disabled-opacity: 0.45;
        }
        ```

4.  **[ ] Importar Arquivo de Sobrescrita:**
    *   Importar o novo arquivo `src/assets/styles/_overrides.scss` no ponto de entrada principal da aplicação (`src/main.js`) para garantir que as regras sejam aplicadas globalmente.

5.  **[ ] Refatorar Componentes com Cores Hardcoded:**
    *   Continuar a substituição de cores fixas por variáveis de tema nos componentes, conforme identificado na análise inicial.
    *   **Próximo alvo:** `src/pages/EditQuestaoView.vue`.
    *   Remover a lógica de tema manual (`isDarkTheme`) dos componentes.

6.  **[ ] Validação Final:**
    *   Testar a aplicação em ambos os temas (claro e escuro).
    *   Verificar a legibilidade do texto em diferentes estados (normal, desabilitado, placeholder).
    *   Confirmar que a seleção de texto funciona corretamente e com bom contraste em todas as páginas.
