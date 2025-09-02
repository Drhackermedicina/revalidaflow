# Análise Completa do Projeto REVALIDAFLOW

## Visão Geral

O REVALIDAFLOW é uma aplicação web complexa projetada para simulações de casos clínicos para o exame Revalida. A arquitetura é distribuída em três componentes principais: um frontend em Vue.js, um backend de tempo real em Node.js e um agente de IA em Python para geração de conteúdo.

## 1. Frontend (Vue.js)

*   **Tecnologias:** Vue 3, Vite, Vuetify (para componentes de UI), Pinia (para gerenciamento de estado) e Vue Router (para roteamento).
*   **Estrutura:** Aplicação de página única (SPA) bem estruturada. Utiliza recursos modernos como auto-imports de componentes, aliases de caminho para organização e um sistema de plugins.
*   **Funcionalidades Principais:**
    *   Interface do usuário para as simulações.
    *   Componentes de chat e notificação em tempo real.
    *   Área de Administração (`AdminView.vue`) para interagir com o agente Python para criar, analisar e gerenciar estações clínicas.
*   **Comunicação com Backends:**
    *   Utiliza **Socket.IO** para se conectar ao backend Node.js para toda a lógica de simulação em tempo real.
    *   Faz requisições **HTTP (API REST)** para o backend Python (na porta 8080, via proxy do Vite) para tarefas de geração de conteúdo.

## 2. Backend (Node.js)

*   **Tecnologias:** Node.js, Express, Socket.IO, Firebase Admin, e uma biblioteca de cache em memória (`node-cache`).
*   **Responsabilidade Principal:** Orquestrar as sessões de simulação em tempo real.
*   **Funcionalidades:**
    *   **Gerenciamento de Sessões via Socket.IO:** Controla todo o fluxo da simulação: convites, entrada de usuários em salas, status de "pronto", início e fim da simulação, timer, e a troca de dados (liberação de exames, atualização de pontuação, etc.) em tempo real.
    *   **Autenticação e Dados:** Utiliza o Firebase Admin SDK para autenticação de usuários e armazenamento de dados no Firestore.
    *   **Otimização:** Possui uma camada de cache para reduzir as leituras do Firestore, otimizando custos e performance.
    *   **Modo de Desenvolvimento:** Possui um modo "mock" que permite rodar o servidor sem uma conexão real com o Firebase, facilitando o desenvolvimento local.

## 3. Backend (Agente Python)

*   **Tecnologias:** Python, FastAPI, Uvicorn, `google-generativeai` (API Gemini), `PyMuPDF` (para ler PDFs).
*   **Responsabilidade Principal:** Agente de Inteligência Artificial para a geração de conteúdo (estações clínicas).
*   **Arquitetura e Funcionalidades (Destaques):**
    *   **Design "Local-First":** O agente é projetado para ser autônomo, utilizando um **"Sistema de Memória Híbrida"** baseado em arquivos locais na pasta `memoria/`. Ele lê suas regras, guias, e aprendizados desta pasta, e salva as estações geradas em `estacoes_geradas/`.
    *   **Independência do Banco de Dados:** A conexão com o Firebase está presente no código, mas a configuração `firebase_mock_mode = True` está **hardcoded (fixa)**, fazendo com que ele nunca se conecte ou salve no Firestore, dependendo exclusivamente dos arquivos locais.
    *   **Geração em Múltiplas Fases:** Utiliza um processo sofisticado de múltiplos prompts para criar uma estação:
        1.  **Fase 1 (Análise):** Pesquisa o tema e cria um resumo clínico detalhado.
        2.  **Fase 2 (Estratégia):** Gera diferentes propostas de abordagem para a estação.
        3.  **Fase 3 (Geração Final):** Cria o JSON completo e estruturado da estação com base na proposta escolhida.
    *   **RAG (Retrieval-Augmented Generation):** O agente enriquece seus prompts buscando informações em documentos PDF e provas antigas do INEP que estão indexados localmente, tornando o conteúdo gerado mais preciso e contextualizado.
    *   **Auto-melhoria e Versionamento:** Possui um sistema que permite "aprender" com o feedback do usuário, salvando novas regras. Também versiona sua própria base de conhecimento, permitindo rollbacks para estados anteriores.
    *   **Robustez:** O código possui tratamento de erros avançado, incluindo múltiplas tentativas de chamada à API Gemini com diferentes chaves e modelos, e várias estratégias para corrigir JSON malformado que a IA possa retornar.

## 4. Fluxo de Comunicação entre Serviços

1.  O **Frontend** é o ponto de entrada para o usuário.
2.  Para a **simulação em tempo real**, o Frontend estabelece uma conexão **Socket.IO** persistente com o **Backend Node.js**.
3.  Para a **criação de conteúdo**, o Frontend (especificamente a `AdminView.vue`) envia requisições **HTTP** para o **Backend Python**.
4.  O **Backend Python** processa a requisição, executa seu fluxo de geração (que inclui chamadas à **API Gemini**) e salva o resultado final como um arquivo `.json` no seu próprio sistema de arquivos.
5.  O **Backend Node.js** utiliza o **Firebase** para persistir dados de usuários e resultados das simulações.
