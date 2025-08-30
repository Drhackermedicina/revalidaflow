<template>
  <VRow 
    :class="[
      'progresso-container',
      isDarkTheme ? 'progresso-container--dark' : 'progresso-container--light'
    ]"
  >
    <VCol cols="12">
      <VCard 
        title="Progresso do Candidato"
        :class="[
          'main-card',
          isDarkTheme ? 'main-card--dark' : 'main-card--light'
        ]"
      >
        <VCardText>
          <p class="text-body-1 mb-4">Acompanhe seu progresso geral e o avanço em cada módulo de estudo.</p>

          <!-- Loading state -->
          <div v-if="loading" 
            :class="[
              'text-center py-8 loading-container',
              isDarkTheme ? 'loading-container--dark' : 'loading-container--light'
            ]"
          >
            <VProgressCircular indeterminate color="primary" size="48" />
            <p class="text-body-2 mt-4">Carregando seu progresso...</p>
          </div>

          <!-- Content when loaded -->
          <div v-else>
            <h3 class="text-h6 mb-2">Progresso Geral</h3>
            <VProgressLinear
              v-model="overallProgress"
              color="primary"
              height="20"
              rounded
              class="mb-4"
            >
              <template #default="{ value }">
                <strong>{{ Math.ceil(value) }}%</strong>
              </template>
            </VProgressLinear>
            <p class="text-caption text-medium-emphasis">Seu progresso é calculado com base nas simulações e módulos concluídos.</p>

            <VDivider class="my-6" />

            <h3 class="text-h6 mb-4">Progresso por Módulo</h3>
            <VList 
              :class="[
                'modules-list',
                isDarkTheme ? 'modules-list--dark' : 'modules-list--light'
              ]"
            >
              <VListItem
                v-for="module in modules"
                :key="module.name"
                :class="[
                  'mb-4 module-item',
                  isDarkTheme ? 'module-item--dark' : 'module-item--light'
                ]"
              >
                <VListItemTitle class="font-weight-medium">{{ module.name }}</VListItemTitle>
                <VListItemSubtitle class="text-caption">{{ module.description }}</VListItemSubtitle>
                <VProgressLinear
                  :model-value="module.progress"
                  color="info"
                  height="10"
                  rounded
                  class="mt-2"
                >
                  <template #default="{ value }">
                    <span class="text-caption font-weight-bold">{{ Math.ceil(value) }}%</span>
                  </template>
                </VProgressLinear>
              </VListItem>
            </VList>
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<script setup>
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { computed, onMounted, ref, watch } from 'vue';
import { useTheme } from 'vuetify';

const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

const overallProgress = ref(0);
const modules = ref([]);
const loading = ref(true);

// Especialidades mapeadas para módulos
const especialidadeModulos = {
  'clinica-medica': { nome: 'Clínica Médica', descricao: 'Revisão de casos clínicos e diretrizes.' },
  'cirurgia': { nome: 'Cirurgia Geral', descricao: 'Procedimentos cirúrgicos e manejo pós-operatório.' },
  'pediatria': { nome: 'Pediatria', descricao: 'Desenvolvimento infantil e doenças comuns.' },
  'ginecologia-obstetricia': { nome: 'Ginecologia e Obstetrícia', descricao: 'Saúde da mulher e acompanhamento gestacional.' },
  'medicina-preventiva': { nome: 'Medicina Preventiva', descricao: 'Epidemiologia e saúde pública.' },
};

// Carregar dados reais do usuário
const loadUserProgress = async () => {
  if (!currentUser.value?.uid) {
    loading.value = false;
    return;
  }
  
  try {
    
    // Buscar dados do usuário
    const userDoc = await getDoc(doc(db, 'usuarios', currentUser.value.uid));
    if (!userDoc.exists()) {
      loading.value = false;
      return;
    }
    
    const userData = userDoc.data();
    
    // Buscar total de estações disponíveis
    const estacoesSnapshot = await getDocs(collection(db, 'estacoes_clinicas'));
    const totalEstacoes = estacoesSnapshot.size;
    
    // Calcular progresso geral baseado em estações concluídas
    const estacoesConcluidas = userData.estacoesConcluidas?.length || 0;
    overallProgress.value = totalEstacoes > 0 ? (estacoesConcluidas / totalEstacoes) * 100 : 0;
    
    // Processar módulos baseado em statistics
    const modulosData = [];
    
    if (userData.statistics) {
      // Contar estações por especialidade
      const estacoesPorEspecialidade = {};
      estacoesSnapshot.docs.forEach(doc => {
        const estacao = doc.data();
        const area = estacao.area?.slug || 'outros';
        estacoesPorEspecialidade[area] = (estacoesPorEspecialidade[area] || 0) + 1;
      });
      
      
      // Criar módulos baseado nas statistics e especialidades mapeadas
      Object.entries(userData.statistics).forEach(([especialidade, dados]) => {
        if (especialidade !== 'geral' && especialidadeModulos[especialidade]) {
          const totalEstacoesEspecialidade = estacoesPorEspecialidade[especialidade] || 10;
          const concluidasEspecialidade = dados.concluidas || 0;
          const progressoEspecialidade = totalEstacoesEspecialidade > 0 
            ? (concluidasEspecialidade / totalEstacoesEspecialidade) * 100 
            : 0;
          
          modulosData.push({
            name: `Módulo: ${especialidadeModulos[especialidade].nome}`,
            description: especialidadeModulos[especialidade].descricao,
            progress: Math.min(progressoEspecialidade, 100) // Garantir que não passe de 100%
          });
        }
      });
    }
    
    // Se não há statistics, criar módulos baseado nas especialidades padrão
    if (modulosData.length === 0) {
      Object.entries(especialidadeModulos).forEach(([slug, info]) => {
        modulosData.push({
          name: `Módulo: ${info.nome}`,
          description: info.descricao,
          progress: 0
        });
      });
    }
    
    modules.value = modulosData;
    
  } catch (error) {
    console.error('❌ Erro ao carregar progresso:', error);
  } finally {
    loading.value = false;
  }
};

// Watch para recarregar quando o usuário mudar
watch(currentUser, (newUser) => {
  if (newUser) {
    loadUserProgress();
  }
}, { immediate: true });

onMounted(() => {
  if (currentUser.value) {
    loadUserProgress();
  }
});
</script>

<style scoped>
/* Container do progresso com tema adaptativo */
.progresso-container--light {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
  padding: 24px;
}

.progresso-container--dark {
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
  padding: 24px;
}

/* Card principal com tema adaptativo */
.main-card--light {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
}

.main-card--dark {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.24) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.24) !important;
}

/* Container de loading com tema adaptativo */
.loading-container--light {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-outline), 0.12);
}

.loading-container--dark {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-outline), 0.24);
}

/* Lista de módulos com tema adaptativo */
.modules-list--light {
  background: transparent;
}

.modules-list--dark {
  background: transparent;
}

/* Itens dos módulos com tema adaptativo */
.module-item--light {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.05) !important;
}

.module-item--dark {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.24) !important;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.15) !important;
}

.module-item--light:hover {
  background: rgba(var(--v-theme-surface-variant), 0.3) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.10) !important;
  transform: translateY(-2px);
}

.module-item--dark:hover {
  background: rgba(var(--v-theme-surface-bright), 0.1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.20) !important;
  transform: translateY(-2px);
}

/* Melhorias gerais de responsividade */
@media (max-width: 768px) {
  .module-item--light,
  .module-item--dark {
    margin-bottom: 12px;
    padding: 12px;
  }
  
  .main-card--light,
  .main-card--dark {
    border-radius: 8px;
  }
}

/* Transições suaves para mudanças de tema */
.progresso-container--light,
.progresso-container--dark,
.main-card--light,
.main-card--dark,
.module-item--light,
.module-item--dark {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
</style>
