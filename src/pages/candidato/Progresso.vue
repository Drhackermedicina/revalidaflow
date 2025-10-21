<template>
  <div :class="themeClasses.container">
    <VContainer fluid class="px-0">
      <VRow>
        <VCol cols="12">
          <VCard
            title="Progresso do Candidato"
            :class="themeClasses.card"
            elevation="2"
          >
            <VCardText>
              <p class="text-body-1 mb-4 progresso-description">
                Acompanhe seu progresso geral e o avanço em cada módulo de estudo.
              </p>

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
                <span class="ml-4 text-h6" aria-label="Carregando progresso">Carregando seu progresso...</span>
              </div>

              <!-- Content -->
              <div v-else>
                <h3 class="text-h6 mb-2 progresso-section-title">Progresso Geral</h3>
                <VProgressLinear
                  :model-value="overallProgress"
                  color="primary"
                  height="20"
                  rounded
                  class="mb-4"
                >
                  <template #default="{ value }">
                    <strong>{{ Math.ceil(value) }}%</strong>
                  </template>
                </VProgressLinear>
                <p class="text-caption text-medium-emphasis progresso-info">Seu progresso é calculado com base nas simulações e módulos concluídos.</p>

                <VDivider class="my-6" />

                <h3 class="text-h6 mb-4 progresso-section-title">Progresso por Módulo</h3>
                <VList class="modules-list">
                  <VListItem
                    v-for="module in modules"
                    :key="module.name"
                    class="mb-4 module-item"
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
    </VContainer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useThemeConfig } from '@/composables/useThemeConfig'
import { useFirebaseData } from '@/composables/useFirebaseData'

const { themeClasses } = useThemeConfig()
const { loading, userData, fetchUserStats } = useFirebaseData()

// Mapeamento de especialidades para módulos
const especialidadeModulos = {
  'clinica-medica': { nome: 'Clínica Médica', descricao: 'Revisão de casos clínicos e diretrizes.' },
  'cirurgia': { nome: 'Cirurgia Geral', descricao: 'Procedimentos cirúrgicos e manejo pós-operatório.' },
  'pediatria': { nome: 'Pediatria', descricao: 'Desenvolvimento infantil e doenças comuns.' },
  'ginecologia-obstetricia': { nome: 'Ginecologia e Obstetrícia', descricao: 'Saúde da mulher e acompanhamento gestacional.' },
  'medicina-preventiva': { nome: 'Medicina Preventiva', descricao: 'Epidemiologia e saúde pública.' },
}

// Computed properties simplificadas
const overallProgress = computed(() => {
  const concluidas = userData.value?.estacoesConcluidas?.length || 0
  // Estimativa baseada em estações concluídas (assumindo ~50 estações totais)
  return Math.min((concluidas / 50) * 100, 100)
})

const modules = computed(() => {
  const stats = userData.value?.statistics
  if (!stats) {
    return Object.values(especialidadeModulos).map(info => ({
      name: `Módulo: ${info.nome}`,
      description: info.descricao,
      progress: 0
    }))
  }

  return Object.entries(stats)
    .filter(([especialidade]) => especialidade !== 'geral' && especialidadeModulos[especialidade])
    .map(([especialidade, dados]) => {
      const progresso = Math.min((dados.mediaNotas || 0) * 10, 100)
      return {
        name: `Módulo: ${especialidadeModulos[especialidade].nome}`,
        description: especialidadeModulos[especialidade].descricao,
        progress: progresso
      }
    })
})

// Lifecycle hooks
onMounted(() => {
  fetchUserStats()
})
</script>

<style scoped>
.modules-list {
  background: transparent;
}

.module-item {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.12) !important;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.05) !important;
}

.module-item:hover {
  background: rgba(var(--v-theme-surface-variant), 0.3) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.10) !important;
  transform: translateY(-2px);
}

/* Responsividade */
@media (max-width: 768px) {
  .module-item {
    margin-bottom: 12px;
    padding: 12px;
  }
}
</style>
