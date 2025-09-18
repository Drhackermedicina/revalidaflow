<template>
  <div ref="lottieContainer" :style="{ width: props.width + 'px', height: props.height + 'px' }"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import lottie from 'lottie-web'

const props = defineProps({
  animationData: {
    type: Object,
    required: true
  },
  width: {
    type: Number,
    default: 100
  },
  height: {
    type: Number,
    default: 100
  }
})

const lottieContainer = ref(null)

onMounted(() => {
  lottie.loadAnimation({
    container: lottieContainer.value,
    animationData: props.animationData,
    renderer: 'svg',
    loop: true,
    autoplay: true
  })
})
</script>
