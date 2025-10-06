<script setup>
import { computed } from 'vue'
import { parseEnumeratedItems, formatItemDescriptionForDisplay } from '@/utils/simulationUtils.ts'
import { TITLE_INDEX } from '@/composables/useSimulationPEP.ts'

const props = defineProps({
  pepData: { type: Array, required: true },
  markedPepItems: { type: [Object], required: true },
  togglePepItemMark: { type: Function, required: true }
})

// Normaliza acesso (suporta ref ou objeto)
const marks = computed(() => props.markedPepItems?.value ?? props.markedPepItems ?? {})

// Verifica se item/subitem está marcado
const isMarked = (item, subIndex = null) => {
  const id = item.idItem ?? item.id
  const itemMarks = marks.value[id]
  if (!itemMarks) return false
  
  if (subIndex === null) return itemMarks.some(Boolean)
  const index = subIndex === -1 ? TITLE_INDEX : subIndex
  return !!itemMarks[index]
}

// Handler de clique
const handleClick = (item, subIndex = 0) => {
  props.togglePepItemMark?.(item.idItem ?? item.id, subIndex)
}
</script>

<template>
  <VCard class="pep-side-view">
    <VCardTitle>PEP - Checklist</VCardTitle>
    <VCardText>
      <VList dense>
        <div
          v-for="(item, index) in pepData"
          :key="item.idItem ?? item.id ?? index"
          class="pep-group"
          :class="{ 'pep-group-divider': index !== pepData.length - 1 }"
        >
          <!-- Título -->
          <VListItem class="pep-item pa-0">
            <div class="d-flex align-start w-100 px-4 py-2">
              <VIcon 
                :icon="isMarked(item, -1) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                :color="isMarked(item, -1) ? 'success' : undefined"
                size="20"
                class="pep-icon me-2 flex-shrink-0"
              />
              <VListItemTitle 
                class="pep-item-title flex-grow-1"
                :class="{ 'orange-text': isMarked(item, -1) }"
                @click="() => handleClick(item, -1)"
              >
                {{ (item.itemNumeroOficial ? item.itemNumeroOficial + '. ' : '') + 
                   (item.descricaoItem?.split(':')[0].trim() || item.titulo || item.action || `Item ${index + 1}`) }}
              </VListItemTitle>
            </div>
          </VListItem>

          <!-- Subitens -->
          <div v-if="item.descricaoItem?.includes('(')" class="pep-subitems">
            <div
              v-for="sub in parseEnumeratedItems(item.descricaoItem)"
              :key="`sub-${item.idItem ?? item.id}-${sub.index}`"
              class="pep-subitem d-flex align-start"
            >
              <VIcon 
                :icon="isMarked(item, sub.index) ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"
                :color="isMarked(item, sub.index) ? 'success' : undefined"
                size="20"
                class="pep-icon me-2 flex-shrink-0"
              />
              <div
                class="pep-subitem-text flex-grow-1"
                :class="{ 'orange-text': isMarked(item, sub.index) }"
                @click="() => handleClick(item, sub.index)"
              >
                <span class="pep-subitem-index">({{ sub.index + 1 }})</span>
                <span v-html="formatItemDescriptionForDisplay(sub.text, item.descricaoItem.split(':')[0] || '')"></span>
              </div>
            </div>
          </div>
        </div>
      </VList>
    </VCardText>
  </VCard>
</template>

<style scoped>
.pep-side-view {
  max-height: 100%;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.04);
}

.pep-item {
  cursor: default;
}

.pep-item-title {
  cursor: pointer;
  user-select: none;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}

.pep-subitems {
  padding: 0 8px;
}

.pep-subitem {
  padding: 6px 12px;
  min-height: 32px;
  line-height: 1.6 !important;
}

.pep-subitem-text {
  line-height: 1.6 !important;
  cursor: pointer;
  user-select: none;
}

.pep-subitem-index {
  margin-right: 6px;
  color: rgba(var(--v-theme-on-background), 0.6);
  flex-shrink: 0;
}

.pep-icon {
  flex-shrink: 0 !important;
  width: 20px !important;
  height: 20px !important;
  position: relative;
  top: 3px;
}

.pep-group {
  padding-bottom: 8px;
}

.pep-group-divider {
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 6px;
}

.orange-text {
  background-color: rgba(255, 165, 0, 0.15) !important;
  border-radius: 4px;
  padding: 2px 6px;
  color: rgba(255, 140, 0, 0.95) !important;
}

/* Tema escuro/claro */
:deep(.v-theme--light) .pep-side-view {
  border-color: rgba(0,0,0,0.08) !important;
}

:deep(.v-theme--dark) .pep-side-view {
  border-color: rgba(255,255,255,0.06) !important;
}

:deep(.v-theme--light) .pep-group-divider {
  border-bottom-color: rgba(0,0,0,0.08) !important;
}

:deep(.v-theme--dark) .pep-group-divider {
  border-bottom-color: rgba(255,255,255,0.06) !important;
}
</style>
