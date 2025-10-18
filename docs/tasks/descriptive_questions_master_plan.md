# Plano Mestre: Funcionalidade de Questões Descritivas com Feedback de IA

Este documento descreve as etapas macro para implementar a funcionalidade completa de questões descritivas, desde o backend e processamento de dados até a interface do usuário e testes.

## 1. Arquitetura e Modelagem de Dados (Fase Atual)

-   **[Concluído]** Análise dos PDFs de provas e gabaritos do INEP.
-   **[Concluído]** Pesquisa de outros formatos de provas discursivas.
-   **[Concluído]** Definição do modelo de dados JSON unificado para questões e gabaritos.
-   **Próximo Passo:** Validação do modelo e criação da coleção no Firestore.

## 2. Backend

-   **API de Questões:**
    -   Criar endpoint `GET /api/descriptive-questions/:id` para buscar uma questão por ID.
    -   Criar endpoint `GET /api/descriptive-questions` para listar questões disponíveis, com filtros (ano, especialidade).
-   **Serviço de Avaliação por IA:**
    -   Criar um endpoint `POST /api/descriptive-questions/:id/evaluate`.
    -   Este endpoint receberá o áudio da resposta do usuário.
    -   **Passo 1: Transcrição:** Integrar com uma API de Speech-to-Text (ex: Google Speech-to-Text) para converter o áudio em texto.
    -   **Passo 2: Análise pela IA:** Construir o prompt para a IA (ex: Gemini) usando o template definido, injetando o caso clínico, o gabarito (do Firestore) e a transcrição do usuário.
    -   **Passo 3: Resposta:** Retornar o feedback estruturado gerado pela IA para o frontend.
-   **Armazenamento de Respostas:**
    -   Projetar e criar uma coleção no Firestore para armazenar as tentativas dos usuários (`userDescriptiveAnswers`), incluindo a transcrição, o feedback da IA e o score.

## 3. Frontend

-   **Tela da Questão (`/prova-discursiva/:id`):**
    -   Exibir o caso clínico e os itens da questão.
    -   Implementar a interface de gravação de áudio usando `MediaRecorder API`.
    -   Controlar o estado da gravação (gravando, parado, enviando).
-   **Componente de Feedback:**
    -   Desenvolver um componente para exibir o feedback da IA de forma estruturada (Pontos Fortes, Pontos a Melhorar, etc.), possivelmente com ícones e formatação.
    -   Exibir o score de coerência.
-   **Interação Pós-feedback:**
    -   Implementar o campo para a "pergunta final" do usuário, que acionará uma nova chamada à IA para aprofundamento.
-   **Integração com a Store (Pinia/Vuex):**
    -   Gerenciar o estado da questão, gravação, envio e recebimento do feedback.

## 4. Gerenciamento de Conteúdo (Admin)

-   **Ferramenta de Upload:**
    -   Criar uma interface de admin (ou um script de backend) para fazer o upload de novas questões discursivas para o Firestore.
    -   A ferramenta deve aceitar o formato JSON definido ou um formulário que gere o JSON.
    -   Incluir validação para garantir a integridade dos dados.

## 5. Testes

-   **Backend:**
    -   Testes unitários para o serviço de avaliação (mockando as APIs externas de Speech-to-Text e Gemini).
    -   Testes de integração para os endpoints da API.
-   **Frontend:**
    -   Testes de componentes para a tela da questão e o componente de feedback.
    -   Testes E2E (Playwright) para simular o fluxo completo do usuário: selecionar questão, gravar áudio, receber e visualizar o feedback.
