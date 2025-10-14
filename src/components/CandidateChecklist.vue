<script setup>
import { computed } from 'vue'
import { parseEnumeratedItems, formatItemDescriptionForDisplay } from '@/utils/simulationUtils.js'
import { TITLE_INDEX } from '@/composables/useSimulationPEP.js'

const props = defineProps({
  checklistData: { type: Object, default: null },
  simulationStarted: { type: Boolean, default: false },
  simulationEnded: { type: Boolean, default: false },
  simulationWasManuallyEndedEarly: { type: Boolean, default: false },
  isChecklistVisibleForCandidate: { type: Boolean, default: false },
  pepReleasedToCandidate: { type: Boolean, default: false },
  markedPepItems: { type: [Object], default: () => ({}) },
  evaluationScores: { type: Object, default: () => ({}) },
  candidateReceivedScores: { type: Object, default: () => ({}) },
  candidateReceivedTotalScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  evaluationSubmittedByCandidate: { type: Boolean, default: false },
  isActorOrEvaluator: { type: Boolean, default: false },
  isCandidate: { type: Boolean, default: false }
})

const emit = defineEmits([
  'releasePepToCandidate',
  'togglePepItemMark',
  'update:evaluationScores',
  'submitEvaluation'
])

// Normaliza marcações
const marks = computed(() => props.markedPepItems?.value ?? props.markedPepItems ?? {})

// Verifica se item/subitem está marcado
const isMarked = (itemId, subIndex) => {
  const itemMarks = marks.value[itemId]
  if (!itemMarks) return false
  const index = subIndex === -1 ? TITLE_INDEX : subIndex
  return !!itemMarks[index]
}

// Handlers
const handleReleasePepToCandidate = () => emit('releasePepToCandidate')
const handleTogglePepItemMark = (itemId, subIndex) => emit('togglePepItemMark', itemId, subIndex)
const handleEvaluationScoreUpdate = (itemId, score) => emit('update:evaluationScores', { itemId, score })
const handleSubmitEvaluation = () => emit('submitEvaluation')

// Funções de avaliação
const getEvaluationColor = (item, score) => {
  if (item.pontuacoes?.adequado?.pontos === score) return 'success'
  if (item.pontuacoes?.parcialmenteAdequado?.pontos === score) return 'warning'
  if (item.pontuacoes?.inadequado?.pontos === score) return 'error'
  return 'grey'
}

const getEvaluationLabel = (item, score) => {
  if (item.pontuacoes?.adequado?.pontos === score) return 'Adequado'
  if (item.pontuacoes?.parcialmenteAdequado?.pontos === score) return 'Parc. Adequado'
  if (item.pontuacoes?.inadequado?.pontos === score) return 'Inadequado'
  return 'Não avaliado'
}
</script>

<template>
  
  <!-- VISÃO DO AVALIADOR/ATOR -->
  <VCard
    v-if="isActorOrEvaluator && checklistData?.itensAvaliacao?.length > 0"
    :class="[
      'checklist-evaluator-card',
      'mb-6'
    ]"
  >
    <VCardItem>
      <VCardTitle class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon color="black" icon="ri-file-list-3-fill" size="large" class="me-2" />
          Checklist de Avaliação (PEP)
        </div>
      </VCardTitle>
      <!-- Botão centralizado e grande -->
      <div class="pep-liberado-btn-wrapper">
        <VBtn
          color="info"
          @click="handleReleasePepToCandidate"
          :disabled="pepReleasedToCandidate || !simulationEnded"
          variant="tonal"
          size="large"
          class="pep-liberado-btn"
        >
          {{ pepReleasedToCandidate ? 'PEP Liberado' : 'Liberar PEP' }}
        </VBtn>
        <!-- Indicador visual quando o botão está desabilitado -->
        <div v-if="!simulationEnded && !pepReleasedToCandidate" class="mt-2">
          <VChip color="warning" size="small" variant="outlined">
            ⏳ Disponível após encerrar a estação
          </VChip>
        </div>
      </div>
    </VCardItem>
    <VTable class="pep-table">
      <thead>
        <tr>
          <th class="text-left">Item</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in checklistData.itensAvaliacao" :key="item.idItem || `pep-item-${index}`" class="pep-item-row">
          <td class="pep-item-cell">
            <!-- Conteúdo do Item -->
            <div class="d-flex align-center pep-title-wrapper">
              <VIcon
                :icon="isMarked(item.idItem, -1) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                :color="isMarked(item.idItem, -1) ? 'success' : undefined"
                size="small"
                class="me-2 flex-shrink-0"
              />
              <p 
                class="font-weight-bold pep-item-title mb-0"
                :class="{ 'orange-text': isMarked(item.idItem, -1) }"
                @click="handleTogglePepItemMark(item.idItem, -1)"
              >
                <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                {{ item.descricaoItem?.split(':')[0].trim() || 'Item' }}
              </p>
            </div>
            <!-- Apenas a descrição formatada, sem duplicar o título -->
            <div class="text-body-2 pep-item-description" v-if="item.descricaoItem?.includes(':')">
              <div
                v-for="(subItem, subIndex) in parseEnumeratedItems(item.descricaoItem)"
                :key="`sub-item-${item.idItem}-${subIndex}`"
                class="pep-sub-item-wrapper d-flex align-center"
              >
                <VIcon
                  :icon="isMarked(item.idItem, subItem.index) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                  :color="isMarked(item.idItem, subItem.index) ? 'success' : undefined"
                  size="small"
                  class="me-2 flex-shrink-0"
                />
                <span
                  class="pep-sub-item flex-grow-1"
                  :class="{ 'orange-text': isMarked(item.idItem, subItem.index) }"
                  @click="handleTogglePepItemMark(item.idItem, subItem.index)"
                >
                  ({{ subItem.index + 1 }}) <span v-html="formatItemDescriptionForDisplay(subItem.text)"></span>
                </span>
              </div>
            </div>

            <!-- Critérios de Avaliação Integrados - Clicáveis -->
            <div class="criterios-integrados mt-3 mb-4">
              <div 
                v-if="item.pontuacoes?.adequado" 
                :class="{'criterio-item': true, 'criterio-selecionado': evaluationScores[item.idItem] === item.pontuacoes.adequado.pontos, 'mb-2': true, 'cursor-pointer': simulationStarted}"
                @click="simulationStarted && handleEvaluationScoreUpdate(item.idItem, item.pontuacoes.adequado.pontos)"
              >
                <div class="d-flex align-start">
                  <VIcon 
                    :icon="evaluationScores[item.idItem] === item.pontuacoes.adequado.pontos ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'" 
                    color="success" 
                    size="small" 
                    class="me-2 mt-1 flex-shrink-0" 
                  />
                  <div class="flex-grow-1">
                    <div class="font-weight-medium">Adequado ({{ item.pontuacoes.adequado.pontos.toFixed(2) }} pts)</div>
                    <div class="text-caption">{{ item.pontuacoes.adequado.criterio }}</div>
                  </div>
                </div>
              </div>

              <div 
                v-if="item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.criterio && item.pontuacoes.parcialmenteAdequado.criterio.trim() !== '' && item.pontuacoes.parcialmenteAdequado.pontos > 0" 
                :class="{'criterio-item': true, 'criterio-selecionado': evaluationScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos, 'mb-2': true, 'cursor-pointer': simulationStarted}"
                @click="simulationStarted && handleEvaluationScoreUpdate(item.idItem, item.pontuacoes.parcialmenteAdequado.pontos)"
              >
                <div class="d-flex align-start">
                  <VIcon 
                    :icon="evaluationScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos ? 'ri-checkbox-indeterminate-fill' : 'ri-checkbox-blank-circle-line'" 
                    color="warning" 
                    size="small" 
                    class="me-2 mt-1 flex-shrink-0" 
                  />
                  <div class="flex-grow-1">
                    <div class="font-weight-medium">Parcialmente Adequado ({{ item.pontuacoes.parcialmenteAdequado.pontos.toFixed(2) }} pts)</div>
                    <div class="text-caption">{{ item.pontuacoes.parcialmenteAdequado.criterio }}</div>
                  </div>
                </div>
              </div>

              <div 
                v-if="item.pontuacoes?.inadequado" 
                :class="{'criterio-item': true, 'criterio-selecionado': evaluationScores[item.idItem] === item.pontuacoes.inadequado.pontos, 'cursor-pointer': simulationStarted}"
                @click="simulationStarted && handleEvaluationScoreUpdate(item.idItem, item.pontuacoes.inadequado.pontos)"
              >
                <div class="d-flex align-start">
                  <VIcon 
                    :icon="evaluationScores[item.idItem] === item.pontuacoes.inadequado.pontos ? 'ri-close-circle-fill' : 'ri-checkbox-blank-circle-line'" 
                    color="error" 
                    size="small" 
                    class="me-2 mt-1 flex-shrink-0" 
                  />
                  <div class="flex-grow-1">
                    <div class="font-weight-medium">Inadequado ({{ item.pontuacoes.inadequado.pontos.toFixed(2) }} pts)</div>
                    <div class="text-caption">{{ item.pontuacoes.inadequado.criterio }}</div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </VTable>
    <VCardActions class="pa-4">
      <VSpacer />
      <VChip color="primary" size="large" label class="me-2">
        <strong>Nota Total: {{ totalScore.toFixed(2) }}</strong>
      </VChip>
    </VCardActions>
    <VAlert v-if="simulationEnded && simulationWasManuallyEndedEarly" type="warning" density="compact" class="ma-2">
      A estação foi encerrada manualmente. A submissão de nota ainda é permitida, mas o ato fica registrado.
    </VAlert>

    <!-- Feedback da Estação (para ator/avaliador - sempre visível) -->
    <VCardText v-if="checklistData?.feedbackEstacao">
      <VExpansionPanels variant="accordion" class="mt-2">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <div class="d-flex align-center">
              <VIcon icon="ri-information-line" color="info" class="me-2" />
              Feedback Técnico da Estação
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <div v-if="checklistData.feedbackEstacao.resumoTecnico" class="mb-4">
              <h5 class="text-subtitle-1 font-weight-bold mb-2">Resumo Técnico:</h5>
              <p class="text-body-2" v-html="checklistData.feedbackEstacao.resumoTecnico"></p>
            </div>
            <div v-if="checklistData.feedbackEstacao.fontes">
              <h5 class="text-subtitle-1 font-weight-bold mb-2">Fontes:</h5>
              <ul v-if="Array.isArray(checklistData.feedbackEstacao.fontes)" class="text-caption">
                <li v-for="(fonte, index) in checklistData.feedbackEstacao.fontes" :key="index" class="mb-1">
                  {{ fonte }}
                </li>
              </ul>
              <p v-else class="text-caption" v-html="checklistData.feedbackEstacao.fontes"></p>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCardText>
  </VCard>

  <!-- VISÃO DO CANDIDATO -->
  <VCard
    v-if="isCandidate && checklistData?.itensAvaliacao?.length > 0 && isChecklistVisibleForCandidate"
    :class="[
      'mb-6 checklist-candidate-card'
    ]"
  >
    <VCardItem>
      <VCardTitle class="d-flex align-center">
        <!-- Mesmo ícone colorido para o PEP na visão do candidato -->
        <VIcon color="black" icon="ri-file-list-3-fill" size="large" class="me-2" />
        Checklist de Avaliação (PEP)
      </VCardTitle>
    </VCardItem>

    <VTable class="pep-table">
        <thead>
            <tr>
                <th class="text-left">Item</th>
                <th class="text-center" style="width: 20%;">Sua Pontuação</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in checklistData.itensAvaliacao" :key="'cand-chk-' + item.idItem" class="pep-item-row">
                <td class="pep-item-cell">
                  <!-- Conteúdo do Item -->
                  <div class="d-flex align-center pep-title-wrapper">
                    <VIcon
                      :icon="isMarked(item.idItem, -1) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                      :color="isMarked(item.idItem, -1) ? 'success' : undefined"
                      size="small"
                      class="me-2 flex-shrink-0"
                    />
                    <p 
                      class="font-weight-bold pep-item-title mb-0"
                      :class="{ 'orange-text': isMarked(item.idItem, -1) }"
                      @click="handleTogglePepItemMark(item.idItem, -1)"
                    >
                      <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                      {{ item.descricaoItem?.split(':')[0].trim() || 'Item' }}
                    </p>
                  </div>
                  <!-- Apenas a descrição formatada, sem duplicar o título -->
                  <div class="text-body-2" v-if="item.descricaoItem && item.descricaoItem.includes(':')" v-html="formatItemDescriptionForDisplay(item.descricaoItem, item.descricaoItem.split(':')[0].trim())" />

                  <!-- Critérios de Avaliação Integrados para o Candidato -->
                  <div class="criterios-integrados mt-3 mb-4">
                    <div v-if="item.pontuacoes?.adequado"
                      :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.adequado.pontos, 'mb-2': true}">
                      <div class="d-flex align-start">
                        <VIcon
                          :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.adequado.pontos ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                          color="success"
                          size="small"
                          class="me-2 mt-1 flex-shrink-0"
                        />
                        <div class="flex-grow-1">
                          <div class="font-weight-medium">Adequado ({{ item.pontuacoes.adequado.pontos.toFixed(2) }} pts)</div>
                          <div class="text-caption">{{ item.pontuacoes.adequado.criterio }}</div>
                        </div>
                      </div>
                    </div>

                    <div v-if="item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.criterio && item.pontuacoes.parcialmenteAdequado.criterio.trim() !== '' && item.pontuacoes.parcialmenteAdequado.pontos > 0"
                      :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos, 'mb-2': true}">
                      <div class="d-flex align-start">
                        <VIcon
                          :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.parcialmenteAdequado.pontos ? 'ri-checkbox-indeterminate-fill' : 'ri-checkbox-blank-circle-line'"
                          color="warning"
                          size="small"
                          class="me-2 mt-1 flex-shrink-0"
                        />
                        <div class="flex-grow-1">
                          <div class="font-weight-medium">Parcialmente Adequado ({{ item.pontuacoes.parcialmenteAdequado.pontos.toFixed(2) }} pts)</div>
                          <div class="text-caption">{{ item.pontuacoes.parcialmenteAdequado.criterio }}</div>
                        </div>
                      </div>
                    </div>

                    <div v-if="item.pontuacoes?.inadequado"
                      :class="{'criterio-item': true, 'criterio-selecionado': candidateReceivedScores[item.idItem] === item.pontuacoes.inadequado.pontos}">
                      <div class="d-flex align-start">
                        <VIcon
                          :icon="candidateReceivedScores[item.idItem] === item.pontuacoes.inadequado.pontos ? 'ri-close-circle-fill' : 'ri-checkbox-blank-circle-line'"
                          color="error"
                          size="small"
                          class="me-2 mt-1 flex-shrink-0"
                        />
                        <div class="flex-grow-1">
                          <div class="font-weight-medium">Inadequado ({{ item.pontuacoes.inadequado.pontos.toFixed(2) }} pts)</div>
                          <div class="text-caption">{{ item.pontuacoes.inadequado.criterio }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-center">
                  <!-- Visualização da pontuação do candidato -->
                  <div v-if="candidateReceivedScores[item.idItem] !== undefined">
                    <VChip
                      :color="getEvaluationColor(item, candidateReceivedScores[item.idItem])"
                      variant="tonal"
                      class="mb-1"
                    >
                      {{ getEvaluationLabel(item, candidateReceivedScores[item.idItem]) }}
                    </VChip>
                    <div class="text-caption mt-1">{{ parseFloat(candidateReceivedScores[item.idItem]).toFixed(2) }} pts</div>
                  </div>
                  <VChip v-else color="grey-lighten-1" variant="tonal">Não avaliado</VChip>
                </td>
            </tr>
        </tbody>
    </VTable>

    <!-- Botão de submissão para candidato -->
    <VCardActions v-if="simulationEnded && !evaluationSubmittedByCandidate" class="pa-4">
      <VSpacer />
      <VBtn
        color="primary"
        @click="handleSubmitEvaluation"
        :disabled="simulationWasManuallyEndedEarly"
      >
        Submeter Avaliação Final
      </VBtn>
    </VCardActions>

    <!-- Resumo da nota total - movido para o final -->
    <VCardText v-if="candidateReceivedTotalScore > 0" class="pt-4">
      <VAlert
        variant="tonal"
        :color="candidateReceivedTotalScore >= 7 ? 'success' : candidateReceivedTotalScore >= 5 ? 'warning' : 'error'"
        class="mb-4"
      >
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-h6 mb-1">Sua nota final</div>
            <div class="text-body-2">
              {{ candidateReceivedTotalScore >= 7 ? 'Parabéns!' : candidateReceivedTotalScore >= 5 ? 'Satisfatório' : 'Precisa melhorar' }}
            </div>
          </div>
          <div class="text-h4 font-weight-bold">
            {{ candidateReceivedTotalScore.toFixed(2) }}
          </div>
        </div>
      </VAlert>
    </VCardText>

    <!-- Feedback da Estação (para o candidato - só após término) -->
    <VCardText v-if="checklistData?.feedbackEstacao && simulationEnded">
      <VExpansionPanels variant="accordion" class="mt-2">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <div class="d-flex align-center">
              <VIcon icon="ri-information-line" color="info" class="me-2" />
              Feedback Técnico da Estação
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <div v-if="checklistData.feedbackEstacao.resumoTecnico" class="mb-4">
              <h5 class="text-subtitle-1 font-weight-bold mb-2">Resumo Técnico:</h5>
              <p class="text-body-2" v-html="checklistData.feedbackEstacao.resumoTecnico"></p>
            </div>
            <div v-if="checklistData.feedbackEstacao.fontes">
              <h5 class="text-subtitle-1 font-weight-bold mb-2">Fontes:</h5>
              <ul v-if="Array.isArray(checklistData.feedbackEstacao.fontes)" class="text-caption">
                <li v-for="(fonte, index) in checklistData.feedbackEstacao.fontes" :key="index" class="mb-1">
                  {{ fonte }}
                </li>
              </ul>
              <p v-else class="text-caption" v-html="checklistData.feedbackEstacao.fontes"></p>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCardText>
  </VCard>

  <!-- Card separado para mostrar a nota mesmo sem o checklist visível -->
  <VCard
    v-if="isCandidate && simulationEnded && candidateReceivedTotalScore > 0 && !isChecklistVisibleForCandidate"
    :class="[
      'mb-6 score-card'
    ]"
  >
    <VCardText class="pt-4">
      <VAlert
        variant="tonal"
        :color="candidateReceivedTotalScore >= 7 ? 'success' : candidateReceivedTotalScore >= 5 ? 'warning' : 'error'"
        class="mb-4"
      >
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-h6 mb-1">Sua nota final</div>
            <div class="text-body-2">
              {{ candidateReceivedTotalScore >= 7 ? 'Parabéns!' : candidateReceivedTotalScore >= 5 ? 'Satisfatório' : 'Precisa melhorar' }}
            </div>
          </div>
          <div class="text-h4 font-weight-bold">
            {{ candidateReceivedTotalScore.toFixed(2) }}
          </div>
        </div>
      </VAlert>
    </VCardText>
  </VCard>
</template>

<style scoped>
.checklist-evaluator-card,
.checklist-candidate-card,
.score-card {
  border: 2px solid rgb(var(--v-theme-surface-variant));
}

.pep-liberado-btn-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pep-liberado-btn {
  min-width: 200px;
}

.pep-item-row {
  border-bottom: 2px solid rgba(var(--v-theme-surface-variant), 0.15);
  transition: background-color 0.2s ease;
}

.pep-item-row:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.02);
}

.pep-item-row:last-child {
  border-bottom: none;
}

.pep-item-cell {
  padding: 24px 16px !important;
  vertical-align: top;
}

.criterios-integrados {
  margin-top: 16px;
  margin-bottom: 8px;
  padding-bottom: 8px;
}

.criterio-item {
  padding: 12px;
  border-radius: 6px;
  background-color: rgba(var(--v-theme-surface-variant), 0.08);
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.2);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.criterio-item.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.criterio-item.cursor-pointer:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.2);
  transform: translateX(2px);
}

.criterio-selecionado {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px !important;
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.25) !important;
  transform: scale(1.02);
}

.pep-item-description {
  margin-top: 8px;
  margin-bottom: 4px;
  line-height: 1.5;
  font-size: 1.05rem;
}

.pep-title-wrapper,
.pep-sub-item-wrapper {
  padding: 2px 0;
  margin-bottom: 2px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 1.05rem;
  line-height: 1.4;
}

.pep-sub-item-wrapper {
  padding: 2px 12px;
  margin-bottom: 2px;
}

.pep-title-wrapper:hover,
.pep-sub-item-wrapper:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}

.pep-item-title,
.pep-sub-item {
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;
}

.pep-item-title {
  flex-grow: 1;
}

.pep-sub-item {
  display: inline;
}

.pep-item-title:hover,
.pep-sub-item:hover {
  opacity: 0.8;
}

.orange-text {
  color: #ff9800 !important;
  font-weight: 500;
}
</style>
