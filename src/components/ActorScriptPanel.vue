<script setup>
import { computed } from 'vue'
import PepSideView from '@/components/PepSideView.vue'
import {
  formatActorText,
  formatIdentificacaoPaciente,
  processInfrastructureItems,
  getInfrastructureIcon,
  getInfrastructureColor,
  splitIntoParagraphs
} from '@/utils/simulationUtils.js'
import { memoize } from '@/utils/memoization.js'

// Props
const props = defineProps({
  stationData: { type: Object, required: true },
  isDarkTheme: { type: Boolean, default: false },
  isActorOrEvaluator: { type: Boolean, required: true },
  checklistData: { type: Object, default: null },
  pepViewState: { type: Object, required: true },
  markedPepItems: { type: Object, required: true },
  markedScriptContexts: { type: Object, required: true },
  markedParagraphs: { type: Object, required: true },
  actorVisibleImpressoContent: { type: Object, required: true },
  actorReleasedImpressoIds: { type: Object, required: true },
  getImageSource: { type: Function, required: true },
  getImageId: { type: Function, required: true },
  handleImageError: { type: Function, required: true },
  handleImageLoad: { type: Function, required: true },
  isParagraphMarked: { type: Function, required: true }
})

// Emits
const emit = defineEmits([
  'toggle-pep-view',
  'toggle-script-context',
  'toggle-paragraph-mark',
  'toggle-pep-item-mark',
  'toggle-actor-impresso-visibility',
  'release-data',
  'open-image-zoom'
])

// Funções memoizadas
const memoizedFormatActorText = memoize(formatActorText)
const memoizedFormatIdentificacaoPaciente = memoize(formatIdentificacaoPaciente)

// Função para processar roteiro do ator
const processRoteiroActor = (text) => {
  if (!text) return ''
  return formatActorText(text, props.isActorOrEvaluator)
}

// Funções delegadas para o componente pai
const togglePepViewHandler = () => {
  props.pepViewState.isVisible = !props.pepViewState.isVisible
}

const debouncedToggleScriptContext = (idx, e) => {
  emit('toggle-script-context', idx, e)
}

const debouncedToggleParagraphMark = (idx, pIdx, e) => {
  emit('toggle-paragraph-mark', idx, pIdx, e)
}

const togglePepItemMark = (itemId, subIndex) => {
  emit('toggle-pep-item-mark', itemId, subIndex)
}

const toggleActorImpressoVisibility = (id) => {
  emit('toggle-actor-impresso-visibility', id)
}

const releaseData = (id) => {
  emit('release-data', id)
}

const openImageZoom = (src, title) => {
  emit('open-image-zoom', src, title)
}
</script>

<template>
  <div class="actor-script-panel">
    <!-- Card para Cenário -->
    <VCard 
      :class="[
        'mb-6 scenario-card',
        isDarkTheme ? 'scenario-card--dark' : 'scenario-card--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.cenarioAtendimento"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-hospital-line" color="info" />
        </template>
        <VCardTitle>Cenário do Atendimento</VCardTitle>
      </VCardItem>
      <VCardText v-if="stationData.instrucoesParticipante" class="text-body-1">
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
              'pa-2 mb-4 infrastructure-card',
              isDarkTheme ? 'infrastructure-card--dark' : 'infrastructure-card--light'
            ]"
          >
            <ul class="tasks-list infra-icons-list pl-2">
              <li v-for="(item, index) in processInfrastructureItems(stationData.instrucoesParticipante.cenarioAtendimento.infraestruturaUnidade)" 
                  :key="`infra-actor-${index}`"
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

    <!-- Card para Descrição do Caso -->
    <VCard 
      :class="[
        'mb-6 case-description-card',
        isDarkTheme ? 'case-description-card--dark' : 'case-description-card--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.descricaoCasoCompleta"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-file-text-line" color="primary" />
        </template>
        <VCardTitle>Descrição do Caso</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1" v-html="stationData.instrucoesParticipante.descricaoCasoCompleta" />
    </VCard>

    <!-- Card para Tarefas -->
    <VCard 
      :class="[
        'mb-6 tasks-card',
        isDarkTheme ? 'tasks-card--dark' : 'tasks-card--light'
      ]" 
      v-if="stationData.instrucoesParticipante?.tarefasPrincipais?.length"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-task-line" color="success" />
        </template>
        <VCardTitle>Tarefas do Candidato</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1">
        <ul class="tasks-list pl-5">
          <li v-for="(tarefa, i) in stationData.instrucoesParticipante.tarefasPrincipais" :key="`actor-task-${i}`" v-html="tarefa"></li>
        </ul>
      </VCardText>
    </VCard>

    <!-- Card para Avisos Importantes -->
    <VCard
      :class="[
        'mb-6 warnings-card',
        isDarkTheme ? 'warnings-card--dark' : 'warnings-card--light'
      ]"
      v-if="stationData.instrucoesParticipante?.avisosImportantes?.length"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-error-warning-line" color="warning" />
        </template>
        <VCardTitle>Avisos Importantes para o Candidato</VCardTitle>
      </VCardItem>
      <VCardText class="text-body-1">
        <ul class="warnings-list pl-5">
          <li v-for="(aviso, i) in stationData.instrucoesParticipante.avisosImportantes" :key="`actor-warning-${i}`" class="mb-2">
            {{ aviso }}
          </li>
        </ul>
      </VCardText>
    </VCard>

    <!-- Card para Roteiro / Informações Verbais do Ator -->
    <VCard
      id="roteiro-card"
      :class="[
        'mb-6 script-card',
        isDarkTheme ? 'script-card--dark' : 'script-card--light'
      ]"
      v-if="stationData?.materiaisDisponiveis?.informacoesVerbaisSimulado && stationData.materiaisDisponiveis.informacoesVerbaisSimulado.length > 0"
      style="display: flex; flex-direction: column;"
    >
      <VCardItem>
        <template #prepend>
          <VIcon icon="ri-chat-quote-line" color="warning" />
        </template>
        <VCardTitle class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            Roteiro / Informações a Fornecer
            <VChip size="small" color="warning" variant="outlined" class="ms-2">
              Se perguntado pelo candidato
            </VChip>
            <VBtn
              icon
              variant="text"
              size="large"
              class="ms-3 pep-eye-button"
              @click="togglePepViewHandler"
              :title="pepViewState.isVisible ? 'Ocultar PEP' : 'Mostrar PEP'"
            >
              <VIcon 
                :icon="pepViewState.isVisible ? 'ri-eye-off-line' : 'ri-eye-line'" 
                size="24"
              />
            </VBtn>
          </div>
        </VCardTitle>
      </VCardItem>
      <div class="d-flex flex-grow-1" :class="{ 'flex-column flex-md-row': pepViewState.isVisible }" style="flex: 1;">
        <VCardText
          class="text-body-1"
          :class="{
            'flex-grow-1': true,
            'w-100': !pepViewState.isVisible,
            'w-50': pepViewState.isVisible,
            'pep-split-view-border-right': pepViewState.isVisible
          }"
        >
          <ul class="roteiro-list pa-0" style="list-style: none;">
            <li v-for="(info, idx) in stationData.materiaisDisponiveis.informacoesVerbaisSimulado"
                :key="'script-' + idx"
                class="mb-1 pa-1">
              <!-- Título/Contexto (apenas display, sem marcação) -->
              <div class="context-wrapper">
                <span
                  class="uppercase-title"
                  v-html="processRoteiroActor(info.contextoOuPerguntaChave)">
                </span>
              </div>
              
              <!-- Cada parágrafo do conteúdo com marcação independente -->
              <div class="mt-0 pa-1 border-s-2" style="border-left: 3px solid rgba(var(--v-theme-outline), 0.3);">
                <!-- Tratamento especial para IDENTIFICAÇÃO DO PACIENTE -->
                <div v-if="info.contextoOuPerguntaChave.toUpperCase().includes('IDENTIFICAÇÃO DO PACIENTE')"
                      class="paragraph-item cursor-pointer">
                  <span
                    :class="{
                      'marked-warning': isParagraphMarked(idx, 0)
                    }"
                    @click="(e) => debouncedToggleParagraphMark(idx, 0, e)"
                    v-html="memoizedFormatIdentificacaoPaciente(info.informacao, info.contextoOuPerguntaChave)">
                  </span>
                </div>
                
                <!-- Tratamento padrão para outras informações verbais -->
                <div v-else
                      v-for="(paragraph, pIdx) in splitIntoParagraphs(info.informacao)"
                      :key="`paragraph-${idx}-${pIdx}`"
                      class="paragraph-item cursor-pointer">
                  <span
                    :class="{
                      'marked-warning': isParagraphMarked(idx, pIdx)
                    }"
                    @click="(e) => debouncedToggleParagraphMark(idx, pIdx, e)"
                    v-html="processRoteiroActor(paragraph)">
                  </span>
                </div>
              </div>
            </li>
          </ul>
        </VCardText>
        <PepSideView
          v-if="pepViewState.isVisible"
          :pep-data="checklistData?.itensAvaliacao"
          :marked-pep-items="markedPepItems"
          :toggle-pep-item-mark="togglePepItemMark"
          :class="{
            'w-100': !pepViewState.isVisible,
            'w-50': pepViewState.isVisible,
            'pep-side-view-card': true
          }"
        />
      </div>
    </VCard>

    <!-- Card para Impressos -->
    <VCard
      id="impressos-card"
      :class="[
        'mb-6 impressos-actor-card',
        isDarkTheme ? 'impressos-actor-card--dark' : 'impressos-actor-card--light'
      ]"
      v-if="isActorOrEvaluator && stationData?.materiaisDisponiveis?.impressos?.length > 0"
    >
      <VCardTitle>IMPRESSOS</VCardTitle>
      <VCardText>
        <div v-for="impresso in stationData.materiaisDisponiveis.impressos" :key="impresso.idImpresso" class="impresso-control-item">
          <div class="d-flex align-center gap-2 flex-wrap">
            <VBtn
              @click="toggleActorImpressoVisibility(impresso.idImpresso)"
              :color="actorVisibleImpressoContent[impresso.idImpresso] ? 'primary' : 'info'"
              :prepend-icon="actorVisibleImpressoContent[impresso.idImpresso] ? 'ri-eye-off-line' : 'ri-eye-line'"
              class="impresso-btn"
            >
              {{ impresso.tituloImpresso }}
            </VBtn>
            <VBtn icon variant="tonal" size="small" @click="releaseData(impresso.idImpresso)" :disabled="!!actorReleasedImpressoIds[impresso.idImpresso]">
              <VIcon :icon="!!actorReleasedImpressoIds[impresso.idImpresso] ? 'ri-lock-unlock-line' : 'ri-lock-line'" />
            </VBtn>
          </div>
          <VExpandTransition>
            <div v-if="actorVisibleImpressoContent[impresso.idImpresso]" class="mt-2 pa-3 border rounded bg-grey-lighten-4">
              <div v-if="impresso.tipoConteudo === 'texto_simples'" v-html="impresso.conteudo.texto" />
              <div v-else-if="impresso.tipoConteudo === 'imagem_com_texto'">
                <p v-if="impresso.conteudo.textoDescritivo" v-html="impresso.conteudo.textoDescritivo"></p>
                <img 
                  v-if="impresso.conteudo.caminhoImagem" 
                  :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto'))" 
                  :alt="impresso.tituloImpresso" 
                  class="impresso-imagem impresso-imagem-clickable"
                  @click="openImageZoom(getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto')), impresso.tituloImpresso)"
                  @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-texto'))"
                  @load="handleImageLoad(getImageId(impresso.idImpresso, 'actor-img-texto'))"
                />
                <p v-if="impresso.conteudo.legendaImagem"><em>{{ impresso.conteudo.legendaImagem }}</em></p>
                <div v-if="impresso.conteudo.laudo" class="laudo-impresso"><pre>{{ impresso.conteudo.laudo }}</pre></div>
              </div>
              <div v-else-if="impresso.tipoConteudo === 'lista_chave_valor_secoes'" class="mt-4">
                <div v-for="(secao, idxS) in impresso.conteudo.secoes" :key="`actor-prev-sec-${impresso.idImpresso}-${idxS}`" class="secao-impressos">
                  <VDivider v-if="idxS > 0" class="my-4" />
                  <div v-if="secao.tituloSecao" class="secao-titulo">
                    <!-- Ícone removido conforme solicitação -->
                    <h6 class="text-h6 font-weight-bold mb-0">{{ secao.tituloSecao }}</h6>
                  </div>
                  <div class="chave-valor-list">
                    <!-- Filtra itens que não sejam duplicações do título da seção -->
                    <div v-for="(itemSec, idxI) in (secao.itens || []).filter(item => {
                      if (!item.chave || !secao.tituloSecao) return true;
                      const tituloNormalizado = secao.tituloSecao.trim().toLowerCase();
                      const chaveNormalizada = item.chave.trim().toLowerCase();
                      return chaveNormalizada !== tituloNormalizado;
                    })" :key="`actor-prev-item-${impresso.idImpresso}-${idxS}-${idxI}`" class="chave-valor-item">
                      <strong>{{ itemSec.chave }}:</strong> <span v-html="itemSec.valor"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else-if="impresso.tipoConteudo === 'tabela_objetos'">
                <VTable>
                  <thead>
                    <tr><th v-for="cab in impresso.conteudo.cabecalhos" :key="`actor-prev-th-${cab.key}`">{{ cab.label }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(linha, idxL) in impresso.conteudo.linhas" :key="`actor-prev-lin-${impresso.idImpresso}-${idxL}`">
                      <td v-for="cab in impresso.conteudo.cabecalhos" :key="`actor-prev-cel-${impresso.idImpresso}-${idxL}-${cab.key}`" v-html="linha[cab.key]"></td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
              <div v-else-if="impresso.tipoConteudo === 'imagem_descritiva'">
                <p v-if="impresso.conteudo.descricao" v-html="impresso.conteudo.descricao"></p>
                <img 
                  v-if="impresso.conteudo.caminhoImagem" 
                  :src="getImageSource(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-desc'))" 
                  :alt="impresso.tituloImpresso" 
                  class="impresso-imagem"
                  @error="handleImageError(impresso.conteudo.caminhoImagem, getImageId(impresso.idImpresso, 'actor-img-desc'))"
                  @load="handleImageLoad(getImageId(impresso.idImpresso, 'actor-img-desc'))"
                />
              </div>
              <pre v-else>{{ impresso.conteudo }}</pre>
            </div>
          </VExpandTransition>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.actor-script-panel {
  width: 100%;
}

/* Cards temáticos */
.scenario-card,
.case-description-card,
.tasks-card,
.warnings-card,
.script-card,
.impressos-actor-card {
  transition: all 0.2s ease;
}

/* Descrição do Caso do Ator - Texto maior */
.case-description-card .v-card-text,
.case-description-card p,
.case-description-card div {
  font-size: 1.125rem !important;
  line-height: 1.7 !important;
}

/* Tarefas do Ator - Mesmo tamanho da descrição */
.tasks-card .v-card-text,
.tasks-card .tasks-list li {
  font-size: 1.125rem !important;
  line-height: 1.7 !important;
}

.scenario-card--dark,
.case-description-card--dark,
.tasks-card--dark,
.warnings-card--dark,
.script-card--dark,
.impressos-actor-card--dark {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.scenario-card--light,
.case-description-card--light,
.tasks-card--light,
.warnings-card--light,
.script-card--light,
.impressos-actor-card--light {
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Infrastructure card */
.infrastructure-card--dark {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
}

.infrastructure-card--light {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
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

/* Roteiro styles */
.roteiro-list {
  list-style: none;
}

.context-wrapper {
  display: block;
  padding: 2px 4px;
  margin-bottom: 0px;
}

.uppercase-title {
  text-transform: uppercase;
  color: rgba(var(--v-theme-primary), 1);
  font-size: 1.125rem;
  font-weight: 600;
  display: block;
}

.paragraph-item {
  margin-bottom: 0px;
  padding: 0px 2px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 1.125rem;
  line-height: 1.2;
}

.paragraph-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}

.marked-warning {
  background-color: rgba(var(--v-theme-warning), 0.2) !important;
  color: rgba(var(--v-theme-warning-darken-2), 1) !important;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

/* PEP Split View */
.pep-split-view-border-right {
  border-right: 2px solid rgba(var(--v-theme-surface-variant), 0.2);
  padding-right: 16px;
}

.pep-side-view-card {
  overflow-y: auto;
  max-height: 800px;
}

.pep-eye-button {
  transition: transform 0.2s ease;
}

.pep-eye-button:hover {
  transform: scale(1.1);
}

/* Impressos */
.impresso-control-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}

.impresso-btn {
  text-transform: none;
  font-weight: 500;
}

.impresso-imagem {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
}

.impresso-imagem-clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.impresso-imagem-clickable:hover {
  transform: scale(1.02);
}

.laudo-impresso {
  margin-top: 12px;
  padding: 12px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 4px;
}

.laudo-impresso pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.9em;
  line-height: 1.5;
}

.chave-valor-list {
  margin-top: 8px;
}

.chave-valor-item {
  padding: 6px 0;
  line-height: 1.6;
}

</style>
