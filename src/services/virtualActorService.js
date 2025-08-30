// services/virtualActorService.js
// NOTE: Serviço do agente legado removido. Mantemos um stub explícito para falhas ruidosas
// e para orientar migração para o agente Python em backend-python-agent (http://localhost:8080).

const LEGACY_REMOVAL_MESSAGE = 'Serviço de agente legado removido. Atualize o frontend para usar o agente Python em backend-python-agent (http://localhost:8080) ou remova chamadas ao agente legado.';

export const virtualActorService = {
  async sendMessage() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  },

  async startVirtualSimulation() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  },

  async endVirtualSimulation() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  },

  async requestFeedback() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  },

  async textToSpeech() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  },

  async speechToText() {
    throw new Error(LEGACY_REMOVAL_MESSAGE);
  }
};
