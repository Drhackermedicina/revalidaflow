<script setup>
import { ref, onMounted } from 'vue'
import { heroFeatures } from '../data/features.js'

// Estado para animações
const featuresVisible = ref(false)
const animatedCards = ref([])

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    featuresVisible.value = true
    // Anima cards sequencialmente
    heroFeatures.forEach((_, index) => {
      setTimeout(() => {
        animatedCards.value.push(index)
      }, index * 150)
    })
  }, 200)
})

// Função para verificar se card deve animar
const shouldAnimateCard = (index) => {
  return animatedCards.value.includes(index)
}
</script>

<template>
  <section class="features-section" :class="{ 'features-visible': featuresVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-star-line" class="badge-icon" />
          <span class="badge-text">Recursos Exclusivos</span>
        </div>

        <h2 class="section-title">
          Tecnologia de Ponta para
          <span class="title-gradient">Sua Aprovação</span>
        </h2>

        <p class="section-subtitle">
          Combinamos inteligência artificial avançada com metodologia comprovada
          para oferecer a melhor preparação do mercado
        </p>
      </div>

      <!-- Grid de features -->
      <v-row class="features-grid">
        <v-col
          v-for="(feature, index) in heroFeatures"
          :key="index"
          cols="12"
          sm="6"
          lg="4"
          class="feature-col"
        >
          <div
            class="feature-card"
            :class="{ 'card-animated': shouldAnimateCard(index) }"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <!-- Ícone do feature -->
            <div class="feature-icon-container">
              <div class="icon-bg" :style="{ background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}40)` }">
                <v-icon
                  :icon="feature.icon"
                  size="32"
                  :color="feature.color"
                  class="feature-icon"
                />
              </div>
            </div>

            <!-- Badge -->
            <div class="feature-badge" :style="{ backgroundColor: `${feature.color}20`, color: feature.color }">
              {{ feature.badge }}
            </div>

            <!-- Conteúdo -->
            <div class="feature-content">
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>

            <!-- Elemento decorativo -->
            <div class="feature-decoration">
              <div class="decoration-line" :style="{ backgroundColor: feature.color }"></div>
              <div class="decoration-dot" :style="{ backgroundColor: feature.color }"></div>
            </div>

            <!-- Efeito hover -->
            <div class="feature-hover-effect"></div>
          </div>
        </v-col>
      </v-row>

      <!-- Call to action -->
      <div class="features-cta text-center mt-16">
        <div class="cta-content">
          <h3 class="cta-title">Pronto para revolucionar seus estudos?</h3>
          <p class="cta-subtitle">
            Junte-se a milhares de médicos que já transformaram sua preparação
          </p>
          <v-btn
            to="/register"
            size="x-large"
            color="primary"
            class="btn-primary-custom cta-button"
            elevation="8"
          >
            <span>Começar Agora</span>
            <v-icon class="ml-2">ri-arrow-right-line</v-icon>
          </v-btn>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/features-section.scss';
</style>
