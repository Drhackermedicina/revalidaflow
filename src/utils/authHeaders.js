// utils/authHeaders.js
import { currentUser } from '@/plugins/auth.js';
import { useUserStore } from '@/stores/userStore';

/**
 * Obtém headers de autenticação para requisições à API
 */
export function getAuthHeaders() {
  const user = currentUser.value;

  if (!user) {
    return {};
  }

  // Se o usuário tem um token de acesso
  if (user.accessToken) {
    return {
      'Authorization': `Bearer ${user.accessToken}`
    };
  }

  // Se precisar obter o token via getIdToken
  if (user.getIdToken && typeof user.getIdToken === 'function') {
    // Nota: Esta é uma implementação síncrona, pode precisar ser async
    // dependendo de como o Firebase Auth está configurado
    try {
      const token = user.getIdToken();
      if (token instanceof Promise) {
        return {};
      }
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return {};
    }
  }

  return {};
}

/**
 * Versão assíncrona para obter headers de autenticação
 */
export async function getAuthHeadersAsync() {
  const user = currentUser.value;

  if (!user) {
    return {};
  }

  try {
    let token = null;

    // Se já tem token disponível
    if (user.accessToken) {
      token = user.accessToken;
    }
    // Se tem método para obter token
    else if (user.getIdToken && typeof user.getIdToken === 'function') {
      token = await user.getIdToken();
    }

    if (token) {
      return {
        'Authorization': `Bearer ${token}`
      };
    }
  } catch (error) {
    console.error('Erro ao obter token de autenticação:', error);
  }

  return {};
}

/**
 * Verifica se o usuário está autenticado
 */
export function isAuthenticated() {
  return !!currentUser.value;
}

/**
 * Verifica se o usuário é administrador
 */
export function isAdmin() {
  const user = currentUser.value;
  if (!user) return false;

  // Usar userStore para verificação de permissões
  const { canEditStations } = useUserStore();
  return canEditStations.value;
}
