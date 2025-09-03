/**
 * Serviço Gemini - Google AI Studio
 * Sistema de correção de texto para estações clínicas
 */

class GeminiService {
  constructor() {
    // 🔑 API Keys para Gemini (Google AI Studio)
    this.apiKeys = [
      'AIzaSyB6Lj_5p11hJKbZAnb3oRK5h3lxgVZIl8U', // Chave principal
      'AIzaSyAlvMR2zOJDZbwBBpP0sl1JHp2fb9uQiy4', // Chave fallback 1
      'AIzaSyDBBrr3WWQqQMQGdXPTELZYhYrbW_CfgRA', // Chave fallback 2
      'AIzaSyDnv2FGgXC1bKZ7Sfrsz4RBjwfsu5h3J_I', // Chave fallback 3
    ];

    // Configurações do modelo
    this.model = 'gemini-2.0-flash-exp';
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';

    this.currentKeyIndex = 0;
    this.cache = new Map(); // Cache para modo offline
  }

  /**
   * Tenta fazer uma requisição com fallback automático: Gemini → Cache
   */
  async makeRequest(prompt, context = '', maxRetries = 12) {
    const cacheKey = `${prompt}:${context}`;

    // Tentar Gemini
    try {
      const result = await this.makeGeminiRequest(prompt, context, maxRetries);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      // console.log('⚠️ Gemini falhou, tentando cache...', error.message);
    }

    // Último recurso: cache offline
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      // console.log('📱 Usando resposta do cache offline');
      return cachedResult;
    }

    throw new Error('Gemini falhou e não há cache disponível');
  }

  /**
   * Requisição para Gemini via Google AI Studio
   */
  async makeGeminiRequest(prompt, context = '', maxRetries = 12) {
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const apiKey = this.apiKeys[this.currentKeyIndex];

        // console.log(`🤖 Tentativa ${attempts + 1}: Gemini 2.0 Flash com chave ${this.currentKeyIndex + 1}`);

        const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

        const response = await fetch(`${this.endpoint}/${this.model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

          // Aplicar sanitização para remover dados identificadores
          generatedText = this.sanitizeText(generatedText);

          // console.log('✅ Resposta do Gemini:', generatedText.substring(0, 100) + '...');
          return generatedText;

        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        console.error(`❌ Erro na tentativa ${attempts + 1}:`, error.message);
        attempts++;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Gemini falhou após todas as tentativas');
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

    // Adicionar instruções específicas para campos de descrição de caso
    let additionalInstructions = '';
    if (fieldName === 'descricaoCasoCompleta') {
      additionalInstructions = `

ATENÇÃO ESPECIAL - CAMPO DESCRIÇÃO DO CASO:
🚫 REMOVER OBRIGATORIAMENTE todos os dados de identificação:
- Nomes próprios (João, Maria, etc.) → usar "paciente", "lactente", "criança"
- Idades específicas (8 meses, 2 anos) → usar "lactente", "pré-escolar", "criança"
- Sexo específico → usar termos neutros quando possível
- Procedência, naturalidade, ocupação, estado civil, religião

✅ USAR APENAS termos genéricos médicos apropriados.
✅ VERIFICAÇÃO OBRIGATÓRIA: Releia o resultado final e confirme ausência total de dados identificadores.`;
    }

    const prompt = `
Contexto da Estação: ${stationContext}

Campo sendo corrigido: ${fieldLabels[fieldName] || fieldName}
Valor atual: ${currentValue || 'Vazio'}

Solicitação do usuário: ${userRequest}
${additionalInstructions}

Por favor, corrija o campo conforme solicitado, mantendo o formato adequado para uso em uma estação clínica de ensino médico. Retorne apenas o texto corrigido, sem explicações adicionais.
    `;

    try {
      const result = await this.makeRequest(prompt, stationContext);
      
      // Verificação adicional para campo de descrição de caso
      if (fieldName === 'descricaoCasoCompleta') {
        // Padrões comuns que devem ser removidos
        const problematicPatterns = [
          /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Nomes próprios
          /\b\d+\s*(?:meses?|anos?|dias?)\b/gi, // Idades específicas
          /\bJoão\b/gi, /\bMaria\b/gi, /\bPedro\b/gi, // Nomes comuns
        ];
        
        let cleanedResult = result;
        // Substituir padrões problemáticos por termos genéricos
        cleanedResult = cleanedResult.replace(/\bJoão\b/gi, 'o paciente');
        cleanedResult = cleanedResult.replace(/\b\d+\s*meses?\b/gi, 'lactente');
        cleanedResult = cleanedResult.replace(/\bbebê\s+[A-Z][a-z]+/gi, 'o lactente');
        
        return cleanedResult;
      }
      
      return result;
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

  /**
   * Remove dados identificadores de texto
   */
  sanitizeText(text) {
    if (!text) return text;
    
    let cleanText = text;
    
    // Remover nomes próprios comuns - APENAS quando claramente são nomes de pessoas
    const nomes = [
      'João', 'Maria', 'José', 'Ana', 'Pedro', 'Paulo', 'Carlos', 'Luiz', 'Fernando',
      'Antonio', 'Marcos', 'Rafael', 'Lucas', 'Bruno', 'Guilherme', 'Ricardo',
      'Adriana', 'Juliana', 'Patricia', 'Fernanda', 'Mariana', 'Gabriela'
    ];
    
    nomes.forEach(nome => {
      // Usar regex mais específica para evitar substituições incorretas
      const regexNome = new RegExp(`\\b(o\\s+bebê\\s+|a\\s+criança\\s+|paciente\\s+)?${nome}\\b`, 'gi');
      cleanText = cleanText.replace(regexNome, 'o paciente');
    });
    
    // Remover idades específicas - APENAS quando é claramente idade
    cleanText = cleanText.replace(/\b\d+\s*meses?\s+(de\s+idade)?\b/gi, 'alguns meses');
    cleanText = cleanText.replace(/\b\d+\s*anos?\s+(de\s+idade)?\b/gi, 'alguns anos');
    cleanText = cleanText.replace(/\b\d+\s*dias?\s+(de\s+idade)?\b/gi, 'alguns dias');
    
    // Correções para contextos específicos que podem ter sido mal interpretados
    cleanText = cleanText.replace(/febre alta há lactente/gi, 'febre alta há alguns dias');
    cleanText = cleanText.replace(/febre alta há criança/gi, 'febre alta há alguns dias');
    cleanText = cleanText.replace(/febre alta há recém-nascido/gi, 'febre alta há alguns dias');
    cleanText = cleanText.replace(/há alguns meses\b/gi, 'há alguns dias');
    
    // Remover referências específicas de sexo quando desnecessárias
    cleanText = cleanText.replace(/\bmenino\s+de\b/gi, 'criança de');
    cleanText = cleanText.replace(/\bmenina\s+de\b/gi, 'criança de');
    
    // Remover procedência específica
    cleanText = cleanText.replace(/\bnatural de [^,\.]+/gi, '');
    cleanText = cleanText.replace(/\bprocedente de [^,\.]+/gi, '');
    
    return cleanText.trim();
  }
}

// Instância singleton
export const geminiService = new GeminiService();
export default geminiService;
