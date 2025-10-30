<script setup>
/**
 * AITrainingModal.vue
 *
 * Modal para seleção de especialidades no modo de treinamento com IA
 */

import { ref, computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'select-specialty'])

const specialties = ref([
  {
    id: 'clinica-medica',
    name: 'Clínica Médica',
    icon: 'ri-stethoscope-line',
    color: 'info',
    description: 'Estações de consulta e raciocínio clínico'
  },
  {
    id: 'cirurgia',
    name: 'Cirurgia',
    icon: 'ri-knife-line',
    color: 'primary',
    description: 'Estações cirúrgicas e procedimentos invasivos'
  },
  {
    id: 'pediatria',
    name: 'Pediatria',
    icon: 'ri-bear-smile-line',
    color: 'success',
    description: 'Estações pediátricas e neonatais'
  },
  {
    id: 'ginecologia',
    name: 'Ginecologia e Obstetrícia',
    icon: 'ri-women-line',
    color: 'error',
    description: 'Estações ginecológicas e obstétricas'
  },
  {
    id: 'preventiva',
    name: 'Preventiva',
    icon: 'ri-shield-cross-line',
    color: 'warning',
    description: 'Estações de medicina preventiva'
  },
  {
    id: 'procedimentos',
    name: 'Procedimentos',
    icon: 'ri-syringe-line',
    color: '#A52A2A',
    description: 'Estações de procedimentos diversos'
  }
])

const selectedSpecialty = ref(null)

function onSelectSpecialty(specialty) {
  selectedSpecialty.value = specialty
  emit('select-specialty', specialty)
}

function onClose() {
  emit('close')
}
</script>

<template>
  <v-dialog 
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    max-width="800px" 
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div class="d-flex align-center">
          <v-icon class="me-3" color="primary" size="28">ri-robot-line</v-icon>
          <span class="text-h5">Treinamento com IA</span>
        </div>
        <v-btn 
          icon="ri-close-line" 
          variant="text" 
          @click="onClose"
        />
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert type="info" variant="tonal" class="mb-4">
          <template #title>Como funciona o treinamento com IA</template>
          <div class="text-body-2">
            <p>1. Escolha uma especialidade abaixo</p>
            <p>2. O sistema selecionará aleatoriamente uma estação dessa especialidade</p>
            <p>3. Você não saberá qual estação foi selecionada (surpresa!)</p>
            <p>4. O treinamento será iniciado automaticamente com o modo IA</p>
          </div>
        </v-alert>

        <div class="specialty-grid">
          <v-card
            v-for="specialty in specialties"
            :key="specialty.id"
            class="specialty-card mb-3"
            elevation="2"
            rounded="lg"
            @click="onSelectSpecialty(specialty)"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-center">
                <v-icon 
                  :icon="specialty.icon" 
                  :color="specialty.color" 
                  size="32" 
                  class="me-3"
                />
                <div>
                  <h4 class="text-h6 font-weight-bold mb-1">{{ specialty.name }}</h4>
                  <p class="text-body-2 text-medium-emphasis mb-0">{{ specialty.description }}</p>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn 
          variant="outlined" 
          @click="onClose"
          prepend-icon="ri-close-line"
        >
          Cancelar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.specialty-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.specialty-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.specialty-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}
</style>
