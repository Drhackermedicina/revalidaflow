<script setup>
/**
 * AdminUploadCard.vue
 *
 * Card de área administrativa para upload de estações
 */

const emit = defineEmits(['navigate-to-upload'])
</script>

<template>
  <v-card class="mb-4" elevation="2" rounded color="error" variant="tonal">
    <v-card-text class="py-3">
      <v-row align="center">
        <v-col>
          <div class="d-flex align-center">
            <v-icon class="me-2" color="error">ri-upload-cloud-2-line</v-icon>
            <div>
              <div class="text-subtitle-1 font-weight-bold">Área do Administrador</div>
              <div class="text-caption text-medium-emphasis">Upload e gerenciamento de estações</div>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn
            color="error"
            variant="elevated"
            size="default"
            @click="emit('navigate-to-upload')"
            class="text-none"
            prepend-icon="ri-upload-line"
          >
            Admin Upload
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
