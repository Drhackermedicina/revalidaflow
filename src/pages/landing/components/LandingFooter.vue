<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

// Estado do footer
const currentYear = ref(new Date().getFullYear())
const router = useRouter()

// Links do footer
const footerLinks = {
  product: [
    { label: 'Recursos', href: '#features' },
    { label: 'Preços', href: '#pricing' },
    { label: 'Método Feynman', href: '#feynman' },
    { label: 'Fases do Curso', href: '#phases' }
  ],
  support: [
    { label: 'FAQ', href: '#faq' },
    { label: 'Contato', action: 'contact' },
    { label: 'Suporte', action: 'support' },
    { label: 'Status', href: 'https://status.revalidaflow.com', external: true }
  ],
  company: [
    { label: 'Sobre Nós', action: 'about' },
    { label: 'Blog', action: 'blog' },
    { label: 'Carreiras', action: 'careers' },
    { label: 'Imprensa', action: 'press' }
  ],
  legal: [
    { label: 'Termos de Uso', action: 'terms' },
    { label: 'Política de Privacidade', action: 'privacy' },
    { label: 'Política de Cookies', action: 'cookies' },
    { label: 'LGPD', action: 'lgpd' }
  ]
}

const socialLinks = [
  { icon: 'ri-facebook-fill', href: 'https://facebook.com/revalidaflow', label: 'Facebook' },
  { icon: 'ri-instagram-fill', href: 'https://instagram.com/revalidaflow', label: 'Instagram' },
  { icon: 'ri-twitter-fill', href: 'https://twitter.com/revalidaflow', label: 'Twitter' },
  { icon: 'ri-linkedin-fill', href: 'https://linkedin.com/company/revalidaflow', label: 'LinkedIn' },
  { icon: 'ri-youtube-fill', href: 'https://youtube.com/@revalidaflow', label: 'YouTube' }
]

// Funções de navegação
const handleLinkClick = (link) => {
  if (link.external) {
    window.open(link.href, '_blank', 'noopener,noreferrer')
  } else if (link.href && link.href.startsWith('#')) {
    scrollToSection(link.href)
  } else if (link.action) {
    handleAction(link.action)
  }
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
}

const handleAction = (action) => {
  switch (action) {
    case 'contact':
      // Abrir modal de contato ou redirecionar
      router.push('/contact')
      break
    case 'support':
      router.push('/support')
      break
    case 'about':
      router.push('/about')
      break
    case 'blog':
      window.open('https://blog.revalidaflow.com', '_blank', 'noopener,noreferrer')
      break
    case 'careers':
      router.push('/careers')
      break
    case 'press':
      router.push('/press')
      break
    case 'terms':
      router.push('/terms')
      break
    case 'privacy':
      router.push('/privacy')
      break
    case 'cookies':
      router.push('/cookies')
      break
    case 'lgpd':
      router.push('/lgpd')
      break
    default:
      break
  }
}

const goToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
</script>

<template>
  <footer class="landing-footer">
    <v-container fluid class="footer-container">
      <!-- Main Footer Content -->
      <div class="footer-main">
        <!-- Company Info -->
        <div class="footer-brand">
          <div class="brand-logo">
            <img
              src="@/assets/images/revalidaflow.png"
              alt="REVALIDA FLOW"
              class="footer-logo-image"
            />
            <span class="footer-logo-text">REVALIDA FLOW</span>
          </div>
          <p class="brand-description">
            A revolução no estudo para revalidação de diplomas médicos.
            Método Feynman aplicado à medicina com tecnologia de ponta.
          </p>
          <div class="brand-social">
            <a
              v-for="social in socialLinks"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              :aria-label="social.label"
            >
              <v-icon :icon="social.icon" size="20" />
            </a>
          </div>
        </div>

        <!-- Footer Links -->
        <div class="footer-links">
          <div class="links-column">
            <h4 class="column-title">Produto</h4>
            <ul class="column-links">
              <li
                v-for="link in footerLinks.product"
                :key="link.label"
                class="link-item"
              >
                <a
                  v-if="link.href"
                  :href="link.href"
                  class="footer-link"
                  @click.prevent="handleLinkClick(link)"
                >
                  {{ link.label }}
                </a>
                <button
                  v-else
                  class="footer-link footer-btn"
                  @click="handleLinkClick(link)"
                >
                  {{ link.label }}
                </button>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h4 class="column-title">Suporte</h4>
            <ul class="column-links">
              <li
                v-for="link in footerLinks.support"
                :key="link.label"
                class="link-item"
              >
                <a
                  v-if="link.href"
                  :href="link.href"
                  class="footer-link"
                  @click.prevent="handleLinkClick(link)"
                >
                  {{ link.label }}
                </a>
                <button
                  v-else
                  class="footer-link footer-btn"
                  @click="handleLinkClick(link)"
                >
                  {{ link.label }}
                </button>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h4 class="column-title">Empresa</h4>
            <ul class="column-links">
              <li
                v-for="link in footerLinks.company"
                :key="link.label"
                class="link-item"
              >
                <a
                  v-if="link.href"
                  :href="link.href"
                  class="footer-link"
                  @click.prevent="handleLinkClick(link)"
                >
                  {{ link.label }}
                </a>
                <button
                  v-else
                  class="footer-link footer-btn"
                  @click="handleLinkClick(link)"
                >
                  {{ link.label }}
                </button>
              </li>
            </ul>
          </div>

          <div class="links-column">
            <h4 class="column-title">Legal</h4>
            <ul class="column-links">
              <li
                v-for="link in footerLinks.legal"
                :key="link.label"
                class="link-item"
              >
                <a
                  v-if="link.href"
                  :href="link.href"
                  class="footer-link"
                  @click.prevent="handleLinkClick(link)"
                >
                  {{ link.label }}
                </a>
                <button
                  v-else
                  class="footer-link footer-btn"
                  @click="handleLinkClick(link)"
                >
                  {{ link.label }}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer Bottom -->
      <div class="footer-bottom">
        <div class="bottom-content">
          <div class="copyright">
            <p>&copy; {{ currentYear }} REVALIDA FLOW. Todos os direitos reservados.</p>
          </div>
          <div class="bottom-links">
            <button
              class="back-to-top"
              @click="goToTop"
              aria-label="Voltar ao topo"
            >
              <v-icon>ri-arrow-up-line</v-icon>
              <span>Voltar ao Topo</span>
            </button>
          </div>
        </div>
      </div>
    </v-container>
  </footer>
</template>

<style scoped lang="scss">
@import '../styles/landing-footer.scss';
</style>
