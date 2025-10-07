<script setup>
import {
  processInfrastructureItems,
  getInfrastructureIcon,
  getInfrastructureColor
} from '@/utils/simulationUtils.ts'

// Props
const props = defineProps({
  stationData: { type: Object, required: true },
  simulationStarted: { type: Boolean, required: true },
  isDarkTheme: { type: Boolean, default: false }
})
</script>

<template>
  <div class="candidate-content-panel" v-if="simulationStarted">
    <!-- Card para Cenário (CANDIDATO) -->
    <VCard 
      :class="[
        'mb-6 scenario-card-candidate',
        isDarkTheme ? 'scenario-card-candidate--dark' : 'scenario-card-candidate--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.cenarioAtendimento"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-hospital-line" color="info" />
        </template>
        <VCardTitle>Cenário do Atendimento</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1">
        <p><strong>Nível de Atenção:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.nivelAtencao }}</p>
        <p><strong>Tipo de Atendimento:</strong> {{ stationData.instrucoesParticipante.cenarioAtendimento?.tipoAtendimento }}</p>
        <div v-if="stationData.instrucoesParticipante.cenarioAtendimento?.infraestruturaUnidade?.length">
          <p class="font-weight-bold text-h6 mb-2 d-flex align-center">
            <VIcon icon="ri-building-2-line" color="primary" class="me-2" size="24" />
            Infraestrutura:
          </p>
          <VCard 
            flat 
            :class="[
              'pa-2 mb-4 infrastructure-card-candidate',
              isDarkTheme ? 'infrastructure-card-candidate--dark' : 'infrastructure-card-candidate--light'
            ]"
          >
            <ul class="tasks-list infra-icons-list pl-2">
              <li v-for="(item, index) in processInfrastructureItems(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade)" 
                  :key="`infra-cand-${index}`"
                  :class="{'sub-item': item.startsWith('- ')}">
                <VIcon 
                  :icon="getInfrastructureIcon(item)" 
                  :color="getInfrastructureColor(item)" 
                  class="me-2" 
                  size="20"
                  :title="item.startsWith('- ') ? item.substring(2) : item"
                />
                <span :data-sub-item="item.startsWith('- ') ? 'true' : 'false'">
                  {{ item.startsWith('- ') ? item.substring(2) : item }}
                </span>
              </li>
            </ul>
          </VCard>
        </div>
      </VCardText>
    </VCard>

    <!-- Card para Descrição do Caso (CANDIDATO) -->
    <VCard 
      :class="[
        'mb-6 case-description-card-candidate',
        isDarkTheme ? 'case-description-card-candidate--dark' : 'case-description-card-candidate--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.descricaoCasoCompleta"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-file-text-line" color="primary" />
        </template>
        <VCardTitle>Descrição do Caso</VCardTitle>
      </VCardItem>
      <VCardText 
        class="case-description-text" 
        v-if="stationData.instrucoesParticipante" 
        v-html="stationData.instrucoesParticipante.descricaoCasoCompleta" 
      />
    </VCard>

    <!-- Card para Tarefas (CANDIDATO) -->
    <VCard 
      :class="[
        'mb-6 tasks-card-candidate',
        isDarkTheme ? 'tasks-card-candidate--dark' : 'tasks-card-candidate--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.tarefasPrincipais?.length"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-task-line" color="success" />
        </template>
        <VCardTitle>Suas Tarefas</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1">
        <ul class="tasks-list pl-5">
          <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" 
              :key="`cand-task-main-${i}`" 
              v-html="tarefa">
          </li>
        </ul>
      </VCardText>
    </VCard>

    <!-- Card para Avisos Importantes (CANDIDATO) -->
    <VCard
      :class="[
        'mb-6 warnings-card-candidate',
        isDarkTheme ? 'warnings-card-candidate--dark' : 'warnings-card-candidate--light'
      ]"
      v-if="stationData.instrucoesParticipante?.avisosImportantes?.length"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-error-warning-line" color="warning" />
        </template>
        <VCardTitle>Avisos Importantes</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1">
        <ul class="warnings-list pl-5">
          <li v-for="(aviso, i) in stationData.instrucoesParticipante.avisosImportantes" 
              :key="`cand-warning-${i}`" 
              class="mb-2">
            {{ aviso }}
          </li>
        </ul>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.candidate-content-panel {
  width: 100%;
}

/* Cards temáticos */
.scenario-card-candidate,
.case-description-card-candidate,
.tasks-card-candidate,
.warnings-card-candidate {
  transition: all 0.2s ease;
}

.scenario-card-candidate--dark,
.case-description-card-candidate--dark,
.tasks-card-candidate--dark,
.warnings-card-candidate--dark {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.scenario-card-candidate--light,
.case-description-card-candidate--light,
.tasks-card-candidate--light,
.warnings-card-candidate--light {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Infrastructure card */
.infrastructure-card-candidate--dark {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.infrastructure-card-candidate--light {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

/* Descrição do Caso - Texto maior */
.case-description-text {
  font-size: 1.125rem !important;
  line-height: 1.7 !important;
  font-weight: 400 !important;
}

.case-description-text p,
.case-description-text div,
.case-description-text span {
  font-size: 1.125rem !important;
  line-height: 1.7 !important;
  margin-bottom: 10px;
}

/* Tarefas do Candidato - Mesmo tamanho da descrição */
.tasks-card-candidate .v-card-text,
.tasks-card-candidate .tasks-list li {
  font-size: 1.125rem !important;
  line-height: 1.7 !important;
}

/* Lists */
.tasks-list,
.warnings-list,
.infra-icons-list {
  list-style: none;
  padding-left: 0;
}

.infra-icons-list li {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.infra-icons-list li.sub-item {
  padding-left: 24px;
  font-size: 0.9em;
}

.tasks-list li,
.warnings-list li {
  margin-bottom: 8px;
  line-height: 1.6;
}
</style>
