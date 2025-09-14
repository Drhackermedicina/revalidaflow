<script setup>
import { computed } from 'vue';
import { parseEnumeratedItems, formatItemDescriptionForDisplay } from '@/utils/simulationUtils.ts';

const props = defineProps({
  pepData: {
    type: Array,
    required: true,
  },
  // markedPepItems pode ser um ref ou um objeto simples
  markedPepItems: {
    type: [Object],
    required: true,
  },
  togglePepItemMark: {
    type: Function,
    required: true,
  },
});

// Normaliza acesso ao objeto de marcações (suporta ref ou objeto)
const normalizedMarks = computed(() => {
  return props.markedPepItems?.value ?? props.markedPepItems ?? {};
});

function itemMarked(item, subIndex = null) {
  const id = item.idItem ?? item.id;
  const marks = normalizedMarks.value[id];
  if (!marks) return false;
  if (subIndex === null) {
    // se algum subitem estiver marcado, considera o item marcado
    if (Array.isArray(marks)) return marks.some(Boolean);
    return Boolean(marks);
  }
  return Array.isArray(marks) && !!marks[subIndex];
}

function handleClick(item, subIndex = 0) {
  const id = item.idItem ?? item.id;
  props.togglePepItemMark?.(id, subIndex);
}
</script>

<template>
  <VCard class="pep-side-view">
    <VCardTitle>
      PEP - Checklist
    </VCardTitle>
    <VCardText>
      <VList dense>
        <div
          v-for="(item, index) in pepData"
          :key="item.idItem ?? item.id ?? index"
          class="pep-group"
          :data-group-index="index"
          :class="{ 'pep-group-divider': index !== (pepData.length - 1) }"
        >
          <VListItem class="pep-item">
            <VListItemTitle class="pep-item-title">
              {{ (item.itemNumeroOficial ? item.itemNumeroOficial + '. ' : '') + (item.descricaoItem ? item.descricaoItem.split(':')[0].trim() : (item.titulo || item.action || `Item ${index + 1}`)) }}
            </VListItemTitle>
          </VListItem>

          <!-- Renderiza subitens enumerados, se houver -->
          <div v-if="item.descricaoItem && item.descricaoItem.includes('(')" class="pep-subitems">
            <div
              v-for="sub in parseEnumeratedItems(item.descricaoItem)"
              :key="`sub-${item.idItem ?? item.id}-${sub.index}`"
              class="pep-subitem d-flex align-center justify-space-between"
            >
              <div
                class="pep-subitem-text cursor-pointer"
                @click="() => handleClick(item, sub.index)"
                :class="{ 'orange-text': itemMarked(item, sub.index) }"
              >
                <span class="pep-subitem-index">({{ sub.index + 1 }})</span>
                <span v-html="formatItemDescriptionForDisplay(sub.text, item.descricaoItem.split(':')[0] || '')"></span>
              </div>
              <div class="pep-subitem-bullet">
                <VIcon v-if="itemMarked(item, sub.index)" color="success" icon="ri-checkbox-circle-fill" />
                <VIcon v-else icon="ri-checkbox-blank-circle-line" />
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
  max-height: 100%; /* Garante que o scroll funcione dentro do contêiner pai */
  overflow-y: auto; /* Mantém o comportamento de scroll dentro do cartão */
  /* Fallback neutro — borda reforçada por tema abaixo */
  border: 1px solid rgba(0,0,0,0.04);
  background-clip: padding-box;
}

.pep-item {
  cursor: default;
  padding: 8px 12px;
  transition: background-color 0.2s;
}

.pep-item:hover {
  background-color: transparent; /* não destacar o título */
}

/* Grupo que contém título + subitens; aplicamos divisor após o grupo, exceto no último */
.pep-group {
  padding-bottom: 4px;
}
.pep-group-divider {
  /* Fallback leve — regras por tema abaixo garantem visibilidade */
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 6px; /* afasta o próximo grupo para tornar a divisória mais perceptível */
}

.pep-group {
  padding-bottom: 8px; /* aumenta o espaçamento interno entre título+subitens e o divisor */
}

/* Forçar bordas/divisórias visíveis por tema (cores explícitas) */
:deep(.v-theme--light) .pep-side-view {
  border: 1.6px solid rgba(0,0,0,0.08) !important;
}
:deep(.v-theme--dark) .pep-side-view {
  border: 1.6px solid rgba(255,255,255,0.06) !important;
}
:deep(.v-theme--light) .pep-side-view .pep-group-divider {
  border-bottom: 1.4px solid rgba(0,0,0,0.08) !important;
}
:deep(.v-theme--dark) .pep-side-view .pep-group-divider {
  border-bottom: 1.4px solid rgba(255,255,255,0.06) !important;
}

.item-marked {
  background-color: #e0f7fa; /* Um azul claro para indicar que está marcado */
  font-weight: bold;
}

/* Estilo fraco laranja para subitens marcados, espelhando o PEP pai */
.orange-text {
  background-color: rgba(255, 165, 0, 0.15) !important;
  border-radius: 4px;
  padding: 2px 6px;
  color: rgba(255, 140, 0, 0.95) !important;
}

/* Quebra de linha para textos longos e formatação do subitem */
.pep-subitem-text,
.pep-item-title {
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  display: block;
}

.pep-subitem-index {
  margin-right: 6px;
  color: rgba(var(--v-theme-on-background), 0.6);
}
</style>
