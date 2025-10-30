// src/utils/audioService.js

let audioContext = null;
let audioBufferCache = {};

// Resolve asset path once via Vite
const defaultSoundUrl = new URL('../assets/myinstants.mp3', import.meta.url).href;

/**
 * Lazily create the shared AudioContext and resume it if the browser suspended playback.
 * @returns {AudioContext}
 */
function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
  }

  return audioContext;
}

/**
 * Fetch and decode a sound file, caching the decoded buffer to avoid repeated work.
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
export async function loadAudioFile(url) {
  if (audioBufferCache[url]) {
    return audioBufferCache[url];
  }

  const context = getAudioContext();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} for ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    audioBufferCache[url] = audioBuffer;

    return audioBuffer;
  } catch (error) {
    console.error(`Failed to load or decode audio from ${url}`, error);
    throw error;
  }
}

/**
 * Play a specific segment from the provided buffer.
 * @param {AudioBuffer} buffer
 * @param {number} offset Seconds from the start of the buffer.
 * @param {number} duration Seconds to play.
 * @param {number} volume Volume level (0.0 to 1.0, default 1.0)
 */
export function playAudioSegment(buffer, offset, duration, volume = 1.0) {
  if (!buffer) {
    console.warn('AudioBuffer not provided.');
    return;
  }

  try {
    const context = getAudioContext();
    const source = context.createBufferSource();
    const gainNode = context.createGain();

    // Set volume (clamp between 0.0 and 1.0)
    gainNode.gain.value = Math.max(0.0, Math.min(1.0, volume));

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);

    source.start(0, offset, duration);
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.error('Unable to play audio segment.', error);
  }
}

/**
 * Gracefully close the AudioContext and clear any cached buffers.
 */
export async function closeAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    return;
  }

  try {
    await audioContext.close();
    audioContext = null;
    audioBufferCache = {};
  } catch (error) {
    console.error('Unable to close AudioContext.', error);
  }
}

/**
 * Convenience helper for the default notification sound.
 * Plays from second 1 to 2 (duration 1 second) at reduced volume.
 * @param {string} soundUrl
 * @param {number} volume Volume level (0.0 to 1.0, default 0.7 for 30% reduction)
 */
export async function playSoundEffect(soundUrl = defaultSoundUrl, volume = 0.7) {
  try {
    const audioBuffer = await loadAudioFile(soundUrl);
    playAudioSegment(audioBuffer, 1, 1, volume);
  } catch (error) {
    console.warn('Unable to play sound effect.', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', closeAudioContext);
}
