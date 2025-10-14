import { onAuthStateChanged } from 'firebase/auth'
import { ref } from 'vue'
import { firebaseAuth } from './firebase'

// Cria uma variável reativa para armazenar o estado do usuário
export const currentUser = ref(null)

// Esta função inicializa o "ouvinte" do Firebase.
// Ela verifica se o usuário está logado ou não e atualiza a variável.
export const initAuthListener = () => {
  return new Promise(resolve => {
    onAuthStateChanged(firebaseAuth, user => {
      currentUser.value = user
      resolve()
    })
  })
}

// Função para aguardar a autenticação do Firebase
export const waitForAuth = () => {
  return new Promise(resolve => {
    if (currentUser.value !== null) { // Se o estado já foi inicializado
      resolve(currentUser.value);
      return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      currentUser.value = user;
      resolve(user);
      unsubscribe();
    });
  });
};
