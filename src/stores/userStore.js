// src/stores/userStore.js
import { db } from '@/plugins/firebase'; // Importa a instância do Firestore
import { collection, limit, onSnapshot, orderBy, query, where, getDocs } from 'firebase/firestore';
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

