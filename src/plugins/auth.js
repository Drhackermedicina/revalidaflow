import { onAuthStateChanged } from 'firebase/auth'
import { ref } from 'vue'
import { firebaseAuth } from './firebase'

let isAuthInitialized = false // Flag para garantir que a espera ocorra apenas uma vez

// Cria uma variável reativa para armazenar o estado do usuário
export const currentUser = ref(null)

// Esta função inicializa o "ouvinte" do Firebase.
// Ela verifica se o usuário está logado ou não e atualiza a variável.
export const initAuthListener = () => {
  return new Promise(resolve => {
    onAuthStateChanged(firebaseAuth, user => {
      currentUser.value = user
      isAuthInitialized = true
      resolve()
    })
  })
}

// Função para aguardar a autenticação do Firebase
export const waitForAuth = () => {
  if (isAuthInitialized) return Promise.resolve()
  return initAuthListener()
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

