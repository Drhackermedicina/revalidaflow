/**
* services/agentAssistantService.js
* STUB: Legacy Node agent removed.
*
* Este arquivo foi substituído por um stub para evitar chamadas ao endpoint
* `/api/agent` do backend Node legado (rota removida).
*
* A aplicação deve:
*  - migrar chamadas para o agente Python (backend-python-agent) OU
*  - remover UI/fluxos que dependem do agente antigo.
*
* Se quiser que eu redirecione automaticamente para o agente Python (localhost:8080),
* eu atualizo este stub para encaminhar as requisições.
*/
export const agentAssistantService = {
 async query() {
   throw new Error(
     'Serviço de agente legado removido. Atualize o frontend para usar o agente Python em backend-python-agent ou remova chamadas a /api/agent.'
   );
 }
};
