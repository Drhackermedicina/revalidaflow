# Documentação Técnica: Lógica de Liberação de Impressos por IA

**Arquivo Fonte**: `src/composables/useAiChat.js`

## 1. Visão Geral

A liberação de materiais impressos (exames, laudos, etc.) na simulação com IA é um processo **automático e heurístico**. Ele não depende de uma verdadeira "compreensão" da IA, mas sim de uma cadeia de funções que analisam a conversa para decidir **se** um impresso deve ser liberado e, em caso afirmativo, **qual** impresso é o mais relevante.

O processo é acionado a cada mensagem enviada pelo candidato.

## 2. O Gatilho: O Que o Candidato Precisa Fazer?

Para que a lógica de liberação seja acionada, o candidato precisa fazer um pedido que seja interpretado como uma solicitação de exame ou resultado. A chave é ser específico.

-   **Pedidos que funcionam bem ✅**:
    -   "Gostaria de ver o **hemograma**."
    -   "Qual o resultado da **radiografia de tórax**?"
    -   "Solicito um **ECG**."
    -   "Me mostre os **sinais vitais**."

-   **Pedidos que provavelmente falharão ❌**:
    -   "Quais exames você tem?" (Muito genérico)
    -   "Me dê os resultados." (Não especifica qual resultado)

## 3. Análise Detalhada do Fluxo Lógico

O fluxo completo ocorre dentro do composable `useAiChat.js` e pode ser dividido em 4 etapas principais após o candidato enviar uma mensagem.

### Etapa 1: A Resposta do Paciente Virtual (`processAIResponse`)

1.  A mensagem do candidato é enviada ao backend (`/ai-chat/chat`).
2.  O backend instrui a IA (Gemini) a responder como se fosse o paciente, usando o roteiro da estação.
3.  A IA retorna uma resposta de texto, como "Sim, doutor, tenho o resultado aqui." ou "Não tenho certeza, o que o senhor gostaria de ver?".

### Etapa 2: O Primeiro Filtro (`shouldReleaseSimple`)

Esta função é um **guarda de segurança** para evitar liberações acidentais. Ela só permite que o fluxo continue se **ambas** as condições a seguir forem verdadeiras:

1.  **A Mensagem do Candidato Contém uma Palavra-Chave Médica:** A pergunta do usuário deve incluir termos de uma lista predefinida, como:
    -   `'exame'`, `'hemograma'`, `'radiografia'`, `'físico'`, `'laborat'`, `'pcr'`, `'vhs'`, `'solicito'`, `'glicemia'`.
2.  **A Resposta da IA é Permissiva:** A resposta do paciente virtual (gerada na Etapa 1) deve ser positiva, contendo palavras como:
    -   `'ok'`, `'tudo bem'`, `'pode'`, `'certo'`, `'sim'`.

> **Importante**: Se a resposta da IA contiver "não consta no script" ou "seja mais específico", a função retorna `false` imediatamente, bloqueando a liberação.

### Etapa 3: O Cérebro da Lógica (`findSpecificMaterial`)

Se o primeiro filtro for aprovado, esta função é chamada para decidir **qual** impresso liberar. Este é o núcleo da heurística.

1.  **Extração de Texto:** A função itera sobre cada impresso disponível na estação. Para cada um, ela extrai e combina todo o texto associado (título, descrições, nomes de exames, valores, etc.) em uma única string.

2.  **Cálculo de Score (`calculateMatchScore`):** Para cada impresso, um "score de compatibilidade" é calculado comparando a mensagem do candidato com o texto extraído do impresso. A pontuação é atribuída da seguinte forma:
    *   **+1.0 ponto** por cada correspondência exata de palavra no **título** do impresso (ex: pedir "hemograma" e o título ser "Hemograma Completo").
    *   **+0.4 ponto** por cada correspondência com uma palavra-chave principal de um **dicionário médico interno**.
    *   **+0.2 ponto** por cada correspondência com um **sinônimo** do dicionário médico (ex: "raio-x" e "radiografia" pontuam um ao outro).
    *   Um pequeno bônus por sobreposição geral de palavras.

3.  **Seleção do Melhor Candidato:** O impresso que acumular o **maior score** é selecionado.

4.  **Limiar de Confiança:** O ID do impresso com maior score só é retornado se a pontuação for **maior ou igual a 0.20 (20%)**. Isso previne que uma correspondência muito fraca acione a liberação.

### Etapa 4: A Ação Final (`releaseMaterialById`)

1.  Se a Etapa 3 retornou um ID de impresso válido, esta função é executada.
2.  Ela localiza o objeto completo do impresso nos dados da estação.
3.  Adiciona o objeto ao `ref` reativo `releasedData`, o que faz com que o componente `CandidateImpressosPanel` o renderize na tela.
4.  Adiciona uma mensagem de sistema ao chat (ex: "📄 Material liberado: Hemograma Completo") para notificar o usuário de forma explícita.

## 4. Conclusão

A liberação de impressos pela IA é um sistema **baseado em regras e pontuação de palavras-chave**, não em uma compreensão semântica real. Ele é projetado para simular a resposta a um pedido direto, funcionando bem quando o candidato é específico. A complexidade está no algoritmo de pontuação que tenta inferir a intenção do usuário com base em um dicionário médico e na relevância do título do impresso.