// Arquivo movido para padronização de rotas do candidato

<template>
  <div class="ranking-view">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h4 py-4 primary-text">
              Ranking de Desempenho
              <v-spacer></v-spacer>
              <v-chip
                color="primary"
                :class="{'ma-2': true, 'active': filtroAtivo === 'geral'}"
                @click="filtrarPor('geral')"
              >
                Geral
              </v-chip>
              <v-chip
                color="success"
                :class="{'ma-2': true, 'active': filtroAtivo === 'mediaNota'}"
                @click="filtrarPor('mediaNota')"
              >
                Média de Notas
              </v-chip>
              <v-chip
                color="info"
                :class="{'ma-2': true, 'active': filtroAtivo === 'quantidade'}"
                @click="filtrarPor('quantidade')"
              >
                Quantidade de Estações
              </v-chip>
            </v-card-title>
            
            <v-card-text>
              <v-alert v-if="loading" type="info" text>
                Carregando dados do ranking...
              </v-alert>
              
              <v-alert v-if="error" type="error" text>
                {{ error }}
              </v-alert>

              <div v-if="!loading && !error">
                <div class="meu-ranking text-center pa-4 mb-6">
                  <h3 class="text-h5 mb-2">Seu ranking</h3>
                  <v-avatar 
                    size="90" 
                    :color="obterCorRanking(meuRanking?.posicao || 999)" 
                    class="white--text mb-2"
                  >
                    {{ meuRanking?.posicao || '?' }}
                  </v-avatar>
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

                <v-table>
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
                        <v-avatar 
                          size="36" 
                          :color="obterCorRanking(index + 1)" 
                          class="white--text mr-2"
                        >
                          {{ index + 1 }}
                        </v-avatar>
                      </td>
                      <td>
                        <div class="d-flex align-center">
                          <v-avatar class="mr-3" size="40">
                            <v-img
                              v-if="usuario.photoURL"
                              :src="usuario.photoURL"
                              alt="Avatar"
                            ></v-img>
                            <span v-else>{{ obterIniciais(usuario.nome, usuario.sobrenome) }}</span>
                          </v-avatar>
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
                </v-table>
              </div>
            </v-card-text>
          </v-card>

          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h5">
              Estatísticas por Especialidade
            </v-card-title>
            <v-card-text>
              <v-row v-if="!loading && especialidades.length > 0">
                <v-col v-for="especialidade in especialidades" :key="especialidade.nome" cols="12" md="4">
                  <v-card variant="outlined" class="pa-3">
                    <div class="text-h6 mb-2">{{ especialidade.nome }}</div>
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-caption">Estações:</span>
                      <span class="font-weight-medium">{{ especialidade.concluidas }}</span>
                    </div>
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-caption">Média de notas:</span>
                      <span class="font-weight-medium">{{ formatarNota(especialidade.mediaNotas) }}</span>
                    </div>
                    <v-progress-linear
                      :model-value="(especialidade.mediaNotas/10)*100"
                      :color="obterCorNota(especialidade.mediaNotas)"
                      height="10"
                      rounded
                      class="mt-2"
                    ></v-progress-linear>
                  </v-card>
                </v-col>
              </v-row>
              <v-alert v-else-if="!loading" type="info" text>
                Você ainda não completou nenhuma estação.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { onMounted, ref } from 'vue';

// Estado
const loading = ref(true);
const error = ref(null);
const ranking = ref([]);
const currentUserId = ref(null);
const meuRanking = ref(null);
const especialidades = ref([]);
const filtroAtivo = ref('geral');

// Firebase
const auth = getAuth();
const db = getFirestore();

// Buscar ranking
async function buscarRanking() {
  loading.value = true;
  error.value = null;
  
  try {
    // Determinar campo para ordenar com base no filtro
    let campoOrdenacao = 'ranking'; // padrão
    
    if (filtroAtivo.value === 'mediaNota') {
      campoOrdenacao = 'nivelHabilidade';
    } else if (filtroAtivo.value === 'quantidade') {
      campoOrdenacao = 'estacoesConcluidas';
    }
    
    // Buscar top 50 usuários
    const usuariosRef = collection(db, 'usuarios');
    const q = query(usuariosRef, orderBy(campoOrdenacao, 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    
    const rankingData = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Calcular estações concluídas
      const estacoesConcluidas = Array.isArray(userData.estacoesConcluidas) 
        ? userData.estacoesConcluidas.length 
        : 0;
      
      // Calcular média de notas
      const mediaNota = userData.nivelHabilidade || 0;
      
      // Calcular pontos
      const pontos = userData.ranking || 0;
      
      rankingData.push({
        id: doc.id,
        nome: userData.nome || 'Usuário',
        sobrenome: userData.sobrenome || '',
        cidade: userData.cidade || 'Desconhecida',
        paisOrigem: userData.paisOrigem || 'Brasil',
        photoURL: userData.photoURL,
        estacoesConcluidas,
        mediaNota,
        nivelHabilidade: userData.nivelHabilidade || 0,
        pontos,
      });
    });
    
    ranking.value = rankingData;
    
    // Encontrar minha posição no ranking
    if (currentUserId.value) {
      const minhaPos = rankingData.findIndex(u => u.id === currentUserId.value);
      if (minhaPos !== -1) {
        meuRanking.value = {
          ...rankingData[minhaPos],
          posicao: minhaPos + 1
        };
      } else {
        // Se não estiver nos top 50, buscar especificamente meus dados
        await buscarMeusDados();
      }
    }
  } catch (err) {
    console.error('Erro ao buscar ranking:', err);
    error.value = 'Não foi possível carregar o ranking. Tente novamente mais tarde.';
  } finally {
    loading.value = false;
  }
}

// Buscar meus dados quando não estou no top 50
async function buscarMeusDados() {
  if (!currentUserId.value) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', currentUserId.value));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Calcular estações concluídas
      const estacoesConcluidas = Array.isArray(userData.estacoesConcluidas) 
        ? userData.estacoesConcluidas.length 
        : 0;
      
      // Calcular média de notas
      const mediaNota = userData.nivelHabilidade || 0;
      
      // Calcular pontos
      const pontos = userData.ranking || 0;
      
      meuRanking.value = {
        id: userDoc.id,
        nome: userData.nome || 'Você',
        sobrenome: userData.sobrenome || '',
        estacoesConcluidas,
        mediaNota,
        nivelHabilidade: userData.nivelHabilidade || 0,
        pontos,
        posicao: 999 // Posição desconhecida fora do top 50
      };
      
      // Processar estatísticas por especialidade
      processarEstatisticas(userData.statistics || {});
    }
  } catch (err) {
    console.error('Erro ao buscar meus dados:', err);
  }
}

// Processar estatísticas por especialidade
function processarEstatisticas(statistics) {
  const especialidadesData = [];
  
  // Remover a estatística geral para processamento separado
  const { geral, ...especialidadesObj } = statistics;
  
  // Processar cada especialidade
  for (const [nome, dados] of Object.entries(especialidadesObj)) {
    especialidadesData.push({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1), // Capitalizar
      concluidas: dados.concluidas || 0,
      mediaNotas: dados.mediaNotas || 0,
      total: dados.total || 0
    });
  }
  
  // Ordenar por número de estações concluídas
  especialidadesData.sort((a, b) => b.concluidas - a.concluidas);
  
  especialidades.value = especialidadesData;
}

// Filtrar ranking
function filtrarPor(filtro) {
  filtroAtivo.value = filtro;
  buscarRanking();
}

// Formatar nota para exibição
function formatarNota(nota) {
  if (nota === undefined || nota === null) return '0.00';
  return (Math.round(nota * 100) / 100).toFixed(2);
}

// Formatar nível para exibição
function formatarNivel(nivel) {
  if (nivel === undefined || nivel === null) return 'Iniciante';
  
  if (nivel >= 9) return 'Expert';
  if (nivel >= 7.5) return 'Avançado';
  if (nivel >= 5) return 'Intermediário';
  return 'Iniciante';
}

// Obter cor com base na posição no ranking
function obterCorRanking(posicao) {
  if (posicao === 1) return 'amber-darken-2'; // Ouro
  if (posicao === 2) return 'grey-lighten-1'; // Prata
  if (posicao === 3) return 'amber-darken-4'; // Bronze
  if (posicao <= 10) return 'blue';
  if (posicao <= 20) return 'teal';
  return 'grey';
}

// Obter cor com base na nota
function obterCorNota(nota) {
  if (nota >= 9) return 'success';
  if (nota >= 7) return 'info';
  if (nota >= 5) return 'warning';
  return 'error';
}

// Obter iniciais do nome
function obterIniciais(nome, sobrenome) {
  const n = nome ? nome.charAt(0).toUpperCase() : '';
  const s = sobrenome ? sobrenome.charAt(0).toUpperCase() : '';
  return n + s;
}

// Monitorar usuário autenticado
onMounted(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserId.value = user.uid;
      buscarRanking();
    } else {
      error.value = 'Você precisa estar autenticado para ver o ranking.';
      loading.value = false;
    }
  });
  
  // Limpar listener ao desmontar
  return () => unsubscribe();
});
</script>

<style scoped>
.ranking-view {
  min-height: 100vh;
}

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
