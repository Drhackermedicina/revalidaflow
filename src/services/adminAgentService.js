/**
* services/adminAgentService.js
* STUB: Legacy Node admin-agent removed.
*
* O agente administrativo legado (endpoints em /api/agent/admin-analysis) foi removido do backend.
* Este arquivo foi mantido como stub para evitar chamadas acidentais.
*
* Ações sugeridas:
*  - Remover componentes da UI que dependem de adminAgentService, OU
*  - Redirecionar para o agente Python (gerador-de-estacoes) — posso fazer isso se confirmar.
*/
export const adminAgentService = {
 async analyzeStation() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 },
 async analyzeAllStations() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 },
 async generateSuggestions() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 },
 async autoFixStation() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 },
 async validatePEP() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 },
 async sendMessage() {
   throw new Error('Serviço admin-agent removido. Atualize a UI para não chamar /api/agent/admin-analysis.');
 }
};
