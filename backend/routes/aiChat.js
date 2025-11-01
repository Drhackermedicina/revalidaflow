const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

class AIChatManager {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.loadApiKeys();
  }

  loadApiKeys() {
    const seenValues = new Set();

    const envKeys = Object.keys(process.env)
      .filter(name => name.startsWith('GOOGLE_API_KEY_') && process.env[name])
      .map(name => ({
        index: Number.parseInt(name.replace('GOOGLE_API_KEY_', ''), 10) || 0,
        value: process.env[name]
      }))
      .filter(item => !Number.isNaN(item.index) && item.index > 0)
      .sort((a, b) => a.index - b.index);

    envKeys.forEach(({ index, value }) => {
      if (seenValues.has(value)) return;
      seenValues.add(value);

      this.apiKeys.push({
        key: value,
        index,
        quotaUsed: 0,
        maxQuota: 1500, // Limite diário aproximado
        lastReset: new Date().toDateString(),
        errors: 0,
        isActive: true
      });
    });

    console.log(`🔑 Carregadas ${this.apiKeys.length} chaves API para IA Chat`);
  }

  getActiveKey() {
    const today = new Date().toDateString();

    // Reset diário das quotas
    this.apiKeys.forEach(keyData => {
      if (keyData.lastReset !== today) {
        keyData.quotaUsed = 0;
        keyData.errors = 0;
        keyData.lastReset = today;
        keyData.isActive = true;
        console.log(`🔄 Reset quota para chave ${keyData.index}`);
      }
    });

    // Encontrar primeira chave disponível
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length;
      const keyData = this.apiKeys[keyIndex];

      if (keyData.isActive && keyData.quotaUsed < keyData.maxQuota) {
        this.currentKeyIndex = keyIndex;
        return keyData;
      }
    }

    // Se todas estão no limite, usar a com menos uso
    const leastUsedKey = this.apiKeys.reduce((min, key) =>
      (key.quotaUsed < min.quotaUsed) ? key : min
    );

    console.log(`⚠️ Todas as chaves no limite, usando chave ${leastUsedKey.index} (uso: ${leastUsedKey.quotaUsed})`);
    return leastUsedKey;
  }

  async generateAIResponse(userMessage, stationData, conversationHistory) {
    const keyData = this.getActiveKey();

    try {
      // VERIFICAR SE É PERGUNTA FORA DO SCRIPT
      if (this.isOffScript(userMessage, stationData)) {
        console.log(`⚠️ Pergunta fora do script detectada: "${userMessage}"`);

        return {
          message: "Não consta no script.",
          releaseMaterial: false,
          materialToRelease: null,
          keyUsed: keyData.index,
          quotaRemaining: keyData.maxQuota - keyData.quotaUsed,
          offScript: true
        };
      }

      // VERIFICAR SE É SOLICITAÇÃO VAGA
      const vagueCheck = this.shouldGiveVagueResponse(userMessage, conversationHistory, stationData);
      if (vagueCheck.isVague && !vagueCheck.shouldAccept) {
        console.log(`⚠️ Solicitação vaga detectada: "${userMessage}"`);

        return {
          message: vagueCheck.response,
          releaseMaterial: false,
          materialToRelease: null,
          keyUsed: keyData.index,
          quotaRemaining: keyData.maxQuota - keyData.quotaUsed,
          vagueRequest: true
        };
      }

      // Usar Gemini 2.5 Flash especificamente
      const genAI = new GoogleGenerativeAI(keyData.key);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
      });

      // Construir prompt contextual para simulação médica
      const prompt = this.buildMedicalSimulationPrompt(userMessage, stationData, conversationHistory);

      console.log(`🤖 Enviando para Gemini 2.5 Flash (chave ${keyData.index}):`, userMessage.substring(0, 100));

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Atualizar estatísticas da chave
      keyData.quotaUsed++;
      keyData.lastUsed = new Date();

      console.log(`✅ Resposta da IA (${text.length} chars):`, text.substring(0, 150));

      return {
        message: text,
        keyUsed: keyData.index,
        quotaRemaining: keyData.maxQuota - keyData.quotaUsed
      };

    } catch (error) {
      console.error(`❌ Erro com chave ${keyData.index}:`, error.message);

      // Marcar chave como problemática se muitos erros
      keyData.errors++;
      if (keyData.errors >= 3) {
        keyData.isActive = false;
        console.log(`🚫 Chave ${keyData.index} desativada após ${keyData.errors} erros`);
      }

      // Tentar próxima chave se disponível
      if (this.apiKeys.some(k => k.isActive && k.quotaUsed < k.maxQuota)) {
        console.log(`🔄 Tentando próxima chave disponível...`);
        return this.generateAIResponse(userMessage, stationData, conversationHistory);
      }

      throw new Error(`Todas as chaves API indisponíveis: ${error.message}`);
    }
  }

  buildMedicalSimulationPrompt(userMessage, stationData, conversationHistory) {
    const stationInfo = stationData?.informacoesEssenciais || {};
    const patientScript = stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado || [];
    const pepData = stationData?.padraoEsperadoProcedimento || null;

    // 🔍 DEBUG: Log completo dos dados recebidos
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏥 Construindo prompt para estação:', stationInfo.titulo || 'SEM TÍTULO');
    console.log('📋 Script do paciente:', patientScript.length, 'seções');
    console.log('💬 Histórico de conversa:', conversationHistory.length, 'mensagens');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Extrair informações do paciente do script
    const patientInfo = this.extractPatientInfo(patientScript);

    // 🆔 IDENTIFICADOR ÚNICO DA ESTAÇÃO (força contexto novo no Gemini)
    const sessionId = `SIMULACAO_${stationInfo.titulo || 'DESCONHECIDA'}_${Date.now()}`;

    let prompt = `🆔 SESSÃO: ${sessionId}\n`;
    prompt += `═══════════════════════════════════════════════════════════\n`;
    prompt += `⚠️ ATENÇÃO: Esta é uma NOVA simulação. ESQUEÇA qualquer conversa anterior.\n`;
    prompt += `═══════════════════════════════════════════════════════════\n\n`;
    prompt += `Você é um paciente virtual em uma simulação médica. Suas características:\n\n`;

    // Informações básicas do paciente (extraídas do script da estação atual)
    if (patientInfo.nome || patientInfo.idade || patientInfo.profissao || patientInfo.estadoCivil) {
      prompt += `IDENTIDADE DO PACIENTE:\n`;
      if (patientInfo.nome) prompt += `- Nome: ${patientInfo.nome}\n`;
      if (patientInfo.idade) prompt += `- Idade: ${patientInfo.idade}\n`;
      if (patientInfo.profissao) prompt += `- Profissão: ${patientInfo.profissao}\n`;
      if (patientInfo.estadoCivil) prompt += `- Estado Civil: ${patientInfo.estadoCivil}\n`;
      prompt += `\n`;
    } else {
      console.warn('⚠️ AVISO: Nenhuma informação de identidade do paciente foi extraída do script!');
      prompt += `IMPORTANTE: Você é um paciente nesta simulação. Suas informações de identidade devem estar no SCRIPT DO PACIENTE abaixo. Use APENAS as informações fornecidas no script.\n\n`;
    }

    // Contexto da estação
    if (stationInfo.titulo) {
      prompt += `CONTEXTO MÉDICO:\n`;
      prompt += `- Estação: ${stationInfo.titulo}\n`;
      if (stationInfo.contextoClinico) {
        prompt += `- Contexto: ${stationInfo.contextoClinico}\n`;
      }
      prompt += `\n`;
    }

    // Script do paciente - FONTE PRINCIPAL DE INFORMAÇÃO
    if (patientScript.length > 0) {
      prompt += `═══════════════════════════════════════════════════════════\n`;
      prompt += `SCRIPT DO PACIENTE - LEIA COM ATENÇÃO (${patientScript.length} seções)\n`;
      prompt += `═══════════════════════════════════════════════════════════\n`;
      prompt += `Este é o roteiro completo desta estação. Use APENAS estas informações para responder.\n`;
      prompt += `Cada seção mostra:\n`;
      prompt += `- CONTEXTO/PERGUNTA: O que o médico pode perguntar\n`;
      prompt += `- INFORMAÇÃO: Como você (paciente) deve responder\n\n`;

      patientScript.forEach((item, index) => {
        if (item.contextoOuPerguntaChave || item.informacao) {
          prompt += `📋 SEÇÃO ${index + 1}:\n`;
          if (item.contextoOuPerguntaChave) {
            prompt += `   CONTEXTO: ${item.contextoOuPerguntaChave}\n`;
          }
          if (item.informacao) {
            prompt += `   RESPOSTA: ${item.informacao}\n`;
          }
          prompt += `\n`;
        }
      });
      prompt += `═══════════════════════════════════════════════════════════\n\n`;
    } else {
      console.error('❌ ERRO CRÍTICO: Script do paciente está vazio! A IA não terá informações para responder.');
      prompt += `⚠️ AVISO: Nenhum script disponível para esta estação.\n\n`;
    }

    // Histórico da conversa (últimas 6 mensagens)
    if (conversationHistory.length > 0) {
      prompt += `CONVERSA ANTERIOR:\n`;
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        const role = msg.sender === 'ai' ? 'Paciente' : 'Médico';
        prompt += `${role}: ${msg.message}\n`;
      });
      prompt += `\n`;
    }

    // Incluir informações sobre histórico de solicitações vagas
    const vagueRequestHistory = this.getVagueRequestHistory(conversationHistory);

    // Instruções para a IA - REFORÇAR USO DO SCRIPT ATUAL
    prompt += `═══════════════════════════════════════════════════════════\n`;
    prompt += `INSTRUÇÕES CRÍTICAS - LEIA COM ATENÇÃO:\n`;
    prompt += `═══════════════════════════════════════════════════════════\n`;
    prompt += `1. ⚠️ REGRA MAIS IMPORTANTE: Use APENAS as informações do SCRIPT DO PACIENTE acima\n`;
    prompt += `   - NÃO invente informações\n`;
    prompt += `   - NÃO use informações de outras estações ou simulações\n`;
    prompt += `   - Se o médico perguntar algo não mencionado no script, diga: "Não sei" ou "Não consta no script"\n\n`;
    prompt += `2. Você é um paciente virtual nesta simulação específica\n`;
    prompt += `   - Sua identidade, sintomas e história estão NO SCRIPT acima\n`;
    prompt += `   - Mantenha consistência com TODAS as seções do script\n\n`;
    prompt += `3. Use linguagem natural e coloquial (não muito técnica)\n`;
    prompt += `4. Seja cooperativo mas realista - como um paciente real seria\n`;
    prompt += `5. Mantenha respostas concisas (máximo 2-3 frases)\n`;
    prompt += `6. Adapte-se ao contexto da conversa anterior\n`;
    prompt += `7. JAMAIS use "não" redundante no final das frases:\n`;
    prompt += `   - PROIBIDO: "Não fumo, não."\n`;
    prompt += `   - CORRETO: "Não fumo."\n\n`;

    // Regras especiais para controle da conversa
    prompt += `REGRAS ESPECIAIS:\n`;
    prompt += `8. FUGA DO ROTEIRO: Se o candidato perguntar algo que não está no seu script, responda: "Não consta no script"\n`;
    prompt += `9. SOLICITAÇÕES VAGAS: Se o candidato solicitar algo genérico como "exames" ou "exame de sangue":\n`;
    prompt += `   - 1ª vez: Responda "Seja mais específico, doutor"\n`;
    prompt += `   - 2ª vez: Aceite a solicitação vaga (para ele aprender que precisa ser específico)\n`;
    prompt += `10. ANÁLISE DOS MATERIAIS: Considere que alguns exames precisam ser solicitados especificamente para o candidato pontuar\n\n`;

    // Informar sobre solicitações vagas anteriores
    if (vagueRequestHistory.hasVagueRequests) {
      prompt += `HISTÓRICO DE SOLICITAÇÕES VAGAS:\n`;
      prompt += `- O candidato já fez ${vagueRequestHistory.count} solicitação(ões) vaga(s)\n`;
      prompt += `- Última solicitação vaga: "${vagueRequestHistory.lastVague}"\n\n`;
    }

    // Incluir informações do PEP para orientar sobre especificidade necessária
    if (pepData && pepData.itensAvaliacao) {
      prompt += `ITENS DE AVALIAÇÃO (PEP) - Para referência sobre especificidade necessária:\n`;
      pepData.itensAvaliacao.forEach((item, index) => {
        if (item.descricaoItem) {
          prompt += `- Item ${index + 1}: ${item.descricaoItem}\n`;
        }
      });
      prompt += `\nNOTA: Se o candidato solicitar algo genérico que está especificado no PEP, lembre-se das regras sobre especificidade.\n\n`;
    }

    prompt += `PERGUNTA ATUAL DO MÉDICO: "${userMessage}"\n\n`;
    prompt += `Responda como o paciente:`;

    // 🔍 DEBUG: Log do prompt completo (primeiras 500 caracteres)
    console.log('📝 Prompt construído (preview):', prompt.substring(0, 500) + '...');
    console.log('📏 Tamanho total do prompt:', prompt.length, 'caracteres');

    return prompt;
  }

  getVagueRequestHistory(conversationHistory) {
    const vagueKeywords = ['exames', 'exame de sangue', 'laboratório', 'imagem', 'raio-x', 'ultrassom', 'tomografia', 'ressonância'];
    let hasVagueRequests = false;
    let count = 0;
    let lastVague = '';

    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg && msg.sender !== 'ai' && msg.message && typeof msg.message === 'string') { // Mensagem do "Médico"
        const messageText = msg.message.toLowerCase();
        const isVague = vagueKeywords.some(keyword => messageText.includes(keyword));

        if (isVague) {
          hasVagueRequests = true;
          count++;
          if (!lastVague) {
            lastVague = msg.message;
          }
        }
      }
    }
    return { hasVagueRequests, count, lastVague };
  }

  extractPatientInfo(patientScript) {
    const info = {};

    if (!patientScript || patientScript.length === 0) {
      console.warn('⚠️ Script do paciente vazio - impossível extrair informações');
      return info;
    }

    // Buscar em TODAS as seções do script, não só "identificação"
    let allText = '';

    patientScript.forEach(item => {
      if (item.informacao) {
        allText += item.informacao + '\n';
      }
    });

    if (!allText) {
      console.warn('⚠️ Nenhuma informação encontrada no script do paciente');
      return info;
    }

    // Extrair nome - tentar vários padrões
    const namePatterns = [
      /(?:me chamo|meu nome é|nome[:\s]+)([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i,
      /(?:sou|chamo)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)/i,
      /^([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)[,\.]?\s+\d+\s+anos/im
    ];

    for (const pattern of namePatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        info.nome = match[1].trim();
        break;
      }
    }

    // Extrair idade
    const ageMatch = allText.match(/(\d+)\s*anos?/i);
    if (ageMatch) {
      info.idade = ageMatch[1] + ' anos';
    }

    // Extrair profissão - vários padrões
    const professionPatterns = [
      /(?:profissão|trabalho|sou)[:\s]+([^,\.\n]{3,40})/i,
      /trabalho como\s+([^,\.\n]{3,40})/i,
      /(?:atuo|trabalho)\s+(?:como|de|em)\s+([^,\.\n]{3,40})/i
    ];

    for (const pattern of professionPatterns) {
      const match = allText.match(pattern);
      if (match && match[1]) {
        const profession = match[1].trim();
        // Filtrar respostas que não são profissões
        if (!profession.match(/não|nunca|nada|sim|anos/i) && profession.length > 2) {
          info.profissao = profession;
          break;
        }
      }
    }

    // Extrair estado civil
    const maritalPatterns = [
      /(?:casado|solteiro|divorciado|viúvo|viúva|separado|separada)/i,
      /estado civil[:\s]+([^,\.\n]+)/i
    ];

    for (const pattern of maritalPatterns) {
      const match = allText.match(pattern);
      if (match) {
        info.estadoCivil = match[1] ? match[1].trim() : match[0];
        break;
      }
    }

    console.log('📋 Informações extraídas do paciente:', info);
    return info;
  }

  shouldReleaseMaterial(conversationHistory, userMessage, stationData, isVagueRequest = false) {
    console.log('🔍 DEBUG shouldReleaseMaterial - userMessage:', userMessage);
    console.log('🔍 DEBUG shouldReleaseMaterial - isVagueRequest:', isVagueRequest);

    // Se foi solicitação vaga na primeira vez, NÃO liberar material
    if (isVagueRequest) {
      console.log('❌ Material não liberado - solicitação vaga');
      return false;
    }

    // Analisar se o candidato solicitou algo específico que justifica liberação de material
    const userText = userMessage.toLowerCase();

    // Palavras-chave específicas que indicam solicitação de materiais
    const specificRequests = [
      'exame físico', 'sinais vitais', 'ausculta', 'palpação', 'inspeção',
      'pressão arterial', 'temperatura', 'pulso', 'respiração',
      'hemograma', 'pcr', 'vhs', 'glicemia', 'ureia', 'creatinina',
      'raio-x', 'radiografia', 'ressonância', 'tomografia', 'ultrassom',
      'colonoscopia', 'endoscopia', 'eletrocardiograma', 'ecg',
      'prescrição', 'receita', 'atestado', 'relatório'
    ];

    const hasSpecificRequest = specificRequests.some(keyword => userText.includes(keyword));
    const matchingKeywords = specificRequests.filter(keyword => userText.includes(keyword));

    console.log('🔍 DEBUG - Palavras-chave encontradas:', matchingKeywords);
    console.log('🔍 DEBUG - hasSpecificRequest:', hasSpecificRequest);

    // Verificar se há orientações específicas no roteiro do ator
    const patientScript = stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado || [];
    const hasSpecialReleaseInstruction = patientScript.some(item => {
      const info = item.informacao?.toLowerCase() || '';
      return info.includes('libere') || info.includes('liberar') || info.includes('disponibilize');
    });

    console.log('🔍 DEBUG - hasSpecialReleaseInstruction:', hasSpecialReleaseInstruction);

    const result = hasSpecificRequest || hasSpecialReleaseInstruction;
    console.log('🔍 DEBUG shouldReleaseMaterial RESULTADO:', result);

    return result;
  }

  decideMaterialToRelease(stationData, conversationHistory, userMessage) {
    const userText = userMessage.toLowerCase();

    // Verificar múltiplas estruturas possíveis de materiais
    const availableMaterials = stationData?.materiaisImpressos ||
                              stationData?.materiais ||
                              stationData?.materiaisDisponiveis?.materiaisImpressos ||
                              [];

    const patientScript = stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado || [];

    console.log('🔍 DEBUG - Estrutura completa stationData:', Object.keys(stationData || {}));
    console.log('🔍 DEBUG - materiaisImpressos:', stationData?.materiaisImpressos);
    console.log('🔍 DEBUG - materiais alternativo:', stationData?.materiais);
    console.log('🔍 DEBUG - materiaisDisponiveis:', stationData?.materiaisDisponiveis ? Object.keys(stationData.materiaisDisponiveis) : 'undefined');
    console.log('🔍 DEBUG - availableMaterials final:', availableMaterials);
    console.log('🔍 DEBUG - Texto do usuário para análise:', userText);

    if (availableMaterials.length === 0) {
      console.log('❌ Nenhum material disponível na estação');
      return null;
    }

    console.log('🔍 Analisando materiais disponíveis:', availableMaterials.map(m => m.tituloImpresso || m.titulo));

    // 1. VERIFICAR ORIENTAÇÕES ESPECÍFICAS NO ROTEIRO DO ATOR
    for (const scriptItem of patientScript) {
      const info = scriptItem.informacao?.toLowerCase() || '';
      if (info.includes('libere') || info.includes('liberar')) {
        // Extrair nome do material da instrução
        const materialMatch = info.match(/libere?\s+(?:o\s+)?(?:impresso\s+)?([^.]+)/i);
        if (materialMatch) {
          const materialName = materialMatch[1].trim();

          // Buscar material com nome similar
          const matchingMaterial = availableMaterials.find(material => {
            const title = (material.tituloImpresso || material.titulo || '').toLowerCase();
            return title.includes(materialName) || materialName.includes(title);
          });

          if (matchingMaterial) {
            console.log('✅ Material liberado por instrução específica:', matchingMaterial.tituloImpresso);
            return matchingMaterial.idImpresso || matchingMaterial.id;
          }
        }
      }
    }

    // 2. LIBERAÇÃO BASEADA NO NOME/CONTEÚDO DOS MATERIAIS
    for (const material of availableMaterials) {
      if (!material) continue;
      const materialTitle = (material.tituloImpresso || material.titulo || '').toLowerCase();
      const materialContent = (material.conteudo || material.conteudoImpresso || '').toLowerCase();

      // Verificar correspondência direta com nome do material
      const titleWords = materialTitle.split(' ').filter(word => word.length > 2);
      const contentKeywords = this.extractKeywordsFromContent(materialContent);

      // Combinar palavras do título + palavras-chave do conteúdo
      const allKeywords = [...titleWords, ...contentKeywords];

      // Verificar se candidato mencionou alguma palavra-chave relevante
      const hasMatch = allKeywords.some(keyword => {
        if (keyword.length < 3) return false; // Ignorar palavras muito curtas
        return userText.includes(keyword);
      });

      if (hasMatch) {
        console.log(`✅ Material "${materialTitle}" liberado por correspondência:`, {
          keywords: allKeywords.filter(k => userText.includes(k)),
          userText: userText.substring(0, 100)
        });
        return material.idImpresso || material.id;
      }
    }

    // 3. CORRESPONDÊNCIA SEMÂNTICA INTELIGENTE
    const semanticMatches = {
      'exame físico': ['físico', 'exame físico', 'semiologia', 'propedêutica'],
      'sinais vitais': ['vitais', 'pressão', 'temperatura', 'pulso', 'respiração', 'pa', 'fc', 'fr'],
      'laboratório': ['hemograma', 'sangue', 'urina', 'fezes', 'pcr', 'vhs', 'glicemia'],
      'radiografia': ['raio-x', 'raio x', 'rx', 'radiografia', 'tórax'],
      'prescrição': ['receita', 'medicamento', 'remédio', 'prescrição'],
      'atestado': ['atestado', 'licença', 'afastamento']
    };

    for (const [category, keywords] of Object.entries(semanticMatches)) {
      const hasSemanticMatch = keywords.some(keyword => userText.includes(keyword));

      if (hasSemanticMatch) {
        // Buscar material que se relaciona com esta categoria
        const matchingMaterial = availableMaterials.find(material => {
          const title = (material.tituloImpresso || material.titulo || '').toLowerCase();
          const content = (material.conteudo || material.conteudoImpresso || '').toLowerCase();

          return keywords.some(keyword =>
            title.includes(keyword) || content.includes(keyword) || title.includes(category)
          );
        });

        if (matchingMaterial) {
          console.log(`✅ Material liberado por correspondência semântica "${category}":`, matchingMaterial.tituloImpresso);
          return matchingMaterial.idImpresso || matchingMaterial.id;
        }
      }
    }

    return null;
  }

  extractKeywordsFromContent(content) {
    if (!content) return [];

    // Extrair palavras-chave relevantes do conteúdo
    const medicalKeywords = [
      'pressão arterial', 'temperatura', 'pulso', 'respiração', 'saturação',
      'ausculta', 'palpação', 'inspeção', 'percussão',
      'hemograma', 'glicemia', 'ureia', 'creatinina', 'pcr', 'vhs',
      'radiografia', 'tomografia', 'ressonância', 'ultrassom',
      'eletrocardiograma', 'ecg', 'ecocardiograma'
    ];

    return medicalKeywords.filter(keyword => content.includes(keyword));
  }

  getVagueRequestHistory(conversationHistory) {
    const vagueKeywords = [
      'exames', 'exame de sangue', 'laboratório', 'exames complementares',
      'exames laboratoriais', 'exame de imagem', 'procedimentos'
    ];

    let vagueCount = 0;
    let lastVagueRequest = '';

    conversationHistory.forEach(msg => {
      if (msg.sender !== 'ai' && msg.message) {
        const text = msg.message.toLowerCase();
        const hasVague = vagueKeywords.some(keyword => text.includes(keyword));

        if (hasVague) {
          vagueCount++;
          lastVagueRequest = msg.message;
        }
      }
    });

    return {
      hasVagueRequests: vagueCount > 0,
      count: vagueCount,
      lastVague: lastVagueRequest
    };
  }

  isOffScript(userMessage, stationData) {
    const userText = userMessage.toLowerCase();
    const patientScript = stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado || [];
    const pepData = stationData?.padraoEsperadoProcedimento || null;

    // Coletar todos os tópicos relevantes do roteiro do ator
    const scriptTopics = new Set();
    patientScript.forEach(item => {
      if (item.contextoOuPerguntaChave) {
        scriptTopics.add(item.contextoOuPerguntaChave.toLowerCase());
      }
      if (item.informacao) {
        // Extrair palavras-chave médicas relevantes
        const medicalKeywords = item.informacao.toLowerCase().match(/\b[a-záàâãéêíóôõúç]{4,}\b/g) || [];
        medicalKeywords.forEach(keyword => scriptTopics.add(keyword));
      }
    });

    // Coletar tópicos dos itens do PEP (checklist)
    if (pepData && pepData.itensAvaliacao) {
      pepData.itensAvaliacao.forEach(item => {
        if (item.descricaoItem) {
          const pepKeywords = item.descricaoItem.toLowerCase().match(/\b[a-záàâãéêíóôõúç]{4,}\b/g) || [];
          pepKeywords.forEach(keyword => scriptTopics.add(keyword));
        }
      });
    }

    // Verificar se a pergunta tem relação com algum tópico do script/PEP
    const scriptTopicsArray = Array.from(scriptTopics);
    const hasRelation = scriptTopicsArray.some(topic => {
      return userText.includes(topic) || topic.includes(userText.replace(/[^a-záàâãéêíóôõúç\s]/g, '').trim().split(' ')[0]);
    });

    // Se não tem relação com script/PEP e não é pergunta médica básica, é fora do script
    const basicMedicalTerms = ['dor', 'sintoma', 'quando', 'como', 'onde', 'medicamento', 'tratamento', 'exame', 'problema', 'queixa'];
    const isBasicMedical = basicMedicalTerms.some(term => userText.includes(term));

    return !hasRelation && !isBasicMedical;
  }

  shouldGiveVagueResponse(userMessage, conversationHistory, stationData) {
    const vagueHistory = this.getVagueRequestHistory(conversationHistory);
    const userText = userMessage.toLowerCase();

    console.log('🔍 DEBUG shouldGiveVagueResponse - userText:', userText);

    // Primeiro verificar se tem especificidade suficiente
    const specificTerms = [
      'hemograma', 'pcr', 'vhs', 'glicemia', 'ureia', 'creatinina',
      'radiografia', 'tomografia', 'ressonância', 'ultrassom',
      'exame físico', 'sinais vitais', 'ausculta', 'palpação', 'inspeção',
      'eletrocardiograma', 'ecg', 'ecocardiograma',
      'coluna lombar', 'coluna cervical', 'tórax', 'abdomen'
    ];

    const hasSpecificTerms = specificTerms.some(term => userText.includes(term));

    console.log('🔍 DEBUG - hasSpecificTerms:', hasSpecificTerms);

    // Se já tem termos específicos, NÃO é vago
    if (hasSpecificTerms) {
      console.log('✅ Solicitação específica detectada - não é vaga');
      return { isVague: false };
    }

    // Detectar apenas solicitações realmente vagas
    const vaguePatterns = [
      /^(solicito?\s+)?exames?\s*$/i,                    // "solicito exames" sem especificar
      /^(quero\s+fazer\s+)?exames?\s*$/i,                // "quero fazer exames" sem especificar
      /^laboratório\s*$/i,                               // só "laboratório" sem especificar
      /^procedimentos?\s*$/i,                            // só "procedimentos" sem especificar
      /^(solicito?\s+)?exames?\s+(complementares?|de\s+rotina)\s*$/i  // "exames complementares" genérico
    ];

    const isVagueRequest = vaguePatterns.some(pattern => pattern.test(userText));

    console.log('🔍 DEBUG - isVagueRequest:', isVagueRequest);

    if (!isVagueRequest) return { isVague: false };

    // Se é primeira vez com solicitação vaga
    if (vagueHistory.count === 0) {
      return {
        isVague: true,
        shouldAccept: false,
        response: "Seja mais específico, doutor. Quais exames exatamente?"
      };
    }

    // Se já fez solicitação vaga antes, aceitar na segunda vez
    return {
      isVague: true,
      shouldAccept: true,
      response: "Certo, doutor."
    };
  }

  async analyzeSemanticPrompt(prompt, options = {}) {
    const keyData = this.getActiveKey();
    try {
      const genAI = new GoogleGenerativeAI(keyData.key);
      const model = genAI.getGenerativeModel({
        model: options.model || "gemini-2.5-flash"
      });

      console.log(`🧠 Enviando análise semântica para Gemini 2.5 Flash (chave ${keyData.index})`);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      keyData.quotaUsed++;
      keyData.lastUsed = new Date();

      console.log(`✅ Análise semântica concluída: ${text.trim()}`);

      return {
        message: text,
        keyUsed: keyData.index,
        quotaRemaining: keyData.maxQuota - keyData.quotaUsed
      };

    } catch (error) {
      console.error(`❌ Erro na análise semântica com chave ${keyData.index}:`, error.message);
      keyData.errors++;

      // Tentar próxima chave se disponível
      if (keyData.errors >= 3) {
        keyData.isActive = false;
        console.log(`🚫 Chave ${keyData.index} desativada após múltiplos erros`);
      }

      // Retry com próxima chave
      const nextKey = this.getActiveKey();
      if (nextKey && nextKey.index !== keyData.index) {
        return this.analyzeSemanticPrompt(prompt);
      }

      throw error;
    }
  }
}

// Instância global do manager
const aiChatManager = new AIChatManager();

const DEFAULT_FEEDBACK_TEMPLATE = {
  temaEstacao: '',
  resumoEstacao: '',
  contextoClinico: '',
  investigacaoAnamnese: [],
  antecedentesRelevantes: [],
  sinaisVitaisEssenciais: [],
  exameFisicoEssencial: [],
  examesLaboratoriaisEssenciais: [],
  examesImagemEssenciais: [],
  examesComplementaresAdicionais: [],
  classificacao: '',
  condutaGeral: [],
  tratamentoConservador: [],
  tratamentoNaoFarmacologico: [],
  tratamentoFarmacologico: [],
  tratamentoCirurgico: [],
  orientacoesPaciente: [],
  sinaisAlerta: [],
  fatoresRisco: [],
  complicacoesPotenciais: [],
  planoSeguimento: [],
  criteriosEncaminhamento: [],
  criteriosInternacao: [],
  criteriosTratamentoAmbulatorial: [],
  prioridadesEstudo: [],
  destaquesDesempenho: [],
  observacoesIA: []
};

const SIMULATION_FEEDBACK_SCHEMA = `{
  "temaEstacao": "string",
  "resumoEstacao": "string",
  "contextoClinico": "string",
  "investigacaoAnamnese": ["string"],
  "antecedentesRelevantes": ["string"],
  "sinaisVitaisEssenciais": ["string"],
  "exameFisicoEssencial": ["string"],
  "examesLaboratoriaisEssenciais": ["string"],
  "examesImagemEssenciais": ["string"],
  "examesComplementaresAdicionais": ["string"],
  "classificacao": "string",
  "condutaGeral": ["string"],
  "tratamentoConservador": ["string"],
  "tratamentoNaoFarmacologico": ["string"],
  "tratamentoFarmacologico": ["string"],
  "tratamentoCirurgico": ["string"],
  "orientacoesPaciente": ["string"],
  "sinaisAlerta": ["string"],
  "fatoresRisco": ["string"],
  "complicacoesPotenciais": ["string"],
  "planoSeguimento": ["string"],
  "criteriosEncaminhamento": ["string"],
  "criteriosInternacao": ["string"],
  "criteriosTratamentoAmbulatorial": ["string"],
  "prioridadesEstudo": ["string"],
  "destaquesDesempenho": ["string"],
  "observacoesIA": ["string"]
}`;

function cloneDefaultFeedback() {
  return JSON.parse(JSON.stringify(DEFAULT_FEEDBACK_TEMPLATE));
}

function sanitizeRichText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|section|article|ul|ol|h[1-6])>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildChecklistOverview(checklistData) {
  const items = (checklistData && Array.isArray(checklistData.itensAvaliacao))
    ? checklistData.itensAvaliacao.slice(0, 25)
    : [];

  if (!items.length) {
    return 'Checklist não disponível.';
  }

  return items.map((item, index) => {
    const numero = item?.itemNumeroOficial || item?.idItem || index + 1;
    const descricao = sanitizeRichText(item?.descricaoItem || 'Item sem descrição.');
    const adequado = item?.pontuacoes?.adequado
      ? `Adequado (${item.pontuacoes.adequado.pontos ?? 0} pts): ${sanitizeRichText(item.pontuacoes.adequado.criterio || '')}`
      : 'Adequado: não informado';
    const parcial = item?.pontuacoes?.parcialmenteAdequado
      ? `Parcial (${item.pontuacoes.parcialmenteAdequado.pontos ?? 0} pts): ${sanitizeRichText(item.pontuacoes.parcialmenteAdequado.criterio || '')}`
      : 'Parcial: não informado';
    const inadequado = item?.pontuacoes?.inadequado
      ? `Inadequado (${item.pontuacoes.inadequado.pontos ?? 0} pts): ${sanitizeRichText(item.pontuacoes.inadequado.criterio || '')}`
      : 'Inadequado: não informado';

    return `Item ${numero}:\nDescrição: ${descricao}\n${adequado}\n${parcial}\n${inadequado}`;
  }).join('\n\n');
}

function buildConversationDigest(conversationHistory = []) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return 'Nenhuma transcrição de candidato disponível.';
  }

  const relevantHistory = conversationHistory.slice(-40);
  return relevantHistory.map((entry, idx) => {
    const role = entry?.role === 'candidate'
      ? 'Candidato'
      : entry?.role === 'actor'
        ? 'Paciente/Ator'
        : (entry?.speakerName || entry?.role || 'Participante');
    const text = sanitizeRichText(entry?.text || '');
    return `${idx + 1}. ${role}: ${text}`;
  }).join('\n');
}

function buildStationContext(stationData = {}) {
  const title = stationData?.tituloEstacao || stationData?.titulo || 'Estação Clínica';
  const especialidade = stationData?.especialidade || stationData?.area || 'Não informada';
  const duracao = stationData?.tempoEstacao || stationData?.duracao || null;
  const instrucoes = sanitizeRichText(
    stationData?.instrucoesParticipante?.descricaoCasoCompleta ||
    stationData?.informacoesEssenciais?.contextoClinico ||
    stationData?.resumoEstacao ||
    ''
  );

  const roteiroArray = Array.isArray(stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado)
    ? stationData.materiaisDisponiveis.informacoesVerbaisSimulado.slice(0, 25)
    : [];

  const roteiro = roteiroArray.length
    ? roteiroArray.map((item, index) => {
        const contexto = sanitizeRichText(item?.contextoOuPerguntaChave || '');
        const informacao = sanitizeRichText(item?.informacao || '');
        return `Seção ${index + 1}:\nContexto: ${contexto}\nInformação: ${informacao}`;
      }).join('\n\n')
    : 'Roteiro verbal não disponível.';

  const materiaisDisponiveis = Array.isArray(stationData?.materiaisDisponiveis?.impressos)
    ? stationData.materiaisDisponiveis.impressos.map((item, index) => {
        const titulo = sanitizeRichText(item?.tituloImpresso || item?.titulo || `Impresso ${index + 1}`);
        const tipo = sanitizeRichText(item?.tipoConteudo || 'não informado');
        return `${titulo} (${tipo})`;
      }).join('\n')
    : 'Nenhum impresso cadastrado.';

  return {
    titulo: sanitizeRichText(title),
    especialidade: sanitizeRichText(especialidade),
    duracao,
    instrucoes,
    roteiro,
    materiaisDisponiveis
  };
}

function buildSimulationFeedbackPrompt({ stationData = {}, checklistData = {}, conversationHistory = [], metadata = {} }) {
  const context = buildStationContext(stationData);
  const checklistResumo = buildChecklistOverview(checklistData);
  const conversationResumo = buildConversationDigest(conversationHistory);
  const objetivos = sanitizeRichText(
    Array.isArray(stationData?.objetivosAprendizado)
      ? stationData.objetivosAprendizado.join('\n')
      : stationData?.objetivosAprendizado ||
        stationData?.instrucoesParticipante?.tarefasPrincipais?.join('\n') ||
        ''
  );
  const metadataInfo = Object.entries(metadata || {})
    .map(([key, value]) => `${key}: ${sanitizeRichText(value)}`)
    .join('\n');

  return `
Você é um avaliador-clínico sênior especializado em estações OSCE, com foco na 2ª fase do INEP Revalida e em outras provas brasileiras/internacionais que seguem o método OSCE. Utilize TODAS as fontes a seguir (dados estruturados da estação, roteiro do paciente padronizado, lista de impressos e itens do PEP) e, se existir, o histórico da fala do candidato. Produza um feedback robusto que funcione como guia de preparação e revisão final para um candidato que enfrentará uma estação com este tema diagnóstico.

INSTRUÇÕES DE ALTA PRIORIDADE:
• Trate o título da estação como referência principal para o tema clínico.
• Integre achados do roteiro/verbalização do paciente, materiais/impressos e cada item do PEP para definir competências específicas.
• Se houver transcrição do candidato, use-a para reconhecer pontos realizados/omitidos; caso contrário, descreva o que deve ser feito.
• Adote a ótica das matrizes oficiais do Revalida (2024+) e das boas práticas OSCE: comunicação clara, empatia, segurança do paciente, higienização, consentimento, manejo do tempo, justificativas diagnósticas e tomada de decisão baseada em evidências brasileiras.

OBJETIVO DO FEEDBACK:
Fornecer um panorama completo que inclua:
1. Visão geral do tema e competências avaliadas (justifique com base no contexto da estação).
2. Checklist operacional da estação:
   - preparação inicial (EPI, conferência do cenário, abordagem inicial, identificação do paciente);
   - anamnese focada: perguntas mandatórias (queixa principal, HMA, antecedentes, fatores de risco, hábitos, contexto biopsicossocial);
   - sinais vitais e exame físico dirigido (passo a passo semiológico coerente com o tema);
   - interpretação dos impressos/exames fornecidos e quais complementares devem ser solicitados segundo protocolos brasileiros;
   - hipóteses diagnósticas principais e diferenciais, com critérios de classificação ou gravidade se aplicável.
3. Condutas e manejo:
   - medidas imediatas de segurança e suporte;
   - condutas conservadoras e não farmacológicas;
   - terapias farmacológicas com doses ou princípios ativos recomendados em diretrizes nacionais;
   - indicações de procedimentos/cirurgia, se cabíveis;
   - comunicação de más notícias ou orientações educacionais para o paciente/ator.
4. Critérios de evolução:
   - sinais de alerta/agravamento;
   - critérios para observação, internação, encaminhamento ou alta ambulatorial;
   - plano de seguimento e monitorizações.
5. Recomendações finais:
   - principais itens do PEP que não podem ser esquecidos (cite explicitamente);
   - erros frequentes na prova OSCE/Revalida sobre esse tema e como evitá-los;
   - checklist mental rápido (passos em ordem lógica);
   - referências de estudo sugeridas (protocolos do MS, sociedades brasileiras, cadernos de habilidades).

FORMATO DA RESPOSTA:
• Retorne APENAS JSON válido usando o schema fornecido abaixo.
• Use português formal/objetivo.
• Sempre que possível, cite de qual fonte (roteiro, PEP, impressos, conversa) veio a informação, usando frases como "Segundo o roteiro..." ou "PEP exige...".

INFORMAÇÕES DA ESTAÇÃO:
- Título: ${context.titulo}
- Especialidade: ${context.especialidade}
- Duração aproximada: ${context.duracao || 'não informada'}

OBJETIVOS PRINCIPAIS / TAREFAS DO CANDIDATO:
${objetivos || 'Objetivos não informados'}

INSTRUÇÕES / CONTEXTO CLÍNICO PARA O CANDIDATO:
${context.instrucoes || 'Sem instruções detalhadas'}

ROTEIRO DO PACIENTE PADRONIZADO (trechos relevantes):
${context.roteiro}

MATERIAIS DISPONÍVEIS AO CANDIDATO / IMPRESSOS:
${context.materiaisDisponiveis}

RESUMO DO CHECKLIST (PEP):
${checklistResumo}

TRANSCRIÇÃO / FALA DO CANDIDATO (apenas dados disponíveis):
${conversationResumo}

METADADOS ADICIONAIS:
${metadataInfo || 'Nenhum metadado adicional informado.'}

INSTRUÇÕES PARA O FEEDBACK:
1. Siga estritamente o modelo JSON descrito abaixo.
2. O feedback deve estar alinhado às competências avaliadas no Revalida (anamnese, exame físico, propedêutica, julgamento clínico, conduta).
3. Foque em orientar o candidato sobre o que deveria ter investigado, interpretado e conduzido.
4. Reforce sinais de alerta, fatores de risco e justificativas para condutas.
5. Quando um tópico não se aplicar claramente, use uma lista vazia [] ou a string "nao_aplicavel", mas mantenha o campo.
6. Nunca inclua itens marcados como "ausente" ou "ausentes" no roteiro ou materiais; omita-os do feedback.
7. Utilize linguagem clara, objetiva e profissional, em português (PT-BR), com foco acadêmico/clínico.

SCHEMA JSON OBRIGATÓRIO (retorne APENAS JSON válido, sem texto extra):
${SIMULATION_FEEDBACK_SCHEMA}

RETORNE SOMENTE JSON. NÃO envolva em markdown.
`;
}

function parseAiFeedbackResponse(rawText) {
  if (!rawText) {
    return cloneDefaultFeedback();
  }

  let jsonText = rawText.trim();

  const tryParse = (text) => {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  };

  let parsed = tryParse(jsonText);

  if (!parsed) {
    jsonText = jsonText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    parsed = tryParse(jsonText);
  }

  if (!parsed) {
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = tryParse(match[0]);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return cloneDefaultFeedback();
  }

  const normalized = cloneDefaultFeedback();
  Object.keys(normalized).forEach((key) => {
    const value = parsed[key];
    if (Array.isArray(normalized[key])) {
      if (Array.isArray(value)) {
        normalized[key] = value
          .map((item) => sanitizeRichText(item))
          .filter(text => text && !/ausente/i.test(text));
      } else if (typeof value === 'string' && value.trim()) {
        const text = sanitizeRichText(value);
        normalized[key] = /ausente/i.test(text) ? [] : [text];
      } else {
        normalized[key] = [];
      }
    } else if (typeof normalized[key] === 'string') {
      normalized[key] = sanitizeRichText(typeof value === 'string' ? value : '');
    }
  });

  return normalized;
}

function pushUnique(list, value) {
  const text = sanitizeRichText(value);
  if (!text) return;
  if (/ausente/i.test(text)) return;
  if (!list.includes(text)) {
    list.push(text);
  }
}

function buildFallbackFeedback({ stationData = {}, checklistData = {}, conversationHistory = [] }) {
  const feedback = cloneDefaultFeedback();
  const context = buildStationContext(stationData);

  feedback.temaEstacao = context.titulo || 'Tema não identificado';
  feedback.resumoEstacao = context.instrucoes || context.roteiro || 'Resumo técnico não disponível. Consulte o roteiro do paciente e o PEP da estação.';
  feedback.contextoClinico = context.roteiro || context.instrucoes || 'Contexto clínico não informado.';

  const pepItems = Array.isArray(checklistData?.itensAvaliacao) ? checklistData.itensAvaliacao : [];

  const keywordTargets = [
    { regex: /(anamnese|histó|pergunta|investiga|queixa|hma|hda|interroga)/i, target: feedback.investigacaoAnamnese },
    { regex: /(antecedente|comorbidade|familiar|gesta|para|obst|social|hábitos|medicamento|alergia)/i, target: feedback.antecedentesRelevantes },
    { regex: /(sinais vitais|ssvv|pressão|temperatura|pulso|freq|glicemia|saturação|capilar)/i, target: feedback.sinaisVitaisEssenciais },
    { regex: /(exame físico|semiologia|inspeção|palpação|ausculta|percussão|manobra|exame geral|segmentar)/i, target: feedback.exameFisicoEssencial },
    { regex: /(laborat|hemograma|dosagem|bioquím|gasometria|urina|urocultura|serologia|perfil|hormônio|pcr|vhs)/i, target: feedback.examesLaboratoriaisEssenciais },
    { regex: /(imagem|raio-x|rx|radiografia|tomografia|ressonância|ultrassom|ecografia|mamografia|ecg|eletrocardiograma|ecocardiograma|colonoscopia|endoscopia)/i, target: feedback.examesImagemEssenciais },
    { regex: /(classifica|estadi|escore|grau|diagnóstico|hipótese|cid)/i, target: feedback.classificacao },
    { regex: /(alerta|alarme|gravidade|choque|instabilidade)/i, target: feedback.sinaisAlerta },
    { regex: /(fator de risco|risco elevado|predisposição|agravante)/i, target: feedback.fatoresRisco },
    { regex: /(complica|desfecho|sequela|evento adverso)/i, target: feedback.complicacoesPotenciais },
    { regex: /(retorno|seguimento|reavaliação|acompanhamento|monitorização)/i, target: feedback.planoSeguimento },
    { regex: /(encaminha|referencia|contrarreferencia|especialista)/i, target: feedback.criteriosEncaminhamento },
    { regex: /(internação|hospitaliza|leito)/i, target: feedback.criteriosInternacao },
    { regex: /(ambulatorial|tratamento ambulatorial|manejo ambulatorial)/i, target: feedback.criteriosTratamentoAmbulatorial }
  ];

  pepItems.forEach((item, index) => {
    const descricao = sanitizeRichText(item?.descricaoItem || '');
    if (!descricao) return;
    const prefix = `PEP ${item?.itemNumeroOficial || index + 1}: ${descricao}`;
    const lower = descricao.toLowerCase();

    let matched = false;
    keywordTargets.forEach(({ regex, target }) => {
      if (regex.test(lower)) {
        pushUnique(target, prefix);
        matched = true;
      }
    });

    if (/(conduta|manejo|tratamento|administra|realiza|inicia|prescreve|intervenção)/i.test(lower)) {
      pushUnique(feedback.condutaGeral, prefix);
      matched = true;
    }

    if (/(orienta|educa|aconselha|explica|consente|instrui|ensina)/i.test(lower)) {
      pushUnique(feedback.orientacoesPaciente, prefix);
      matched = true;
    }

    if (/(tratamento não farmac|medidas não farmac|estilo de vida|fisioterapia|psicoterapia|apoio|reabilitação)/i.test(lower)) {
      pushUnique(feedback.tratamentoNaoFarmacologico, prefix);
      matched = true;
    }

    if (/(medic|farmac|dose|prescreve|antibiótico|analgésico|anti|medicação|terapia farmacológica)/i.test(lower)) {
      pushUnique(feedback.tratamentoFarmacologico, prefix);
      matched = true;
    }

    if (/(cirurg|procedimento|invasivo|drenagem|intubação|traqueostomia|sutura|biópsia|operatório)/i.test(lower)) {
      pushUnique(feedback.tratamentoCirurgico, prefix);
      matched = true;
    }

    if (!matched) {
      pushUnique(feedback.condutaGeral, prefix);
    }
  });

  const impressos = Array.isArray(stationData?.materiaisDisponiveis?.impressos) ? stationData.materiaisDisponiveis.impressos : [];
  impressos.forEach((impresso, idx) => {
    const titulo = sanitizeRichText(impresso?.tituloImpresso || impresso?.titulo || `Impresso ${idx + 1}`);
    const tipo = sanitizeRichText(impresso?.tipoConteudo || '');
    const descricao = sanitizeRichText(impresso?.descricao || '');
    const baseText = descricao ? `${titulo} — ${descricao}` : titulo;
    const lower = `${titulo} ${tipo}`.toLowerCase();

    if (/(laborat|hemograma|exame de sangue|bioquím|serologia|dosagem)/i.test(lower)) {
      pushUnique(feedback.examesLaboratoriaisEssenciais, `Impresso disponível: ${baseText}`);
    } else if (/(imagem|radiografia|raio-x|rx|tomografia|ressonância|ultrassom|ecografia|mamografia|endoscopia|colonoscopia|ecg|eletrocardiograma|ecocardiograma)/i.test(lower)) {
      pushUnique(feedback.examesImagemEssenciais, `Impresso disponível: ${baseText}`);
    } else {
      pushUnique(feedback.examesComplementaresAdicionais, `Impresso disponível: ${baseText}`);
    }
  });

  const roteiro = Array.isArray(stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado)
    ? stationData.materiaisDisponiveis.informacoesVerbaisSimulado
    : [];

  roteiro.slice(0, 12).forEach((bloco, idx) => {
    const contexto = sanitizeRichText(bloco?.contextoOuPerguntaChave || '');
    const informacao = sanitizeRichText(bloco?.informacao || '');
    const texto = contexto && informacao ? `${contexto}: ${informacao}` : informacao || contexto;
    if (!texto) return;
    const lower = texto.toLowerCase();

    if (/(anamnese|pergunta|investiga|históri|queixa)/i.test(lower)) {
      pushUnique(feedback.investigacaoAnamnese, `Roteiro ${idx + 1}: ${texto}`);
    } else if (/(antecedente|familiar|gesta|para|obst|comorbidade)/i.test(lower)) {
      pushUnique(feedback.antecedentesRelevantes, `Roteiro ${idx + 1}: ${texto}`);
    } else if (/(exame físico|inspeção|palpação|ausculta|percussão|manobra)/i.test(lower)) {
      pushUnique(feedback.exameFisicoEssencial, `Roteiro ${idx + 1}: ${texto}`);
    } else {
      pushUnique(feedback.condutaGeral, `Roteiro ${idx + 1}: ${texto}`);
    }
  });

  if (conversationHistory.length > 0) {
    const perguntas = conversationHistory
      .filter(item => (item.role || item.sender) !== 'ai')
      .map((item, index) => sanitizeRichText(item.text || item.message || `Interação ${index + 1}`))
      .filter(Boolean)
      .slice(-8);

    perguntas.forEach((pergunta, idx) => {
      pushUnique(feedback.destaquesDesempenho, `Pergunta realizada (${idx + 1}): ${pergunta}`);
    });
  }

  if (!feedback.prioridadesEstudo.length) {
    pushUnique(feedback.prioridadesEstudo, 'Revisar protocolos e diretrizes nacionais relacionados ao tema da estação (Ministério da Saúde e sociedades brasileiras).');
    pushUnique(feedback.prioridadesEstudo, 'Simular a estação em formato OSCE, enfatizando comunicação, segurança do paciente e justificativa clínica.');
    pushUnique(feedback.prioridadesEstudo, 'Estudar cada item do PEP e praticar o roteiro do paciente em voz alta, controlando o tempo.');
  }

  pushUnique(feedback.observacoesIA, 'Feedback construído automaticamente a partir do roteiro, impressos e PEP devido a indisponibilidade momentânea do motor de IA generativa.');
  pushUnique(feedback.observacoesIA, 'Utilize este resumo como base e complemente com estudo dirigido, simulados OSCE e revisão das diretrizes nacionais.');

  return feedback;
}

function sanitizePerformanceArray(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map(value => sanitizeRichText(value))
    .filter(text => text && !/ausente/i.test(text));
}

function normalizePerformance(performance = {}) {
  const normalized = {
    visaoGeral: sanitizeRichText(performance.visaoGeral || ''),
    pontosFortes: sanitizePerformanceArray(performance.pontosFortes),
    pontosDeMelhoria: sanitizePerformanceArray(performance.pontosDeMelhoria),
    recomendacoesOSCE: sanitizePerformanceArray(performance.recomendacoesOSCE),
    indicadoresCriticos: sanitizePerformanceArray(performance.indicadoresCriticos)
  };

  if (!normalized.visaoGeral) {
    normalized.visaoGeral = 'Resumo indisponível. Revise cada item do PEP, priorizando segurança do paciente, comunicação e cumprimento dos critérios obrigatórios.';
  }
  if (!normalized.pontosFortes.length) {
    normalized.pontosFortes.push('Nenhum ponto forte identificado automaticamente. Reforce o roteiro completo da estação.');
  }
  if (!normalized.pontosDeMelhoria.length) {
    normalized.pontosDeMelhoria.push('Revise o PEP item a item e treine a execução completa dos critérios obrigatórios.');
  }
  if (!normalized.recomendacoesOSCE.length) {
    normalized.recomendacoesOSCE.push('Simule a estação em formato OSCE, praticando comunicação estruturada, tempo de resposta e justificativas clínicas.');
  }
  if (!normalized.indicadoresCriticos.length) {
    normalized.indicadoresCriticos.push('Garanta a execução dos itens críticos do PEP (segurança do paciente, anamnese dirigida e condutas prioritárias).');
  }

  return normalized;
}

// Endpoint principal para chat AI
router.post('/chat', async (req, res) => {
  try {
    const { message, stationData, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log(`💬 Nova mensagem AI: "${message}" (histórico: ${conversationHistory.length} msgs)`);

    const aiResponse = await aiChatManager.generateAIResponse(
      message,
      stationData,
      conversationHistory
    );

    res.json(aiResponse);

  } catch (error) {
    console.error('❌ Erro no chat AI:', error);

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Desculpe, não consegui processar sua mensagem. Tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para gerar feedback estruturado da simulação
router.post('/simulation-feedback', async (req, res) => {
  const {
    stationData,
    checklistData,
    conversationHistory = [],
    metadata = {}
  } = req.body || {};

  if (!stationData) {
    return res.status(400).json({ error: 'stationData é obrigatório' });
  }

  const prompt = buildSimulationFeedbackPrompt({
    stationData,
    checklistData,
    conversationHistory,
    metadata
  });

  try {
    const aiResponse = await aiChatManager.analyzeSemanticPrompt(prompt, { model: 'gemini-2.5-flash' });
    const feedback = parseAiFeedbackResponse(aiResponse.message);

    res.json({
      success: true,
      feedback,
      raw: process.env.NODE_ENV === 'development' ? aiResponse.message : undefined,
      metadata: {
        keyUsed: aiResponse.keyUsed,
        quotaRemaining: aiResponse.quotaRemaining,
        fallback: false
      }
    });
  } catch (error) {
    console.error('❌ Erro ao gerar feedback com IA:', error);

    const fallbackFeedback = buildFallbackFeedback({ stationData, checklistData, conversationHistory });

    res.status(200).json({
      success: false,
      feedback: fallbackFeedback,
      metadata: {
        fallback: true,
        fallbackReason: sanitizeRichText(error?.message || 'Erro desconhecido'),
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Endpoint para avaliar PEP automaticamente
router.post('/evaluate-pep', async (req, res) => {
  try {
    const { stationData, conversationHistory, checklistData } = req.body;

    console.log('🤖 Iniciando avaliação inteligente do PEP...');
    console.log(`📊 Histórico: ${conversationHistory.length} mensagens`);
    console.log(`📋 Checklist: ${checklistData?.itensAvaliacao?.length || 0} itens`);

    // Construir prompt detalhado para avaliação
    let prompt = `Você é um avaliador médico especializado em provas OSCE (incluindo Revalida 2ª fase). Analise CUIDADOSAMENTE a conversa entre médico e paciente e avalie o desempenho do médico em cada item do checklist (PEP - Padrão Esperado de Procedimento). Ao final, produza também um resumo estruturado da performance geral do candidato.

CONVERSA COMPLETA:
${conversationHistory.map((msg, i) => {
  const role = msg.role === 'candidate' || msg.sender === 'candidate' ? 'Médico' : 'Paciente';
  const content = msg.content || msg.message || '';
  return `${i + 1}. ${role}: ${content}`;
}).join('\n')}

ITENS DO CHECKLIST PARA AVALIAR:
`;

    // Adicionar cada item com critérios detalhados
    checklistData?.itensAvaliacao?.forEach((item, index) => {
      prompt += `\n--- ITEM ${index + 1} ---\n`;
      prompt += `Descrição: ${item.descricaoItem || 'Sem descrição'}\n`;

      if (item.pontuacoes) {
        if (item.pontuacoes.adequado) {
          prompt += `✅ ADEQUADO (${item.pontuacoes.adequado.pontos || 1.00} pts): ${item.pontuacoes.adequado.criterio || 'Critério adequado'}\n`;
        }
        if (item.pontuacoes.parcialmenteAdequado) {
          prompt += `⚠️ PARCIALMENTE ADEQUADO (${item.pontuacoes.parcialmenteAdequado.pontos || 0.50} pts): ${item.pontuacoes.parcialmenteAdequado.criterio || 'Critério parcialmente adequado'}\n`;
        }
        if (item.pontuacoes.inadequado) {
          prompt += `❌ INADEQUADO (${item.pontuacoes.inadequado.pontos || 0.00} pts): ${item.pontuacoes.inadequado.criterio || 'Critério inadequado'}\n`;
        }
      }
    });

    prompt += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  INSTRUÇÕES CRÍTICAS DE FORMATAÇÃO - LEIA COM ATENÇÃO  ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOCÊ É UM SISTEMA DE AVALIAÇÃO AUTOMATIZADA.
SUA ÚNICA FUNÇÃO É RETORNAR JSON VÁLIDO.
QUALQUER DESVIO DESTE FORMATO CAUSARÁ FALHA TOTAL DO SISTEMA.

═══════════════════════════════════════════════════════════
REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA CRÍTICA):
═══════════════════════════════════════════════════════════

🚫 PROIBIDO ABSOLUTAMENTE:
   ❌ Texto explicativo antes do JSON
   ❌ Texto explicativo depois do JSON
   ❌ Markdown com blocos de código
   ❌ Comentários dentro do JSON
   ❌ Quebras de linha extras
   ❌ Caracteres antes de {
   ❌ Caracteres depois de }

✅ OBRIGATÓRIO:
   ✓ Primeiro caractere DEVE ser: {
   ✓ Último caractere DEVE ser: }
   ✓ JSON válido conforme RFC 8259
   ✓ Strings entre aspas duplas
   ✓ Números sem aspas
   ✓ Vírgulas entre elementos do array

═══════════════════════════════════════════════════════════
FORMATO EXATO DA RESPOSTA:
═══════════════════════════════════════════════════════════

{"items":[{"pontuacao":2.00,"justificativa":"Texto aqui"},{"pontuacao":0.00,"justificativa":"Texto aqui"}], "performance":{"visaoGeral":"Texto","pontosFortes":["..."],"pontosDeMelhoria":["..."],"recomendacoesOSCE":["..."],"indicadoresCriticos":["..."]}}

OU (com formatação para legibilidade):

{
  "items": [
    {
      "pontuacao": 2.00,
      "justificativa": "O médico solicitou hemograma completo e PCR conforme esperado"
    },
    {
      "pontuacao": 1.00,
      "justificativa": "O médico solicitou apenas um dos exames laboratoriais necessários"
    },
    {
      "pontuacao": 0.00,
      "justificativa": "O médico não solicitou radiografia de tórax"
    },
  ],
  "performance": {
    "visaoGeral": "Resumo narrativo da performance geral citando itens cumpridos e falhas críticas.",
    "pontosFortes": ["Item cumprido destacado com referência ao PEP ou diálogo."],
    "pontosDeMelhoria": ["O que faltou fazer, sempre que possível referenciando o PEP."],
    "recomendacoesOSCE": ["Recomendações de estudo/treino específicas para OSCE/Revalida."],
    "indicadoresCriticos": ["Alertas para competências essenciais não realizadas."]
  ]
}

═══════════════════════════════════════════════════════════
INSTRUÇÕES DE AVALIAÇÃO - LEIA COM EXTREMA ATENÇÃO:
═══════════════════════════════════════════════════════════

🚨 REGRA FUNDAMENTAL: VOCÊ DEVE DETECTAR QUANDO O MÉDICO **NÃO** FEZ ALGO! 🚨

1. Leia TODA a conversa acima linha por linha

2. Para CADA item do checklist, siga este processo RIGOROSO:

   PASSO 1: Identifique TODOS os subitens do critério
   - Se o critério diz "(1) item1; (2) item2; (3) item3" → são 3 subitens
   - Se diz "investiga X, Y e Z" → são 3 subitens
   - Conte EXATAMENTE quantos subitens existem

   PASSO 2: 🔍 VERIFIQUE SE O MÉDICO **REALMENTE FEZ** CADA AÇÃO NA CONVERSA
   ⚠️ ATENÇÃO CRÍTICA:
   - Leia PALAVRA POR PALAVRA da conversa
   - Se NÃO encontrar o médico fazendo a ação → marque como NÃO FEITO
   - NÃO presuma que o médico fez algo que não está explícito
   - NÃO dê benefício da dúvida

   ❌ EXEMPLOS DE AÇÕES **NÃO REALIZADAS** (= 0.00 pontos):
   - Critério: "Indica anticoagulação"
     Conversa: [médico não menciona anticoagulação em nenhum momento]
     → INADEQUADO (0.00 pontos) ✓ CORRETO

   - Critério: "Orienta elevação do membro"
     Conversa: [médico não orienta sobre elevação]
     → INADEQUADO (0.00 pontos) ✓ CORRETO

   - Critério: "Solicita hemograma, PCR, VHS"
     Conversa: [médico pede apenas hemograma]
     → PARCIAL (não é adequado, fez 1/3) ✓ CORRETO

   PASSO 3: Classifique baseado na PROPORÇÃO de subitens cumpridos:

   ✅ ADEQUADO = Cumpriu TODOS ou QUASE TODOS os subitens
      Exemplos:
      - Se tem 3 subitens e fez 3 → ADEQUADO
      - Se tem 5 subitens e fez 4-5 → ADEQUADO
      - O médico EXPLICITAMENTE mencionou as ações
      Use: pontuação do campo "adequado.pontos"

   ⚠️ PARCIAL = Cumpriu ALGUNS subitens, mas NÃO TODOS
      Exemplos:
      - Se tem 3 subitens e fez 1-2 → PARCIAL
      - Se tem 5 subitens e fez 2-3 → PARCIAL
      - O médico fez PARTE das ações, mas faltaram algumas
      Use: pontuação do campo "parcialmenteAdequado.pontos"

   ❌ INADEQUADO = NÃO cumpriu OU cumpriu MUITO POUCO
      🚨 ATENÇÃO MÁXIMA AQUI - ESTE É O CASO MAIS IMPORTANTE:
      Exemplos:
      - Se tem 3 subitens e fez 0 → INADEQUADO (0.00)
      - Se tem 5 subitens e fez 0-1 → INADEQUADO (0.00)
      - O médico NÃO mencionou a ação na conversa
      - Você NÃO encontrou evidência da ação no texto
      Use: pontuação do campo "inadequado.pontos" (geralmente 0.00)

      ⚠️ SE SUA JUSTIFICATIVA DIZ "não...", "não menciona", "não indica", "não solicita":
      → A PONTUAÇÃO **DEVE SER 0.00** (inadequado.pontos)

3. REGRA ABSOLUTA: Use os valores EXATOS das pontuações fornecidas
   - NÃO invente valores
   - NÃO use 1, 3, 5 se os valores reais são 2.00, 1.50, 0.50

4. Justificativa: Seja ESPECÍFICO e HONESTO
   - Diga QUANTOS subitens foram cumpridos
   - Se o médico NÃO fez, diga claramente "O médico não..."
   - Exemplo BOM: "O médico investigou DUM (1/3 itens gineco-obstétricos)"
   - Exemplo BOM: "O médico não indicou anticoagulação em nenhum momento (0/1)"
   - Exemplo RUIM: "O médico investigou parcialmente" (sem números)

═══════════════════════════════════════════════════════════
VALIDAÇÃO FINAL ANTES DE RESPONDER:
═══════════════════════════════════════════════════════════

Antes de enviar sua resposta, verifique:
☐ Minha resposta começa com { ?
☐ Minha resposta termina com } ?
☐ Não há NENHUM texto antes de { ?
☐ Não há NENHUM texto depois de } ?
☐ Não há markdown com blocos de código?
☐ Usei aspas duplas em strings?
☐ Usei números sem aspas para pontuacao?
☐ Há ${checklistData?.itensAvaliacao?.length || 0} itens no array?

🚨 VALIDAÇÃO CRÍTICA DE PONTUAÇÃO:
☐ Para CADA item onde escrevi "não..." na justificativa, usei pontuação 0.00?
☐ Verifiquei se o médico REALMENTE fez a ação antes de dar pontos?
☐ NÃO dei pontos para ações que o médico NÃO realizou?

═══════════════════════════════════════════════════════════
INSTRUÇÕES PARA A SEÇÃO "PERFORMANCE":
• "visaoGeral" deve ser um parágrafo curto (máx 3 frases) relacionando ações realizadas/omitidas aos itens do PEP.
• "pontosFortes" e "pontosDeMelhoria" devem conter frases curtas; mencione o item do PEP ou evidência da conversa (“PEP item 3”, “Pergunta sobre alergias”).
• "recomendacoesOSCE" deve listar dicas práticas para treinar (ex.: repetir roteiro semiológico, revisar protocolo X).
• "indicadoresCriticos" deve listar falhas graves que impactam segurança/competências centrais.
• Nunca inclua frases com "ausente" ou que indiquem ausência do roteiro; apenas descreva o que deve ser feito.

AGORA RETORNE APENAS O JSON (COMECE COM {):
═══════════════════════════════════════════════════════════
`;

    console.log('📤 Enviando prompt para IA Gemini 2.5 Flash...');

    // ✅ Usando Gemini 2.5 Flash para avaliação automática do PEP
    const aiResponse = await aiChatManager.analyzeSemanticPrompt(prompt, { model: 'gemini-2.5-flash' });

    console.log('📥 Resposta bruta da IA:', aiResponse.message.substring(0, 200));

    // ═══════════════════════════════════════════════════════════
    // VALIDAÇÃO ROBUSTA DE JSON - MÚLTIPLAS TENTATIVAS
    // ═══════════════════════════════════════════════════════════
    let evaluationData;
    let jsonText = aiResponse.message.trim();

    // Tentativa 1: JSON puro direto
    try {
      evaluationData = JSON.parse(jsonText);
      console.log('✅ JSON parseado com sucesso (tentativa 1 - direto)');
    } catch (error1) {
      console.warn('⚠️ Tentativa 1 falhou:', error1.message);

      // Tentativa 2: Remover markdown code blocks
      try {
        // Remover blocos de código markdown (usando charCode para evitar problemas com backticks)
        const backtick = String.fromCharCode(96); // caractere `
        const codeBlockMarker = backtick + backtick + backtick;
        jsonText = jsonText.split(codeBlockMarker + 'json').join('').split(codeBlockMarker).join('').trim();
        evaluationData = JSON.parse(jsonText);
        console.log('✅ JSON parseado com sucesso (tentativa 2 - sem markdown)');
      } catch (error2) {
        console.warn('⚠️ Tentativa 2 falhou:', error2.message);

        // Tentativa 3: Extrair JSON entre {} usando regex
        try {
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
            evaluationData = JSON.parse(jsonText);
            console.log('✅ JSON parseado com sucesso (tentativa 3 - regex)');
          } else {
            throw new Error('Nenhum JSON encontrado na resposta');
          }
        } catch (error3) {
          console.warn('⚠️ Tentativa 3 falhou:', error3.message);

          // Tentativa 4: Procurar pela estrutura {"items": [...]}
          try {
            const itemsMatch = jsonText.match(/"items"\s*:\s*\[[\s\S]*?\]/);
            if (itemsMatch) {
              jsonText = `{${itemsMatch[0]}}`;
              evaluationData = JSON.parse(jsonText);
              console.log('✅ JSON parseado com sucesso (tentativa 4 - items array)');
            } else {
              throw new Error('Estrutura "items" não encontrada');
            }
          } catch (error4) {
            console.error('❌ TODAS as tentativas de parsing falharam');
            console.error('Resposta original:', aiResponse.message);
            console.error('Erro final:', error4.message);

            // Fallback: criar avaliação padrão com zeros
            console.log('🔄 Usando fallback - todos os itens com pontuação 0');
            evaluationData = {
              items: checklistData?.itensAvaliacao?.map((item, index) => ({
                pontuacao: 0.00,
                justificativa: "Erro ao processar avaliação da IA. Por favor, avalie manualmente."
              })) || []
            };
          }
        }
      }
    }

    // Validação final da estrutura
    if (!evaluationData || !evaluationData.items || !Array.isArray(evaluationData.items)) {
      console.error('❌ Estrutura JSON inválida:', evaluationData);

      // Criar estrutura válida com zeros
      evaluationData = {
        items: checklistData?.itensAvaliacao?.map((item, index) => ({
          pontuacao: 0.00,
          justificativa: "Estrutura de resposta inválida. Por favor, avalie manualmente."
        })) || [],
        performance: {}
      };
    }

    evaluationData.performance = normalizePerformance(evaluationData.performance || {});

    // Validar número de itens
    const expectedItems = checklistData?.itensAvaliacao?.length || 0;
    const receivedItems = evaluationData.items.length;

    if (receivedItems !== expectedItems) {
      console.warn(`⚠️ Número de itens diferente: esperado ${expectedItems}, recebido ${receivedItems}`);

      // Ajustar array para ter o número correto de itens
      if (receivedItems < expectedItems) {
        const missing = expectedItems - receivedItems;
        for (let i = 0; i < missing; i++) {
          evaluationData.items.push({
            pontuacao: 0.00,
            justificativa: "Item não avaliado pela IA. Por favor, avalie manualmente."
          });
        }
      } else if (receivedItems > expectedItems) {
        evaluationData.items = evaluationData.items.slice(0, expectedItems);
      }
    }

    console.log('✅ Validação final concluída:', {
      totalItems: evaluationData.items.length,
      expectedItems: expectedItems,
      structure: 'OK'
    });

    res.json({
      evaluation: evaluationData,
      success: true,
      raw: aiResponse.message // Para debug
    });

  } catch (error) {
    console.error('❌ Erro na avaliação PEP:', error);
    res.status(500).json({
      error: 'Erro ao avaliar PEP',
      details: error.message
    });
  }
});

// Endpoint para análise semântica inteligente
router.post('/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    console.log('🧠 Análise semântica solicitada');

    const response = await aiChatManager.analyzeSemanticPrompt(prompt, { model: 'gemini-2.5-flash' });
    res.json(response);

  } catch (error) {
    console.error('❌ Erro na análise semântica:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error.message
    });
  }
});

// Endpoint para status das chaves API
router.get('/status', (req, res) => {
  const status = aiChatManager.apiKeys.map(key => ({
    index: key.index,
    quotaUsed: key.quotaUsed,
    maxQuota: key.maxQuota,
    isActive: key.isActive,
    errors: key.errors,
    lastUsed: key.lastUsed
  }));

  res.json({
    keys: status,
    totalKeys: aiChatManager.apiKeys.length,
    currentKey: aiChatManager.currentKeyIndex + 1
  });
});

module.exports = router;
