<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <nav class="navbar">
        <div class="container nav-content">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="logo-text">RevalidaFlow</span>
          </div>
          <div class="nav-links">
            <router-link to="/recursos">Recursos</router-link>
            <router-link to="/como-funciona">Como Funciona</router-link>
            <router-link to="/estacoes">Estações</router-link>
            <router-link to="/precos">Preços</router-link>
            <button @click="navigateToLogin" class="btn-primary">Fazer Login</button>
            <button @click="navigateToRegister" class="btn-secondary">Cadastrar</button>
          </div>
        </div>
      </nav>

      <div class="container hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            Conquiste a <span class="gradient-text">Aprovação no Revalida</span> 2ª Fase - Prova Prática
          </h1>
          <p class="hero-description">
            Prepare-se para o exame do INEP com simulações realistas de estações clínicas das 5 grandes áreas médicas e questões discursivas. 
            Avaliação em tempo real por IA com feedback detalhado e atores profissionais.
          </p>
          <div class="hero-actions">
            <button @click="navigateToRegister" class="btn-primary-large">
              Começar Gratuitamente
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button @click="scrollToDemo" class="btn-secondary-large">
              <svg class="icon" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <polygon points="10,8 16,12 10,16" fill="currentColor"/>
              </svg>
              Ver Demonstração
            </button>
          </div>
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">500+</div>
              <div class="stat-label">Estações Práticas</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">5</div>
              <div class="stat-label">Grandes Áreas Médicas</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">100%</div>
              <div class="stat-label">Cobertura do Edital</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="simulation-preview">
            <div class="preview-header">
              <div class="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <div class="preview-title">Simulação em Tempo Real</div>
            </div>
            <div class="preview-content">
              <div class="simulation-interface">
                <div class="patient-card">
                  <div class="patient-header">
                    <div class="patient-icon">👨‍⚕️</div>
                    <div class="patient-info">
                      <h4>Estação: Clínica Médica</h4>
                      <p>Caso: Dor torácica aguda</p>
                    </div>
                  </div>
                  <div class="timer">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>12:30</span>
                  </div>
                </div>
                <div class="chat-preview">
                  <div class="message received">
                    <p>Olá doutor, estou com muita dor...</p>
                  </div>
                  <div class="message sent">
                    <p>Me conte mais sobre essa dor...</p>
                  </div>
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
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
          <h2 class="section-title">Recursos Exclusivos</h2>
          <p class="section-description">Tudo que você precisa para ter sucesso no Revalida</p>
        </div>
        <div class="features-grid">
          <div class="feature-card" v-for="feature in features" :key="feature.title">
            <div class="feature-icon" :style="{ backgroundColor: feature.color + '20', color: feature.color }">
              {{ feature.emoji }}
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
          <p class="section-description">Simples e eficiente</p>
        </div>
        <div class="steps-grid">
          <div class="step-card" v-for="(step, index) in steps" :key="index">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-icon">{{ step.emoji }}</div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-description">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Assistant Section -->
    <section class="ai-section">
      <div class="container ai-content">
        <div class="ai-visual">
          <div class="ai-chat-preview">
            <div class="ai-header">
              <div class="ai-avatar">🤖</div>
              <div>
                <h4>Assistente IA Gemini</h4>
                <p>Sempre disponível para ajudar</p>
              </div>
            </div>
            <div class="ai-messages">
              <div class="ai-message">
                <p>Como posso te ajudar a se preparar melhor?</p>
              </div>
              <div class="ai-message user">
                <p>Qual a melhor abordagem para anamnese de dor torácica?</p>
              </div>
              <div class="ai-message">
                <p>Vou te ajudar! Na anamnese de dor torácica, é essencial investigar...</p>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-text">
          <h2 class="ai-title">IA Personalizada com Gemini</h2>
          <p class="ai-description">
            Conte com um assistente de IA 24/7 para tirar dúvidas, receber feedback 
            personalizado e aprimorar seu desempenho nas simulações.
          </p>
          <ul class="ai-features">
            <li>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
              </svg>
              Feedback instantâneo durante simulações
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
              </svg>
              Análise de pontos fortes e fracos
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
              </svg>
              Sugestões de estudos personalizadas
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
              </svg>
              Disponível 24/7 para suas dúvidas
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">Planos e Preços</h2>
          <p class="section-description">Escolha o plano ideal para sua preparação</p>
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
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2"/>
                </svg>
                {{ feature }}
              </li>
            </ul>
            <button @click="navigateToRegister" :class="['btn-plan', plan.featured ? 'btn-primary-large' : 'btn-secondary-large']">
              {{ plan.cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">O Que Dizem Nossos Alunos</h2>
          <p class="section-description">Histórias de sucesso reais</p>
        </div>
        <div class="testimonials-grid">
          <div class="testimonial-card" v-for="testimonial in testimonials" :key="testimonial.name">
            <div class="testimonial-stars">★★★★★</div>
            <p class="testimonial-text">"{{ testimonial.text }}"</p>
            <div class="testimonial-author">
              <div class="author-avatar">{{ testimonial.avatar }}</div>
              <div>
                <h4 class="author-name">{{ testimonial.name }}</h4>
                <p class="author-role">{{ testimonial.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container cta-content">
        <h2 class="cta-title">Pronto para Começar sua Jornada?</h2>
        <p class="cta-description">Junte-se a milhares de estudantes que já estão se preparando com o RevalidaFlow</p>
        <div class="cta-buttons">
          <button @click="navigateToRegister" class="btn-primary-large">
            Começar Gratuitamente
          </button>
          <button @click="navigateToLogin" class="btn-secondary-large">
            Já Tenho Conta
          </button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container footer-content">
        <div class="footer-section">
          <div class="logo">
            <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="logo-text">RevalidaFlow</span>
          </div>
          <p class="footer-description">Prepare-se para o Revalida com excelência</p>
        </div>
        <div class="footer-links">
          <div class="footer-column">
            <h4>Produto</h4>
            <a href="#features">Recursos</a>
            <a href="#stations">Estações</a>
            <a href="#pricing">Preços</a>
          </div>
          <div class="footer-column">
            <h4>Suporte</h4>
            <a href="#">Central de Ajuda</a>
            <a href="#">Contato</a>
            <a href="#">FAQ</a>
          </div>
          <div class="footer-column">
            <h4>Legal</h4>
            <a href="#">Termos de Uso</a>
            <a href="#">Privacidade</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 RevalidaFlow. Todos os direitos reservados.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const features = ref([
  {
    title: 'Simulações em Tempo Real',
    description: 'Pratique com avaliadores reais em sessões interativas de 15 minutos',
    emoji: '🎭',
    color: '#3b82f6'
  },
  {
    title: 'IA com Gemini',
    description: 'Assistente inteligente disponível 24/7 para feedback e dúvidas',
    emoji: '🤖',
    color: '#8b5cf6'
  },
  {
    title: 'Banco de Estações',
    description: 'Mais de 500 estações clínicas categorizadas e atualizadas',
    emoji: '📚',
    color: '#10b981'
  },
  {
    title: 'Avaliação Detalhada',
    description: 'Feedback completo com checklist e pontos de melhoria',
    emoji: '📊',
    color: '#f59e0b'
  },
  {
    title: 'Ranking e Competição',
    description: 'Compare seu desempenho com outros estudantes',
    emoji: '🏆',
    color: '#ef4444'
  },
  {
    title: 'Chat de Grupo',
    description: 'Comunidade ativa para trocar experiências e dúvidas',
    emoji: '💬',
    color: '#06b6d4'
  }
]);

const steps = ref([
  {
    title: 'Cadastre-se',
    description: 'Crie sua conta gratuitamente e escolha seu plano',
    emoji: '📝'
  },
  {
    title: 'Escolha uma Estação',
    description: 'Navegue pelo banco de estações e selecione a que deseja praticar',
    emoji: '🎯'
  },
  {
    title: 'Entre na Simulação',
    description: 'Conecte-se com um avaliador ou colega e inicie a prática',
    emoji: '🚀'
  },
  {
    title: 'Receba Feedback',
    description: 'Analise sua performance e melhore continuamente',
    emoji: '📈'
  }
]);

const plans = ref([
  {
    name: 'Gratuito',
    price: '0',
    featured: false,
    cta: 'Começar Grátis',
    features: [
      'Acesso a 10 estações',
      '2 simulações por mês',
      'Chat com IA básico',
      'Comunidade de estudantes'
    ]
  },
  {
    name: 'Estudante',
    price: '97',
    featured: true,
    cta: 'Assinar Agora',
    features: [
      'Acesso ilimitado a todas as estações',
      'Simulações ilimitadas',
      'IA Gemini completa',
      'Feedback detalhado',
      'Ranking e estatísticas',
      'Suporte prioritário'
    ]
  },
  {
    name: 'Premium',
    price: '197',
    featured: false,
    cta: 'Assinar Premium',
    features: [
      'Tudo do plano Estudante',
      'Sessões com avaliadores experts',
      'Aulas ao vivo',
      'Materiais exclusivos',
      'Mentoria individual',
      'Garantia de aprovação'
    ]
  }
]);

const testimonials = ref([
  {
    name: 'Dr. Carlos Silva',
    role: 'Aprovado Revalida 2024',
    avatar: '👨‍⚕️',
    text: 'O RevalidaFlow foi essencial na minha aprovação. As simulações me prepararam muito bem para o dia da prova!'
  },
  {
    name: 'Dra. Maria Santos',
    role: 'Estudante de Medicina',
    avatar: '👩‍⚕️',
    text: 'Incrível poder praticar com feedback em tempo real. A IA me ajudou a identificar pontos fracos que eu nem sabia que tinha.'
  },
  {
    name: 'Dr. João Costa',
    role: 'Revalidando 2024',
    avatar: '👨‍⚕️',
    text: 'A plataforma é muito intuitiva e o banco de estações é completo. Recomendo para todos que estão se preparando!'
  }
]);

const navigateToLogin = () => {
  router.push('/login');
};

const navigateToRegister = () => {
  router.push('/register');
};

const scrollToDemo = () => {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<style scoped>
/* Base Styles */
.landing-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f172a, #1e293b);
  color: white !important;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* Navbar */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.95);
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
  color: var(--primary-color) !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-links a {
  color: rgba(255, 255, 255, 0.9) !important;
  text-decoration: none;
  transition: color 0.3s;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.nav-links a:hover {
  color: white !important;
}

.btn-primary, .btn-secondary {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-size: 0.875rem;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white !important;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* Hero Section */
.hero-section {
  padding: 10rem 0 6rem;
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
  color: white !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.gradient-text {
  color: var(--primary-color) !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.hero-description {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9) !important;
  margin-bottom: 2.5rem;
  line-height: 1.7;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.btn-primary-large, .btn-secondary-large {
  padding: 1rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.125rem;
  transition: all 0.3s;
  border: none;
}

.btn-primary-large {
  background: var(--gradient-primary);
  color: white !important;
}

.btn-primary-large:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
}

.btn-secondary-large {
  background: rgba(255, 255, 255, 0.1);
  color: white !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary-large:hover {
  background: rgba(255, 255, 255, 0.15);
}

.icon {
  width: 22px;
  height: 22px;
}

.stats {
  display: flex;
  gap: 3rem;
}

.stat-item {
  text-align: left;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary-color) !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 0.25rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 0.875rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Simulation Preview */
.simulation-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.preview-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  padding: 2rem;
}

.simulation-interface {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.patient-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.patient-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.patient-icon {
  font-size: 2.5rem;
}

.patient-info h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.patient-info p {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.timer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6;
  font-weight: 600;
}

.timer svg {
  width: 24px;
  height: 24px;
}

.chat-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  padding: 0.875rem 1.25rem;
  border-radius: 1rem;
  max-width: 80%;
  font-size: 0.875rem;
}

.message.received {
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  align-self: flex-start;
}

.message.sent {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  align-self: flex-end;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
  padding: 0.875rem 1.25rem;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 1rem;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

/* Features Section */
.features-section, .how-section, .stations-section, .pricing-section, .testimonials-section {
  padding: 6rem 0;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
}

.section-title {
  font-size: 2.75rem;
  font-weight: 800;
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
  border-radius: 1.25rem;
  padding: 2.5rem;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(59, 130, 246, 0.5);
}

.feature-icon {
  width: 70px;
  height: 70px;
  border-radius: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  font-size: 2rem;
}

.feature-title {
  font-size: 1.375rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.feature-description {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
}

/* Steps Section */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
}

.step-card {
  text-align: center;
  position: relative;
}

.step-card::after {
  content: '→';
  position: absolute;
  right: -1.5rem;
  top: 2rem;
  font-size: 2rem;
  color: rgba(255, 255, 255, 0.2);
}

.step-card:last-child::after {
  display: none;
}

.step-number {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 auto 1rem;
}

.step-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.step-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.step-description {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
}

/* Stations Section */
.stations-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.station-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2.5rem;
  transition: all 0.3s;
}

.station-card:hover {
  transform: translateY(-8px);
  border-color: rgba(139, 92, 246, 0.5);
}

.station-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.station-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.station-count {
  color: #3b82f6;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.station-topics {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.station-topics li {
  color: rgba(255, 255, 255, 0.7);
  padding-left: 1.5rem;
  position: relative;
}

.station-topics li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-weight: 700;
}

/* AI Section */
.ai-section {
  padding: 6rem 0;
  background: rgba(59, 130, 246, 0.05);
}

.ai-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.ai-chat-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  overflow: hidden;
}

.ai-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.ai-header h4 {
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.ai-header p {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.ai-messages {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-message {
  padding: 1rem 1.25rem;
  border-radius: 1rem;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  max-width: 85%;
}

.ai-message.user {
  align-self: flex-end;
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.3);
}

.ai-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
}

.ai-description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  margin-bottom: 2rem;
}

.ai-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-features li {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.125rem;
}

.ai-features svg {
  width: 24px;
  height: 24px;
  color: #10b981;
  stroke-width: 2.5;
  flex-shrink: 0;
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
  border-radius: 1.25rem;
  padding: 2.5rem;
  position: relative;
  transition: all 0.3s;
}

.pricing-card.featured {
  border-color: #3b82f6;
  transform: scale(1.05);
  box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
}

.featured-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  padding: 0.5rem 1.5rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 700;
}

.plan-name {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
}

.plan-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 2.5rem;
}

.currency {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.6);
}

.amount {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0.25rem;
}

.period {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.125rem;
}

.plan-features {
  list-style: none;
  margin-bottom: 2.5rem;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
}

.plan-features svg {
  width: 20px;
  height: 20px;
  color: #10b981;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.btn-plan {
  width: 100%;
}

/* Testimonials Section */
.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.testimonial-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2.5rem;
  transition: all 0.3s;
}

.testimonial-card:hover {
  transform: translateY(-8px);
  border-color: rgba(139, 92, 246, 0.5);
}

.testimonial-stars {
  color: #f59e0b;
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.testimonial-text {
  font-size: 1.125rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.author-name {
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.author-role {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
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
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
}

.cta-description {
  font-size: 1.375rem;
  margin-bottom: 2.5rem;
  opacity: 0.95;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Footer */
.footer {
  background: rgba(0, 0, 0, 0.3);
  padding: 4rem 0 2rem;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 4rem;
  margin-bottom: 3rem;
}

.footer-description {
  color: rgba(255, 255, 255, 0.6);
  margin-top: 1rem;
  line-height: 1.6;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.footer-column h4 {
  font-weight: 700;
  margin-bottom: 1.25rem;
  font-size: 1.125rem;
}

.footer-column a {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  margin-bottom: 0.75rem;
  transition: color 0.3s;
}

.footer-column a:hover {
  color: white;
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-content,
  .ai-content {
    grid-template-columns: 1fr;
  }

  .features-grid,
  .stations-grid,
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .step-card::after {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .features-grid,
  .stations-grid,
  .pricing-grid,
  .testimonials-grid,
  .steps-grid {
    grid-template-columns: 1fr;
  }

  .nav-links {
    display: none;
  }

  .hero-actions,
  .cta-buttons {
    flex-direction: column;
  }

  .stats {
    flex-direction: column;
    gap: 1.5rem;
  }
}
</style>
