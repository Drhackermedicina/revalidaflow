<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser } from '@/plugins/auth'

const router = useRouter()

// Estado do header
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const headerRef = ref(null)

// Menu items
const menuItems = [
  { label: 'Início', href: '#home' },
  { label: 'Recursos', href: '#features' },
  { label: 'Método', href: '#feynman' },
  { label: 'Fases', href: '#phases' },
  { label: 'Depoimentos', href: '#testimonials' },
  { label: 'Preços', href: '#pricing' },
  { label: 'FAQ', href: '#faq' }
]

// Verificar se usuário está logado
const isLoggedIn = computed(() => !!currentUser.value)

// Funções de navegação
const goToLogin = () => {
  router.push('/login')
}

const goToRegister = () => {
  router.push('/register')
}

const goToDashboard = () => {
  router.push('/app/dashboard')
}

const scrollToSection = (href) => {
  const element = document.querySelector(href)
  if (element) {
    const offsetTop = element.offsetTop - 80 // Offset para o header fixo
    window.scrollTo({
      top: offsetTop,
      behavior: 'smooth'
    })
  }
  closeMobileMenu()
}

// Toggle mobile menu
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Detectar scroll para header transparente/sólido
const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll() // Verificar estado inicial
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header
    ref="headerRef"
    class="landing-header"
    :class="{ 'header-scrolled': isScrolled, 'mobile-menu-open': isMobileMenuOpen }"
  >
    <v-container fluid class="header-container">
      <div class="header-content">
        <!-- Logo -->
        <div class="header-logo">
          <router-link to="/" class="logo-link">
            <img
              src="@/assets/images/revalidaflow.png"
              alt="REVALIDA FLOW"
              class="logo-image"
            />
            <span class="logo-text">REVALIDA FLOW</span>
          </router-link>
        </div>

        <!-- Desktop Menu -->
        <nav class="header-nav desktop-nav">
          <ul class="nav-list">
            <li
              v-for="item in menuItems"
              :key="item.label"
              class="nav-item"
            >
              <a
                :href="item.href"
                class="nav-link"
                @click.prevent="scrollToSection(item.href)"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>
        </nav>

        <!-- Desktop Actions -->
        <div class="header-actions desktop-actions">
          <template v-if="isLoggedIn">
            <v-btn
              variant="text"
              class="action-btn dashboard-btn"
              @click="goToDashboard"
            >
              <v-icon class="mr-2">ri-dashboard-line</v-icon>
              <span>Dashboard</span>
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              variant="text"
              class="action-btn login-btn"
              @click="goToLogin"
            >
              <span>Entrar</span>
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              class="action-btn register-btn"
              @click="goToRegister"
            >
              <span>Começar Grátis</span>
            </v-btn>
          </template>
        </div>

        <!-- Mobile Menu Toggle -->
        <button
          class="mobile-menu-toggle"
          @click="toggleMobileMenu"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Toggle menu"
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>

      <!-- Mobile Menu -->
      <div class="mobile-menu" :class="{ 'menu-open': isMobileMenuOpen }">
        <nav class="mobile-nav">
          <ul class="mobile-nav-list">
            <li
              v-for="item in menuItems"
              :key="item.label"
              class="mobile-nav-item"
            >
              <a
                :href="item.href"
                class="mobile-nav-link"
                @click.prevent="scrollToSection(item.href)"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>
        </nav>

        <div class="mobile-actions">
          <template v-if="isLoggedIn">
            <v-btn
              variant="text"
              class="mobile-action-btn dashboard-btn"
              @click="goToDashboard"
              block
            >
              <v-icon class="mr-2">ri-dashboard-line</v-icon>
              <span>Dashboard</span>
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              variant="text"
              class="mobile-action-btn login-btn"
              @click="goToLogin"
              block
            >
              <span>Entrar</span>
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              class="mobile-action-btn register-btn"
              @click="goToRegister"
              block
            >
              <span>Começar Grátis</span>
            </v-btn>
          </template>
        </div>
      </div>
    </v-container>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="isMobileMenuOpen"
      class="mobile-menu-overlay"
      @click="closeMobileMenu"
    ></div>
  </header>
</template>

<style scoped lang="scss">
@import '../styles/landing-header.scss';
</style>
