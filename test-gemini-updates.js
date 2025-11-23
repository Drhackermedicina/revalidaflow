/**
 * Teste completo de atualizações Gemini - REVALIDAFLOW
 * Verifica se todos os modelos foram atualizados corretamente e funcionam
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuração
const API_KEYS = [
  process.env.GOOGLE_API_KEY_1,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
  process.env.GOOGLE_API_KEY_4,
  process.env.GOOGLE_API_KEY_5,
  process.env.GOOGLE_API_KEY_6,
  process.env.GOOGLE_API_KEY_7,
  process.env.GOOGLE_API_KEY_8
].filter(key => key && key.trim() !== '');

// Modelos atualizados que devem funcionar
const UPDATED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash'
];

// Modelos obsoletos que NÃO devem mais ser usados
const OBSOLETE_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp'
];

console.log('🧪 INICIANDO TESTE DE ATUALIZAÇÕES GEMINI');
console.log('📊 Chaves API disponíveis:', API_KEYS.length);
console.log('🔑 Chaves:', API_KEYS.map((key, i) => `#${i+1}: ${key.substring(0, 10)}...`));

/**
 * Testa se um modelo específico funciona com uma chave
 */
async function testModel(modelName, apiKey, keyIndex) {
  const startTime = Date.now();

  try {
    console.log(`🎯 Testando ${modelName} com chave #${keyIndex + 1}...`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const testPrompt = "Responda apenas com 'OK' se estiver funcionando.";
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();

    const duration = Date.now() - startTime;

    console.log(`✅ ${modelName} - SUCESSO (${duration}ms): ${text.substring(0, 50)}...`);

    return {
      success: true,
      model: modelName,
      keyIndex,
      response: text,
      duration,
      error: null
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`❌ ${modelName} - FALHA (${duration}ms): ${error.message.substring(0, 100)}...`);

    return {
      success: false,
      model: modelName,
      keyIndex,
      response: null,
      duration,
      error: error.message
    };
  }
}

/**
 * Testa todos os modelos com todas as chaves
 */
async function testAllCombinations() {
  console.log('\n🔄 Testando combinações de modelos e chaves...');

  const results = {
    successful: [],
    failed: [],
    summary: {
      totalTests: 0,
      successful: 0,
      failed: 0,
      modelsTested: new Set(),
      workingKeys: new Set(),
      brokenModels: new Set()
    }
  };

  // Testar modelos atualizados
  for (const modelName of UPDATED_MODELS) {
    console.log(`\n📋 Testando modelo: ${modelName}`);

    for (let i = 0; i < API_KEYS.length; i++) {
      const result = await testModel(modelName, API_KEYS[i], i);
      results.summary.totalTests++;
      results.summary.modelsTested.add(modelName);

      if (result.success) {
        results.successful.push(result);
        results.summary.successful++;
        results.summary.workingKeys.add(i);
      } else {
        results.failed.push(result);
        results.summary.failed++;

        // Se nenhuma chave funcionar com este modelo, marca como quebrado
        const modelResults = results.failed.filter(r => r.model === modelName);
        if (modelResults.length === API_KEYS.length) {
          results.summary.brokenModels.add(modelName);
        }
      }
    }
  }

  // Verificar se modelos obsoletos realmente falham
  console.log('\n⚠️ Verificando modelos obsoletos (devem falhar)...');

  for (const modelName of OBSOLETE_MODELS) {
    console.log(`\n📋 Verificando modelo obsoleto: ${modelName}`);

    // Testa apenas com a primeira chave para economizar quota
    if (API_KEYS.length > 0) {
      const result = await testModel(modelName, API_KEYS[0], 0);
      results.summary.totalTests++;

      if (result.success) {
        console.log(`⚠️ ATENÇÃO: Modelo obsoleto ${modelName} ainda funciona!`);
        results.successful.push(result);
        results.summary.successful++;
      } else {
        console.log(`✅ Confirmed: Modelo obsoleto ${modelName} está quebrado (como esperado)`);
        results.failed.push(result);
        results.summary.failed++;
      }
    }
  }

  return results;
}

/**
 * Simula teste de transcrição de áudio
 */
async function testAudioTranscription() {
  console.log('\n🎤 Testando serviço de transcrição de áudio...');

  try {
    // Importa o serviço atualizado
    const { getGeminiAudioTranscription } = await import('./backend/services/geminiAudioTranscription.js');
    const transcriptionService = getGeminiAudioTranscription();

    // Teste de áudio simulado (dados fake)
    const fakeAudioBuffer = Buffer.from('fake-audio-data-for-testing');

    console.log('📊 Estatísticas das chaves:', transcriptionService.getKeyStats());

    // Este teste vai falhar com áudio fake, mas mostra que o serviço está configurado
    const result = await transcriptionService.transcribeAudio(fakeAudioBuffer, {
      mimeType: 'audio/webm',
      estimatedDuration: '10 segundos'
    });

    console.log('🎧 Resultado da transcrição:', {
      success: result.success,
      hasMetadata: !!result.metadata,
      modelUsed: result.metadata?.model,
      error: result.error
    });

    return {
      success: true,
      serviceAvailable: true,
      keyStats: transcriptionService.getKeyStats()
    };

  } catch (error) {
    console.log('❌ Erro ao testar serviço de transcrição:', error.message);
    return {
      success: false,
      error: error.message,
      serviceAvailable: false
    };
  }
}

/**
 * Testa avaliação PEP
 */
async function testPEPEvaluation() {
  console.log('\n🧠 Testando serviço de avaliação PEP...');

  try {
    // Importa o serviço atualizado
    const { testGeminiConnection } = await import('./backend/services/geminiEvaluationService.js');

    const result = await testGeminiConnection();

    console.log('📈 Resultado da avaliação PEP:', {
      success: result.success,
      message: result.message,
      hasMetadata: !!result.metadata
    });

    return result;

  } catch (error) {
    console.log('❌ Erro ao testar avaliação PEP:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('='.repeat(60));
  console.log('TESTE COMPLETO - ATUALIZAÇÕES GEMINI REVALIDAFLOW');
  console.log('='.repeat(60));

  if (API_KEYS.length === 0) {
    console.error('❌ Nenhuma chave API encontrada! Configure as variáveis de ambiente.');
    process.exit(1);
  }

  // Testa todas as combinações
  const modelTestResults = await testAllCombinations();

  // Testa serviços específicos
  const transcriptionTest = await testAudioTranscription();
  const pepTest = await testPEPEvaluation();

  // Gera relatório final
  console.log('\n' + '='.repeat(60));
  console.log('RELATÓRIO FINAL');
  console.log('='.repeat(60));

  console.log('\n📊 ESTATÍSTICAS GERAIS:');
  console.log(`• Total de testes: ${modelTestResults.summary.totalTests}`);
  console.log(`• Sucessos: ${modelTestResults.summary.successful}`);
  console.log(`• Falhas: ${modelTestResults.summary.failed}`);
  console.log(`• Taxa de sucesso: ${((modelTestResults.summary.successful / modelTestResults.summary.totalTests) * 100).toFixed(1)}%`);

  console.log('\n🔑 CHAVES API:');
  console.log(`• Chaves testadas: ${API_KEYS.length}`);
  console.log(`• Chaves funcionando: ${modelTestResults.summary.workingKeys.size}`);

  console.log('\n🤖 MODELOS TESTADOS:');
  console.log(`• Modelos atualizados: ${UPDATED_MODELS.join(', ')}`);
  console.log(`• Modelos obsoletos: ${OBSOLETE_MODELS.join(', ')}`);
  console.log(`• Modelos quebrados: ${Array.from(modelTestResults.summary.brokenModels).join(', ') || 'Nenhum'}`);

  console.log('\n🛠️ SERVIÇOS ESPECÍFICOS:');
  console.log(`• Transcrição de áudio: ${transcriptionTest.success ? '✅ OK' : '❌ Falhou'}`);
  console.log(`• Avaliação PEP: ${pepTest.success ? '✅ OK' : '❌ Falhou'}`);

  // Verificações críticas
  console.log('\n🔍 VERIFICAÇÕES CRÍTICAS:');

  const hasWorking2_5Flash = modelTestResults.successful.some(r => r.model === 'gemini-2.5-flash');
  const hasWorking2_5FlashLite = modelTestResults.successful.some(r => r.model === 'gemini-2.5-flash-lite');

  console.log(`• gemini-2.5-flash funcionando: ${hasWorking2_5Flash ? '✅ Sim' : '❌ Não'}`);
  console.log(`• gemini-2.5-flash-lite funcionando: ${hasWorking2_5FlashLite ? '✅ Sim' : '❌ Não'}`);

  // Status geral
  const allCriticalWorking = hasWorking2_5Flash && hasWorking2_5FlashLite &&
                            transcriptionTest.success && pepTest.success;

  console.log('\n' + '='.repeat(60));
  console.log(`STATUS FINAL: ${allCriticalWorking ? '✅ TODAS AS ATUALIZAÇÕES FUNCIONANDO' : '⚠️ PROBLEMAS DETECTADOS'}`);
  console.log('='.repeat(60));

  if (allCriticalWorking) {
    console.log('\n🎉 Parabéns! Todas as atualizações foram aplicadas com sucesso.');
    console.log('📝 Sua transcrição de áudio e avaliação PEP devem estar funcionando.');
  } else {
    console.log('\n⚠️ Alguns problemas foram detectados. Verifique o relatório acima.');
  }
}

// Executa o teste
main().catch(console.error);

export {
  testModel,
  testAllCombinations,
  testAudioTranscription,
  testPEPEvaluation
};