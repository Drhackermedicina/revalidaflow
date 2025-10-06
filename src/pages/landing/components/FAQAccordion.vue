<script setup>
import { ref, onMounted } from 'vue'
import { faqItems } from '../data/faq.js'

// Estado para animações e accordion
const faqVisible = ref(false)
const activeItems = ref(new Set())

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    faqVisible.value = true
  }, 700)
})

// Função para toggle do accordion
const toggleItem = (index) => {
  const newActiveItems = new Set(activeItems.value)
  if (newActiveItems.has(index)) {
    newActiveItems.delete(index)
  } else {
    newActiveItems.add(index)
  }
  activeItems.value = newActiveItems
}

// Verificar se item está ativo
const isItemActive = (index) => {
  return activeItems.value.has(index)
}
</script>

<template>
  <section class="faq-section" :class="{ 'faq-visible': faqVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-question-line" class="badge-icon" />
          <span class="badge-text">Perguntas Frequentes</span>
        </div>

        <h2 class="section-title">
          Tire Suas
          <span class="title-gradient">Dúvidas</span>
        </h2>

        <p class="section-subtitle">
          Tudo que você precisa saber sobre o REVALIDA FLOW.
          Não encontrou sua resposta? Entre em contato conosco.
        </p>
      </div>

      <!-- Accordion de FAQ -->
      <div class="faq-accordion">
        <div
          v-for="(item, index) in faqItems"
          :key="index"
          class="faq-item"
          :class="{ 'active': isItemActive(index) }"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <!-- Header do item -->
          <button
            class="faq-header"
            @click="toggleItem(index)"
            :aria-expanded="isItemActive(index)"
            :aria-controls="`faq-content-${index}`"
          >
            <div class="faq-question">
              <v-icon icon="ri-question-line" class="question-icon" />
              <span class="question-text">{{ item.question }}</span>
            </div>
            <div class="faq-toggle">
              <v-icon
                :icon="isItemActive(index) ? 'ri-subtract-line' : 'ri-add-line'"
                class="toggle-icon"
              />
            </div>
          </button>

          <!-- Conteúdo do item -->
          <div
            class="faq-content"
            :id="`faq-content-${index}`"
            :aria-hidden="!isItemActive(index)"
          >
            <div class="faq-answer">
              <p>{{ item.answer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Call to action -->
      <div class="faq-cta text-center">
        <div class="cta-content">
          <h3 class="cta-title">Ainda tem dúvidas?</h3>
          <p class="cta-subtitle">
            Nossa equipe está pronta para ajudar você a tomar a melhor decisão
          </p>
          <div class="cta-buttons">
            <v-btn
              href="mailto:suporte@revalidaflow.com"
              variant="outlined"
              size="large"
              class="cta-button secondary"
            >
              <v-icon class="mr-2">ri-mail-line</v-icon>
              <span>Enviar Email</span>
            </v-btn>
            <v-btn
              href="https://wa.me/5511999999999"
              color="success"
              size="large"
              class="cta-button primary"
            >
              <v-icon class="mr-2">ri-whatsapp-line</v-icon>
              <span>WhatsApp</span>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Links úteis -->
      <div class="faq-links">
        <div class="links-grid">
          <div class="link-item">
            <v-icon icon="ri-file-text-line" class="link-icon" />
            <div class="link-content">
              <h4 class="link-title">Termos de Uso</h4>
              <p class="link-description">Leia nossos termos e condições</p>
              <a href="#" class="link-action">Ler termos</a>
            </div>
          </div>

          <div class="link-item">
            <v-icon icon="ri-shield-check-line" class="link-icon" />
            <div class="link-content">
              <h4 class="link-title">Política de Privacidade</h4>
              <p class="link-description">Como protegemos seus dados</p>
              <a href="#" class="link-action">Ver política</a>
            </div>
          </div>

          <div class="link-item">
            <v-icon icon="ri-customer-service-line" class="link-icon" />
            <div class="link-content">
              <h4 class="link-title">Central de Ajuda</h4>
              <p class="link-description">Tutoriais e guias completos</p>
              <a href="#" class="link-action">Acessar ajuda</a>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/faq-section.scss';
</style>
