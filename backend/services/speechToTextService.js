const speech = require('@google-cloud/speech');

// Configuração do cliente Speech-to-Text
const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Caminho para as credenciais, se necessário
});

/**
 * Função mock para transcrição de áudio (para desenvolvimento e testes)
 * @param {Buffer} audioBuffer - Buffer do arquivo de áudio
 * @returns {string} Texto transcrito mockado
 */
async function transcribeAudioMock(audioBuffer) {
  if (!audioBuffer) {
    throw new Error('Buffer de áudio é obrigatório');
  }

  // Simulação de processamento de áudio
  console.log(`Processando áudio mockado com ${audioBuffer.length} bytes`);

  // Retorna um texto de exemplo para testes
  return 'Este é um texto de exemplo transcrito do áudio para fins de desenvolvimento.';
}

/**
 * Função real para transcrição de áudio usando Google Speech-to-Text
 * @param {Buffer} audioBuffer - Buffer do arquivo de áudio
 * @returns {string} Texto transcrito
 */
async function transcribeAudioReal(audioBuffer) {
  if (!audioBuffer) {
    throw new Error('Buffer de áudio é obrigatório');
  }

  try {
    // Configuração da requisição para Speech-to-Text
    const request = {
      audio: {
        content: audioBuffer.toString('base64'), // Converte o buffer para base64
      },
      config: {
        encoding: 'LINEAR16', // Ajuste conforme o formato do áudio
        sampleRateHertz: 16000, // Ajuste conforme a taxa de amostragem
        languageCode: 'pt-BR', // Idioma português brasileiro
      },
    };

    // Faz a requisição para a API
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      throw new Error('Nenhum resultado de transcrição encontrado');
    }

    // Extrai o texto transcrito
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join(' ');

    return transcription;
  } catch (error) {
    console.error('Erro na transcrição de áudio:', error);
    throw new Error(`Erro ao transcrever áudio: ${error.message}`);
  }
}

/**
 * Função principal para transcrição de áudio
 * Usa mock por padrão; configure USE_SPEECH_TO_TEXT_MOCK=false e GOOGLE_APPLICATION_CREDENTIALS para produção
 * @param {Buffer} audioBuffer - Buffer do arquivo de áudio
 * @returns {string} Texto transcrito
 */
async function transcribeAudio(audioBuffer) {
  // Usa mock por padrão, a menos que explicitamente desabilitado
  const useMock = process.env.USE_SPEECH_TO_TEXT_MOCK !== 'false';

  if (useMock) {
    console.log('Usando transcrição mockada para desenvolvimento');
    return await transcribeAudioMock(audioBuffer);
  } else {
    console.log('Usando transcrição real com Google Speech-to-Text');
    return await transcribeAudioReal(audioBuffer);
  }
}

module.exports = {
  transcribeAudio,
  transcribeAudioMock,
  transcribeAudioReal,
};