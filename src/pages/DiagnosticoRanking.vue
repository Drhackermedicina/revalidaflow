<template>
  <div class="diagnostico-ranking">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>Diagnóstico de Ranking</v-card-title>
            <v-card-text>
              <div class="mb-4">
                <v-btn color="primary" @click="executarDiagnostico" :loading="loadingDiagnostico">
                  Executar Diagnóstico Completo
                </v-btn>
                <v-btn color="error" class="ml-2" @click="corrigirDados" :loading="loadingCorrecao" :disabled="!diagnosticoResult">
                  Corrigir Dados Corrompidos
                </v-btn>
              </div>

              <div v-if="diagnosticoResult" class="mb-4">
                <h4>Resultados do Diagnóstico:</h4>
                <v-alert type="info" class="mb-2">
                  Total de usuários: {{ diagnosticoResult.totalUsuarios }}
                </v-alert>
                <v-alert type="warning" v-if="diagnosticoResult.usuariosComNomesEstranhos.length > 0" class="mb-2">
                  Usuários com nomes estranhos: {{ diagnosticoResult.usuariosComNomesEstranhos.length }}
                </v-alert>
                <v-alert type="error" v-if="diagnosticoResult.usuariosComDadosDuplicados.length > 0" class="mb-2">
                  Usuários com dados duplicados: {{ diagnosticoResult.usuariosComDadosDuplicados.length }}
                </v-alert>
              </div>

              <div v-if="loading">Carregando dados...</div>
              <div v-else-if="error">{{ error }}</div>
              <div v-else>
                <h3>Dados Brutos do Usuário Atual:</h3>
                <pre>{{ JSON.stringify(userData, null, 2) }}</pre>

                <h3>Dados Processados:</h3>
                <ul>
                  <li><strong>Nome:</strong> {{ processedData.nome }}</li>
                  <li><strong>Estações Concluídas:</strong> {{ processedData.estacoesConcluidas }}</li>
                  <li><strong>Média:</strong> {{ processedData.mediaNota }}</li>
                  <li><strong>Nível:</strong> {{ processedData.nivelHabilidade }}</li>
                  <li><strong>Pontos:</strong> {{ processedData.pontos }}</li>
                </ul>

                <h3>Estações Detalhadas:</h3>
                <div v-if="userData?.estacoesConcluidas">
                  <div v-for="(estacao, index) in userData.estacoesConcluidas" :key="index">
                    <strong>Estação {{ index + 1 }}:</strong>
                    <pre>{{ JSON.stringify(estacao, null, 2) }}</pre>
                  </div>
                </div>
                <div v-else>
                  Nenhuma estação encontrada
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/plugins/firebase'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const auth = getAuth()
const loading = ref(true)
const error = ref('')
const userData = ref(null)
const processedData = ref({})
const loadingDiagnostico = ref(false)
const loadingCorrecao = ref(false)
const diagnosticoResult = ref(null)

async function executarDiagnostico() {
  loadingDiagnostico.value = true
  try {
    const { diagnosticarRanking } = await import('@/utils/rankingDiagnostics.js')
    diagnosticoResult.value = await diagnosticarRanking()
  } catch (err) {
    error.value = `Erro no diagnóstico: ${err.message}`
    console.error('Erro:', err)
  } finally {
    loadingDiagnostico.value = false
  }
}

async function corrigirDados() {
  loadingCorrecao.value = true
  try {
    const { corrigirDadosCorrompidos } = await import('@/utils/rankingDiagnostics.js')
    await corrigirDadosCorrompidos()
    alert('Correção concluída! Recarregue a página para ver os resultados.')
  } catch (err) {
    error.value = `Erro na correção: ${err.message}`
    console.error('Erro:', err)
  } finally {
    loadingCorrecao.value = false
  }
}

onMounted(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid))
        if (userDoc.exists()) {
          userData.value = userDoc.data()

          // Processar dados como na RankingView
          const data = userDoc.data()
          processedData.value = {
            nome: `${data.nome || 'Usuário'} ${data.sobrenome || ''}`.trim(),
            estacoesConcluidas: Array.isArray(data.estacoesConcluidas)
              ? data.estacoesConcluidas.length
              : 0,
            mediaNota: data.nivelHabilidade || 0,
            nivelHabilidade: data.nivelHabilidade || 0,
            pontos: data.ranking || 0
          }
        } else {
          error.value = 'Usuário não encontrado no banco de dados'
        }
      } catch (err) {
        error.value = `Erro ao carregar dados: ${err.message}`
        console.error('Erro:', err)
      }
    } else {
      error.value = 'Usuário não autenticado'
    }
    loading.value = false
  })

  return () => unsubscribe()
})
</script>
