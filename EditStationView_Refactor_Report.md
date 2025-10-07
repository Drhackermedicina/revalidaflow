# Relatório de Refatoração: EditStationView.vue

**Data:** 06/10/2025
**Caminho:** `src/pages/EditStationView.vue`

---

## 1. Métricas e Visão Geral

- **Total de linhas de código:** 4.119 linhas
- **Dependências principais imports:**
  - Vue Composition API (`ref`, `computed`, `watch`, `onMounted`, `onUnmounted`)
  - Vue Router (`useRoute`, `useRouter`)
  - Vuetify (`useTheme`)
  - Firebase (Firestore, Storage)
  - `browser-image-compression`
  - Serviços internos: `geminiService`
  - Componentes: `AIFieldAssistant`, `TiptapEditor`

## 2. Responsabilidades do Componente

1. **Gerenciamento de estado e ciclo de vida**
   - Inicialização de `stationId`, `formData`, indicadores de loading e error
   - Carregamento de dados da estação do Firestore
2. **Histórico de edição e undo/redo**
   - Funções: `generateStateHash`, `saveSnapshot`, `undo`, `restoreFormData`, `detectChangedFields`
3. **Formulário complexo de edição**
   - Gerar dados iniciais (`getInitialFormData`)
   - Normalização de valores (`normalizeValue`)
   - Serialização/normalização de histórico (`normalizarHistoricoEdicao`)
4. **Upload de imagens**
   - Compressão e upload via Firebase Storage
   - Controle de progresso (`uploadProgress`, `uploadingImages`)
5. **Integração com IA (Gemini)**
   - Sugestões por campo e em bulk (`suggestForField`, `fetchSuggestionForField`)
   - Funções de bulk para impressos, PEP, URLs de imagem
6. **Persistência de dados**
   - `updateDoc` no Firestore, timestamp, mensagens de sucesso/erro
7. **Remoção de estação**
   - `deleteDoc` em Firestore e navegação de volta

## 3. Listagem de Funções e Propósito

| Função                            | Finalidade                                               |
|-----------------------------------|----------------------------------------------------------|
| prettyFieldLabel(fieldName)       | Gera rótulo legível a partir do path de campo            |
| suggestForImpresso(index)         | Bulk suggest para campos de impressos                    |
| suggestForImageUrl(index)         | Bulk URL-suggestion para campo de imagem                 |
| suggestForPepItem(index)          | Bulk suggest para itens de PEP                           |
| applyBulkSuggestion(sugg)         | Aplica sugestão individual no `formData`                 |
| applyAllBulkSuggestions()         | Aplica todas as sugestões bulk                           |
| isAILoadingFor(fieldName)         | Verifica se IA está carregando para determinado campo    |
| suggestForField(fieldName, value) | Solicita sugestão de IA para campo único                 |
| fetchSuggestionForField(...)      | Chama serviço Gemini e retorna sugestão para um campo    |
| getInitialFormData()              | Constrói objeto inicial de `formData` com base em `stationData` |
| generateStateHash(state)          | Gera hash único para comparar estados do formulário      |
| saveSnapshot(force = false)       | Salva snapshot atual se houver mudanças                   |
| undo()                            | Restaura último snapshot do histórico                    |
| restoreFormData(state)            | Substitui `formData` pelo estado passado                 |
| detectChangedFields()             | Lista campos modificados em relação ao snapshot inicial  |
| getNestedValue(obj, path)         | Acessa valor aninhado de objeto por string de path       |
| normalizeValue(value)             | Converte valores em tipos primitivos apropriados         |
| normalizarHistoricoEdicao(data)   | Padroniza dados históricos de edição para interface      |
| loadOrGenerateStationContext()    | Inicializa ou busca contexto da estação para IA          |
| handleAIFieldUpdate(payload)      | Atualiza campo no formulário após sugestão IA            |
| onAISuggestRequested(payload)     | Handler para evento de sugestão IA de componente filho   |
| ... (vários watchers e hooks)     | Observadores para sincronizar `formData` e salvar snapshot|
| uploadImage(file, path)           | Compressão e upload de imagem ao Storage                 |
| downloadImage(url)                | Preenche URL de download para preview de imagem          |
| saveStation()                     | Persiste alterações no Firestore                         |
| deleteStation()                   | Remove documento do Firestore e navega                   |

> **Observação:** Há mais funções utilitárias internas para controle de estado e progresso.

## 4. Tratamento de Erros e Boas Práticas

- **Catches vazios:** Vários `catch (err) { /* silent */ }` sem log ou feedback ao usuário.
- **Inconsistência de feedback:** Em alguns lugares usa `showAISuccess`/`showAIError`, mas não em upload/nor em operações de Firestore.
- **Falta de cancelamento:** Operações assíncronas (ex.: upload, IA) não suportam cancelamento.
- **Listeners não removidos:** Watchers e event listeners podem continuar ativos após unmount.

## 5. Propostas de Refatoração

1. **Extração de Composables:**
   - `useEditStationData` (carregamento/salvamento Firestore, estado de loading/error)
   - `useFormHistory` (snapshot, undo, detectChangedFields)
   - `useImageUploader` (compressão, upload, progresso)
   - `useAIFieldAssistant` (sugestões individuais e bulk)
2. **Modularização de Subcomponentes:**
   - Componentes dedicados para cada seção do formulário (Impressos, PEP, Bulk AI, Histórico)
   - Reutilizar `AIFieldAssistant` e `TiptapEditor` em wrappers específicos
3. **Centralização de Tratamento de Erros:**
   - Criar serviço `errorHandler` para log e feedback consistente
   - Remover catches vazios e garantir exibição de erro
4. **Melhorias de UX:**
   - Loading spinners por seção (upload, IA, Firestore)
   - Botões de cancelar operações longas
5. **Tipagem e Validations:**
   - Converter para TypeScript (`.vue` com `<script setup lang="ts">`)
   - Definir interfaces para `formData` e `stationData`
   - Usar `yup` ou `zod` para validação de formulário
6. **Cleanup Automático:**
   - Remover watchers e event listeners em `onUnmounted`
   - Suportar cancel tokens (AbortController) para fetch/IA

## 6. Próximos Passos

1. Criar esqueleto de composable `useEditStationData.ts`
2. Extrair lógica de snapshots para `useFormHistory.ts`
3. Refatorar upload de imagem para `useImageUploader.ts`
4. Refatorar sugestão IA para `useAIFieldAssistant.ts`
5. Modularizar o template em subcomponentes
6. Adicionar testes unitários para cada composable
7. Validar build e testes end-to-end
