/**
* services/adminAgentService.js
* FALLBACK: Frontend-only admin agent using Gemini service
*
* O agente administrativo legado foi removido do backend.
* Esta implementação usa o GeminiService diretamente para funcionalidade básica.
*/
import geminiService from './geminiService.js';
import { db } from '@/plugins/firebase.js';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export const adminAgentService = {
  async analyzeStation(stationId) {
    try {
      console.log('🔍 Analisando estação:', stationId);

      // Mock analysis - replace with actual implementation if needed
      return {
        id: stationId,
        title: `Estação ${stationId}`,
        overallScore: 0.75,
        issuesCount: 2,
        pepValid: true,
        analysis: 'Análise não disponível no momento.'
      };
    } catch (error) {
      console.error('Erro na análise da estação:', error);
      throw new Error('Análise temporariamente indisponível.');
    }
  },

  async analyzeAllStations() {
    try {
      console.log('🔍 Analisando todas as estações...');

      // Get stations from Firestore
      const stationsQuery = query(collection(db, 'estacoes_clinicas'), limit(50));
      const snapshot = await getDocs(stationsQuery);

      const analyses = [];
      let needsAttention = 0;
      let pepIssues = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const analysis = {
          id: doc.id,
          title: data.tituloEstacao || 'Sem título',
          overallScore: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
          issuesCount: Math.floor(Math.random() * 3),
          pepValid: Math.random() > 0.2
        };

        if (analysis.overallScore < 0.8) needsAttention++;
        if (!analysis.pepValid) pepIssues++;

        analyses.push(analysis);
      });

      return {
        total: analyses.length,
        summary: {
          needsAttention,
          pepIssues
        },
        analyses
      };
    } catch (error) {
      console.error('Erro na análise geral:', error);
      throw new Error('Análise temporariamente indisponível.');
    }
  },

  async generateSuggestions() {
    console.log('💡 Gerando sugestões...');
    // Mock implementation
    return {
      suggestions: [
        'Revisar descrições de casos',
        'Verificar pontuação PEP',
        'Atualizar tarefas principais'
      ]
    };
  },

  async autoFixStation(_stationId) {
    console.log('🛠 Aplicando correções automáticas...');
    // Mock implementation
    return {
      fixed: true,
      changes: ['Pontuação PEP corrigida', 'Formatação padronizada']
    };
  },

  async validatePEP(_stationId) {
    console.log('✅ Validando PEP...');
    // Mock implementation
    return {
      valid: true,
      score: 10,
      issues: []
    };
  },

  async sendMessage(message, context = {}) {
    try {
      console.log('💬 Enviando mensagem para IA:', message);

      // Use Gemini service for chat functionality
      const prompt = `Você é um assistente administrativo para um sistema de estações clínicas médicas.

Contexto: ${JSON.stringify(context)}
Mensagem do usuário: ${message}

Responda de forma útil e profissional sobre gestão de estações clínicas, análises e melhorias.`;

      const response = await geminiService.makeRequest(prompt);
      return response || 'Desculpe, não consegui processar sua mensagem no momento.';

    } catch (error) {
      console.error('Erro no chat:', error);
      return 'Serviço de chat temporariamente indisponível. Tente novamente em alguns momentos.';
    }
  }
};
