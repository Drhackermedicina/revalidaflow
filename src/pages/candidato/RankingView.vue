<template>
  <div :class="themeClasses.container">
    <VContainer>
      <VRow>
        <VCol cols="12">
          <VCard :class="themeClasses.card" elevation="2" class="mb-6">
            <VCardTitle class="text-h4 py-4">
              Ranking de Desempenho
              <VSpacer></VSpacer>
              <VChip
                color="primary"
                :class="{'ma-2': true, 'active': filtroAtivo === 'geral'}"
                @click="filtrarPor('geral')"
              >
                Geral
              </VChip>
              <VChip
                color="success"
                :class="{'ma-2': true, 'active': filtroAtivo === 'mediaNota'}"
                @click="filtrarPor('mediaNota')"
              >
                Média de Notas
              </VChip>
              <VChip
                color="info"
                :class="{'ma-2': true, 'active': filtroAtivo === 'quantidade'}"
                @click="filtrarPor('quantidade')"
              >
                Quantidade de Estações
              </VChip>
            </VCardTitle>

            <VCardText>
              <!-- Loading State -->
              <div v-if="loading"
                :class="[
                  'd-flex justify-center align-center pa-8',
                  themeClasses.loading
                ]"
                role="status"
                aria-live="polite"
              >
                <VProgressCircular indeterminate color="primary" size="64" aria-hidden="true" />
                <span class="ml-4 text-h6" aria-label="Carregando ranking">Carregando dados do ranking...</span>
              </div>

              <!-- Error State -->
              <VAlert v-if="error" type="error" text>
                {{ error }}
              </VAlert>

              <div v-if="!loading && !error">
                <div class="meu-ranking text-center pa-4 mb-6">
                  <h3 class="text-h5 mb-2">Seu ranking</h3>
                  <VAvatar
                    size="90"
                    :color="obterCorRanking(meuRanking?.posicao || 999)"
                    class="white--text mb-2"
                  >
                    {{ meuRanking?.posicao || '?' }}
                  </VAvatar>
                  <div class="text-h6">{{ meuRanking?.nome || 'Seu nome' }}</div>
                  <div class="text-subtitle-1">{{ meuRanking?.pontos || 0 }} pontos</div>
                  <div class="d-flex justify-space-around mt-2">
                    <div>
                      <div class="text-caption text-uppercase">Estações</div>
                      <div class="font-weight-bold">{{ meuRanking?.estacoesConcluidas || 0 }}</div>
                    </div>
                    <div>
                      <div class="text-caption text-uppercase">Média</div>
                      <div class="font-weight-bold">{{ formatarNota(meuRanking?.mediaNota) }}</div>
                    </div>
                    <div>
                      <div class="text-caption text-uppercase">Nível</div>
                      <div class="font-weight-bold">{{ formatarNivel(meuRanking?.nivelHabilidade) }}</div>
                    </div>
                  </div>
                </div>

                <VTable>
                  <thead>
                    <tr>
                      <th class="text-left">Posição</th>
                      <th class="text-left">Nome</th>
                      <th class="text-right">Estações Concluídas</th>
                      <th class="text-right">Média de Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(usuario, index) in ranking"
                      :key="usuario.id"
                      :class="{'minha-linha': usuario.id === currentUserId}"
                    >
                      <td>
                        <VAvatar
                          size="36"
                          :color="obterCorRanking(index + 1)"
                          class="white--text mr-2"
                        >
                          {{ index + 1 }}
                        </VAvatar>
                      </td>
                      <td>
                        <div class="d-flex align-center">
                          <VAvatar class="mr-3" size="40">
                            <VImg
                              v-if="usuario.photoURL"
                              :src="usuario.photoURL"
                              alt="Avatar"
                            ></VImg>
                            <span v-else>{{ obterIniciais(usuario.nome, usuario.sobrenome) }}</span>
                          </VAvatar>
                          <div>
                            <div class="font-weight-medium">{{ usuario.nome }} {{ usuario.sobrenome }}</div>
                            <div class="text-caption">{{ usuario.cidade }}, {{ usuario.paisOrigem }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="text-right">{{ usuario.estacoesConcluidas || 0 }}</td>
                      <td class="text-right">{{ formatarNota(usuario.mediaNota) }}</td>
                    </tr>
                    <tr v-if="ranking.length === 0">
                      <td colspan="4" class="text-center py-5">
                        Nenhum usuário encontrado no ranking.
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </VCardText>
          </VCard>

          <VCard :class="themeClasses.card" elevation="2" class="mb-6">
            <VCardTitle class="text-h5">
              Estatísticas por Especialidade
            </VCardTitle>
            <VCardText>
              <VRow v-if="!loading && especialidades.length > 0">
                <VCol v-for="especialidade in especialidades" :key="especialidade.nome" cols="12" md="4">
                  <VCard variant="outlined" class="pa-3">
                    <div class="text-h6 mb-2">{{ especialidade.nome }}</div>
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-caption">Estações:</span>
                      <span class="font-weight-medium">{{ especialidade.concluidas }}</span>
                    </div>
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-caption">Média de notas:</span>
                      <span class="font-weight-medium">{{ formatarNota(especialidade.mediaNotas) }}</span>
                    </div>
                    <VProgressLinear
                      :model-value="(especialidade.mediaNotas/10)*100"
                      :color="obterCorNota(especialidade.mediaNotas)"
                      height="10"
                      rounded
                      class="mt-2"
                    ></VProgressLinear>
                  </VCard>
                </VCol>
              </VRow>
              <VAlert v-else-if="!loading" type="info" text>
                Você ainda não completou nenhuma estação.
              </VAlert>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useThemeConfig } from '@/composables/useThemeConfig'
import { useFirebaseData } from '@/composables/useFirebaseData'
import { currentUser } from '@/plugins/auth'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/plugins/firebase'

const { themeClasses } = useThemeConfig()
const { userData } = useFirebaseData()

// Estado
const loading = ref(true)
const error = ref(null)
const ranking = ref([])
const meuRanking = ref(null)
const filtroAtivo = ref('geral')

// Computed properties
const currentUserId = computed(() => currentUser.value?.uid)

// Buscar ranking
async function buscarRanking() {
  loading.value = true
  error.value = null

  try {
    // Determinar campo para ordenar com base no filtro
    let campoOrdenacao = 'ranking'

    if (filtroAtivo.value === 'mediaNota') {
      campoOrdenacao = 'nivelHabilidade'
    } else if (filtroAtivo.value === 'quantidade') {
      campoOrdenacao = 'estacoesConcluidas'
    }

    // Buscar top 50 usuários
    const usuariosRef = collection(db, 'usuarios')
    const q = query(usuariosRef, orderBy(campoOrdenacao, 'desc'), limit(50))
    const querySnapshot = await getDocs(q)

    const rankingData = []
    querySnapshot.forEach((doc) => {
      const userData = doc.data()

      rankingData.push({
        id: doc.id,
        nome: userData.nome || 'Usuário',
        sobrenome: userData.sobrenome || '',
        cidade: userData.cidade || 'Desconhecida',
        paisOrigem: userData.paisOrigem || 'Brasil',
        photoURL: userData.photoURL,
        estacoesConcluidas: Array.isArray(userData.estacoesConcluidas) ? userData.estacoesConcluidas.length : 0,
        mediaNota: userData.nivelHabilidade || 0,
        nivelHabilidade: userData.nivelHabilidade || 0,
        pontos: userData.ranking || 0,
      })
    })

    ranking.value = rankingData

    // Encontrar minha posição no ranking
    if (currentUserId.value) {
      const minhaPos = rankingData.findIndex(u => u.id === currentUserId.value)
      if (minhaPos !== -1) {
        meuRanking.value = {
          ...rankingData[minhaPos],
          posicao: minhaPos + 1
        }
      } else {
        // Usar dados do usuário atual se disponível
        if (userData.value) {
          meuRanking.value = {
            id: currentUserId.value,
            nome: userData.value.nome || 'Você',
            sobrenome: userData.value.sobrenome || '',
            estacoesConcluidas: userData.value.estacoesConcluidas?.length || 0,
            mediaNota: userData.value.nivelHabilidade || 0,
            nivelHabilidade: userData.value.nivelHabilidade || 0,
            pontos: userData.value.ranking || 0,
            posicao: 999
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao buscar ranking:', err)
    error.value = 'Não foi possível carregar o ranking. Tente novamente mais tarde.'
  } finally {
    loading.value = false
  }
}

// Computed para estatísticas por especialidade
const especialidades = computed(() => {
  const stats = userData.value?.statistics
  if (!stats) return []

  const { geral, ...especialidadesObj } = stats

  return Object.entries(especialidadesObj)
    .map(([nome, dados]) => ({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1),
      concluidas: dados.concluidas || 0,
      mediaNotas: dados.mediaNotas || 0,
      total: dados.total || 0
    }))
    .sort((a, b) => b.concluidas - a.concluidas)
})

// Filtrar ranking
function filtrarPor(filtro) {
  filtroAtivo.value = filtro
  buscarRanking()
}

// Formatar nota para exibição
function formatarNota(nota) {
  if (nota === undefined || nota === null) return '0.00'
  return (Math.round(nota * 100) / 100).toFixed(2)
}

// Formatar nível para exibição
function formatarNivel(nivel) {
  if (nivel === undefined || nivel === null) return 'Iniciante'

  if (nivel >= 9) return 'Expert'
  if (nivel >= 7.5) return 'Avançado'
  if (nivel >= 5) return 'Intermediário'
  return 'Iniciante'
}

// Obter cor com base na posição no ranking
function obterCorRanking(posicao) {
  if (posicao === 1) return 'amber-darken-2'
  if (posicao === 2) return 'grey-lighten-1'
  if (posicao === 3) return 'amber-darken-4'
  if (posicao <= 10) return 'blue'
  if (posicao <= 20) return 'teal'
  return 'grey'
}

// Obter cor com base na nota
function obterCorNota(nota) {
  if (nota >= 9) return 'success'
  if (nota >= 7) return 'info'
  if (nota >= 5) return 'warning'
  return 'error'
}

// Obter iniciais do nome
function obterIniciais(nome, sobrenome) {
  const n = nome ? nome.charAt(0).toUpperCase() : ''
  const s = sobrenome ? sobrenome.charAt(0).toUpperCase() : ''
  return n + s
}

// Lifecycle hooks
onMounted(() => {
  if (currentUserId.value) {
    buscarRanking()
  } else {
    error.value = 'Você precisa estar autenticado para ver o ranking.'
    loading.value = false
  }
})
</script>

<style scoped>
.active {
  font-weight: bold !important;
  transform: scale(1.05);
}

.meu-ranking {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
}

.minha-linha {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* Animações suaves para interação */
.v-avatar, .v-chip {
  transition: all 0.2s ease-in-out;
}

.v-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
</style>
