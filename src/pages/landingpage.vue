<script setup>
import { computed, ref } from 'vue'
import revalidaFlowLogo from '@images/revalidaflow.png'
import { useTheme } from 'vuetify'

const vuetifyTheme = useTheme()
const isDark = computed(() => vuetifyTheme.global.name.value === 'dark')

// Animação Lottie avançada com efeito de brilho pulsante
const pulseAnimation = ref({
  v: "5.7.1",
  meta: { g: "LottieFiles AE 1.0.0" },
  fr: 30,
  ip: 0,
  op: 120,
  w: 100,
  h: 100,
  nm: "Glow Pulse Animation",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Glow Layer",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 30, s: [100] },
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 60, s: [0] },
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 90, s: [100] },
            { t: 120, s: [0] }
          ],
          ix: 11
        },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [50, 50, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: {
          a: 1,
          k: [
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 0, s: [80, 80, 100] },
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 30, s: [120, 120, 100] },
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 60, s: [80, 80, 100] },
            { i: { x: [0.833, 0.833, 0.833], y: [0.833, 0.833, 0.833] }, o: { x: [0.167, 0.167, 0.167], y: [0.167, 0.167, 0.167] }, t: 90, s: [120, 120, 100] },
            { t: 120, s: [80, 80, 100] }
          ],
          ix: 6
        }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [60, 60], ix: 2 },
              p: { a: 0, k: [0, 0], ix: 3 }
            },
            {
              ty: "gf",
              o: { a: 0, k: 100, ix: 10 },
              r: 1,
              bm: 0,
              g: {
                p: 3,
                k: {
                  a: 0,
                  k: [0, 0.5, 0.5, 0.5, 0.5, 1, 1, 1],
                  ix: 9
                }
              },
              s: { a: 0, k: [0, 0], ix: 5 },
              e: { a: 0, k: [100, 100], ix: 6 },
              t: 1,
              nm: "Radial Gradient 1",
              mn: "ADBE Vector Graphic - G-Fill",
              hd: false
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 }
            }
          ],
          nm: "Glow Shape",
          np: 3,
          cix: 2,
          bm: 0,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false
        }
      ],
      ip: 0,
      op: 120,
      st: 0,
      bm: 0
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Core Shape",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [50, 50, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 }
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [40, 40], ix: 2 },
              p: { a: 0, k: [0, 0], ix: 3 }
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.2, 0.6, 1, 1], ix: 4 },
              o: { a: 0, k: 100, ix: 5 },
              r: 1,
              bm: 0,
              nm: "Fill 1",
              mn: "ADBE Vector Graphic - Fill",
              hd: false
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 }
            }
          ],
          nm: "Core",
          np: 2,
          cix: 2,
          bm: 0,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false
        }
      ],
      ip: 0,
      op: 120,
      st: 0,
      bm: 0
    }
  ]
})
const firstPhaseFeatures = [
  {
    icon: 'ri-book-open-line',
    title: 'Banco de Questões Atualizado',
    text: 'Milhares de questões objetivas alinhadas ao novo formato 2025.2 - sem prova discursiva!'
  },
  {
    icon: 'ri-file-pdf-line',
    title: 'Materiais de Apoio Premium',
    text: 'PDFs e videoaulas sobre todos os temas do REVALIDA, produzidos por médicos revalidados.'
  },
  {
    icon: 'ri-stack-line',
    title: 'Flashcards Inteligentes',
    text: 'Sistema de repetição espaçada para memorização eficiente de conceitos-chave.'
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Cronograma Personalizado',
    text: 'Planejamento de estudos adaptado ao seu perfil e tempo disponível até a prova.'
  }
]

const secondPhaseFeatures = [
  {
    icon: 'ri-user-voice-line',
    title: 'Simulações em Tempo Real',
    text: 'Estações clínicas ao vivo com outros usuários da plataforma e feedback imediato.'
  },
  {
    icon: 'ri-team-line',
    title: 'Atores Profissionais',
    text: 'Pacientes simulados treinados especificamente para cenários do REVALIDA.'
  },
  {
    icon: 'ri-database-line',
    title: 'Todas as Estações INEP',
    text: 'Única plataforma com TODAS as estações oficiais do INEP desde 2011 até 2025.1.'
  },
  {
    icon: 'ri-star-line',
    title: 'Estações Exclusivas',
    text: 'Cenários únicos criados por médicos revalidados com vasta experiência na prova.'
  }
]

const feynmanFeatures = [
  {
    icon: 'ri-mic-line',
    title: 'FALE - Explique em Áudio',
    text: 'Grave sua explicação do caso clínico como se estivesse em uma prova oral.'
  },
  {
    icon: 'ri-brain-line',
    title: 'IA Analisa seu Raciocínio',
    text: 'Nossa IA identifica acertos, falhas e desafia você a simplificar pontos complexos.'
  },
  {
    icon: 'ri-trophy-line',
    title: 'DOMINE - Feedback Personalizado',
    text: 'Use o feedback para preencher lacunas e solidificar o aprendizado.'
  }
]

const benefits = [
  {
    icon: 'ri-speed-up-line',
    title: 'Acelere seu Aprendizado',
    text: 'Falar em voz alta aumenta a retenção em até 50% (Efeito de Produção).'
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Desenvolva Confiança Real',
    text: 'Simule a pressão da prova e treine sua capacidade de organizar conhecimento.'
  },
  {
    icon: 'ri-eye-line',
    title: 'Descubra seus Pontos Cegos',
    text: 'A IA revela fraquezas no raciocínio que a leitura silenciosa jamais mostraria.'
  },
  {
    icon: 'ri-lightbulb-line',
    title: 'Estude de Forma Inteligente',
    text: 'Foque exatamente onde precisa melhorar, sem reler a mesma coisa.'
  }
]

const testimonials = [
  {
    name: 'Dr. Ana Silva',
    specialty: 'Revalidada em 2024',
    text: 'O REVALIDA FLOW foi fundamental para minha aprovação. As simulações são idênticas à prova real!',
    rating: 5,
    avatar: '👩‍⚕️'
  },
  {
    name: 'Dr. Carlos Rodriguez',
    specialty: 'Revalidado em 2023',
    text: 'A técnica Feynman mudou completamente minha forma de estudar. Aprovado na primeira tentativa!',
    rating: 5,
    avatar: '👨‍⚕️'
  },
  {
    name: 'Dra. Maria Santos',
    specialty: 'Revalidada em 2024',
    text: 'Plataforma completa e atualizada. O suporte é excepcional e os materiais são de alta qualidade.',
    rating: 5,
    avatar: '👩‍⚕️'
  }
]

const mobileMenuOpen = ref(false)

const heroFeatures = [
  {
    icon: 'ri-mic-line',
    title: 'IA Feynman',
    description: 'Explique em áudio, receba feedback instantâneo',
    color: 'yellow',
    badge: 'EXCLUSIVO'
  },
  {
    icon: 'ri-book-open-line',
    title: '50.000+ Questões',
    description: 'Banco atualizado formato 2025.2',
    color: 'blue',
    badge: 'NOVO FORMATO'
  },
  {
    icon: 'ri-user-voice-line',
    title: 'Simulações Reais',
    description: 'Estações clínicas com atores profissionais',
    color: 'green',
    badge: 'AO VIVO'
  },
  {
    icon: 'ri-calendar-check-line',
    title: 'Cronograma IA',
    description: 'Planejamento personalizado inteligente',
    color: 'purple',
    badge: 'PERSONALIZADO'
  },
  {
    icon: 'ri-flashlight-line',
    title: 'Flashcards IA',
    description: 'Repetição espaçada inteligente',
    color: 'orange',
    badge: 'INTELIGENTE'
  },
  {
    icon: 'ri-video-line',
    title: 'Videoaulas Exclusivas',
    description: 'Conteúdo por médicos revalidados',
    color: 'red',
    badge: 'PREMIUM'
  }
]

const platformStats = [
  { number: '2.500+', label: 'Médicos Aprovados', icon: 'ri-user-heart-line' },
  { number: '98%', label: 'Taxa de Aprovação', icon: 'ri-trophy-line' },
  { number: '50+', label: 'Estações Oficiais', icon: 'ri-hospital-line' },
  { number: '4.9/5', label: 'Avaliação Média', icon: 'ri-star-fill' }
]
</script>

<template>
  <div class="landing-page">
    <!-- Header Navigation -->
    <header class="premium-header">
      <v-container class="header-container">
        <div class="brand-section">
          <div class="logo-container">
            <!-- Logo removido conforme solicitado -->
          </div>
        </div>

        <!-- Desktop Navigation -->
        <nav class="desktop-nav d-none d-lg-flex">
          <a href="#features" class="nav-link">Recursos</a>
          <a href="#how-it-works" class="nav-link">Metodologia</a>
          <a href="#pricing" class="nav-link">Planos</a>
          <a href="#faq" class="nav-link">Suporte</a>
        </nav>

        <!-- Auth Section -->
        <div class="auth-section d-none d-lg-flex">
          <v-btn variant="text" to="/login" class="login-btn">
            Entrar
          </v-btn>
          <div class="custom-trial-btn" @click="$router.push('/register')">
            <span class="trial-text">7 Dias Grátis</span>
            <div class="trial-shine"></div>
          </div>
        </div>

        <!-- Mobile Menu -->
        <v-btn
          class="d-lg-none mobile-menu-btn"
          icon
          variant="text"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <v-icon color="white">ri-menu-line</v-icon>
        </v-btn>
      </v-container>
    </header>

    <!-- Mobile Navigation Drawer -->
    <v-navigation-drawer
      v-model="mobileMenuOpen"
      location="top"
      temporary
      class="d-md-none"
    >
      <v-list>
        <v-list-item to="#features" title="Recursos" />
        <v-list-item to="#how-it-works" title="Como Funciona" />
        <v-list-item to="#pricing" title="Planos" />
        <v-list-item to="#faq" title="Dúvidas" />
        <v-divider />
        <v-list-item to="/login" title="Login" />
        <v-list-item to="/register" title="7 Dias Grátis" />
      </v-list>
    </v-navigation-drawer>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background"></div>
      <div class="hero-overlay"></div>

      <v-container fluid class="hero-content">
        <!-- Main Hero Content -->
        <v-row align="center" justify="center" class="min-vh-100">
          <v-col cols="12" xl="10" class="hero-text-content">
            <div class="hero-badge-container mb-8">
              <div class="premium-badge">
                <span class="badge-icon">🚀</span>
                <span class="badge-text">Primeira Plataforma Adaptada ao Novo Formato da Prova do INEP REVALIDA 2025/2026</span>
              </div>
            </div>

            <div class="hero-title-container mb-10">
              <div class="brand-title-wrapper">
                <h1 class="brand-title">
                  <span class="flow-text">REVALIDA</span>
                  <span class="flow-text">FLOW</span>
                </h1>
                <div class="brand-tagline">
                  <span class="tagline-highlight">Inteligência Artificial</span> •
                  <span class="tagline-highlight">Técnica Feynman</span> •
                  <span class="tagline-highlight">Ambiente de Simulação de Última Geração</span>
                </div>
              </div>
              <h2 class="hero-subtitle">
                A Única Plataforma Completa para sua Revalidação Médica no Brasil
              </h2>
              <div class="title-underline"></div>
            </div>

            <div class="unique-features-grid mb-10">
              <div class="feature-highlight">
                <div class="feature-icon">🧠</div>
                <div class="feature-content">
                  <h3>Técnica Feynman IA</h3>
                  <p>Explique em áudio, receba feedback inteligente</p>
                </div>
              </div>
              <div class="feature-highlight">
                <div class="feature-icon">🏥</div>
                <div class="feature-content">
                  <h3>Todas as Estações INEP</h3>
                  <p>100% das estações oficiais para simulação</p>
                </div>
              </div>
              <div class="feature-highlight">
                <div class="feature-icon">⭐</div>
                <div class="feature-content">
                  <h3>500+ Estações Exclusivas</h3>
                  <p>Criadas por médicos já revalidados</p>
                </div>
              </div>
              <div class="feature-highlight">
                <div class="feature-icon">🎯</div>
                <div class="feature-content">
                  <h3>Nova 2ª Fase INEP</h3>
                  <p>Única adaptada ao novo formato com prova escrita</p>
                </div>
              </div>
            </div>

            <div class="premium-offer-card mb-10">
              <div class="offer-content">
                <div class="offer-icon">🎁</div>
                <div class="offer-details">
                  <div class="offer-title">7 Dias Grátis - Acesso Total à Plataforma</div>
                  <div class="offer-subtitle">Sem cartão • Apenas email Google • Cancele quando quiser</div>
                </div>
              </div>
            </div>

            <div class="hero-cta-buttons">
              <div class="primary-cta-custom" @click="$router.push('/register')">
                <div class="cta-bg-effect"></div>
                <span class="cta-text">COMEÇAR TESTE GRÁTIS AGORA</span>
                <div class="cta-arrow">→</div>
              </div>
              <div class="secondary-cta-custom" @click="$router.push('/login')">
                <span class="secondary-text">Já sou membro</span>
              </div>
            </div>

            <!-- Social Proof Stats -->
            <div class="hero-stats-grid mt-12">
              <div class="stat-item">
                <div class="stat-number">2.500+</div>
                <div class="stat-label">Médicos Aprovados</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">98%</div>
                <div class="stat-label">Taxa de Sucesso</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">550+</div>
                <div class="stat-label">Estações Disponíveis</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">4.9★</div>
                <div class="stat-label">Avaliação dos Usuários</div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Platform Features Grid -->
        <v-row class="features-grid-section">
          <v-col cols="12" class="text-center mb-12">
            <h3 class="section-title">Tecnologia que Acelera sua Aprovação</h3>
            <p class="section-subtitle">Ferramentas inteligentes para um estudo mais eficiente</p>
          </v-col>

          <v-col cols="12">
            <div class="features-grid">
              <div
                v-for="(feature, i) in heroFeatures"
                :key="i"
                class="feature-card-pro"
                :style="{ animationDelay: `${i * 0.15}s` }"
              >
                <div class="feature-badge-pro">{{ feature.badge }}</div>
                <div class="feature-icon-pro">
                  <v-icon :icon="feature.icon" size="32" />
                </div>
                <h4 class="feature-title-pro">{{ feature.title }}</h4>
                <p class="feature-desc-pro">{{ feature.description }}</p>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Social Proof Bottom -->
        <v-row class="social-proof-section">
          <v-col cols="12" class="text-center">
            <div class="social-proof-card">
              <div class="proof-stats">
                <div class="proof-stat">
                  <span class="proof-number">2.500+</span>
                  <span class="proof-label">Médicos Aprovados</span>
                </div>
                <div class="proof-stat">
                  <span class="proof-number">98%</span>
                  <span class="proof-label">Taxa de Sucesso</span>
                </div>
                <div class="proof-stat">
                  <span class="proof-number">4.9★</span>
                  <span class="proof-label">Avaliação</span>
                </div>
              </div>
              <h3 class="proof-title">Junte-se aos Médicos que Já Foram Aprovados</h3>
              <p class="proof-subtitle">Comece sua jornada de sucesso hoje mesmo</p>
              <div class="proof-cta">
                <v-btn color="yellow" size="x-large" variant="elevated" class="text-black font-weight-bold hover:scale-105 transition-transform duration-300" to="/register">
                  <v-icon start icon="ri-rocket-line" class="transition-transform duration-300 hover:scale-110" />
                  QUERO COMEÇAR AGORA
                </v-btn>
                <span class="proof-cta-text">QUERO COMEÇAR AGORA</span>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Problem Section -->
    <v-sheet class="py-16" :color="isDark ? 'grey-darken-3' : 'grey-lighten-5'">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Você se identifica com isso?</h2>
          <p class="text-h5 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
            Você passa horas lendo casos clínicos, grifando apostilas e assistindo aulas. Mas na hora de responder uma questão descritiva, <strong>o raciocínio trava?</strong>
          </p>
        </div>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card class="pa-8 text-center" color="error" variant="tonal">
              <v-icon icon="ri-emotion-sad-line" size="64" color="error" class="mb-4" />
              <h3 class="text-h4 font-weight-bold mb-4">O método tradicional é passivo</h3>
              <p class="text-h6">
                Ele enche sua cabeça de informação, mas não treina a habilidade mais importante para um médico: <strong>o raciocínio clínico aplicado.</strong>
              </p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- Feynman Method Section -->
    <v-sheet class="py-20" color="primary" theme="dark">
      <v-container>
        <div class="text-center mb-12">
          <v-chip color="yellow" variant="elevated" class="mb-4">
            <v-icon start icon="ri-lightbulb-line" />
            EXCLUSIVO NO REVALIDA FLOW
          </v-chip>
          <h2 class="text-h2 font-weight-bold mb-6">Técnica Feynman Ativo Interativo</h2>
          <p class="text-h5 font-weight-regular mb-8 mx-auto" style="max-inline-size: 900px;">
            A primeira plataforma do mundo que usa a Técnica Feynman e Inteligência Artificial para analisar suas respostas em áudio e fornecer feedback em tempo real. Esse método é exclusivo para a prova discursiva. <strong>Estude menos, aprenda mais.</strong>
          </p>
        </div>
        <transition-group name="fade" tag="v-row">
          <v-col
            v-for="(feature, i) in feynmanFeatures"
            :key="i"
            cols="12"
            sm="4"
          >
            <v-card class="text-center pa-6 h-100 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105" :color="isDark ? 'grey-darken-2' : 'white'" variant="elevated">
              <div class="feature-number mb-4">{{ i + 1 }}</div>
              <v-icon :icon="feature.icon" color="primary" size="50" class="mb-4 transition-transform duration-300 hover:scale-110" />
              <v-card-title class="font-weight-bold text-h5 mb-4">
                {{ feature.title }}
              </v-card-title>
              <v-card-text class="text-body-1">
                {{ feature.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </transition-group>
      </v-container>
    </v-sheet>

    <!-- Benefits Section -->
    <v-sheet class="py-16" :color="isDark ? 'grey-darken-4' : 'white'">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Por que o REVALIDA FLOW funciona?</h2>
        </div>
        <v-row>
          <v-col
            v-for="(benefit, i) in benefits"
            :key="i"
            cols="12"
            sm="6"
            md="3"
          >
            <v-card class="text-center pa-6 h-100 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105" flat variant="elevated">
              <v-icon :icon="benefit.icon" color="success" size="50" class="mb-4 transition-transform duration-300 hover:scale-110" />
              <v-card-title class="font-weight-semibold text-h6">
                {{ benefit.title }}
              </v-card-title>
              <v-card-text>
                {{ benefit.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- First Phase Features -->
    <v-sheet id="features" class="py-16" :color="isDark ? 'grey-darken-3' : 'grey-lighten-4'">
      <v-container>
        <div class="text-center mb-12">
          <v-chip color="info" variant="elevated" class="mb-4">
            <v-icon start icon="ri-number-1" />
            PRIMEIRA FASE
          </v-chip>
          <h2 class="text-h3 font-weight-bold mb-6">Preparação Completa para a 1ª Fase</h2>
          <p class="text-h6 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
            <strong>Adaptado ao novo formato 2025.2:</strong> Somente questões objetivas, sem prova discursiva!
          </p>
        </div>
        <v-row>
          <v-col
            v-for="(feature, i) in firstPhaseFeatures"
            :key="i"
            cols="12"
            sm="6"
            md="3"
          >
            <v-card class="text-center pa-6 h-100" :color="isDark ? 'grey-darken-2' : 'white'">
              <v-icon :icon="feature.icon" color="info" size="50" class="mb-4" />
              <v-card-title class="font-weight-semibold">
                {{ feature.title }}
              </v-card-title>
              <v-card-text>
                {{ feature.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- Second Phase Features -->
    <v-sheet class="py-16" :color="isDark ? 'grey-darken-4' : 'white'">
      <v-container>
        <div class="text-center mb-12">
          <v-chip color="secondary" variant="elevated" class="mb-4">
            <v-icon start icon="ri-number-2" />
            SEGUNDA FASE
          </v-chip>
          <h2 class="text-h3 font-weight-bold mb-6">Simulações de Habilidades Clínicas</h2>
          <p class="text-h6 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
            A única plataforma com <strong>TODAS as estações oficiais do INEP</strong> desde 2011 até 2025.1 + estações exclusivas criadas por médicos revalidados.
          </p>
        </div>
        <v-row>
          <v-col
            v-for="(feature, i) in secondPhaseFeatures"
            :key="i"
            cols="12"
            sm="6"
            md="3"
          >
            <v-card class="text-center pa-6 h-100" :color="isDark ? 'grey-darken-2' : 'grey-lighten-5'">
              <v-icon :icon="feature.icon" color="secondary" size="50" class="mb-4" />
              <v-card-title class="font-weight-semibold">
                {{ feature.title }}
              </v-card-title>
              <v-card-text>
                {{ feature.text }}
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- Video Demo Section -->
    <v-sheet class="py-16" color="primary" theme="dark">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Veja a Plataforma em Ação</h2>
          <p class="text-h6 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
            Descubra como o REVALIDA FLOW transforma seu estudo passivo em aprendizado ativo e eficiente.
          </p>
        </div>
        <v-row justify="center">
          <v-col cols="12" md="10">
            <v-card class="pa-4">
              <div class="video-placeholder text-center pa-16" style="background: linear-gradient(45deg, #f0f0f0, #e0e0e0); border-radius: 8px;">
                <v-icon icon="ri-play-circle-line" size="80" color="primary" class="mb-4" />
                <h3 class="text-h4 font-weight-bold mb-4 text-black">Demonstração da Técnica Feynman Ativo Interativo</h3>
                <p class="text-h6 text-black mb-6">Veja como funciona nossa IA que analisa seu raciocínio em tempo real</p>
                <v-btn color="primary" size="large" class="text-white hover:scale-105 transition-transform duration-300" variant="elevated">
                  <v-icon start icon="ri-play-line" class="transition-transform duration-300 hover:scale-110" />
                  Assistir Demonstração (3 min)
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
        <v-row class="mt-8">
          <v-col cols="12" sm="4">
            <div class="text-center">
              <v-icon icon="ri-mic-line" size="40" color="yellow" class="mb-2" />
              <h4 class="text-h6 font-weight-bold mb-2">1. Grave sua Explicação</h4>
              <p class="text-body-2">Explique casos clínicos em áudio</p>
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-center">
              <v-icon icon="ri-brain-line" size="40" color="yellow" class="mb-2" />
              <h4 class="text-h6 font-weight-bold mb-2">2. IA Analisa</h4>
              <p class="text-body-2">Feedback instantâneo e personalizado</p>
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-center">
              <v-icon icon="ri-trophy-line" size="40" color="yellow" class="mb-2" />
              <h4 class="text-h6 font-weight-bold mb-2">3. Domine o Conteúdo</h4>
              <p class="text-body-2">Aprenda de forma eficiente e duradoura</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-16" :style="{ backgroundColor: isDark ? '#1e1e1e' : '#f8f9fa' }">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Como Funciona em 3 Passos Simples</h2>
          <p class="text-h6 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
            Transforme seu estudo passivo em uma prática ativa e poderosa com nossa metodologia exclusiva.
          </p>
        </div>
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="text-center pa-8 h-100" color="info" variant="tonal">
              <div class="step-number mb-4">1</div>
              <v-icon icon="ri-mic-line" size="60" color="info" class="mb-4" />
              <h3 class="text-h4 font-weight-bold mb-4">FALE</h3>
              <p class="text-body-1">
                Escolha um caso clínico e grave sua resposta em áudio. Explique a fisiopatologia, diagnóstico e tratamento como se estivesse em uma prova oral.
              </p>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="text-center pa-8 h-100" color="warning" variant="tonal">
              <div class="step-number mb-4">2</div>
              <v-icon icon="ri-brain-line" size="60" color="warning" class="mb-4" />
              <h3 class="text-h4 font-weight-bold mb-4">RECEBA FEEDBACK</h3>
              <p class="text-body-1">
                Em segundos, nossa IA analisa sua explicação, identifica acertos, aponta falhas no raciocínio, e desafia você a simplificar pontos complexos.
              </p>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="text-center pa-8 h-100" color="success" variant="tonal">
              <div class="step-number mb-4">3</div>
              <v-icon icon="ri-trophy-line" size="60" color="success" class="mb-4" />
              <h3 class="text-h4 font-weight-bold mb-4">DOMINE</h3>
              <p class="text-body-1">
                Use o feedback para preencher lacunas de conhecimento. Faça uma pergunta final para a IA e solidifique o aprendizado.
              </p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Testimonials Section -->
    <v-sheet class="py-16" :color="isDark ? 'grey-darken-4' : 'grey-lighten-4'">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">O que nossos médicos revalidados dizem</h2>
          <p class="text-h6 font-weight-regular mb-8">
            Centenas de médicos já foram aprovados com nossa metodologia exclusiva
          </p>
        </div>
        <v-row>
          <v-col
            v-for="(testimonial, i) in testimonials"
            :key="i"
            cols="12"
            md="4"
          >
            <v-card class="pa-6 h-100" :color="isDark ? 'grey-darken-2' : 'white'">
              <div class="d-flex align-center mb-4">
                <div class="testimonial-avatar mr-4">{{ testimonial.avatar }}</div>
                <div>
                  <h4 class="font-weight-bold">{{ testimonial.name }}</h4>
                  <p class="text-body-2 text-grey">{{ testimonial.specialty }}</p>
                </div>
              </div>
              <div class="mb-4">
                <v-icon
                  v-for="star in testimonial.rating"
                  :key="star"
                  icon="ri-star-fill"
                  color="yellow-darken-2"
                  size="20"
                />
              </div>
              <p class="text-body-1">{{ testimonial.text }}</p>
            </v-card>
          </v-col>
        </v-row>
        <div class="text-center mt-8">
          <v-btn color="primary" size="large" to="/register" class="hover:scale-105 transition-transform duration-300" variant="elevated">
            <v-icon start icon="ri-user-add-line" class="transition-transform duration-300 hover:scale-110" />
            Junte-se a eles - 7 Dias Grátis
          </v-btn>
        </div>
      </v-container>
    </v-sheet>

    <!-- Pricing Section -->
    <v-sheet id="pricing" class="py-16" :color="isDark ? 'grey-darken-4' : 'white'">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Planos que Cabem no seu Bolso</h2>
          <p class="text-h6 font-weight-regular mb-8">
            Comece com 7 dias gratuitos, sem cartão de crédito
          </p>
        </div>
        <v-row justify="center">
          <v-col cols="12" md="4">
            <v-card class="pa-6 text-center h-100" :color="isDark ? 'grey-darken-2' : 'grey-lighten-5'">
              <h3 class="text-h4 font-weight-bold mb-4">Teste Gratuito</h3>
              <div class="text-h2 font-weight-bold text-success mb-2">R$ 0</div>
              <p class="text-body-2 mb-6">7 dias • Acesso completo</p>
              <v-list class="bg-transparent">
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Técnica Feynman IA</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Banco de questões completo</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Simulações ilimitadas</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Materiais de apoio</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-btn color="success" block size="large" class="mt-6" to="/register">
                Começar Agora
              </v-btn>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="pa-6 text-center h-100 position-relative" color="primary" theme="dark">
              <v-chip color="yellow" class="position-absolute" style="top: -12px; left: 50%; transform: translateX(-50%);">
                MAIS POPULAR
              </v-chip>
              <h3 class="text-h4 font-weight-bold mb-4 mt-4">Plano Mensal</h3>
              <div class="text-h2 font-weight-bold mb-2">R$ 97</div>
              <p class="text-body-2 mb-6">por mês • Acesso completo</p>
              <v-list class="bg-transparent">
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="yellow" />
                  </template>
                  <v-list-item-title>Tudo do plano gratuito</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="yellow" />
                  </template>
                  <v-list-item-title>Atores profissionais</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="yellow" />
                  </template>
                  <v-list-item-title>Suporte prioritário</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="yellow" />
                  </template>
                  <v-list-item-title>Cronograma personalizado</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-btn color="yellow" variant="elevated" block size="large" class="mt-6 text-black" to="/register">
                Assinar Agora
              </v-btn>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="pa-6 text-center h-100" :color="isDark ? 'grey-darken-2' : 'grey-lighten-5'">
              <h3 class="text-h4 font-weight-bold mb-4">Plano Anual</h3>
              <div class="d-flex justify-center align-baseline mb-2">
                <span class="text-h2 font-weight-bold text-success">R$ 597</span>
                <span class="text-body-2 text-decoration-line-through ml-2">R$ 1.164</span>
              </div>
              <p class="text-body-2 mb-2 text-success font-weight-bold">Economize R$ 567!</p>
              <p class="text-body-2 mb-6">por ano • 12x sem juros</p>
              <v-list class="bg-transparent">
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Tudo do plano mensal</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Mentoria individual</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Certificado de conclusão</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon icon="ri-check-line" color="success" />
                  </template>
                  <v-list-item-title>Acesso vitalício aos materiais</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-btn color="success" block size="large" class="mt-6" to="/register">
                Escolher Anual
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- FAQ Section -->
    <v-sheet id="faq" class="py-16" :color="isDark ? 'grey-darken-3' : 'grey-lighten-4'">
      <v-container>
        <div class="text-center mb-12">
          <h2 class="text-h3 font-weight-bold mb-6">Dúvidas Frequentes</h2>
          <p class="text-h6 font-weight-regular">
            Tire suas dúvidas sobre o REVALIDA FLOW
          </p>
        </div>
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-expansion-panels>
              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  Como funciona o teste gratuito de 7 dias?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Você tem acesso completo à plataforma por 7 dias, incluindo a Técnica Feynman IA, banco de questões, simulações e materiais. Não cobramos cartão de crédito - apenas seu email do Google é necessário.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  A plataforma está adaptada às mudanças do REVALIDA 2025.2?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Sim! Somos a primeira plataforma totalmente adaptada ao novo formato, que eliminou a prova discursiva da primeira fase. Nosso banco de questões está 100% alinhado com as mudanças do INEP.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  O que é a Técnica Feynman Ativo Interativo?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  É nossa metodologia exclusiva onde você explica casos clínicos em áudio, nossa IA analisa seu raciocínio em tempo real e fornece feedback personalizado. Isso aumenta a retenção em até 50% comparado ao estudo tradicional.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  Vocês têm todas as estações do INEP?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Sim! Somos a única plataforma com TODAS as estações oficiais do INEP desde 2011 até 2025.1, além de estações exclusivas criadas por médicos revalidados experientes.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  Como funcionam as simulações em tempo real?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Você participa de simulações ao vivo com outros candidatos e atores profissionais treinados. As sessões são idênticas ao formato da prova oficial, com cronômetro e avaliação em tempo real.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel>
                <v-expansion-panel-title class="text-h6 font-weight-bold">
                  Posso cancelar a qualquer momento?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Claro! Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento e continuará tendo acesso até o final do período pago.
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- Final CTA Section -->
    <v-sheet class="cta-section text-center py-16" color="success" theme="dark">
      <v-container>
        <h2 class="text-h2 font-weight-bold mb-6">
          Transforme sua preparação. Comece seu teste gratuito agora!
        </h2>
        <p class="text-h5 font-weight-regular mb-8 mx-auto" style="max-inline-size: 800px;">
          Pronto para destravar seu verdadeiro potencial? Cadastre-se e veja a diferença que a Técnica Feynman Ativo Interativo pode fazer na sua aprovação.
        </p>
        <div class="mb-6">
          <v-chip color="yellow" variant="elevated" size="large">
            <v-icon start icon="ri-time-line" />
            Oferta por tempo limitado - 7 dias grátis
          </v-chip>
        </div>
        <div class="d-flex ga-4 justify-center flex-wrap">
          <v-btn to="/register" color="yellow" size="x-large" class="text-black font-weight-bold">
            <v-icon start icon="ri-rocket-line" />
            Começar Agora - É Grátis
          </v-btn>
          <v-btn to="/login" variant="outlined" size="x-large" color="white">
            <v-icon start icon="ri-login-box-line" />
            Já tenho conta
          </v-btn>
        </div>
        <p class="text-body-2 mt-4 text-grey-lighten-2">
          Sem cartão de crédito • Acesso imediato • Cancele quando quiser
        </p>
      </v-container>
    </v-sheet>

    <!-- Footer -->
    <v-footer class="d-flex flex-column" color="grey-darken-4" theme="dark">
      <v-container>
        <v-row class="py-8">
          <v-col cols="12" md="4" class="text-center text-md-left">
            <div class="d-flex align-center justify-center justify-md-start mb-4">
              <img
                :src="revalidaFlowLogo"
                alt="REVALIDA FLOW Logo"
                style="height: 50px; width: auto;"
                class="mr-3"
              >
            </div>
            <p class="text-grey-lighten-1 mb-4">
              A primeira plataforma com Técnica Feynman IA para revalidação médica no Brasil.
            </p>
            <div class="d-flex ga-3 justify-center justify-md-start">
              <v-btn icon size="small" color="grey-lighten-1">
                <v-icon>ri-facebook-line</v-icon>
              </v-btn>
              <v-btn icon size="small" color="grey-lighten-1">
                <v-icon>ri-instagram-line</v-icon>
              </v-btn>
              <v-btn icon size="small" color="grey-lighten-1">
                <v-icon>ri-youtube-line</v-icon>
              </v-btn>
              <v-btn icon size="small" color="grey-lighten-1">
                <v-icon>ri-linkedin-line</v-icon>
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="2" class="text-center text-md-left">
            <h3 class="font-weight-bold text-white mb-4">Plataforma</h3>
            <v-list class="bg-transparent pa-0" density="compact">
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start" href="#features">
                  Recursos
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start" href="#pricing">
                  Planos
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start" to="/login">
                  Login
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start" to="/register">
                  Teste Grátis
                </v-btn>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" sm="6" md="2" class="text-center text-md-left">
            <h3 class="font-weight-bold text-white mb-4">Suporte</h3>
            <v-list class="bg-transparent pa-0" density="compact">
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start" href="#faq">
                  FAQ
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start">
                  Contato
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start">
                  WhatsApp
                </v-btn>
              </v-list-item>
              <v-list-item class="pa-0">
                <v-btn variant="text" color="grey-lighten-1" class="pa-0 justify-start">
                  Tutorial
                </v-btn>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="4" class="text-center text-md-left">
            <h3 class="font-weight-bold text-white mb-4">Newsletter</h3>
            <p class="text-grey-lighten-1 mb-4">
              Receba dicas exclusivas e atualizações sobre o REVALIDA
            </p>
            <div class="d-flex ga-2">
              <v-text-field
                placeholder="Seu email"
                variant="outlined"
                density="compact"
                hide-details
                class="flex-grow-1"
              />
              <v-btn color="primary" size="small">
                Inscrever
              </v-btn>
            </div>
          </v-col>
        </v-row>
        <v-divider class="my-4" />
        <v-row align="center">
          <v-col cols="12" md="6" class="text-center text-md-left">
            <p class="text-grey-lighten-1 ma-0">
              &copy; {{ new Date().getFullYear() }} REVALIDA FLOW — Todos os direitos reservados.
            </p>
          </v-col>
          <v-col cols="12" md="6" class="text-center text-md-right">
            <div class="d-flex ga-4 justify-center justify-md-end">
              <v-btn variant="text" color="grey-lighten-1" size="small">
                Termos de Uso
              </v-btn>
              <v-btn variant="text" color="grey-lighten-1" size="small">
                Política de Privacidade
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>
  </div>
</template>

<style scoped lang="scss">
// Import professional fonts
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap');

.landing-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow-x: hidden;
  letter-spacing: -0.02em;
}

// Premium Header Design
.premium-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(10, 10, 11, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
    max-width: 1400px;
  }

  .brand-section {
    flex: 1;

    .logo-container {
      display: flex;
      align-items: center;

      .brand-logo {
        height: 42px;
        width: auto;
        filter: brightness(1.1) contrast(1.1);
        transition: all 0.3s ease;

        &:hover {
          filter: brightness(1.2) contrast(1.2);
          transform: scale(1.02);
        }
      }

      .tech-logo-container {
        height: 50px;
        width: 50px;
        margin-left: 1rem;
        border: 2px solid rgba(255, 255, 255, 0.2);
        filter: brightness(1.1) contrast(1.1);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          border-color: rgba(255, 255, 255, 0.5);
          filter: brightness(1.3) contrast(1.3);
          transform: scale(1.05);
        }
      }
    }
  }

  .desktop-nav {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    flex: 2;
    justify-content: center;

    .nav-link {
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      padding: 0.5rem 0;
      position: relative;
      transition: all 0.3s ease;
      letter-spacing: 0.01em;

      &:hover {
        color: #ffffff;
        transform: translateY(-1px);
      }

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #007bff, #00d4ff);
        transition: width 0.3s ease;
      }

      &:hover::after {
        width: 100%;
      }
    }
  }

  .auth-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1.5rem;

    .login-btn {
      color: rgba(255, 255, 255, 0.9) !important;
      font-weight: 500 !important;
      transition: all 0.3s ease !important;

      &:hover {
        color: #ffffff !important;
        background: rgba(255, 255, 255, 0.1) !important;
      }
    }

    .custom-trial-btn {
      position: relative;
      background: linear-gradient(135deg, #007bff 0%, #00d4ff 100%);
      color: #ffffff;
      padding: 0.75rem 1.75rem;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(0, 123, 255, 0.4);
      }

      .trial-text {
        position: relative;
        z-index: 2;
        letter-spacing: 0.02em;
      }

      .trial-shine {
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.6s ease;
      }

      &:hover .trial-shine {
        left: 100%;
      }
    }
  }

  .mobile-menu-btn {
    color: white !important;
  }
}

// Professional Hero Section
.hero-section {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #0a0a0b;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 35%, #0f0f0f 100%);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 20% 50%, rgba(0, 123, 255, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(138, 43, 226, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(255, 0, 150, 0.1) 0%, transparent 50%);
    animation: backgroundShift 8s ease-in-out infinite alternate;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
      linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.01) 25%, rgba(255,255,255,0.01) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.01) 75%);
    background-size: 60px 60px;
    opacity: 0.5;
  }
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.3) 100%
  );
  z-index: 1;
}

.hero-content {
  position: relative;
  z-index: 2;
  padding-top: 100px;
}

// Professional Typography & Components
.hero-text-content {
  padding: 0 2rem;
  text-align: center;
}

// Brand Title Redesign
.brand-title-wrapper {
  margin-bottom: 2rem;

  .brand-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(3.5rem, 10vw, 7rem);
    font-weight: 900;
    line-height: 0.85;
    margin: 0 0 1rem 0;
    letter-spacing: -0.03em;
    text-transform: uppercase;

    .revalida-text {
      background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      text-shadow: 0 0 60px rgba(255, 255, 255, 0.4);
    }

    .flow-text {
      background: linear-gradient(135deg, #007bff 0%, #00d4ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      text-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
      margin-left: 0.2em;
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #007bff, #00d4ff);
        border-radius: 2px;
        animation: pulseGlow 2s ease-in-out infinite;
      }
    }
  }

  .brand-tagline {
    font-family: 'Inter', sans-serif;
    font-size: clamp(0.9rem, 2vw, 1.1rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0.1em;
    text-transform: uppercase;

    .tagline-highlight {
      color: #00d4ff;
      font-weight: 600;
    }
  }
}

// Unique Features Grid
.unique-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 3rem 0;

  .feature-highlight {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 1.5rem;
    backdrop-filter: blur(20px);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      border-color: rgba(0, 212, 255, 0.3);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .feature-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
    }

    .feature-content {
      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0 0 0.25rem 0;
        line-height: 1.2;
      }

      p {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
        line-height: 1.4;
      }
    }
  }
}

// Custom CTA Buttons
.hero-cta-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  margin: 3rem 0;

  .primary-cta-custom {
    position: relative;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: #ffffff;
    padding: 1.25rem 3rem;
    border-radius: 50px;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 1rem;

    &:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 12px 35px rgba(0, 123, 255, 0.6);
    }

    .cta-bg-effect {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.6s ease;
    }

    &:hover .cta-bg-effect {
      left: 100%;
    }

    .cta-text {
      position: relative;
      z-index: 2;
    }

    .cta-arrow {
      position: relative;
      z-index: 2;
      font-size: 1.2rem;
      transition: transform 0.3s ease;
    }

    &:hover .cta-arrow {
      transform: translateX(4px);
    }
  }

  .secondary-cta-custom {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.75rem 0;
    position: relative;
    transition: all 0.3s ease;

    &:hover {
      color: #ffffff;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, #007bff, #00d4ff);
      transition: width 0.3s ease;
    }

    &:hover::after {
      width: 100%;
    }
  }
}

// Hero Stats Grid
.hero-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 2rem;
  padding: 3rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  .stat-item {
    text-align: center;

    .stat-number {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00d4ff 0%, #007bff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
      letter-spacing: 0.02em;
    }
  }
}

.premium-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  backdrop-filter: blur(20px);
  animation: pulseGlow 3s ease-in-out infinite;

  .badge-icon {
    font-size: 1.2rem;
  }

  .badge-text {
    color: #ffffff;
    font-weight: 600;
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
}

.hero-main-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(3rem, 8vw, 5.5rem);
  font-weight: 800;
  line-height: 0.9;
  margin: 0;
  letter-spacing: -0.04em;

  .title-gradient {
    background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
    text-shadow: 0 0 40px rgba(255, 255, 255, 0.3);
  }
}

.hero-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  margin: 1rem 0 0 0;
  letter-spacing: 0.02em;
}

.title-underline {
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, #007bff, #8a2be2);
  border-radius: 2px;
  margin: 2rem 0;
  animation: slideIn 1s ease-out 0.5s both;
}

.value-prop-text {
  font-size: clamp(1.1rem, 2.5vw, 1.3rem);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
  margin: 0;

  .highlight-text {
    color: #00d4ff;
    font-weight: 600;
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
  }
}

.premium-offer-card {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(138, 43, 226, 0.05));
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  .offer-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .offer-icon {
    font-size: 2rem;
    animation: bounce 2s infinite;
  }

  .offer-title {
    color: #ffffff;
    font-weight: 700;
    font-size: 1.25rem;
    margin-bottom: 0.25rem;
  }

  .offer-subtitle {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 400;
  }
}

.hero-cta-buttons {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;

  .primary-cta {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: transform 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    .custom-button {
      width: 60px;
      height: 60px;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
      transition: all 0.3s ease;

      &:hover {
        filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.4));
        transform: scale(1.05);
      }
    }

    .cta-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
    }
  }

  .secondary-cta {
    border: 2px solid rgba(255, 255, 255, 0.3) !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    padding: 1rem 2rem !important;
    border-radius: 12px !important;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease !important;

    &:hover {
      border-color: rgba(255, 255, 255, 0.6) !important;
      background: rgba(255, 255, 255, 0.1) !important;
      transform: translateY(-2px);
    }
  }
}

// Tech Showcase
.tech-showcase {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  .tech-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
    animation: float 6s ease-in-out infinite;
  }

  .floating-stats {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .stat-bubble {
    position: absolute;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 16px;
    padding: 1rem;
    backdrop-filter: blur(20px);
    text-align: center;
    animation: floatBubble 4s ease-in-out infinite;

    .stat-number {
      font-weight: 800;
      font-size: 1.5rem;
      color: #ffffff;
      display: block;
    }

    .stat-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 500;
    }

    &.stat-1 {
      top: 20%;
      left: -10%;
      animation-delay: 0s;
    }

    &.stat-2 {
      top: 60%;
      right: -15%;
      animation-delay: 1s;
    }

    &.stat-3 {
      bottom: 10%;
      left: 10%;
      animation-delay: 2s;
    }
  }
}

// Features Grid
.features-grid-section {
  margin-top: 6rem;
  margin-bottom: 4rem;

  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 1rem;
  }

  .section-subtitle {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 400;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem 0;
}

.feature-card-pro {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 2rem;
  position: relative;
  backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideUp 0.8s ease-out both;

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(0, 212, 255, 0.4);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .feature-badge-pro {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: linear-gradient(135deg, #007bff, #8a2be2);
    color: #ffffff;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .feature-icon-pro {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(138, 43, 226, 0.1));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: #00d4ff;
  }

  .feature-title-pro {
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 0.75rem;
  }

  .feature-desc-pro {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
    font-size: 0.95rem;
  }
}

// Social Proof Section
.social-proof-section {
  margin-top: 6rem;
  margin-bottom: 2rem;

  .social-proof-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    padding: 3rem 2rem;
    backdrop-filter: blur(20px);
    text-align: center;
  }

  .proof-stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;

    .proof-stat {
      text-align: center;

      .proof-number {
        display: block;
        font-size: 2.5rem;
        font-weight: 800;
        color: #00d4ff;
        text-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
      }

      .proof-label {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
      }
    }
  }

  .proof-title {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 1rem;
  }

  .proof-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }

  .proof-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    cursor: pointer;
    transition: transform 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    .custom-button-small {
      width: 50px;
      height: 50px;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }

    .proof-cta-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.05em;
    }
  }
}

.hero-badge {
  animation: pulse 2s infinite;
}

.free-trial-highlight {
  animation: glow 3s ease-in-out infinite alternate;
}

.medical-illustration {
  position: relative;
  block-size: 400px;
  inline-size: 400px;
}

.medical-illustration div {
  position: absolute;
  animation: float 4s ease-in-out infinite;
  font-size: 4rem;
  opacity: 0.9;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
}

.stethoscope {
  animation-delay: 0s;
  inset-block-start: 10%;
  inset-inline-start: 10%;
}

.brain {
  animation-delay: 1s;
  inset-block-start: 15%;
  inset-inline-end: 10%;
}

.microphone {
  animation-delay: 2s;
  inset-block-start: 60%;
  inset-inline-start: 15%;
}

.chart {
  animation-delay: 3s;
  inset-block-end: 10%;
  inset-inline-end: 20%;
}

.feature-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: bold;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
  color: #1a1a1a;
  border-radius: 50%;
  font-size: 2rem;
  font-weight: bold;
  margin: 0 auto;
}

.testimonial-avatar {
  font-size: 3rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
}

.video-placeholder {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.video-placeholder:hover {
  transform: scale(1.02);
}

// New Hero Section Styles
.stat-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 215, 0, 0.3);
}

.feature-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
  transform: translateY(30px);
}

.feature-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 215, 0, 0.2);
}

.feature-icon-container {
  position: relative;
}

.feature-icon {
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon {
  transform: scale(1.2);
  filter: drop-shadow(0 0 10px currentColor);
}

.hero-cta-bottom {
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.hero-cta-bottom:hover {
  border-color: rgba(255, 215, 0, 0.3);
  background: rgba(0,0,0,0.3) !important;
}

// Staggered animations for feature cards
@for $i from 1 through 6 {
  .feature-card:nth-child(#{$i}) {
    animation-delay: #{$i * 0.1}s;
  }
}

// Professional Animations
@keyframes backgroundShift {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(-20px) translateY(-20px);
  }
}

@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  }
}

@keyframes slideIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 80px;
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.02);
  }
}

@keyframes floatBubble {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Scroll animations
.v-card, .v-chip {
  transition: all 0.3s ease;
}

.v-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

// Professional Responsive Design
@media (max-width: 1200px) {
  .hero-content {
    padding-top: 80px;
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .premium-header {
    .header-container {
      gap: 1rem;
    }

    .desktop-nav {
      gap: 2rem;
    }

    .auth-section {
      gap: 1rem;
    }
  }

  .unique-features-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
  }
}

@media (max-width: 992px) {
  .hero-text-content {
    padding: 0 1rem;
  }

  .brand-title {
    font-size: clamp(2.5rem, 8vw, 5rem) !important;
  }

  .unique-features-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;

    .feature-highlight {
      padding: 1.25rem;

      .feature-icon {
        font-size: 2rem;
      }
    }
  }

  .hero-cta-buttons {
    gap: 1.5rem;

    .primary-cta-custom {
      padding: 1rem 2.5rem;
      font-size: 1rem;
    }
  }

  .hero-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;

    .stat-item .stat-number {
      font-size: 2rem;
    }
  }

  .features-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .proof-stats {
    gap: 2rem;

    .proof-stat .proof-number {
      font-size: 2rem;
    }
  }

  .social-proof-card {
    padding: 2rem 1.5rem;
  }
}

@media (max-width: 768px) {
  .hero-content {
    padding-top: 60px;
  }

  .brand-title {
    font-size: clamp(2rem, 7vw, 4rem) !important;
    line-height: 0.9 !important;
  }

  .hero-subtitle {
    font-size: clamp(1rem, 2.5vw, 1.2rem);
  }

  .unique-features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;

    .feature-highlight {
      padding: 1rem;
      flex-direction: column;
      text-align: center;

      .feature-icon {
        font-size: 2.5rem;
      }
    }
  }

  .hero-cta-buttons {
    flex-direction: column;
    gap: 1rem;
    width: 100%;

    .primary-cta-custom {
      width: 100%;
      justify-content: center;
      padding: 1rem 2rem;
    }
  }

  .hero-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 2rem 0;

    .stat-item .stat-number {
      font-size: 1.75rem;
    }
  }

  .premium-offer-card {
    padding: 1.25rem;

    .offer-content {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .feature-card-pro {
    padding: 1.5rem;
  }

  .proof-stats {
    flex-direction: column;
    gap: 1.5rem;

    .proof-stat .proof-number {
      font-size: 1.75rem;
    }
  }

  .section-title {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
  }
}

@media (max-width: 480px) {
  .hero-text-content {
    padding: 0 0.75rem;
  }

  .premium-badge {
    padding: 0.5rem 1rem;
    gap: 0.5rem;

    .badge-text {
      font-size: 0.75rem;
    }
  }

  .hero-main-title {
    font-size: clamp(1.75rem, 5vw, 2.75rem);
  }

  .title-underline {
    width: 60px;
    margin: 1.5rem auto;
  }

  .hero-cta-buttons {
    flex-direction: column;
    gap: 1rem;
    width: 100%;

    .primary-cta, .secondary-cta {
      width: 100%;
      justify-content: center;
    }

    .secondary-cta {
      padding: 0.75rem 1.5rem !important;
    }
  }

  .feature-card-pro {
    padding: 1.25rem;

    .feature-icon-pro {
      width: 56px;
      height: 56px;
    }

    .feature-title-pro {
      font-size: 1.1rem;
    }

    .feature-desc-pro {
      font-size: 0.9rem;
    }
  }

  .social-proof-card {
    padding: 1.5rem 1rem;
  }

  .proof-title {
    font-size: 1.5rem;
  }

  .proof-subtitle {
    font-size: 1rem;
  }

  .proof-cta {
    flex-direction: column;
    gap: 0.75rem;

    .proof-cta-text {
      font-size: 0.9rem;
    }
  }
}

// Dark mode optimizations
@media (prefers-color-scheme: light) {
  .header-nav {
    background: rgba(255, 255, 255, 0.98) !important;
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }
}

// Smooth scrolling for anchor links
html {
  scroll-behavior: smooth;
}

// Custom scrollbar
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%);
}

// Vue Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
