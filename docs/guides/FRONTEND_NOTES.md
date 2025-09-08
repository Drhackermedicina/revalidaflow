# Notas e Detalhes do Frontend (Vue.js)

Este documento detalha aspectos específicos do frontend do projeto REVALIDAFLOW, desenvolvido em Vue.js. Ele aborda a estrutura de componentes, páginas principais, integrações com Firebase e outras considerações relevantes.

## 1. Estrutura de Pastas e Componentes Principais

O frontend segue uma estrutura de pastas modular, com componentes reutilizáveis e páginas dedicadas a funcionalidades específicas.

*   `src/App.vue`: Componente raiz da aplicação.
*   `src/main.js`: Ponto de entrada da aplicação Vue.js.
*   `src/@core/`: Contém componentes e estilos base do template.
*   `src/@layouts/`: Componentes relacionados ao layout da aplicação (navegação, etc.).
*   `src/assets/`: Ativos estáticos como imagens e estilos globais.
*   `src/components/`: Componentes reutilizáveis da aplicação.
    *   `AIFieldAssistant.vue`: Assistente de edição com IA, integrado nos campos de edição. **Desafio:** Precisa de integração da memória na coleção do Firestore (sem índice).
    *   `AdminAgentAssistant.vue`: Tentativa de implementação de um assistente de agente IA global para administradores/editores.
*   `src/composables/`: Funções reutilizáveis e lógicas de estado (Vue Composition API).
*   `src/config/`: Arquivos de configuração.
*   `src/layouts/`: Layouts da aplicação.
*   `src/pages/`: Páginas principais da aplicação.
    *   `StationList.vue`: Página onde o ator/avaliador escolhe uma estação clínica.
    *   `SimulationView.vue`: Página da simulação em tempo real, onde o link de convite é gerado e a interação entre ator/avaliador e candidato ocorre.
    *   `AdminUpload.vue`: Página para upload de estações em JSON. **Desafio:** Lógica para upload de questões foi removida, mas a coleção no Firebase Storage existe.
    *   `AdminView.vue`: Página de administração para verificação de estações e edições. **Desafio:** Problemas de filtragem e inconsistência de dados na coleção `estacoes_clinicas`.
    *   `pagamento.vue`: Página de pagamentos (inativa).
    *   `BuscarUsuarios.vue`: Página de busca de usuários (em desenvolvimento).
    *   `EditStationView.vue`: Página de edição de estações, onde o `AIFieldAssistant.vue` é utilizado.
*   `src/plugins/`: Plugins Vue.js e inicialização de serviços (Firebase, Pinia, etc.).
    *   `firebase.js`: Inicialização e configuração do Firebase.
*   `src/services/`: Serviços para interação com APIs e lógica de negócio.
    *   `adminAgentService.js`: **STUB:** Serviço legado removido, com sugestão de migração para backend Python (`gerador-de-estacoes`).
    *   `agentAssistantService.js`: **STUB:** Serviço legado removido, com sugestão de migração para backend Python (`gerador-de-estacoes`).
*   `src/stores/`: Gerenciamento de estado global (Pinia).
*   `src/utils/`: Funções utilitárias.

## 2. Integração com Firebase

O frontend se integra profundamente com o Firebase para diversas funcionalidades:

*   **Firestore:** Utilizado como banco de dados principal para armazenar:
    *   `estacoes_clinicas`: Coleção de todas as estações clínicas, incluindo seus detalhes, roteiros, impressos e PEPs.
    *   `usuarios`: Coleção de dados dos usuários.
    *   **Desafio:** Inconsistência de dados em `estacoes_clinicas` e necessidade de integrar a memória do `AIFieldAssistant` em uma coleção sem índice.
*   **Firebase Hosting:** Utilizado para hospedar o frontend da aplicação.
*   **Firebase Authentication:** Gerencia a autenticação de usuários.
*   **Firebase Storage:** Utilizado para armazenar arquivos, como imagens de impressos. **Desafio:** Impressos também estão aparecendo em um bucket na Cloud, indicando possível duplicação.

## 3. Comunicação com Backend

O frontend se comunica com o backend (Node.js na Cloud Run) para funcionalidades como:

*   **Simulação em Tempo Real:** Utiliza WebSockets para a comunicação entre ator/avaliador e candidato durante a simulação.
*   **Download de Estações:** A página `EditStationView.vue` utiliza endpoints do backend para download de estações em JSON.

## 4. Desafios Específicos do Frontend

*   **AIFieldAssistant:** Integrar a memória na coleção do Firestore sem índice.
*   **AdminUpload.vue:** Reintroduzir a lógica para upload de questões.
*   **AdminView.vue:** Resolver problemas de filtragem e inconsistência de dados das estações.
*   **Página de Pagamentos:** ✅ Ativada e configurada com redirecionamento para gateways de pagamento.
*   **Buscador de Usuários:** Concluir o desenvolvimento.
*   **Integração Gemini Chat:** Implementar o chat diretamente na página, em vez de redirecionar para o site oficial.

## 5. Próximos Passos

Este documento será atualizado conforme o desenvolvimento do frontend avança e novos desafios surgem ou são resolvidos.
