<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <nav class="navbar">
        <div class="container nav-content">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="logo-text">StationFlow</span>
          </div>
          <div class="nav-links">
            <a href="#features">Recursos</a>
            <a href="#how-it-works">Como Funciona</a>
            <a href="#pricing">Preços</a>
            <button @click="navigateToApp" class="btn-primary">Acessar App</button>
          </div>
        </div>
      </nav>

      <div class="container hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            Gestão Inteligente de <span class="gradient-text">Postos de Combustível</span>
          </h1>
          <p class="hero-description">
            Monitore seus tanques em tempo real, previna desabastecimentos e otimize suas operações com inteligência artificial.
          </p>
          <div class="hero-actions">
            <button @click="navigateToApp" class="btn-primary-large">
              Começar Agora
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-secondary-large">
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
              </svg>
              Ver Demo
            </button>
          </div>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">98%</div>
              <div class="stat-label">Precisão</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">24/7</div>
              <div class="stat-label">Monitoramento</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">-40%</div>
              <div class="stat-label">Custos</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="dashboard-preview">
            <div class="preview-header">
              <div class="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <div class="preview-title">Dashboard em Tempo Real</div>
            </div>
            <div class="preview-content">
              <div class="tank-cards">
                <div class="tank-card" v-for="tank in demoTanks" :key="tank.id">
                  <div class="tank-header">
                    <span class="tank-name">{{ tank.name }}</span>
                    <span :class="['tank-status', tank.status]">{{ tank.statusText }}</span>
                  </div>
                  <div class="tank-level">
                    <div class="level-bar">
                      <div class="level-fill" :style="{ width: tank.level + '%', backgroundColor: tank.color }"></div>
                    </div>
                    <span class="level-text">{{ tank.level }}%</span>
                  </div>
                  <div class="tank-info">
                    <span>{{ tank.volume }}L</span>
                    <span>{{ tank.forecast }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Recursos Poderosos</h2>
          <p class="section-description">Tudo que você precisa para gerenciar seu posto de forma eficiente</p>
        </div>
        <div class="features-grid">
          <div class="feature-card" v-for="feature in features" :key="feature.title">
            <div class="feature-icon" :style="{ backgroundColor: feature.color + '20', color: feature.color }">
              <component :is="feature.icon" />
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="how-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Como Funciona</h2>
          <p class="section-description">Simples, rápido e eficiente</p>
        </div>
        <div class="steps-grid">
          <div class="step-card" v-for="(step, index) in steps" :key="index">
            <div class="step-number">{{ index + 1 }}</div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-description">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Planos e Preços</h2>
          <p class="section-description">Escolha o plano ideal para seu negócio</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card" v-for="plan in plans" :key="plan.name" :class="{ featured: plan.featured }">
            <div v-if="plan.featured" class="featured-badge">Mais Popular</div>
            <h3 class="plan-name">{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="currency">R$</span>
              <span class="amount">{{ plan.price }}</span>
              <span class="period">/mês</span>
            </div>
            <ul class="plan-features">
              <li v-for="feature in plan.features" :key="feature">
                <svg class="check-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ feature }}
              </li>
            </ul>
            <button @click="navigateToApp" :class="['btn-plan', plan.featured ? 'btn-primary-large' : 'btn-secondary-large']">
              Começar Agora
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container cta-content">
        <h2 class="cta-title">Pronto para Transformar seu Posto?</h2>
        <p class="cta-description">Comece hoje e veja os resultados em tempo real</p>
        <button @click="navigateToApp" class="btn-primary-large">
          Começar Gratuitamente
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container footer-content">
        <div class="footer-section">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="logo-text">StationFlow</span>
          </div>
          <p class="footer-description">Gestão inteligente para postos de combustível</p>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h4>Produto</h4>
            <a href="#features">Recursos</a>
            <a href="#pricing">Preços</a>
            <a href="#how-it-works">Como Funciona</a>
          </div>
          <div class="footer-column">
            <h4>Empresa</h4>
            <a href="#">Sobre</a>
            <a href="#">Contato</a>
            <a href="#">Blog</a>
          </div>
          <div class="footer-column">
            <h4>Legal</h4>
            <a href="#">Privacidade</a>
            <a href="#">Termos</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 StationFlow. Todos os direitos reservados.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const demoTanks = ref([
  { id: 1, name: 'Gasolina Comum', level: 75, volume: 15000, status: 'ok', statusText: 'Normal', color: '#10b981', forecast: '5 dias' },
  { id: 2, name: 'Etanol', level: 45, volume: 9000, status: 'warning', statusText: 'Atenção', color: '#f59e0b', forecast: '3 dias' },
  { id: 3, name: 'Diesel S10', level: 20, volume: 4000, status: 'critical', statusText: 'Crítico', color: '#ef4444', forecast: '1 dia' }
]);

const features = ref([
  {
    title: 'Monitoramento em Tempo Real',
    description: 'Acompanhe o nível de todos os tanques em tempo real com atualização automática',
    color: '#3b82f6',
    icon: 'MonitorIcon'
  },
  {
    title: 'Previsão Inteligente',
    description: 'IA prevê quando você ficará sem combustível com base no histórico de consumo',
    color: '#8b5cf6',
    icon: 'BrainIcon'
  },
  {
    title: 'Alertas Automáticos',
    description: 'Receba notificações antes que o tanque atinja níveis críticos',
    color: '#ef4444',
    icon: 'BellIcon'
  },
  {
    title: 'Relatórios Completos',
    description: 'Análises detalhadas de consumo, vendas e eficiência operacional',
    color: '#10b981',
    icon: 'ChartIcon'
  },
  {
    title: 'Gestão Multi-Postos',
    description: 'Gerencie múltiplos postos a partir de um único dashboard',
    color: '#f59e0b',
    icon: 'MapIcon'
  },
  {
    title: 'Integração com Bombas',
    description: 'Conexão direta com bombas e sistemas de automação',
    color: '#06b6d4',
    icon: 'PlugIcon'
  }
]);

const steps = ref([
  {
    title: 'Configure seus Tanques',
    description: 'Adicione informações sobre capacidade, tipo de combustível e níveis mínimos'
  },
  {
    title: 'Conecte os Sensores',
    description: 'Integre com seus medidores ou insira dados manualmente'
  },
  {
    title: 'Monitore e Otimize',
    description: 'Acompanhe em tempo real e receba insights para melhorar suas operações'
  }
]);

const plans = ref([
  {
    name: 'Básico',
    price: '99',
    featured: false,
    features: [
      'Até 3 tanques',
      'Monitoramento básico',
      'Relatórios semanais',
      'Suporte por email'
    ]
  },
  {
    name: 'Profissional',
    price: '299',
    featured: true,
    features: [
      'Até 10 tanques',
      'Monitoramento em tempo real',
      'IA e previsões avançadas',
      'Alertas personalizados',
      'Relatórios diários',
      'Suporte prioritário'
    ]
  },
  {
    name: 'Enterprise',
    price: '699',
    featured: false,
    features: [
      'Tanques ilimitados',
      'Multi-postos',
      'API completa',
      'Integração personalizada',
      'Treinamento dedicado',
      'Suporte 24/7'
    ]
  }
]);

const navigateToApp = () => {
  router.push('/app');
};
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f172a, #1e293b);
  color: white;
}

/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1000;
  padding: 1rem 0;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: #3b82f6;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links a {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: white;
}

/* Hero Section */
.hero-section {
  padding: 8rem 0 4rem;
  overflow: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.btn-primary, .btn-primary-large {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.3s, box-shadow 0.3s;
}

.btn-primary-large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

.btn-primary:hover, .btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
}

.btn-secondary-large {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s;
}

.btn-secondary-large:hover {
  background: rgba(255, 255, 255, 0.2);
}

.icon {
  width: 20px;
  height: 20px;
}

.stats {
  display: flex;
  gap: 3rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
}

/* Dashboard Preview */
.dashboard-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.preview-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.preview-dots {
  display: flex;
  gap: 0.5rem;
}

.preview-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.preview-title {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.preview-content {
  padding: 1.5rem;
}

.tank-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tank-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
}

.tank-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tank-name {
  font-weight: 600;
}

.tank-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tank-status.ok { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.tank-status.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.tank-status.critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.tank-level {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.level-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
}

.level-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s;
}

.level-text {
  font-weight: 600;
  min-width: 50px;
}

.tank-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Features Section */
.features-section, .how-section, .pricing-section {
  padding: 6rem 0;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.section-description {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.6);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.feature-description {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

/* Steps Section */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
}

.step-card {
  text-align: center;
}

.step-number {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 auto 1.5rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.step-description {
  color: rgba(255, 255, 255, 0.7);
}

/* Pricing Section */
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.pricing-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
  position: relative;
  transition: transform 0.3s;
}

.pricing-card.featured {
  border-color: #3b82f6;
  transform: scale(1.05);
}

.featured-badge {
  position: absolute;
  top: -12px;
  right: 2rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.plan-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 2rem;
}

.currency {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.6);
}

.amount {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0.25rem;
}

.period {
  color: rgba(255, 255, 255, 0.6);
}

.plan-features {
  list-style: none;
  margin-bottom: 2rem;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
}

.check-icon {
  width: 20px;
  height: 20px;
  color: #10b981;
}

.btn-plan {
  width: 100%;
}

/* CTA Section */
.cta-section {
  padding: 6rem 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

.cta-content {
  text-align: center;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-description {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

/* Footer */
.footer {
  background: rgba(0, 0, 0, 0.2);
  padding: 4rem 0 2rem;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 4rem;
  margin-bottom: 2rem;
}

.footer-description {
  color: rgba(255, 255, 255, 0.6);
  margin-top: 1rem;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.footer-column h4 {
  font-weight: 600;
  margin-bottom: 1rem;
}

.footer-column a {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s;
}

.footer-column a:hover {
  color: white;
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-content, .features-grid, .steps-grid, .pricing-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .nav-links {
    display: none;
  }
}
</style>
