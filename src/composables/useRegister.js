import { aplicarMascaraCPF, validarCPF } from '@/@core/utils/cpf'
import { db, firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export function useRegister() {
  const router = useRouter()
  const loading = ref(false)
  const error = ref('')
  const usuarioGoogle = ref(null)
  const form = ref({
    nome: '',
    sobrenome: '',
    cpf: '',
    cidade: '',
    paisOrigem: '',
    aceitouTermos: false,
  })

  watch(usuarioGoogle, (novoValor) => {
    if (novoValor) {
      form.value.nome = novoValor.displayName?.split(' ')[0] || ''
      form.value.sobrenome = novoValor.displayName?.split(' ').slice(1).join(' ') || ''
    }
  })

  async function loginComGoogle() {
    loading.value = true
    error.value = ''
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(firebaseAuth, provider)
      usuarioGoogle.value = result.user
    } catch (e) {
      error.value = 'Erro ao fazer login com Google: ' + e.message
    } finally {
      loading.value = false
    }
  }

  async function salvarUsuarioFirestore() {
    loading.value = true
    error.value = ''
    try {
      const user = firebaseAuth.currentUser
      if (!user) throw new Error('Usuário não autenticado')
      if (!validarCPF(form.value.cpf)) throw new Error('CPF inválido')
      const usuariosRef = collection(db, 'usuarios')
      const q = query(usuariosRef, where('cpf', '==', form.value.cpf))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) throw new Error('Já existe um usuário cadastrado com este CPF')
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: form.value.nome,
        sobrenome: form.value.sobrenome,
        cpf: form.value.cpf,
        cidade: form.value.cidade,
        paisOrigem: form.value.paisOrigem,
        aceitouTermos: form.value.aceitouTermos,
        dataCadastro: new Date(),
        trialExpiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        plano: 'trial',
        planoExpiraEm: null,
        estacoesConcluidas: [],
        nivelHabilidade: 0,
        statistics: {},
        ranking: 0,
        status: 'disponivel',
      })
      router.push('/app/dashboard')
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    usuarioGoogle,
    form,
    loginComGoogle,
    salvarUsuarioFirestore,
    aplicarMascaraCPF,
  }
}
