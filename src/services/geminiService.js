/**
 * Serviço para integração com Gemini AI
 * Sistema de fallback entre modelos e chaves
 */

class GeminiService {
  constructor() {
    // Chaves API com sistema de fallback
    this.apiKeys = [
      'AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U',
      'AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4',
      'AIzaSyDBBrr3WWQqQMQGdXPTELZYhYrbW_CfgRA',
      'AIzaSyDnv2FGgXC1bKZ7Sfrsz4RBjwfsu5h3J_I'
    ];

    // Modelos com ordem de preferência
    this.models = [
      'gemini-2.5-flash',
      'gemini-2.5-lite', 
      'gemini-2.0-flash'
    ];

    this.currentModelIndex = 0;
    this.currentKeyIndex = 0;
    this.cache = new Map(); // Cache para modo offline
  }

  /**
   * Tenta fazer uma requisição com fallback automático
   */
  async makeRequest(prompt, context = '', maxRetries = 12) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        const model = this.models[this.currentModelIndex];
        const apiKey = this.apiKeys[this.currentKeyIndex];
        
        console.log(`🤖 Tentativa ${attempts + 1}: ${model} com chave ${this.currentKeyIndex + 1}`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${context}\n\nPrompt: ${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          // Salvar no cache para modo offline
          this.cache.set(`${prompt}:${context}`, generatedText);
          
          return generatedText;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        console.error(`❌ Erro na tentativa ${attempts + 1}:`, error.message);
        attempts++;
        
        // Rotacionar para próxima chave
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        
        // Se testou todas as chaves, passar para próximo modelo
        if (this.currentKeyIndex === 0) {
          this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
        }
        
        // Pequeno delay antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Se todos os modelos falharam, tentar cache offline
    const cachedResult = this.cache.get(`${prompt}:${context}`);
    if (cachedResult) {
      console.log('📱 Usando resposta do cache offline');
      return cachedResult;
    }
    
    throw new Error('Todos os modelos Gemini falharam e não há cache disponível');
  }

  /**
   * Gerar contexto geral da estação
   */
  async generateStationContext(stationData) {
    const prompt = `
Analise os dados desta estação clínica e gere um contexto geral resumido:

Título: ${stationData.tituloEstacao || 'Não informado'}
Especialidade: ${stationData.especialidade || 'Não informado'}
Nível: ${stationData.nivelDificuldade || 'Não informado'}
Duração: ${stationData.tempoDuracaoMinutos || 'Não informado'} minutos

Descrição do Caso: ${stationData.descricaoCasoCompleta || 'Não informado'}
Tarefas Principais: ${stationData.tarefasPrincipais || 'Não informado'}

Por favor, gere um contexto conciso (máximo 200 palavras) que resume o cenário, objetivos e características principais desta estação para uso em correções futuras.
    `;

    try {
      return await this.makeRequest(prompt);
    } catch (error) {
      console.error('Erro ao gerar contexto da estação:', error);
      return 'Contexto não disponível no momento.';
    }
  }

  /**
   * Corrigir campo específico
   */
  async correctField(fieldName, currentValue, userRequest, stationContext = '') {
    const fieldLabels = {
      'descricaoCasoCompleta': 'Descrição Completa do Caso',
      'tarefasPrincipais': 'Tarefas Principais', 
      'roteiroCandidato': 'Roteiro do Candidato',
      'informacoesVerbaisSimulado': 'Informações Verbais do Simulado',
      'impressos': 'Impressos',
      'padraoEsperadoProcedimento': 'Padrão Esperado de Procedimento'
    };

    const prompt = `
Contexto da Estação: ${stationContext}

Campo sendo corrigido: ${fieldLabels[fieldName] || fieldName}
Valor atual: ${currentValue || 'Vazio'}

Solicitação do usuário: ${userRequest}

Por favor, corrija o campo conforme solicitado, mantendo o formato adequado para uso em uma estação clínica de ensino médico. Retorne apenas o texto corrigido, sem explicações adicionais.
    `;

    try {
      return await this.makeRequest(prompt, stationContext);
    } catch (error) {
      console.error('Erro ao corrigir campo:', error);
      throw error;
    }
  }

  /**
   * Corrigir item de array dinâmico
   */
  async correctArrayItem(arrayType, itemIndex, currentValue, userRequest, stationContext = '') {
    const arrayLabels = {
      'informacoesVerbaisSimulado': 'Informação Verbal do Simulado',
      'impressos': 'Conteúdo do Impresso',
      'padraoEsperadoProcedimento.itensAvaliacao': 'Descrição do Item de Avaliação PEP'
    };

    // 🎯 NOVA ABORDAGEM: Trabalhar apenas com texto específico
    const prompt = `
Contexto da Estação: ${stationContext}

Tipo de campo: ${arrayLabels[arrayType] || arrayType}
Posição: Item ${itemIndex + 1}

Texto atual para correção:
${currentValue || 'Vazio'}

Solicitação do usuário: ${userRequest}

IMPORTANTE: 
- Retorne APENAS o texto corrigido, sem formatação JSON
- Mantenha o mesmo tipo de conteúdo (texto simples, não código)
- Seja claro, objetivo e adequado para uso em uma estação clínica
- Não inclua explicações ou comentários adicionais

Texto corrigido:
    `;

    try {
      const result = await this.makeRequest(prompt, stationContext);
      // Retornar apenas o texto limpo, sem tentar parsear JSON
      return result.trim();
    } catch (error) {
      console.error('Erro ao corrigir item do array:', error);
      throw error;
    }
  }

  /**
   * Obter sugestões baseadas na memória
   */
  async getSuggestions(fieldName, memorias = []) {
    if (memorias.length === 0) return [];

    const relevantMemories = memorias.filter(m => 
      m.tipo_campo === fieldName || 
      m.metadados?.campo_especifico === fieldName
    );

    return relevantMemories.slice(0, 5).map(m => ({
      id: m.id,
      titulo: m.titulo_correcao,
      prompt: m.prompt_original,
      preview: m.correcao_aplicada.substring(0, 100) + '...'
    }));
  }
}

// Instância singleton
export const geminiService = new GeminiService();
export default geminiService;
