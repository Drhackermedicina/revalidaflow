// src/stores/userStore.js
import { db } from '@/plugins/firebase'; // Importa a instância do Firestore
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { reactive } from 'vue';

const state = reactive({
  user: null,
  isAuthenticated: false,
  users: [], // Lista de usuários online
  loadingUsers: false,
  errorUsers: '',
});

function setUser(user) {
  state.user = user;
  state.isAuthenticated = !!user;
}

function clearUser() {
  state.user = null;
  state.isAuthenticated = false;
}

// Função para buscar usuários online do Firestore
function fetchUsers() {
  state.loadingUsers = true;
  state.errorUsers = '';
  const usersCollectionRef = collection(db, 'usuarios');
  // Reduz leituras: filtra apenas usuários com status relevante, ordena por última atividade e limita resultados.
  // Isso evita escutar toda a coleção 'usuarios' e reduz leituras por atualização.
  const q = query(
    usersCollectionRef,
    where('status', 'in', ['disponivel', 'treinando']),
    orderBy('lastActive', 'desc'),
    limit(100)
  );

  // Usa onSnapshot para escutar mudanças em tempo real
  return onSnapshot(q, (snapshot) => {
    const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    // DEBUG: logar currentUser
    if (typeof window !== 'undefined') {
      console.log('[DEBUG] currentUser:', state.user);
    }
    // Filtra apenas usuários realmente online ou treinando (lastActive < 60s)
    const now = Date.now();
    state.users = allUsers
      .filter(user => {
        const statusOk = user.status === 'disponivel' || user.status === 'treinando';
        const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : 0;
        // Considera online se atualizou há menos de 60 segundos
        return statusOk && lastActive && (now - lastActive < 60000);
      })
      .map(user => ({
        ...user,
        displayName: user.displayName || 'Usuário sem nome',
        photoURL: user.photoURL || 'https://ui-avatars.com/api/?name=User',
      }));
    state.loadingUsers = false;
    // Corrigir log para mostrar o array real
    if (typeof window !== 'undefined') {
      console.log('[DEBUG USERS] Usuários online filtrados (array real):', JSON.parse(JSON.stringify(state.users)));
    }
  }, (error) => {
    state.errorUsers = 'Erro ao buscar usuários: ' + error.message;
    state.loadingUsers = false;
    console.error("Erro ao buscar usuários:", error);
  });
}

const userStore = {
  state,
  setUser,
  clearUser,
  fetchUsers, // Adiciona fetchUsers ao store
};

function useUserStore() {
  return userStore;
}

export default userStore;
export { useUserStore };

