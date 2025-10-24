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

function setUser(user) {
  state.user = user;
  state.isAuthenticated = !!user;

  // Se usuário mudou, buscar role e permissões
  if (user) {
    fetchUserRole();
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
}

// Função para buscar role e permissões do usuário
function fetchUserRole() {
  if (!currentUser.value?.uid) {
    logger.warn('fetchUserRole: No current user UID');
    return;
  }

  state.roleLoading = true;
  state.roleError = '';

  try {
    const userDocRef = doc(db, 'usuarios', currentUser.value.uid);

    // Listener em tempo real para mudanças de role
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const role = userData.role || 'user';
        const permissions = userData.permissions || getDefaultPermissions(role);

        // Log apenas em caso de erro ou mudanças importantes
        if (import.meta.env.DEV && role !== state.role) {
          logger.info('User role changed:', {
            uid: currentUser.value.uid,
            from: state.role,
            to: role
          });
        }

        state.role = role;
        state.permissions = permissions;
      } else {
        // Usuário não existe no Firestore, usar defaults
        logger.warn('User document not found in Firestore, using defaults');
        state.role = 'user';
        state.permissions = getDefaultPermissions('user');
      }

      state.roleLoading = false;
      state.roleError = '';
    }, (error) => {
      logger.error('Error fetching user role:', error);
      state.roleError = 'Erro ao carregar permissões do usuário';
      state.roleLoading = false;

      // Em caso de erro, usar defaults
      state.role = 'user';
      state.permissions = getDefaultPermissions('user');
    });

    // Retornar função de cleanup
    return unsubscribe;
  } catch (error) {
    logger.error('Error setting up role listener:', error);
    state.roleError = 'Erro ao configurar listener de permissões';
    state.roleLoading = false;
    state.role = 'user';
    state.permissions = getDefaultPermissions('user');
  }
}

// Watch para mudanças no currentUser e atualizar role
let roleUnsubscribe = null;
let lastUser = null;

watch(currentUser, (newUser) => {
  const newUserUid = newUser?.uid;

  // Evitar múltiplas atualizações desnecessárias
  if (lastUser?.uid === newUserUid) {
    return;
  }

  lastUser = newUser;

  // Limpar listener anterior
  if (roleUnsubscribe) {
    roleUnsubscribe();
    roleUnsubscribe = null;
  }

  if (newUser) {
    // Configurar novo listener para role
    roleUnsubscribe = fetchUserRole();
  } else {
    clearUserRole();
  }
}, { immediate: true });

// Função para fazer cleanup manual quando necessário
function cleanupRoleListener() {
  if (roleUnsubscribe) {
    roleUnsubscribe();
    roleUnsubscribe = null;
  }
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

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
    }
  }).catch((error) => {
    state.errorUsers = 'Erro ao buscar usuários: ' + error.message;
    state.loadingUsers = false;
    console.error("Erro ao buscar usuários:", error);
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

    logger.info('User role updated successfully:', { userId, newRole, updatedBy });
    return true;
  } catch (error) {
    logger.error('Error updating user role:', error);
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

  // Utilities
  getDefaultPermissions
};

function useUserStore() {
  return userStore;
}

export default userStore;
export { useUserStore };


