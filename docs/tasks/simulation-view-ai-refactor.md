# Plano de Refatoração Acionável: SimulationViewAI.vue

## 1. Objetivo

Reduzir o componente `src/pages/SimulationViewAI.vue` de ~2.700 linhas para menos de 500, extraindo lógicas complexas para composables reutilizáveis e testáveis, e componentizando a UI.

## 2. Status Atual (Verificado em 26/10/2025)

-   **[✅ FEITO]** A lógica de sessão (`useSimulationSession`) e o fluxo de trabalho standalone (`useSimulationWorkflowStandalone`) já foram extraídos e estão em uso.
-   **[❌ PENDENTE]** A lógica principal continua monolítica dentro do componente. As seguintes funcionalidades ainda precisam ser extraídas:
    -   Gerenciamento do chat com a IA.
    -   Reconhecimento e síntese de voz (Speech-to-Text e Text-to-Speech).
    -   Heurísticas para liberação de materiais (impressos).
    -   Avaliação automática do PEP (checklist).
-   **[❌ PENDENTE]** O template continua com HTML duplicado em vez de usar componentes existentes.
-   **[❌ PENDENTE]** Logs de debug (`console.log`) ainda estão espalhados pelo código.
-   **[❌ PENDENTE]** Não há testes unitários ou de integração para o fluxo de IA.

---

## 3. Plano de Refatoração Sequencial

A refatoração será dividida em 5 passos sequenciais para minimizar riscos e garantir progresso incremental.

### Passo 1: Isolar a Lógica de Voz

**Objetivo:** Mover toda a interação com as APIs de `SpeechRecognition` e `SpeechSynthesis` para um composable dedicado.

-   [ ] **Criar o arquivo `src/composables/useSpeechInteraction.js`.**
-   [ ] **Mover as seguintes `refs` e funções de `SimulationViewAI.vue` para `useSpeechInteraction.js`:**
    -   `refs`: `isListening`, `speechRecognition`, `isSpeaking`, `speechSynthesis`, `speechTimeout`, `autoRecordMode`, `silenceTimeout`, `lastSpeechTime`, `selectedVoice`.
    -   `funções`: `initSpeechRecognition`, `startListening`, `stopListening`, `extractPatientDemographics`, `selectVoiceForPatient`, `getVoiceParametersForAge`, `speakText`, `stopSpeaking`, `toggleVoiceRecording`, `toggleAutoRecordMode`.
-   [ ] **Expor uma API simplificada:** O novo composable deve expor um estado reativo e funções simples.
    ```javascript
    // Exemplo da API do novo composable
    export function useSpeechInteraction() {
      const isListening = ref(false);
      const isSpeaking = ref(false);
      const recognizedText = ref('');

      function start() { /* ... */ }
      function stop() { /* ... */ }
      function speak(text, patientProfile) { /* ... */ }

      return { isListening, isSpeaking, recognizedText, start, stop, speak };
    }
    ```
-   [ ] **Substituir a lógica em `SimulationViewAI.vue`:** Remover todas as funções e refs de voz e usar o novo composable `useSpeechInteraction()`.

### Passo 2: Isolar a Lógica de Chat e Liberação de Materiais

**Objetivo:** Mover o gerenciamento da conversa com a IA e a complexa lógica de liberação de impressos para um composable.

-   [ ] **Criar o arquivo `src/composables/useAiChat.js`.**
-   [ ] **Mover as seguintes `refs` e funções para `useAiChat.js`:**
    -   `refs`: `conversationHistory`, `currentMessage`, `isProcessingMessage`.
    -   `funções`: `sendMessage`, `processAIResponse`, `shouldReleaseSimple`, `releaseSpecificMaterial`, `findSpecificMaterial`, `releaseMaterialById`.
    -   Mover também o `medicalDictionary` e a função `calculateMatchScore` para dentro deste novo arquivo ou para um utilitário.
-   [ ] **Padronizar o formato do histórico:** Garantir que `conversationHistory` use um formato de objeto único e consistente (ex: `{ id, role, content, timestamp, metadata }`).
-   [ ] **Substituir a lógica em `SimulationViewAI.vue`:** Usar o novo composable `useAiChat()`, que receberá `stationData` como dependência e retornará o histórico e as funções de interação.

### Passo 3: Isolar a Lógica de Avaliação Automática (PEP)

**Objetivo:** Extrair a funcionalidade que usa a IA para avaliar o checklist.

-   [ ] **Criar o arquivo `src/composables/useAiEvaluation.js`.**
-   [ ] **Mover as seguintes funções para `useAiEvaluation.js`:**
    -   `aiEvaluatePEP`, `processAIEvaluation`, `processAIEvaluationSimple`, `autoEvaluatePEPFallback`, `getClassificacaoFromPontuacao`.
-   [ ] **Conectar com o backend:** O composable será responsável pela chamada ao endpoint `POST /ai-chat/evaluate-pep`.
-   [ ] **Substituir a lógica em `SimulationViewAI.vue`:** Chamar a função principal do `useAiEvaluation()` quando a simulação terminar.

### Passo 4: Componentizar a Interface (UI)

**Objetivo:** Limpar o template do `SimulationViewAI.vue` substituindo blocos de HTML por componentes reutilizáveis.

-   [ ] **Analisar o template de `SimulationView.vue` (versão humana) e identificar componentes reutilizáveis.**
-   [ ] **Substituir o HTML em `SimulationViewAI.vue` pelos seguintes componentes (se aplicável):**
    -   `CandidateContentPanel`: Para exibir o cenário e as tarefas.
    -   `CandidateImpressosPanel`: Para listar e exibir os impressos liberados.
    -   `CandidateChecklist`: Para exibir o PEP (checklist) no final.
    -   `ImageZoomModal`: Para a funcionalidade de zoom em imagens, removendo a implementação com `document.write`.
-   [ ] **Passar os dados reativos (refs) dos composables como `props` para esses componentes filhos.**

### Passo 5: Limpeza, Documentação e Testes

**Objetivo:** Finalizar a refatoração, garantindo a qualidade e a manutenibilidade do código.

-   [ ] **Substituir todos os `console.log` e `console.error` por um `Logger` padronizado**, que só exibe logs em ambiente de desenvolvimento.
-   [ ] **Adicionar testes unitários (Vitest) para os novos composables:**
    -   `tests/unit/composables/useSpeechInteraction.spec.js`
    -   `tests/unit/composables/useAiChat.spec.js`
    -   `tests/unit/composables/useAiEvaluation.spec.js`
-   [ ] **Revisar e remover qualquer código não utilizado** que tenha sobrado em `SimulationViewAI.vue`.
-   [ ] **Atualizar esta documentação** marcando os itens como concluídos.

---

## 4. Resultado Esperado

Ao final desta refatoração, o arquivo `SimulationViewAI.vue` será drasticamente menor e atuará principalmente como um **orquestrador**, conectando os diferentes composables e componentes, sem conter lógica de negócio complexa. O código resultante será mais limpo, mais fácil de testar e muito mais simples de manter ou estender no futuro.