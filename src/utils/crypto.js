/**
 * crypto.js
 *
 * Utilitários para criptografia de dados sensíveis
 * Usa Web Crypto API nativa do navegador
 */

// Chave de criptografia (em produção, gerar por sessão ou usar variável de ambiente)
const ENCRYPTION_KEY_STRING = 'revalidaflow-secure-2025-v1'

/**
 * Deriva uma chave criptográfica a partir de uma string
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey() {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY_STRING),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('revalidaflow-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Criptografa dados sensíveis
 * @param {Object} data - Dados a serem criptografados
 * @returns {Promise<Object>} - Objeto com dados criptografados e IV
 */
export async function encryptData(data) {
  try {
    const encoder = new TextEncoder()
    const dataStr = JSON.stringify(data)
    const dataBuffer = encoder.encode(dataStr)

    const key = await deriveKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    )

    return {
      encrypted: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      timestamp: Date.now(),
      version: '1.0'
    }
  } catch (error) {
    console.error('Erro ao criptografar dados:', error)
    throw new Error('Falha na criptografia')
  }
}

/**
 * Descriptografa dados criptografados
 * @param {Object} encryptedObj - Objeto com dados criptografados
 * @returns {Promise<Object>} - Dados descriptografados
 */
export async function decryptData(encryptedObj) {
  try {
    if (!encryptedObj || !encryptedObj.encrypted || !encryptedObj.iv) {
      throw new Error('Dados criptografados inválidos')
    }

    const key = await deriveKey()

    const encryptedBuffer = new Uint8Array(encryptedObj.encrypted)
    const iv = new Uint8Array(encryptedObj.iv)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    )

    const decoder = new TextDecoder()
    const dataStr = decoder.decode(decrypted)
    return JSON.parse(dataStr)
  } catch (error) {
    console.error('Erro ao descriptografar dados:', error)
    throw new Error('Falha na descriptografia')
  }
}

/**
 * Verifica se o navegador suporta Web Crypto API
 * @returns {boolean}
 */
export function isCryptoSupported() {
  return typeof crypto !== 'undefined' &&
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function'
}

/**
 * Salva dados criptografados no sessionStorage
 * @param {string} key - Chave do storage
 * @param {Object} data - Dados a serem salvos
 */
export async function saveEncryptedToSession(key, data) {
  if (!isCryptoSupported()) {
    console.warn('Web Crypto API não suportada, salvando sem criptografia')
    sessionStorage.setItem(key, JSON.stringify(data))
    return
  }

  try {
    const encrypted = await encryptData(data)
    sessionStorage.setItem(key, JSON.stringify(encrypted))
  } catch (error) {
    console.error('Erro ao salvar dados criptografados:', error)
    // Fallback: salvar sem criptografia
    sessionStorage.setItem(key, JSON.stringify(data))
  }
}

/**
 * Recupera dados criptografados do sessionStorage
 * @param {string} key - Chave do storage
 * @returns {Promise<Object|null>} - Dados descriptografados ou null
 */
export async function loadEncryptedFromSession(key) {
  const stored = sessionStorage.getItem(key)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored)

    // Verificar se está criptografado
    if (parsed.encrypted && parsed.iv) {
      // Dados criptografados
      return await decryptData(parsed)
    } else {
      // Dados não criptografados (fallback ou legacy)
      return parsed
    }
  } catch (error) {
    console.error('Erro ao carregar dados do session:', error)
    return null
  }
}

/**
 * Remove dados do sessionStorage
 * @param {string} key - Chave do storage
 */
export function removeFromSession(key) {
  sessionStorage.removeItem(key)
}
