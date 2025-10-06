<script setup>
import { ref, onMounted } from 'vue'
import { pricingPlans } from '../data/pricing.js'

// Estado para animações
const pricingVisible = ref(false)

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    pricingVisible.value = true
  }, 600)
})

// Função para escolher plano
const selectPlan = (plan) => {
  // Aqui você pode implementar a lógica de seleção do plano
  console.log('Plano selecionado:', plan.name)
  // Por exemplo, redirecionar para checkout ou modal
}
</script>

<template>
  <section class="pricing-section" :class="{ 'pricing-visible': pricingVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-money-dollar-circle-line" class="badge-icon" />
          <span class="badge-text">Planos Flexíveis</span>
        </div>

        <h2 class="section-title">
          Escolha o Plano
          <span class="title-gradient">Ideal para Você</span>
        </h2>

        <p class="section-subtitle">
          Comece gratuitamente e evolua conforme suas necessidades.
          Todos os planos incluem garantia de 30 dias.
        </p>
      </div>

      <!-- Cards de pricing -->
      <div class="pricing-grid">
        <div
          v-for="(plan, index) in pricingPlans"
          :key="index"
          class="pricing-card"
          :class="{ 'popular': plan.popular }"
          :style="{ animationDelay: `${index * 0.2}s` }"
        >
          <!-- Badge de popular -->
          <div v-if="plan.popular" class="popular-badge">
            <v-icon icon="ri-star-fill" class="badge-star" />
            <span>Mais Popular</span>
          </div>

          <!-- Header do card -->
          <div class="pricing-header">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <p class="plan-description">{{ plan.description }}</p>
          </div>

          <!-- Preço -->
          <div class="pricing-price">
            <div class="price-container">
              <span class="price-amount">{{ plan.price }}</span>
              <span class="price-period">{{ plan.period }}</span>
            </div>
          </div>

          <!-- Features -->
          <div class="pricing-features">
            <div
              v-for="(feature, featureIndex) in plan.features"
              :key="featureIndex"
              class="feature-item"
            >
              <v-icon icon="ri-check-circle-fill" class="feature-check" />
              <span class="feature-text">{{ feature }}</span>
            </div>
          </div>

          <!-- Botão CTA -->
          <div class="pricing-cta">
            <v-btn
              :color="plan.popular ? 'primary' : 'secondary'"
              :variant="plan.buttonVariant"
              size="large"
              class="pricing-button"
              :class="{ 'popular-button': plan.popular }"
              @click="selectPlan(plan)"
              block
            >
              <span>{{ plan.buttonText }}</span>
              <v-icon v-if="plan.popular" class="ml-2">ri-arrow-right-line</v-icon>
            </v-btn>
          </div>

          <!-- Elementos decorativos -->
          <div class="pricing-decoration">
            <div class="decoration-circles">
              <div class="circle circle-1"></div>
              <div class="circle circle-2"></div>
              <div class="circle circle-3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Informações adicionais -->
      <div class="pricing-info">
        <div class="info-grid">
          <div class="info-item">
            <v-icon icon="ri-shield-check-line" class="info-icon" />
            <div class="info-content">
              <h4 class="info-title">Garantia de 30 Dias</h4>
              <p class="info-text">Não ficou satisfeito? Devolvemos 100% do seu investimento.</p>
            </div>
          </div>

          <div class="info-item">
            <v-icon icon="ri-refresh-line" class="info-icon" />
            <div class="info-content">
              <h4 class="info-title">Cancele Quando Quiser</h4>
              <p class="info-text">Sem taxas de cancelamento ou contratos longos.</p>
            </div>
          </div>

          <div class="info-item">
            <v-icon icon="ri-customer-service-line" class="info-icon" />
            <div class="info-content">
              <h4 class="info-title">Suporte Especializado</h4>
              <p class="info-text">Equipe de médicos revalidados pronta para ajudar.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ Link -->
      <div class="pricing-faq-link text-center">
        <p class="faq-text">
          <span>Dúvidas sobre os planos?</span>
          <a href="#faq" class="faq-link">Veja nossas perguntas frequentes</a>
        </p>
      </div>

      <!-- Call to action final -->
      <div class="pricing-final-cta text-center">
        <div class="cta-card">
          <h3 class="cta-title">Não sabe qual escolher?</h3>
          <p class="cta-subtitle">
            Comece com o teste gratuito e descubra o plano ideal para seu perfil
          </p>
          <v-btn
            to="/register"
            size="x-large"
            color="primary"
            class="btn-primary-custom cta-button"
            elevation="8"
          >
            <span>Começar Teste Gratuito</span>
            <v-icon class="ml-2">ri-rocket-line</v-icon>
          </v-btn>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/pricing-section.scss';
</style>
