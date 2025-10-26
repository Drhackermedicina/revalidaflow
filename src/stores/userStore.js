// src/stores/userStore.js
import { db } from '@/plugins/firebase'; // Importa a instância do Firestore
import { collection, limit, orderBy, query, where, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { reactive, computed, watch } from 'vue';
import { currentUser } from '@/plugins/auth';
import Logger from '@/utils/logger';

const logger = new Logger('userStore');

// Default permissions por role (mesmo do backend)
const DEFAULT_PERMISSIONS = {
  admin: {
    canDeleteMessages: true,
    canManageUsers: true,
    canEditStations: true,
    canViewAnalytics: true,
    canManageRoles: true,
    canAccessAdminPanel: true
  },
  moderator: {
    canDeleteMessages: true,
    canManageUsers: false,
    canEditStations: true,
    canViewAnalytics: true,
    canManageRoles: false,
    canAccessAdminPanel: false
  },
  user: {
    canDeleteMessages: false,
    canManageUsers: false,
    canEditStations: false,
    canViewAnalytics: false,
    canManageRoles: false,
    canAccessAdminPanel: false
  }
};

function getDefaultPermissions(role) {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.user;
}

const state = reactive({
  user: null,
  isAuthenticated: false,
  // Role & permissions
  role: 'user',
  permissions: getDefaultPermissions('user'),
  roleLoading: false,
  roleError: '',
  // Lista de usuários online
  users: [], // Lista de usuários online
  loadingUsers: false,
  errorUsers: '',
  accessStatus: 'trial',
  accessSource: null,
  accessExpiresAt: null,
  accessInviteCode: null,
  subscriptionPlan: null,
});

// Flag global para controlar concorrência de fetchUserRole
let isFetchingRole = false;
let currentRoleUnsubscribe = null;

// Computed properties para fácil acesso aos dados do usuário
const uid = computed(() => state.user?.uid || null);
const email = computed(() => state.user?.email || '');
const displayName = computed(() => state.user?.displayName || 'Usuário');
const photoURL = computed(() => state.user?.photoURL || 'https://ui-avatars.com/api/?name=User');

// Computed properties para roles e permissões
const isAdmin = computed(() => state.role === 'admin');
const isModerator = computed(() => state.role === 'moderator' || state.role === 'admin');
const canDeleteMessages = computed(() => state.permissions.canDeleteMessages);
const canManageUsers = computed(() => state.permissions.canManageUsers);
const canEditStations = computed(() => state.permissions.canEditStations);
const canViewAnalytics = computed(() => state.permissions.canViewAnalytics);
const canManageRoles = computed(() => state.permissions.canManageRoles);
const canAccessAdminPanel = computed(() => state.permissions.canAccessAdminPanel);

// Computed properties para estado de carregamento e erro
const roleLoading = computed(() => state.roleLoading);
const roleError = computed(() => state.roleError);

function setUser(user) {
  state.user = user;
  state.isAuthenticated = !!user;

  // Se usuário mudou, buscar role e permissões
  if (user) {
    // Controle de concorrência: só chamar fetchUserRole se não estiver em execução
    if (!isFetchingRole) {
      fetchUserRole('setUser');
    }
  } else {
    clearUserRole();
  }
}

function clearUser() {
  state.user = null;
  state.isAuthenticated = false;
  clearUserRole();
}

function clearUserRole() {
  state.role = 'user';
  state.permissions = getDefaultPermissions('user');
  state.roleLoading = false;
  state.roleError = '';
  state.accessStatus = 'trial';
  state.accessSource = null;
  state.accessExpiresAt = null;
  state.accessInviteCode = null;
  state.subscriptionPlan = null;

  // Resetar flags de concorrência
  isFetchingRole = false;
}

// Função para buscar role e permissões do usuário com retry e backoff
function fetchUserRole(_source = 'unknown') {
  if (!currentUser.value?.uid) {
    if (import.meta.env.DEV) {
      logger.warn('fetchUserRole: No current user UID');
    }
    return;
  }

  const userUid = currentUser.value.uid;

  // Controle de concorrência: se já está buscando, ignorar chamada
  if (isFetchingRole) {
    return;
  }

  // Limpar listener anterior se existir
  if (currentRoleUnsubscribe) {
    currentRoleUnsubscribe();
    currentRoleUnsubscribe = null;
  }

  isFetchingRole = true;
  state.roleLoading = true;
  state.roleError = '';

  // Cache temporário com dados básicos do usuário
  const tempUserData = {
    uid: currentUser.value.uid,
    email: currentUser.value.email,
    displayName: currentUser.value.displayName,
    role: 'user',
    permissions: getDefaultPermissions('user')
  };

  // Usar dados temporários enquanto aguarda documento
  state.role = tempUserData.role;
  state.permissions = tempUserData.permissions;

  try {
    const userDocRef = doc(db, 'usuarios', userUid);

    // Função de retry com exponential backoff
    const retryFetch = (attempt = 0, maxAttempts = 5) => {
      const delay = attempt === 0 ? 500 : Math.min(500 * Math.pow(2, attempt - 1), 8000); // 500ms inicial, depois backoff até 8s

      setTimeout(() => {
        // Listener em tempo real para mudanças de role
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const role = userData.role || 'user';
            const permissions = userData.permissions || getDefaultPermissions(role);

            // Log apenas em desenvolvimento para mudanças de role
            if (import.meta.env.DEV && role !== state.role) {
              logger.info('User role changed:', {
                uid: userUid,
                from: state.role,
                to: role
              });
            }

            state.role = role;
            state.permissions = permissions;
            state.roleLoading = false;
            state.roleError = '';

            // Finalizar busca - limpar flags
            isFetchingRole = false;
            currentRoleUnsubscribe = unsubscribe;
          } else {
            if (attempt < maxAttempts) {
              retryFetch(attempt + 1, maxAttempts);
            } else {
              if (import.meta.env.DEV) {
                logger.warn(`fetchUserRole: Máximo de tentativas atingido para UID ${userUid}, usando dados temporários`);
              }
              state.roleLoading = false;
              state.roleError = '';

              // Finalizar busca mesmo em falha
              isFetchingRole = false;
              currentRoleUnsubscribe = unsubscribe;
            }
          }
        }, (error) => {
          if (attempt < maxAttempts) {
            retryFetch(attempt + 1, maxAttempts);
          } else {
            state.roleError = 'Erro ao carregar permissões do usuário';
            state.roleLoading = false;
            // Manter dados temporários em caso de erro persistente

            // Finalizar busca mesmo em erro
            isFetchingRole = false;
            currentRoleUnsubscribe = unsubscribe;

            // Log apenas em desenvolvimento para erros críticos
            if (import.meta.env.DEV) {
              logger.error(`fetchUserRole: Erro persistente para UID ${userUid}:`, error);
            }
          }
        });

        // Retornar função de cleanup
        return unsubscribe;
      }, delay);
    };

    // Iniciar primeira tentativa com delay inicial
    return retryFetch();
  } catch (error) {
    state.roleError = 'Erro ao configurar listener de permissões';
    state.roleLoading = false;
    isFetchingRole = false;
    // Manter dados temporários

    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      logger.error(`fetchUserRole: Erro ao configurar listener para UID ${userUid}:`, error);
    }
  }
}

// Watch para mudanças no currentUser e atualizar role
let lastUser = null;
let debounceTimer = null;

watch(currentUser, (newUser) => {
  const newUserUid = newUser?.uid;

  // Evitar múltiplas atualizações desnecessárias
  if (lastUser?.uid === newUserUid) {
    return;
  }

  lastUser = newUser;

  // Limpar debounce anterior
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // Debounce aumentado para 500ms e verificação adicional para evitar chamadas duplicadas
  debounceTimer = setTimeout(() => {
    // Verificação adicional: se já está buscando role, não fazer nada
    if (isFetchingRole) {
      debounceTimer = null;
      return;
    }

    // Limpar listener anterior
    if (currentRoleUnsubscribe) {
      currentRoleUnsubscribe();
      currentRoleUnsubscribe = null;
    }

    if (newUser) {
      // Configurar novo listener para role
      fetchUserRole('watch'); // Não armazena unsubscribe aqui, pois fetchUserRole já o faz
    } else {
      clearUserRole();
    }

    debounceTimer = null;
  }, 500); // Aumentado de 300ms para 500ms
}, { immediate: true });

// Função para fazer cleanup manual quando necessário
function cleanupRoleListener() {
  // Limpar debounce timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // Limpar listener atual
  if (currentRoleUnsubscribe) {
    currentRoleUnsubscribe();
    currentRoleUnsubscribe = null;
  }

  // Resetar flags
  isFetchingRole = false;
}

// Função para buscar usuários online do Firestore (otimizada para reduzir custos)
function fetchUsers() {
  state.loadingUsers = true;
  state.errorUsers = '';
  const usersCollectionRef = collection(db, 'usuarios');

  // Otimização: Busca única em vez de listener em tempo real
  // Filtra apenas usuários ativos recentemente para reduzir leituras
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás

  const q = query(
    usersCollectionRef,
    where('status', 'in', ['disponivel', 'treinando']),
    where('lastActive', '>', fiveMinutesAgo), // Apenas usuários ativos nos últimos 5 min
    orderBy('lastActive', 'desc'),
    limit(50) // Reduzido de 100 para 50
  );

  // Usa getDocs em vez de onSnapshot para evitar listeners constantes
  return getDocs(q).then((snapshot) => {
    const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

    // Filtra apenas usuários realmente online (lastActive < 2 minutos)
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    state.users = allUsers
      .filter(user => {
        const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : 0;
        return lastActive > twoMinutesAgo;
      })
      .map(user => ({
        ...user,
        displayName: user.displayName || 'Usuário sem nome',
        photoURL: user.photoURL || 'https://ui-avatars.com/api/?name=User',
      }));

    state.loadingUsers = false;

    // Removido log desnecessário
  }).catch((error) => {
    state.errorUsers = 'Erro ao buscar usuários: ' + error.message;
    state.loadingUsers = false;
    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      console.error("Erro ao buscar usuários:", error);
    }
  });
}

// Função para atualizar role do usuário manualmente (admin)
async function updateUserRole(userId, newRole, updatedBy) {
  try {
    const userDocRef = doc(db, 'usuarios', userId);
    const newPermissions = getDefaultPermissions(newRole);

    await updateDoc(userDocRef, {
      role: newRole,
      permissions: newPermissions,
      roleLastUpdated: new Date(),
      roleUpdatedBy: updatedBy
    });

    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      logger.info('User role updated successfully:', { userId, newRole, updatedBy });
    }
    return true;
  } catch (error) {
    // Log apenas em desenvolvimento
    if (import.meta.env.DEV) {
      logger.error('Error updating user role:', error);
    }
    throw error;
  }
}

// Função para verificar se usuário tem permissão específica
function hasPermission(permission) {
  return state.permissions[permission] || false;
}

// Função para verificar se usuário tem alguma das permissões listadas
function hasAnyPermission(permissions) {
  return permissions.some(perm => state.permissions[perm]);
}

// Função para verificar se usuário tem todas as permissões listadas
function hasAllPermissions(permissions) {
  return permissions.every(perm => state.permissions[perm]);
}

// Função de debug para testar roles (apenas desenvolvimento)
function debugRoleInfo() {
  if (import.meta.env.DEV) {
    return {
      uid: state.user?.uid,
      email: state.user?.email,
      role: state.role,
      permissions: state.permissions,
      canDeleteMessages: state.permissions.canDeleteMessages,
      canManageUsers: state.permissions.canManageUsers,
      canEditStations: state.permissions.canEditStations,
      canViewAnalytics: state.permissions.canViewAnalytics,
      canManageRoles: state.permissions.canManageRoles,
      canAccessAdminPanel: state.permissions.canAccessAdminPanel
    };
  }
  return null;
}

const userStore = {
  // State
  state,

  // User methods
  setUser,
  clearUser,

  // Role & permissions methods
  fetchUserRole,
  clearUserRole,
  updateUserRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  cleanupRoleListener,
  debugRoleInfo,

  // Users list methods
  fetchUsers,

  // Computed properties
  uid,
  email,
  displayName,
  photoURL,
  isAdmin,
  isModerator,
  canDeleteMessages,
  canManageUsers,
  canEditStations,
  canViewAnalytics,
  canManageRoles,
  canAccessAdminPanel,
  roleLoading,
  roleError,

  // Utilities
  getDefaultPermissions
};

function useUserStore() {
  return userStore;
}

export default userStore;
export { useUserStore };


