<script setup>
import { computed } from 'vue'

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  editStatus: {
    type: Object,
    default: () => ({ hasBeenEdited: false, totalEdits: 0 })
  },
  userScore: {
    type: Object,
    default: null
  },
  specialty: {
    type: String,
    default: null
  },
  showSequentialConfig: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isInSequence: {
    type: Boolean,
    default: false
  },
  isCreatingSession: {
    type: Boolean,
    default: false
  },
  backgroundColor: {
    type: String,
    default: ''
  },
  showDetailedDates: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'click',
  'add-to-sequence',
  'remove-from-sequence',
  'edit-station',
  'start-ai-training'
])

const scoreColor = computed(() => {
  if (!props.userScore) return 'default'
  if (props.userScore.percentage >= 70) return 'success'
  if (props.userScore.percentage >= 50) return 'warning'
  return 'error'
})
</script>

<template>
  <v-list-item
    :key="station.id"
    class="mb-2 rounded-lg elevation-1 station-list-item clickable-card"
    :style="{ backgroundColor: backgroundColor }"
    @click="emit('click', station.id)"
  >
    <template #prepend>
      <v-icon color="info">ri-file-list-3-line</v-icon>
    </template>

    <v-list-item-title class="font-weight-bold text-body-1 text-on-surface">
      {{ station.cleanTitle || station.tituloEstacao }}
    </v-list-item-title>

    <v-list-item-subtitle v-if="station.especialidade && !showDetailedDates" class="text-caption">
      {{ station.especialidade }}
    </v-list-item-subtitle>

    <!-- Status de Edição -->
    <div v-if="showDetailedDates" class="d-flex flex-column gap-1 mt-2">
      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="editStatus.hasBeenEdited === false"
          color="warning"
          variant="flat"
          size="x-small"
          class="edit-status-chip"
        >
          <v-icon start size="12">ri-alert-line</v-icon>
          NÃO EDITADA
        </v-chip>
        <v-chip
          v-else-if="editStatus.hasBeenEdited === true"
          color="success"
          variant="flat"
          size="x-small"
          class="edit-status-chip"
        >
          <v-icon start size="12">ri-check-line</v-icon>
          EDITADA ({{ editStatus.totalEdits || 0 }}x)
        </v-chip>
      </div>

      <div v-if="editStatus.createdDate" class="text-caption text-secondary">
        <v-icon size="12" class="me-1">ri-calendar-line</v-icon>
        Criada: {{ editStatus.createdDate }}
      </div>

      <div v-if="editStatus.lastEditDate && editStatus.hasBeenEdited" class="text-caption text-secondary">
        <v-icon size="12" class="me-1">ri-edit-line</v-icon>
        Editada: {{ editStatus.lastEditDate }}
      </div>
    </div>

    <!-- Status de Edição Simples (INEP) -->
    <div v-else class="d-flex align-center gap-2 mt-1">
      <v-chip
        v-if="editStatus.hasBeenEdited === false"
        color="warning"
        variant="flat"
        size="x-small"
        class="edit-status-chip"
      >
        <v-icon start size="12">ri-alert-line</v-icon>
        NÃO EDITADA
      </v-chip>
      <v-chip
        v-else-if="editStatus.hasBeenEdited === true"
        color="success"
        variant="flat"
        size="x-small"
        class="edit-status-chip"
      >
        <v-icon start size="12">ri-check-line</v-icon>
        EDITADA ({{ editStatus.totalEdits || 0 }}x)
      </v-chip>
    </div>

    <!-- Pontuação do Usuário -->
    <div v-if="userScore" class="mt-2">
      <v-chip
        :color="scoreColor"
        variant="flat"
        size="small"
        class="user-score-chip"
      >
        <v-icon start size="16">ri-star-fill</v-icon>
        {{ userScore.score }}/{{ userScore.maxScore }} ({{ userScore.percentage }}%)
      </v-chip>
    </div>

    <template #append>
      <div class="d-flex align-center">
        <!-- Loading Spinner -->
        <v-progress-circular
          v-if="isCreatingSession"
          indeterminate
          size="24"
          color="primary"
          class="me-2 sequential-selection-btn"
        />

        <!-- Botão Modo Sequencial -->
        <v-btn
          v-if="showSequentialConfig"
          :color="isInSequence ? 'success' : 'primary'"
          :variant="isInSequence ? 'tonal' : 'outlined'"
          size="small"
          @click.stop="isInSequence ? emit('remove-from-sequence', station.id) : emit('add-to-sequence', station)"
          class="me-2 sequential-selection-btn"
          :aria-label="isInSequence ? 'Remover da sequência' : 'Adicionar à sequência'"
        >
          <v-icon
            :style="{
              color: isInSequence ? 'var(--v-theme-success)' : 'var(--v-theme-primary)',
              opacity: '1',
              fontWeight: '600',
              visibility: 'visible'
            }"
            :data-fallback="isInSequence ? '✓' : '+'"
            :aria-hidden="false"
            :aria-label="isInSequence ? 'Estação selecionada' : 'Selecionar estação'"
          >
            {{ isInSequence ? 'ri-check-line' : 'ri-plus-line' }}
          </v-icon>
        </v-btn>

        <!-- Botão Editar (Admin) -->
        <v-btn
          v-if="isAdmin"
          color="secondary"
          variant="text"
          size="small"
          icon="ri-pencil-line"
          @click.stop="emit('edit-station', station.id)"
          class="me-2 sequential-selection-btn"
          aria-label="Editar Estação"
        />

        <!-- Botão IA -->
        <v-btn
          color="primary"
          variant="text"
          size="small"
          icon="ri-robot-line"
          @click.stop="emit('start-ai-training', station.id)"
          class="me-2 sequential-selection-btn"
          aria-label="Treinar com IA"
        />
      </div>
    </template>
  </v-list-item>
</template>

<style scoped>
.clickable-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.edit-status-chip {
  font-size: 0.7rem;
  height: 20px;
}

.user-score-chip {
  font-weight: 600;
}

.sequential-selection-btn {
  flex-shrink: 0;
}
</style>
