<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()

// Lógica de redirecionamento para usuários logados
const checkAndRedirectIfLoggedIn = () => {
  if (currentUser.value) {
    router.push('/app/dashboard')
  }
}

// Verificar ao montar a página
onMounted(() => {
  checkAndRedirectIfLoggedIn()
})

// Monitorar mudanças no estado de autenticação
watch(currentUser, (newUser) => {
  if (newUser) {
    router.push('/app/dashboard')
  }
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
