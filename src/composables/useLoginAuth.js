import { firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useLoginAuth() {
  const loading = ref(false)
  const error = ref('')

  const router = useRouter()

  async function loginComGoogle() {
    loading.value = true
    error.value = ''

    try {
      const provider = new GoogleAuthProvider()

      let result;
      try {
        // Adicionar timeout para evitar travamento do popup
        const popupPromise = signInWithPopup(firebaseAuth, provider);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Popup timeout')), 10000)
        );
        
        result = await Promise.race([popupPromise, timeoutPromise]);
      } catch (popupError) {
        throw popupError;
      }

      if (result && result.user) {
        router.push('/app/dashboard')
      } else {
        throw new Error('Usuário não retornado pelo Firebase')
      }

    } catch (err) {
      // Detectar especificamente erros de popup/policy
      const isPopupError = err.message?.includes('popup') ||
                          err.message?.includes('Cross-Origin') ||
                          err.code?.includes('popup') ||
                          err.code === 'auth/popup-blocked' ||
                          err.code === 'auth/popup-closed-by-user'

      if (isPopupError) {
        // Tratamento silencioso de erros de popup - apenas log em desenvolvimento
        if (import.meta.env.DEV) {
          console.warn('[LoginAuth] Erro de popup detectado, tentando fallback:', err.code);
        }

        try {
          await signInWithRedirect(firebaseAuth, provider)
          // O resultado será processado quando o usuário voltar
          return // Sai da função, pois o redirect vai recarregar a página
        } catch (redirectError) {
          // Tratamento silencioso de falha do fallback
          if (import.meta.env.DEV) {
            console.error('[LoginAuth] Fallback para redirect falhou:', redirectError.code);
          }
          error.value = 'Não foi possível abrir a janela de autenticação. Verifique se popups estão bloqueados e tente novamente.'
        }
      } else {
        // Erro não relacionado a popup
        error.value = 'Ocorreu um erro ao tentar fazer o login. Tente novamente.'
      }
    } finally {
      loading.value = false
    }
  }

  // Processar resultado do redirect quando o usuário volta da autenticação
  async function processarRedirectResult() {
    try {
      const result = await getRedirectResult(firebaseAuth)
      if (result && result.user) {
        router.push('/app/dashboard')
        return true
      }
    } catch (e) {
      // Apenas logar erros que não são cancelamento pelo usuário
      if (e.code !== 'auth/redirect-cancelled-by-user') {
        if (import.meta.env.DEV) {
          console.error('[LoginAuth] Erro no processamento do redirect:', e.code);
        }
        error.value = `Erro ao processar autenticação: ${e.message}`
      }
    }
    return false
  }

  return { loading, error, loginComGoogle, processarRedirectResult }
}
