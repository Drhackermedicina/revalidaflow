<script setup>
const props = defineProps({
  candidate: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['back', 'change'])
</script>

<template>
  <v-card
    class="selected-candidate-card rf-glass-card"
    rounded="xl"
    elevation="0"
  >
    <v-card-text class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-avatar size="54" class="candidate-avatar me-4">
          <v-img
            v-if="candidate?.photoURL"
            :src="candidate.photoURL"
            cover
          />
          <v-icon v-else size="30">ri-user-line</v-icon>
        </v-avatar>

        <div class="candidate-details">
          <span class="candidate-label text-caption text-medium-emphasis">
            Candidato selecionado
          </span>
          <h5 class="candidate-name text-subtitle-1 font-weight-bold mb-1">
            {{ candidate?.nome }} {{ candidate?.sobrenome }}
          </h5>
          <span class="candidate-email text-body-2 text-medium-emphasis">
            {{ candidate?.email }}
          </span>
        </div>
      </div>

      <div class="card-actions">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="ri-arrow-left-line"
          class="me-2"
          @click="emit('back')"
        >
          Voltar
        </v-btn>

        <v-btn
          variant="elevated"
          color="primary"
          prepend-icon="ri-user-search-line"
          @click="emit('change')"
        >
          Trocar candidato
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.selected-candidate-card {
  padding: 0.5rem 0.5rem;
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: linear-gradient(165deg, rgba(126, 87, 255, 0.22), rgba(34, 197, 255, 0.1)), rgba(18, 16, 43, 0.6);
}

.candidate-avatar {
  box-shadow: 0 12px 30px rgba(102, 126, 234, 0.25);

  :deep(.v-icon) {
    color: rgba(239, 233, 255, 0.96);
    opacity: 0.95;
  }
}

.candidate-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.candidate-label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(222, 217, 255, 0.7);
}

.candidate-name {
  color: rgba(243, 241, 255, 0.95);
}

.candidate-email {
  color: rgba(224, 220, 255, 0.75);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .selected-candidate-card {
    padding: 0.75rem 0.5rem;
  }

  .candidate-avatar {
    width: 48px;
    height: 48px;
  }

  .card-actions {
    flex-direction: column;
    align-items: flex-end;
  }

  .card-actions .v-btn {
    width: 100%;
  }
}
</style>

