<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { testimonials } from '../data/testimonials.js'

// Estado do carousel
const testimonialsVisible = ref(false)
const currentSlide = ref(0)
const autoPlayInterval = ref(null)
const isPaused = ref(false)

// Configurações do carousel
const autoPlayDelay = 4000 // 4 segundos
const totalSlides = testimonials.length

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    testimonialsVisible.value = true
  }, 500)

  // Iniciar autoplay
  startAutoPlay()
})

// Limpar interval quando componente for destruído
onUnmounted(() => {
  stopAutoPlay()
})

// Funções do carousel
const startAutoPlay = () => {
  if (autoPlayInterval.value) return

  autoPlayInterval.value = setInterval(() => {
    if (!isPaused.value) {
      nextSlide()
    }
  }, autoPlayDelay)
}

const stopAutoPlay = () => {
  if (autoPlayInterval.value) {
    clearInterval(autoPlayInterval.value)
    autoPlayInterval.value = null
  }
}

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % totalSlides
}

const prevSlide = () => {
  currentSlide.value = currentSlide.value === 0 ? totalSlides - 1 : currentSlide.value - 1
}

const goToSlide = (index) => {
  currentSlide.value = index
}

// Pausar autoplay quando usuário interagir
const pauseAutoPlay = () => {
  isPaused.value = true
  setTimeout(() => {
    isPaused.value = false
  }, autoPlayDelay)
}

// Função para renderizar estrelas
const renderStars = (rating) => {
  return Array.from({ length: 5 }, (_, i) => i < rating)
}
</script>

<template>
  <section class="testimonials-section" :class="{ 'testimonials-visible': testimonialsVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-star-line" class="badge-icon" />
          <span class="badge-text">Depoimentos Reais</span>
        </div>

        <h2 class="section-title">
          Histórias de
          <span class="title-gradient">Sucesso Real</span>
        </h2>

        <p class="section-subtitle">
          Médicos que transformaram seus estudos e conquistaram
          a aprovação no REVALIDA através do nosso método.
        </p>
      </div>

      <!-- Carousel Container -->
      <div class="carousel-container">
        <!-- Slides -->
        <div class="carousel-wrapper">
          <div
            class="carousel-slide"
            v-for="(testimonial, index) in testimonials"
            :key="index"
            :class="{ 'active': currentSlide === index }"
            :style="{ transform: `translateX(${(index - currentSlide) * 100}%)` }"
          >
            <div class="testimonial-card">
              <!-- Quote icon -->
              <div class="quote-icon">
                <v-icon icon="ri-double-quotes-l" size="32" />
              </div>

              <!-- Rating stars -->
              <div class="rating-stars">
                <v-icon
                  v-for="(filled, starIndex) in renderStars(testimonial.rating)"
                  :key="starIndex"
                  :icon="filled ? 'ri-star-fill' : 'ri-star-line'"
                  class="star-icon"
                  :class="{ 'filled': filled }"
                  size="20"
                />
              </div>

              <!-- Testimonial text -->
              <blockquote class="testimonial-text">
                {{ testimonial.text }}
              </blockquote>

              <!-- Author info -->
              <div class="testimonial-author">
                <div class="author-avatar">
                  <span class="avatar-emoji">{{ testimonial.avatar }}</span>
                </div>
                <div class="author-info">
                  <h4 class="author-name">{{ testimonial.name }}</h4>
                  <p class="author-specialty">{{ testimonial.specialty }}</p>
                </div>
              </div>

              <!-- Decorative elements -->
              <div class="testimonial-decoration">
                <div class="decoration-line"></div>
                <div class="decoration-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation arrows -->
        <button
          class="carousel-arrow carousel-arrow-prev"
          @click="prevSlide(); pauseAutoPlay()"
          aria-label="Depoimento anterior"
        >
          <v-icon icon="ri-arrow-left-line" size="24" />
        </button>

        <button
          class="carousel-arrow carousel-arrow-next"
          @click="nextSlide(); pauseAutoPlay()"
          aria-label="Próximo depoimento"
        >
          <v-icon icon="ri-arrow-right-line" size="24" />
        </button>

        <!-- Indicators -->
        <div class="carousel-indicators">
          <button
            v-for="(testimonial, index) in testimonials"
            :key="index"
            class="indicator"
            :class="{ 'active': currentSlide === index }"
            @click="goToSlide(index); pauseAutoPlay()"
            :aria-label="`Ir para depoimento ${index + 1}`"
          ></button>
        </div>
      </div>

      <!-- Stats abaixo do carousel -->
      <div class="testimonials-stats">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">2.500+</div>
            <div class="stat-label">Aprovados</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">98%</div>
            <div class="stat-label">Taxa de Aprovação</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">4.9/5</div>
            <div class="stat-label">Avaliação Média</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">50+</div>
            <div class="stat-label">Estações Oficiais</div>
          </div>
        </div>
      </div>

      <!-- Call to action -->
      <div class="testimonials-cta text-center">
        <div class="cta-content">
          <h3 class="cta-title">Seja o próximo sucesso!</h3>
          <p class="cta-subtitle">
            Junte-se aos milhares de médicos que conquistaram seus sonhos
          </p>
          <v-btn
            to="/register"
            size="x-large"
            color="primary"
            class="btn-primary-custom cta-button"
            elevation="8"
          >
            <span>Começar Minha Jornada</span>
            <v-icon class="ml-2">ri-arrow-right-line</v-icon>
          </v-btn>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/testimonials-section.scss';
</style>
