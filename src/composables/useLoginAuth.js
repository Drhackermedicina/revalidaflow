import { firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useLoginAuth() {
  const loading = ref(false)
  const error = ref('')

  const router = useRouter()

  async function loginComGoogle() {
    loading.value = true
    error.value = ''
    const provider = new GoogleAuthProvider()
    try {
      // Retorna ao método signInWithPopup conforme solicitado
      const result = await signInWithPopup(firebaseAuth, provider)
      if (result && result.user) {
        router.push('/app/dashboard')
      } else {
        throw new Error('Usuário não retornado pelo Firebase')
      }
    } catch (err) {
      error.value = 'Ocorreu um erro ao tentar fazer o login. Tente novamente.'
    } finally {
      loading.value = false
    }
  }

  return { loading, error, loginComGoogle }
}
