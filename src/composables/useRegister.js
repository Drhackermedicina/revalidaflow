import { aplicarMascaraCPF, validarCPF } from '@/@core/utils/cpf.js'
import { db, firebaseAuth } from '@/plugins/firebase'
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, where, Timestamp } from 'firebase/firestore'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { redeemInvite } from '@/services/accessControlService.js'
import validationLogger from '@/utils/validationLogger'

console.log('[useRegister] Módulo importado com sucesso')
console.log('[useRegister] Funções CPF importadas:', { aplicarMascaraCPF, validarCPF })

export function useRegister() {
  console.log('[useRegister] Inicializando função useRegister...')
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
    inviteCode: '',
  })
  
  console.log('[useRegister] Estado inicial criado:', {
    loading: loading.value,
    error: error.value,
    usuarioGoogle: usuarioGoogle.value,
    form: form.value
  })

  // Função auxiliar para padronizar CPF
  const getNumericCPF = (cpf) => cpf.replace(/\D/g, '')

  watch(usuarioGoogle, (novoValor) => {
    if (novoValor) {
      form.value.nome = novoValor.displayName?.split(' ')[0] || ''
      form.value.sobrenome = novoValor.displayName?.split(' ').slice(1).join(' ') || ''
    }
  })

  // Processar resultado do redirect quando o usuário volta da autenticação
  async function processarRedirectResult() {
    try {
      const result = await getRedirectResult(firebaseAuth)
      if (result && result.user) {
        console.log('[useRegister] ✅ Login via redirect processado com sucesso:', {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        })
        usuarioGoogle.value = result.user

        // LOG DE VALIDAÇÃO: Redirect processado com sucesso
        validationLogger.logGoogleAuthRecovered('processarRedirectResult', {
          method: 'redirect',
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        });

        return true
      }
    } catch (e) {
      console.error('[useRegister] 🔥 Erro ao processar redirect result:', e)
      if (e.code !== 'auth/redirect-cancelled-by-user') {
        error.value = `Erro ao processar autenticação: ${e.message}`
      }
    }
    return false
  }

  async function loginComGoogle() {
    const loginTime = new Date().toISOString();
    const loginId = Math.random().toString(36).substr(2, 9);

    console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🚀 INICIANDO login com Google`);
    console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔍 Ambiente: ${import.meta.env.MODE}`);
    console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔍 User Agent: ${navigator.userAgent}`);
    console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔍 URL atual: ${window.location.href}`);

    loading.value = true
    error.value = ''

    try {
      console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔧 Criando provider Google...`);
      const provider = new GoogleAuthProvider()

      // LOG DE DIAGNÓSTICO: Configuração do provider
      console.log(`[${loginTime}] loginComGoogle: [${loginId}] Provider configurado:`, {
        customParameters: provider.customParameters,
        scopes: provider.scopes
      });

      // Detectar problemas de popup antes de iniciar
      console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔍 Verificando configurações de popup:`, {
        popupBlocked: false, // Será atualizado se ocorrer erro
        crossOriginOpenerPolicy: document.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')?.content,
        crossOriginEmbedderPolicy: document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')?.content,
        supportsPopup: typeof window !== 'undefined' && window.open !== undefined
      });

      console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🪟 Tentando signInWithPopup...`);

      const result = await signInWithPopup(firebaseAuth, provider)

      console.log(`[${loginTime}] loginComGoogle: [${loginId}] ✅ Login bem-sucedido via popup:`, {
        uid: result.user?.uid,
        email: result.user?.email,
        displayName: result.user?.displayName,
        hasPhotoURL: !!result.user?.photoURL
      });

      usuarioGoogle.value = result.user
      console.log(`[${loginTime}] loginComGoogle: [${loginId}] usuarioGoogle atualizado:`, usuarioGoogle.value);

      // LOG DE VALIDAÇÃO: Login Google recuperado com sucesso
      validationLogger.logGoogleAuthRecovered('loginComGoogle', {
        loginId,
        method: 'popup',
        uid: result.user?.uid,
        email: result.user?.email
      });

    } catch (e) {
      // LOG DE DIAGNÓSTICO: Análise detalhada de erros
      console.error(`[${loginTime}] loginComGoogle: [${loginId}] 🔥 ERRO NO LOGIN GOOGLE:`, e);
      console.error(`[${loginTime}] loginComGoogle: [${loginId}] Detalhes do erro:`, {
        name: e.name,
        code: e.code,
        message: e.message,
        stack: e.stack,
        customData: e.customData
      });

      // Detectar especificamente erros de popup/policy
      const isPopupError = e.message?.includes('popup') ||
                          e.message?.includes('Cross-Origin') ||
                          e.code?.includes('popup') ||
                          e.code === 'auth/popup-blocked' ||
                          e.code === 'auth/popup-closed-by-user'

      if (isPopupError) {
        console.warn(`[${loginTime}] loginComGoogle: [${loginId}] 🚨 ERRO DE POPUP DETECTADO - Tentando fallback para redirect:`, e.message);
        console.log(`[${loginTime}] loginComGoogle: [${loginId}] 🔄 Iniciando signInWithRedirect como fallback...`);

        // LOG DE VALIDAÇÃO: Erro de popup detectado
        if (e.message?.includes('Cross-Origin') || e.code?.includes('Cross-Origin')) {
          validationLogger.logGoogleAuthCrossOriginError('loginComGoogle', {
            loginId,
            errorCode: e.code,
            errorMessage: e.message,
            userAgent: navigator.userAgent,
            url: window.location.href
          });
        } else {
          validationLogger.logGoogleAuthPopupBlocked('loginComGoogle', {
            loginId,
            errorCode: e.code,
            errorMessage: e.message,
            userAgent: navigator.userAgent
          });
        }

        // LOG DE VALIDAÇÃO: Fallback para redirect
        validationLogger.logGoogleAuthFallbackRedirect('loginComGoogle', {
          loginId,
          reason: 'popup_error',
          originalError: e.message
        });

        try {
          // Fallback para redirect
          await signInWithRedirect(firebaseAuth, provider)
          console.log(`[${loginTime}] loginComGoogle: [${loginId}] ✅ Redirect iniciado com sucesso`);
          // O resultado será processado quando o usuário voltar
          return // Sai da função, pois o redirect vai recarregar a página
        } catch (redirectError) {
          console.error(`[${loginTime}] loginComGoogle: [${loginId}] 🔥 ERRO NO REDIRECT FALLBACK:`, redirectError);
          error.value = 'Não foi possível abrir a janela de autenticação. Verifique se popups estão bloqueados e tente novamente.'
        }
      } else {
        // Erro não relacionado a popup
        console.error(`[${loginTime}] loginComGoogle: [${loginId}] 🚨 ERRO NÃO-RELACIONADO A POPUP:`, e.message);
        error.value = `Erro ao fazer login com Google: ${e.message}`
      }

      console.log(`[${loginTime}] loginComGoogle: [${loginId}] Mensagem de erro definida:`, error.value);
    } finally {
      loading.value = false
      console.log(`[${loginTime}] loginComGoogle: [${loginId}] ⏹️ loading finalizado:`, loading.value);
    }
  }

  async function salvarUsuarioFirestore() {
    loading.value = true
    error.value = ''
    console.log('[Register] Iniciando processo de cadastro.')

    try {
      const user = firebaseAuth.currentUser
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const cpfNumerico = getNumericCPF(form.value.cpf)
      console.log(`[Register] CPF informado: ${form.value.cpf}, Padronizado: ${cpfNumerico}`)

      if (!validarCPF(cpfNumerico)) {
        throw new Error('CPF inválido')
      }

      console.log(`[Register] Verificando duplicidade para o CPF: ${cpfNumerico}`)
      const usuariosRef = collection(db, 'usuarios')
      const q = query(usuariosRef, where('cpf', '==', cpfNumerico))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        console.error(`[Register] Tentativa de cadastro com CPF duplicado: ${cpfNumerico}`)
        throw new Error('Já existe um usuário cadastrado com este CPF')
      }

      console.log(`[Register] CPF ${cpfNumerico} é único. Prosseguindo com a criação do usuário.`)
      
      const trialDays = Number.parseInt(import.meta.env.VITE_TRIAL_DAYS || '14', 10)
      const trialExpiresAt = Timestamp.fromDate(new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000))
      
      const userData = {
        nome: form.value.nome,
        sobrenome: form.value.sobrenome,
        cpf: cpfNumerico,
        cidade: form.value.cidade,
        paisOrigem: form.value.paisOrigem,
        aceitouTermos: form.value.aceitouTermos,
        dataCadastro: Timestamp.now(),
        dataUltimaAtualizacao: Timestamp.now(),
        ultimoLogin: Timestamp.now(),
        trialExpiraEm: trialExpiresAt,
        plano: 'trial',
        planoExpiraEm: trialExpiresAt,
        accessStatus: 'trial',
        accessSource: 'register',
        accessExpiresAt: trialExpiresAt,
        accessInviteCode: form.value.inviteCode ? form.value.inviteCode.trim().toUpperCase() : null,
        subscriptionPlan: null,
        accessUpdatedAt: Timestamp.now(),
        estacoesConcluidas: [],
        historicoEstacoes: [],
        historicoSimulacoes: [],
        nivelHabilidade: 0,
        mediaGeral: 0,
        totalScore: 0,
        score: 0,
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
          ultimaSessao: null,
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
            progresso: 0,
          },
          nivel: 'Iniciante',
          nivelAtual: 'Iniciante',
          pontosExperiencia: 0,
          streak: 0,
        },
        ranking: null,
        status: 'offline',
      }

      await setDoc(doc(db, 'usuarios', user.uid), userData)
      console.log(`[Register] Usuário ${user.uid} salvo com sucesso no Firestore.`)

      if (form.value.inviteCode) {
        const inviteCode = form.value.inviteCode.trim().toUpperCase()
        console.log(`[Register] Tentando resgatar convite: ${inviteCode}`)
        try {
          const inviteResult = await redeemInvite(inviteCode)
          if (inviteResult.fallback) {
            console.warn(`[Register] Convite ${inviteCode} não pôde ser resgatado agora (${inviteResult.error}). Será tentado novamente posteriormente.`)
          } else {
            console.log(`[Register] Convite ${inviteCode} resgatado com sucesso.`)
          }
        } catch (inviteError) {
          console.warn(`[Register] Falha ao resgatar o convite ${inviteCode}. O cadastro continua, mas o erro será logado.`, inviteError)
        }
      }

      console.log('[Register] Processo de cadastro finalizado. Redirecionando para /app/dashboard.')
      router.push('/app/dashboard')

    } catch (e) {
      console.error(`[Register] Erro no fluxo de cadastro: ${e.message}`, e)
      if (e.message.includes('Já existe um usuário cadastrado com este CPF')) {
        error.value = 'Este CPF já está em uso. Por favor, utilize outro.'
      } else if (e.message.includes('CPF inválido')) {
        error.value = 'O CPF informado é inválido. Verifique os dígitos.'
      } else if (e.message.includes('Usuário não autenticado')) {
        error.value = 'Sua sessão expirou. Por favor, faça o login novamente para continuar.'
      } else {
        error.value = 'Ocorreu um erro inesperado durante o cadastro. Tente novamente mais tarde.'
      }
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
    processarRedirectResult,
    aplicarMascaraCPF,
  }
}
