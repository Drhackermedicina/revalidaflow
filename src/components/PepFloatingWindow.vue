<template>
  <div class="pep-floating-container" :style="containerStyle" :class="{ 'minimized': isMinimized }">
    <VCard class="pep-floating-window">
     <VCardTitle class="d-flex align-center">
       <VBtn
         icon
         variant="text"
         size="small"
         @click="emit('toggle-minimize')"
         :title="isMinimized ? 'Maximizar PEP' : 'Minimizar PEP'"
         class="me-2"
       >
         <VIcon :icon="isMinimized ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'" />
       </VBtn>
       <span>PEP Flutuante</span>
     </VCardTitle>
      <VCardText v-if="!isMinimized" class="pep-card-text-scroll">
      <VTable class="pep-table">
        <thead>
          <tr>
            <th class="text-left">Item</th>
            <th class="text-center" style="width: 20%;">Marcação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in pepData" :key="item.idItem || `pep-item-${index}`">
            <td>
              <p class="font-weight-bold">
                <span v-if="item.itemNumeroOficial">{{ item.itemNumeroOficial }}. </span>
                {{ item.descricaoItem ? item.descricaoItem.split(':')[0].trim() : 'Item' }}
              </p>
              <div class="text-body-2" v-if="item.descricaoItem && item.descricaoItem.includes(':')">
                <span
                  v-for="(subItem, subIndex) in parseEnumeratedItems(item.descricaoItem)"
                  :key="`sub-item-${item.idItem}-${subIndex}`"
                  class="cursor-pointer"
                  @click="togglePepItemMark(item.idItem, subItem.index)"
                  :class="{ 'orange-text': safeMarkedPepItems?.[item.idItem]?.[subItem.index] }"
                >
                  ({{ subItem.index + 1 }}) <span v-html="formatItemDescriptionForDisplay(subItem.text)"></span>
                </span>
              </div>
            </td>
            <td class="text-center">
              <!-- Não há avaliação aqui, apenas marcação -->
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
    </VCard>
  </div>
</template>

<script setup>
import { toRefs, computed } from 'vue';
import { VCard, VCardTitle, VCardText, VTable, VBtn, VIcon } from 'vuetify/components';
import { parseEnumeratedItems, formatItemDescriptionForDisplay } from '@/utils/simulationUtils';

const props = defineProps({
  pepData: {
    type: Array,
    required: true,
  },
  markedPepItems: {
    type: Object,
    required: true,
  },
  togglePepItemMark: {
    type: Function,
    required: true,
  },
  isMinimized: {
    type: Boolean,
    default: false,
  },
  containerHeight: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['toggle-minimize']);

// Usar toRefs para desestruturar props e manter a reatividade
const { markedPepItems } = toRefs(props);

// Adicionar uma computed property para garantir que markedPepItems seja sempre um objeto válido
const safeMarkedPepItems = computed(() => {
  return markedPepItems.value && typeof markedPepItems.value === 'object' ? markedPepItems.value : {};
});
const containerStyle = computed(() => {
  if (props.containerHeight > 0) {
    return {
      'max-height': `${props.containerHeight - 20}px`,
    };
  }
  return {};
});
</script>

<style scoped>
.pep-floating-container {
 position: absolute;
 top: 10px;
 right: 10px;
 z-index: 1005;
 transition: all 0.3s ease;
 display: flex;
 flex-direction: column;
 /* max-height é agora controlado pelo estilo computado */
}

.pep-floating-window {
  width: 380px;
  border: 1px solid #ccc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
}

.pep-floating-container.minimized {
  max-height: 60px;
}

.pep-floating-container.minimized .pep-floating-window {
  width: 180px;
}

.pep-table {
  width: 100%;
  display: block; /* Garante que a tabela se comporte como um bloco para respeitar max-height */
  max-height: calc(100% - 20px); /* Limita a altura da tabela dentro do VCardText, ajustando para padding */
  overflow-y: auto; /* Adiciona scroll vertical à tabela se o conteúdo exceder a altura */
}

.pep-card-text-scroll {
  max-height: calc(100vh - 150px); /* Ajuste conforme necessário para o cabeçalho e rodapé do VCard */
  overflow-y: auto;
}

.pep-table th, .pep-table td {
  padding: 8px;
  vertical-align: top;
}

.orange-text {
  background-color: rgba(255, 165, 0, 0.2) !important; /* Laranja com 20% de opacidade */
  border-radius: 4px;
  padding: 2px 4px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
