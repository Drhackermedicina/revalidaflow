# Análise do Projeto REVALIDAFLOW

## Descrição

REVALIDAFLOW é uma aplicação web projetada para auxiliar estudantes de medicina e médicos na preparação para o exame Revalida, uma prova para médicos formados no exterior que desejam exercer a medicina no Brasil. A aplicação fornece uma plataforma para simular estudos de caso clínicos, com recursos para colaboração em tempo real entre um "candidato" e um "ator/avaliador".

## Arquitetura

*   **Frontend:** Uma aplicação de página única (SPA) Vue.js construída com Vite. Utiliza Vuetify para os componentes de UI, Pinia para gerenciamento de estado e Vue Router para roteamento.
*   **Backend (Node.js):** Um backend Node.js usando Express e Socket.IO. Ele lida com a autenticação de usuários, gerenciamento de sessões e comunicação em tempo real para as simulações. Também utiliza o Firebase Admin para interagir com os serviços do Firebase.
*   **Backend (Agente Python):** Um backend Python usando FastAPI. Este agente é responsável por gerar os estudos de caso clínicos usando a API Gemini. Ele utiliza um sistema de Geração Aumentada por Recuperação (RAG) para recuperar informações de uma base de conhecimento local de documentos médicos.
*   **Banco de Dados:** O Firestore é usado como o banco de dados principal para armazenar dados de usuários, estações clínicas e resultados de avaliação.
*   **Hospedagem:** A aplicação é hospedada no Firebase.

## Funcionalidades Principais

*   Autenticação de usuários e controle de acesso baseado em papéis (candidato, ator/avaliador).
*   Simulação em tempo real de estudos de caso clínicos.
*   Checklist de avaliação interativo (PEP).
*   Pontuação e feedback em tempo real.
*   Geração de estudos de caso clínicos usando IA (Gemini).
*   Memória local e cache para otimização de desempenho.
*   Análise detalhada e logging do projeto.
