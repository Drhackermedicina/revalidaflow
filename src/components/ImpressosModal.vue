<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  stationData: {
    type: Object,
    default: () => ({})
  },
  actorReleasedImpressoIds: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:isOpen', 'release-impresso'])

const dialogModel = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
})

const impressos = computed(() => {
  return props.stationData?.materiaisDisponiveis?.impressos || []
})

const releaseImpresso = (impressoId) => {
  emit('release-impresso', impressoId)
}

const closeModal = () => {
  emit('update:isOpen', false)
}
</script>

<template>
  <VNavigationDrawer
    v-model="dialogModel"
    location="right"
    width="320"
    temporary
    overlay
    class="impressos-drawer"
    @click:outside="closeModal"
  >
    <div class="impressos-drawer-container">
      <VCard flat class="impressos-card">
        <VCardTitle class="d-flex align-center pa-4" style="flex-shrink: 0;">
          <VIcon icon="ri-file-text-line" class="me-2" />
          Gerenciar Impressos
        </VCardTitle>
        
        <VDivider style="flex-shrink: 0;" />
        
        <VCardText class="impressos-content" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
          <div v-if="!impressos.length" class="text-center py-8">
            <VIcon icon="ri-file-text-line" size="48" color="grey" class="mb-4" />
            <p class="text-h6 text-grey">Nenhum impresso disponível</p>
          </div>
          
          <div v-else style="flex: 0 0 auto; width: 100%;">
            <div 
              v-for="impresso in impressos" 
              :key="impresso.idImpresso" 
              class="impresso-control-item"
            >
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center flex-grow-1">
                  <VIcon icon="ri-file-text-line" size="20" class="me-3 text-info" />
                  <span class="text-body-1 font-weight-medium">{{ impresso.tituloImpresso }}</span>
                </div>
                
                <div class="d-flex align-center gap-2">
                  <VBtn
                    icon
                    :color="!!actorReleasedImpressoIds[impresso.idImpresso] ? 'success' : 'warning'"
                    variant="tonal"
                    size="small"
                    @click="releaseImpresso(impresso.idImpresso)"
                    :disabled="!!actorReleasedImpressoIds[impresso.idImpresso]"
                    :title="!!actorReleasedImpressoIds[impresso.idImpresso] ? 'Impresso já liberado' : 'Liberar impresso para o candidato'"
                  >
                    <VIcon :icon="!!actorReleasedImpressoIds[impresso.idImpresso] ? 'ri-lock-unlock-line' : 'ri-lock-line'" />
                  </VBtn>
                  
                  <VChip
                    v-if="!!actorReleasedImpressoIds[impresso.idImpresso]"
                    color="success"
                    size="small"
                    variant="tonal"
                    class="text-caption"
                  >
                    Liberado
                  </VChip>
                </div>
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </div>
  </VNavigationDrawer>
</template>

<style scoped lang="scss">
.impressos-drawer-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.impressos-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.impressos-content {
  overflow-y: auto;
}

.impresso-control-item {
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: rgba(var(--v-theme-surface-variant), 0.08);
  }
}
</style>
