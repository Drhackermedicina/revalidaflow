import { aplicarMascaraCPF, validarCPF } from '@/@core/utils/cpf'
import { db, firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, where, Timestamp } from 'firebase/firestore'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { redeemInvite } from '@/services/accessControlService.js'

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
    inviteCode: ''
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
      // Schema padronizado para consistência
      const trialDays = Number.parseInt(import.meta.env.VITE_TRIAL_DAYS || '14', 10)
      const trialExpiresAt = Timestamp.fromDate(new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000))
      const userData = {
        // Dados pessoais obrigatórios
        nome: form.value.nome,
        sobrenome: form.value.sobrenome,
        cpf: form.value.cpf,
        cidade: form.value.cidade,
        paisOrigem: form.value.paisOrigem,
        aceitouTermos: form.value.aceitouTermos,

        // Dados de cadastro e plano
        dataCadastro: new Date(),
        dataUltimaAtualizacao: new Date(),
        ultimoLogin: new Date(),
        trialExpiraEm: trialExpiresAt,
        plano: 'trial',
        planoExpiraEm: trialExpiresAt,
        accessStatus: 'trial',
        accessSource: 'register',
        accessExpiresAt: trialExpiresAt,
        accessInviteCode: form.value.inviteCode ? form.value.inviteCode.trim().toUpperCase() : null,
        subscriptionPlan: null,
        accessUpdatedAt: Timestamp.now(),

        // Arrays de atividades
        estacoesConcluidas: [],
        historicoEstacoes: [],
        historicoSimulacoes: [],

        // Estatísticas básicas
        nivelHabilidade: 0,
        mediaGeral: 0,
        totalScore: 0,
        score: 0,

        // Estruturas de dados organizadas
        estatisticas: {
          diasConsecutivos: 0,
          estacoesPorEspecialidade: {},
          mediaGeral: 0,
          melhorNota: 0,
          piorNota: 0,
          progressoSemanal: [],
          rankingPosicao: null,
          sessoesCompletadas: 0,
          tempoMedioSessao: 0,
          tempoTotalTreinamento: 0,
          totalEstacoesFeitas: 0,
          totalPontos: 0,
          ultimaAtividade: null,
          ultimaSessao: null
        },

        performance: {},
        pontuacoes: {},
        resultados: {},
        statistics: {},

        progresso: {
          badges: [],
          conquistas: [],
          experiencia: 0,
          metasSemana: {
            estacoesPlanejadas: 0,
            estacoesRealizadas: 0,
            progresso: 0
          },
          nivel: 'Iniciante',
          nivelAtual: 'Iniciante',
          pontosExperiencia: 0,
          streak: 0
        },

        // Status e posicionamento
        ranking: null,
        status: 'offline'
      }

      await setDoc(doc(db, 'usuarios', user.uid), userData)

      if (form.value.inviteCode) {
        try {
          await redeemInvite(form.value.inviteCode.trim())
        } catch (inviteError) {
          console.error('[Register] Erro ao resgatar convite:', inviteError)
          throw new Error(inviteError.message || 'Não foi possível validar o convite fornecido.')
        }
      }

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
