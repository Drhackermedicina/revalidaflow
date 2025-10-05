/**
 * useUserManagement.js
 *
 * Composable para gerenciar dados de usuários e permissões
 */

import { ref, computed, watch } from 'vue'
import { db } from '@/plugins/firebase.js'
import { doc, getDoc } from 'firebase/firestore'
import { currentUser } from '@/plugins/auth.js'

export function useUserManagement() {
  // Cache de usuários
  const usersCache = ref(new Map())
  const isLoadingUsers = ref(false)

  // Estado de admin do usuário atual
  const isCurrentUserAdmin = ref(false)

  /**
   * Busca dados de um usuário por UID
   * @param {String} uid - UID do usuário
   * @returns {Object|null} - Dados do usuário ou null
   */
  async function buscarDadosUsuario(uid) {
    if (!uid) return null

    // Verificar cache primeiro
    if (usersCache.value.has(uid)) {
      return usersCache.value.get(uid)
    }

    try {
      const userDoc = await getDoc(doc(db, 'usuarios', uid))
      if (userDoc.exists()) {
        const userData = {
          uid: uid,
          nome: userDoc.data().nome || 'Usuário Desconhecido',
          email: userDoc.data().email || '',
          isAdmin: userDoc.data().isAdmin || false
        }

        // Armazenar no cache
        usersCache.value.set(uid, userData)
        return userData
      } else {
        // Se não encontrou, criar entrada cache com dados padrão para admins não cadastrados
        const defaultData = {
          uid: uid,
          nome: 'Admin',
          email: '',
          isAdmin: true
        }
        usersCache.value.set(uid, defaultData)
        return defaultData
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do usuário:', error)
      return {
        uid: uid,
        nome: 'Erro ao carregar',
        email: '',
        isAdmin: false
      }
    }
  }

  /**
   * Atualizar status de admin quando usuário muda
   */
  watch(currentUser, async (user) => {
    if (user) {
      const userData = await buscarDadosUsuario(user.uid)
      isCurrentUserAdmin.value = userData?.isAdmin || false
    } else {
      isCurrentUserAdmin.value = false
    }
  }, { immediate: true })

  /**
   * Computed para verificar se usuário atual é admin
   */
  const isAdmin = computed(() => isCurrentUserAdmin.value)

  return {
    // State
    usersCache,
    isLoadingUsers,
    isCurrentUserAdmin,

    // Computed
    isAdmin,

    // Methods
    buscarDadosUsuario
  }
}
