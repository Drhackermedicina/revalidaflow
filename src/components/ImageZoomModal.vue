<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  imageAlt: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:isOpen', 'close', 'image-error', 'image-load'])

const dialogModel = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
})

const closeModal = () => {
  emit('close')
  emit('update:isOpen', false)
}

const handleImageError = (event) => {
  emit('image-error', event)
}

const handleImageLoad = (event) => {
  emit('image-load', event)
}
</script>

<template>
  <VDialog v-model="dialogModel" fullscreen persistent hide-overlay scrollable width="100vw" height="100vh">
    <div class="image-zoom-fullscreen">
      <VBtn icon class="zoom-close-btn" @click="closeModal">
        <VIcon>mdi-close</VIcon>
      </VBtn>
      <VImg
        :src="imageUrl"
        :alt="imageAlt"
        class="zoom-image-full"
        @error="handleImageError"
        @load="handleImageLoad"
      />
    </div>
  </VDialog>
</template>

<style scoped lang="scss">
 /* Container full-screen para zoom */
 .image-zoom-fullscreen {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.9);
 }

 /* Imagem ajustada para ocupar todo espaço disponível sem distorcer */
 .zoom-image-full {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
 }

 /* Botão fechar posicionado no canto superior direito */
 .zoom-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  color: #fff;
 }
</style>
