<script setup>
import { onMounted, watch } from 'vue'
import { currentUser } from '@/plugins/auth'

// Componentes das seções
import LandingHeader from './components/LandingHeader.vue'
import HeroSection from './components/HeroSection.vue'
import FeaturesGrid from './components/FeaturesGrid.vue'
import FeynmanSection from './components/FeynmanSection.vue'
import PhasesTabs from './components/PhasesTabs.vue'
import TestimonialsCarousel from './components/TestimonialsCarousel.vue'
import PricingCards from './components/PricingCards.vue'
import FAQAccordion from './components/FAQAccordion.vue'
import LandingFooter from './components/LandingFooter.vue'

// A landing page agora é acessível tanto para usuários logados quanto não logados
// Não há mais redirecionamento automático

// Verificar ao montar a página (apenas para logging)
onMounted(() => {
  console.log('[LandingPage] onMounted - currentUser:', !!currentUser.value)
})

// Monitorar mudanças no estado de autenticação (apenas para logging)
watch(currentUser, (newUser, oldUser) => {
  console.log('[LandingPage] currentUser changed:', !!newUser, 'from:', !!oldUser)
  // Não faz redirecionamento automático
})
</script>

<template>
  <div class="landing-page">
    <LandingHeader />

    <HeroSection id="home" />

    <FeaturesGrid id="features" />

    <FeynmanSection id="feynman" />

    <PhasesTabs id="phases" />

    <TestimonialsCarousel id="testimonials" />

    <PricingCards id="pricing" />

    <FAQAccordion id="faq" />

    <LandingFooter />
  </div>
</template>

<style scoped lang="scss">
@import './styles/landing.scss';
</style>
