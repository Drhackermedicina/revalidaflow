<script setup>
import { currentUser, waitForAuth } from '@/plugins/auth'
import revalidaFacilLogo from '@images/revalidafacillogo.png'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'

const vuetifyTheme = useTheme()
const router = useRouter()
const isDark = computed(() => vuetifyTheme.global.name.value === 'dark')

// Redireciona para o dashboard se já estiver autenticado
onMounted(async () => {
  await waitForAuth()
  if (currentUser.value) {
    router.replace('/app/dashboard') 
  }
})

const features = [
  { icon: 'ri-flask-line', title: 'Simulação Realista', text: 'Estações clínicas que reproduzem cenários reais do exercício médico, com pacientes simulados e situações autênticas.' },
  { icon: 'ri-time-line', title: 'Tempo Controlado', text: 'Pratique sob pressão temporal real, com cronômetro e gestão de tempo igual ao exame oficial do REVALIDA.' },
  { icon: 'ri-file-text-line', title: 'Avaliação Profissional', text: 'Receba feedback detalhado de avaliadores qualificados usando critérios oficiais do exame REVALIDA.' },
  { icon: 'ri-bar-chart-2-line', title: 'Relatórios Detalhados', text: 'Acompanhe seu progresso com relatórios completos de performance e áreas para melhoria.' },
  { icon: 'ri-global-line', title: 'Acesso Online', text: 'Participe de simulações de qualquer lugar, conectando-se com outros candidatos e avaliadores.' },
  { icon: 'ri-focus-3-line', title: 'Foco no REVALIDA', text: 'Conteúdo específico e atualizado conforme as diretrizes mais recentes do exame de revalidação médica.' },
]

const steps = [
  { icon: 'ri-user-add-line', title: 'Cadastre-se', text: 'Crie sua conta gratuita e acesse a plataforma de simulações médicas.' },
  { icon: 'ri-list-check-2', title: 'Escolha uma Estação', text: 'Selecione entre diversas estações clínicas disponíveis para praticar.' },
  { icon: 'ri-group-line', title: 'Conecte-se', text: 'Entre em uma sessão de simulação com outros candidatos e avaliadores.' },
  { icon: 'ri-user-voice-line', title: 'Pratique', text: 'Realize a simulação seguindo as instruções e interagindo com o paciente simulado.' },
  { icon: 'ri-feedback-line', title: 'Receba Feedback', text: 'Obtenha avaliação detalhada e dicas para melhorar sua performance.' },
]
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <v-sheet
      class="hero-section d-flex align-center"
      theme="dark"
      height="100vh"
    >
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="6" class="text-center text-md-left">
            <h1 class="hero-title text-h2 font-weight-bold mb-4">
              <span class="highlight">REVALIDA FÁCIL</span>
              <br>
              Sua plataforma de simulação médica
            </h1>
            <p class="hero-description text-h6 font-weight-regular mb-8">
              Prepare-se para o exame REVALIDA com simulações realistas e avaliação profissional. Nossa plataforma oferece estações clínicas interativas que simulam situações reais do exercício da medicina no Brasil.
            </p>
            <div class="d-flex ga-4 justify-center justify-md-start">
              <v-btn
                to="/login"
                color="primary"
                size="x-large"
              >
                <v-icon start icon="ri-login-box-line" />
                Fazer Login
              </v-btn>
              <v-btn
                to="/register"
                variant="outlined"
                size="x-large"
              >
                Criar Conta
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" md="6" class="d-none d-md-flex justify-center align-center">
            <div class="medical-illustration">
              <div class="stethoscope">🩺</div>
              <div class="chart">📊</div>
              <div class="clipboard">📋</div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <!-- Features Section -->
    <v-sheet id="features" class="py-16" :color="isDark ? 'grey-darken-4' : 'grey-lighten-4'">
      <v-container>
        <h2 class="text-h3 font-weight-bold text-center mb-12">
          Como Funciona o REVALIDA FÁCIL
        </h2>
        <v-row>
          <v-col
            v-for="(feature, i) in features"
            :key="i"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card class="text-center pa-6" flat>
              <v-icon :icon="feature.icon" color="primary" size="50" class="mb-4" />
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

    <!-- How It Works Section -->
    <section id="how-it-works" class="py-16">
      <v-container>
        <h2 class="text-h3 font-weight-bold text-center mb-12">
          Como Participar das Simulações
        </h2>
        <v-timeline align="start" side="end">
          <v-timeline-item
            v-for="(step, i) in steps"
            :key="i"
            :dot-color="i % 2 === 0 ? 'primary' : 'secondary'"
            size="large"
          >
            <template #icon>
              <v-icon :icon="step.icon" />
            </template>
            <v-card>
              <v-card-title>{{ i + 1 }}. {{ step.title }}</v-card-title>
              <v-card-text>{{ step.text }}</v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-container>
    </section>

    <!-- CTA Section -->
    <v-sheet class="cta-section text-center py-16" theme="dark">
      <v-container>
        <h2 class="text-h3 font-weight-bold mb-4">
          Pronto para Começar sua Preparação?
        </h2>
        <p class="text-h6 font-weight-regular mb-8 mx-auto" style="max-inline-size: 700px;">
          Junte-se a centenas de médicos que já estão se preparando para o REVALIDA com nossa plataforma.
        </p>
        <div class="d-flex ga-4 justify-center flex-wrap">
          <v-btn to="/register" color="white" size="x-large">
            Começar Agora - É Grátis
          </v-btn>
          <v-btn to="/login" variant="outlined" size="x-large">
            Já tenho conta
          </v-btn>
        </div>
      </v-container>
    </v-sheet>

    <!-- Footer -->
    <v-footer class="d-flex flex-column" color="grey-darken-4">
      <v-container>
        <v-row justify="space-between" align="center" class="py-4">
          <v-col cols="12" md="4" class="text-center text-md-left">
             <div class="d-flex align-center justify-center justify-md-start mb-4">
                <RouterLink
                  to="/app/dashboard"
                  class="d-flex align-center gap-3"
                >
                  <img
                    :src="revalidaFacilLogo"
                    alt="Revalida Fácil Logo"
                    style="block-size: 40px;"
                  >
                  <h2 class="font-weight-medium text-2xl text-uppercase">
                    REVALIDA FÁCIL
                  </h2>
                </RouterLink>
            </div>
            <p class="text-grey-lighten-1">
              Sua preparação para o exame de revalidação médica.
            </p>
          </v-col>
        </v-row>
        <v-divider />
        <div class="text-center pa-4">
          &copy; {{ new Date().getFullYear() }} REVALIDA FÁCIL — Todos os direitos reservados.
        </div>
      </v-container>
    </v-footer>
  </div>
</template>

<style scoped lang="scss">
.landing-page {
  font-family: Inter, sans-serif;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cta-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-title .highlight {
  color: #ffd700;
}

.medical-illustration {
  position: relative;
  block-size: 350px;
  inline-size: 350px;
}

.medical-illustration div {
  position: absolute;
  animation: float 4s ease-in-out infinite;
  font-size: 4rem;
  opacity: 0.8;
}

.stethoscope {
  animation-delay: 0s;
  inset-block-start: 15%;
  inset-inline-start: 15%;
}

.chart {
  animation-delay: 1.5s;
  inset-block-start: 25%;
  inset-inline-end: 15%;
}

.clipboard {
  animation-delay: 2.5s;
  inset-block-end: 20%;
  inset-inline-start: 45%;
  transform: translateX(-50%);
}

@keyframes float {
  0%,
  100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}
</style>
