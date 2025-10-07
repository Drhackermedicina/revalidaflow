// src/utils/audioService.js

let audioContext = null;
let audioBufferCache = {}; // Cache para armazenar AudioBuffers carregados

/**
 * Garante que um AudioContext esteja disponível e resume-o se necessário.
 * @returns {AudioContext} O AudioContext ativo.
 */
function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Resume o AudioContext se ele estiver suspenso (comum em alguns navegadores)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
  return audioContext;
}

/**
 * Carrega um arquivo de áudio de forma assíncrona e decodifica-o em um AudioBuffer.
 * O resultado é armazenado em cache para evitar recarregamentos.
 * @param {string} url O URL do arquivo de áudio (ex: '/assets/myinstants.mp3').
 * @returns {Promise<AudioBuffer>} Uma promessa que resolve com o AudioBuffer.
 */
export async function loadAudioFile(url) {
  if (audioBufferCache[url]) {
    return audioBufferCache[url];
  }

  const context = getAudioContext();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    audioBufferCache[url] = audioBuffer;
    return audioBuffer;
  } catch (error) {
    console.error(`Erro ao carregar ou decodificar áudio de ${url}:`, error);
    throw error;
  }
}

/**
 * Reproduz um segmento de áudio de um AudioBuffer.
 * @param {AudioBuffer} buffer O AudioBuffer a ser reproduzido.
 * @param {number} offset O tempo de início da reprodução no buffer (em segundos).
 * @param {number} duration A duração da reprodução (em segundos).
 * @returns {void}
 */
export function playAudioSegment(buffer, offset, duration) {
  const context = getAudioContext();
  if (!buffer) {
    console.warn("AudioBuffer não fornecido para reprodução.");
    return;
  }

  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0, offset, duration); // Reproduz do offset pelo tempo de duração
    source.onended = () => {
      source.disconnect();
    };
  } catch (error) {
    console.error("Erro ao reproduzir segmento de áudio:", error);
  }
}

/**
 * Reproduz um efeito sonoro padrão (som de notificação)
 * Usa o arquivo de áudio myinstants.mp3 com duração de 1 segundo
 */
export async function playSoundEffect() {
  try {
    const audioBuffer = await loadAudioFile('/src/assets/myinstants.mp3');
    playAudioSegment(audioBuffer, 1, 1); // Reproduz do segundo 1 ao segundo 2 (duração de 1 segundo)
  } catch (e) {
    console.warn("Não foi possível tocar o som:", e);
  }
}

/**
 * Fecha o AudioContext. Deve ser chamado quando o áudio não for mais necessário.
 */
export function closeAudioContext() {
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().then(() => {
      console.log("AudioContext fechado.");
      audioContext = null;
      audioBufferCache = {}; // Limpa o cache ao fechar o contexto
    }).catch(error => {
      console.error("Erro ao fechar AudioContext:", error);
    });
  }
}

// Adiciona um listener para fechar o AudioContext quando a página é descarregada
window.addEventListener('beforeunload', closeAudioContext);
