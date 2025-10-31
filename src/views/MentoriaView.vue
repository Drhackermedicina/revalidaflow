<template>
  <VContainer fluid class="mentoria-container py-8">
    <!-- Hero Section -->
    <div class="mentoria-hero mb-12">
      <div class="hero-content text-center">
        <VChip
          color="primary"
          variant="elevated"
          class="mb-4"
          size="large"
        >
          <VIcon icon="ri-graduation-cap-fill" start />
          Mentoria Especializada
        </VChip>
        
        <h1 class="text-h2 font-weight-bold mb-4">
          <span class="gradient-text">ATIVAMED</span> Mentoria
        </h1>
        
        <p class="text-h6 text-medium-emphasis mb-6 mx-auto" style="max-width: 800px;">
          Prepare-se para o Revalida com quem já conquistou a aprovação!
          <br>
          Mentoria personalizada com profissionais revalidados e experientes.
        </p>

        <VBtn
          color="primary"
          size="x-large"
          variant="elevated"
          class="px-8"
          @click="scrollToProdutos"
        >
          <VIcon icon="ri-arrow-down-line" start />
          Conheça Nossos Planos
        </VBtn>
      </div>
    </div>

    <!-- Mentores Section -->
    <div ref="mentoresSection" class="mentores-section mb-12">
      <div class="section-header text-center mb-8">
        <VIcon icon="ri-star-fill" color="warning" size="32" class="mb-2" />
        <h2 class="text-h3 font-weight-bold mb-3">Nossos Mentores</h2>
        <p class="text-h6 text-medium-emphasis">
          Profissionais revalidados que já trilharam o caminho do sucesso
        </p>
      </div>

      <!-- Card de Parceria e Descrição -->
      <VCard
        class="parceria-card mb-10"
        elevation="12"
        color="primary"
      >
        <VCardText class="pa-8">
          <div class="text-center mb-6">
            <VIcon icon="ri-handshake-fill" color="white" size="48" class="mb-3" />
            <h3 class="text-h4 font-weight-bold text-white mb-2">
              Parceria RevalidaFlow + Ativa Med Mentoria
            </h3>
          </div>
          
          <div class="parceria-content">
            <p class="text-h6 text-white text-center mb-6 font-weight-medium">
              O RevalidaFlow fechou uma parceria exclusiva com a Ativa Med Mentoria para oferecer 
              uma experiência completa de preparação para o Revalida!
            </p>
            
            <VDivider class="my-6 border-opacity-25" color="white" />
            
            <VRow class="mt-6">
              <VCol cols="12" md="4" class="text-center">
                <VIcon icon="ri-medal-fill" color="warning" size="40" class="mb-3" />
                <h4 class="text-h6 text-white font-weight-bold mb-2">Mentores Revalidados</h4>
                <p class="text-body-1 text-white opacity-90">
                  Profissionais aprovados na 2ª Fase do Revalida
                </p>
              </VCol>
              
              <VCol cols="12" md="4" class="text-center">
                <VIcon icon="ri-book-open-fill" color="success" size="40" class="mb-3" />
                <h4 class="text-h6 text-white font-weight-bold mb-2">Experiência Comprovada</h4>
                <p class="text-body-1 text-white opacity-90">
                  Especialistas em preparação para provas práticas
                </p>
              </VCol>
              
              <VCol cols="12" md="4" class="text-center">
                <VIcon icon="ri-team-fill" color="info" size="40" class="mb-3" />
                <h4 class="text-h6 text-white font-weight-bold mb-2">Acompanhamento Personalizado</h4>
                <p class="text-body-1 text-white opacity-90">
                  Mentoria humanizada e focada no seu sucesso
                </p>
              </VCol>
            </VRow>
          </div>
        </VCardText>
      </VCard>

      <!-- Cards dos Mentores -->
      <VRow justify="center">
        <VCol
          v-for="mentor in mentores"
          :key="mentor.id"
          cols="6"
          sm="4"
          md="3"
          lg="2"
        >
          <VCard
            class="mentor-card-simple text-center"
            elevation="8"
            hover
          >
            <VCardText class="pa-4">
              <!-- Usa imagem real se disponível, senão avatar -->
              <div v-if="mentor.imagem" class="mentor-image-wrapper mb-3">
                <img 
                  :src="mentor.imagem" 
                  :alt="mentor.nome"
                  class="mentor-real-image"
                />
              </div>
              <VAvatar
                v-else
                :color="mentor.color"
                size="80"
                class="mb-3"
              >
                <VIcon icon="ri-user-fill" size="40" />
              </VAvatar>
              
              <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ mentor.nome }}</h3>
              <VChip
                color="success"
                variant="elevated"
                size="x-small"
              >
                <VIcon icon="ri-verified-badge-fill" start size="12" />
                Revalidado
              </VChip>

              <!-- Botão WhatsApp -->
              <div class="mt-4">
                <VBtn
                  icon
                  size="x-small"
                  variant="tonal"
                  color="success"
                  class="whatsapp-btn"
                  :href="`https://wa.me/${mentor.whatsapp}?text=${encodeURIComponent(mentor.mensagem)}`"
                  target="_blank"
                  title="Falar com o mentor no WhatsApp"
                >
                  <VIcon icon="ri-whatsapp-fill" size="20" />
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- Produtos Section -->
    <div ref="produtosSection" class="produtos-section mb-12">
      <div class="section-header text-center mb-8">
        <VIcon icon="ri-gift-fill" color="primary" size="32" class="mb-2" />
        <h2 class="text-h3 font-weight-bold mb-3">Nossos Produtos</h2>
        <p class="text-h6 text-medium-emphasis">
          Escolha o plano ideal para sua preparação
        </p>
      </div>

      <VRow>
        <!-- Produto 1: Ator Revalidado + Feedback -->
        <VCol
          v-for="produto in produtos"
          :key="produto.id"
          cols="12"
          md="4"
        >
          <VCard
            :class="['produto-card', { 'produto-destaque': produto.destaque }]"
            elevation="12"
            hover
          >
            <div v-if="produto.destaque" class="destaque-badge">
              <VIcon icon="ri-star-fill" size="16" />
              MAIS POPULAR
            </div>

            <VCardText class="pa-8">
              <div class="text-center mb-6">
                <VIcon
                  :icon="produto.icon"
                  :color="produto.color"
                  size="64"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-2">{{ produto.titulo }}</h3>
                <p class="text-body-1 text-medium-emphasis">{{ produto.descricao }}</p>
              </div>

              <VDivider class="my-6" />

              <!-- Features -->
              <div class="features-list mb-6">
                <div
                  v-for="(feature, index) in produto.features"
                  :key="index"
                  class="feature-item mb-3"
                >
                  <VIcon icon="ri-checkbox-circle-fill" color="success" class="me-2" size="20" />
                  <span class="text-body-1">{{ feature }}</span>
                </div>
              </div>

              <VDivider class="my-6" />

              <!-- Preços -->
              <div v-if="produto.opcoes" class="opcoes-preco mb-6">
                <div
                  v-for="(opcao, index) in produto.opcoes"
                  :key="index"
                  class="opcao-item mb-3"
                >
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-subtitle-1 font-weight-medium">{{ opcao.label }}</span>
                    <VChip
                      :color="produto.color"
                      variant="elevated"
                      size="large"
                    >
                      R$ {{ opcao.preco }}
                    </VChip>
                  </div>
                </div>
              </div>
              <div v-else class="text-center mb-6">
                <div class="text-h3 font-weight-bold" :style="{ color: getColorHex(produto.color) }">
                  R$ {{ produto.preco }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ produto.prazo }}</div>
              </div>

              <!-- Botão CTA -->
              <VBtn
                :color="produto.color"
                size="x-large"
                variant="elevated"
                block
                class="text-h6"
                @click="entrarEmContato(produto)"
              >
                <VIcon icon="ri-whatsapp-fill" start />
                Quero Este Plano
              </VBtn>

              <!-- Badge de aula grátis -->
              <div v-if="produto.aulaGratis" class="text-center mt-4">
                <VChip
                  color="success"
                  variant="elevated"
                  size="large"
                >
                  <VIcon icon="ri-gift-fill" start />
                  Primeira Aula Grátis!
                </VChip>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </div>

    <!-- CTA Final Section -->
    <div class="cta-final-section text-center">
      <VCard
        color="primary"
        class="pa-12"
        elevation="16"
      >
        <VIcon icon="ri-rocket-fill" size="64" class="mb-4" color="white" />
        <h2 class="text-h3 font-weight-bold text-white mb-4">
          Pronto para Começar sua Jornada?
        </h2>
        <p class="text-h6 text-white mb-6">
          Entre em contato agora e agende sua primeira aula!
        </p>
        <VBtn
          color="white"
          size="x-large"
          variant="elevated"
          class="px-12"
          @click="entrarEmContatoGeral"
        >
          <VIcon icon="ri-whatsapp-fill" start />
          Falar com um Mentor
        </VBtn>
      </VCard>
    </div>
  </VContainer>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()
const produtosSection = ref(null)
const mentoresSection = ref(null)

// Dados dos mentores
const mentores = [
  {
    id: 1,
    nome: 'Gabriel Feruffo',
    color: 'primary',
    imagem: '/gabriel.jpg',
    whatsapp: '+5546999064467', // Número do Gabriel (sem espaços ou +)
    mensagem: `Olá Gabriel! Vi seu perfil na Ativa Med Mentoria do RevalidaFlow e gostaria de saber mais sobre seus serviços de mentoria para o Revalida. Você tem disponibilidade para conversarmos?`
  },
  {
    id: 2,
    nome: 'Stefferson Ferraz',
    color: 'secondary',
    whatsapp: '+595983680985', // Número do Stefferson (sem espaços ou +)
    mensagem: `Olá Stefferson! Vi seu perfil na Ativa Med Mentoria do RevalidaFlow e gostaria de saber mais sobre seus serviços de mentoria para o Revalida. Você tem disponibilidade para conversarmos?`
  },
]

// Dados dos produtos
const produtos = [
  {
    id: 1,
    titulo: 'Ator Revalidado + Feedback',
    descricao: 'Pratique com quem já conquistou a aprovação',
    icon: 'ri-user-star-fill',
    color: 'primary',
    features: [
      'Simulação de estações práticas',
      'Feedback personalizado e detalhado',
      'Dicas de quem já passou',
      'Material de apoio incluso',
    ],
    opcoes: [
      { label: '5 Estações', preco: '49' },
      { label: '10 Estações', preco: '89' },
    ],
    destaque: false,
  },
  {
    id: 2,
    titulo: 'Mentoria Flash',
    descricao: 'Construa uma base sólida em pouco tempo',
    icon: 'ri-flashlight-fill',
    color: 'warning',
    preco: '500',
    prazo: '5 aulas intensivas',
    features: [
      'Construção do esqueleto de estudo',
      'Treinamentos práticos direcionados',
      'Simulados personalizados',
      'Acompanhamento individual',
      'Material exclusivo',
    ],
    destaque: true,
  },
  {
    id: 3,
    titulo: 'Mentoria Completa',
    descricao: 'Acompanhamento total até a aprovação',
    icon: 'ri-trophy-fill',
    color: 'success',
    preco: '1.500',
    prazo: '15 aulas completas',
    features: [
      'Acompanhamento até o dia da prova',
      'Plano de estudos personalizado',
      'Simulações semanais',
      'Suporte via WhatsApp',
      'Revisões e tira-dúvidas',
      'Estratégias comprovadas',
      'Análise de performance',
    ],
    aulaGratis: true,
    destaque: false,
  },
]

// Funções
function scrollToProdutos() {
  if (produtosSection.value) {
    produtosSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

function getColorHex(colorName) {
  const colors = {
    primary: theme.current.value.colors.primary,
    secondary: theme.current.value.colors.secondary,
    success: theme.current.value.colors.success,
    warning: theme.current.value.colors.warning,
    error: theme.current.value.colors.error,
    info: theme.current.value.colors.info,
  }
  return colors[colorName] || colorName
}

function entrarEmContato(produto) {
  const mensagem = `Olá! Gostaria de saber mais sobre o plano "${produto.titulo}" da ATIVAMED Mentoria.`
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(mensagem)}`
  window.open(whatsappUrl, '_blank')
}

function entrarEmContatoGeral() {
  const mensagem = 'Olá! Gostaria de saber mais sobre a ATIVAMED Mentoria e agendar uma conversa.'
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(mensagem)}`
  window.open(whatsappUrl, '_blank')
}
</script>

<style scoped lang="scss">
.mentoria-container {
  max-width: 1400px;
  margin: 0 auto;
}

.mentoria-hero {
  padding: 60px 20px;
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.1) 0%, rgba(0, 188, 212, 0.1) 100%);
  border-radius: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(124, 77, 255, 0.2) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite;
  }

  .hero-content {
    position: relative;
    z-index: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.gradient-text {
  background: linear-gradient(135deg, #7c4dff 0%, #00bcd4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-header {
  margin-bottom: 48px;
}

.parceria-card {
  background: linear-gradient(135deg, #7c4dff 0%, #00bcd4 100%);
  position: relative;
  overflow: hidden;
  margin: 0 auto;
  max-width: 1200px;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
    animation: pulse 4s ease-in-out infinite;
  }

  .parceria-content {
    position: relative;
    z-index: 1;
  }
}

.mentor-card-simple {
  height: 100%;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-6px);
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
  }

  .v-avatar {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.produto-card {
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-12px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
  }

  &.produto-destaque {
    border-color: rgb(var(--v-theme-warning));
    
    .destaque-badge {
      position: absolute;
      top: -12px;
      right: 20px;
      background: linear-gradient(135deg, #ffd600 0%, #ff9800 100%);
      color: #000;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      z-index: 1;
    }
  }

  .features-list {
    .feature-item {
      display: flex;
      align-items: flex-start;
      padding: 8px 0;
    }
  }

  .opcoes-preco {
    .opcao-item {
      padding: 16px;
      background: rgba(var(--v-theme-surface), 0.5);
      border-radius: 12px;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(var(--v-theme-surface), 0.8);
        transform: translateX(4px);
      }
    }
  }
}

.cta-final-section {
  margin-top: 80px;
  margin-bottom: 40px;

  .v-card {
    background: linear-gradient(135deg, #7c4dff 0%, #00bcd4 100%);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: 0.3;
    }
  }
}

.mentor-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(var(--v-theme-surface), 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
}

.mentor-real-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.whatsapp-btn {
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%) !important;
  color: white !important;
  border-radius: 50% !important;
  width: 40px !important;
  height: 40px !important;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3) !important;
  transition: all 0.3s ease !important;

  &:hover {
    transform: scale(1.1) !important;
    box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4) !important;
  }

  .v-icon {
    color: white !important;
  }
}

// Responsividade
@media (max-width: 960px) {
  .mentoria-hero {
    padding: 40px 20px;

    .text-h2 {
      font-size: 2rem !important;
    }
  }

  .section-header {
    .text-h3 {
      font-size: 1.75rem !important;
    }
  }

  .produto-card {
    margin-bottom: 24px;
  }
}

@media (max-width: 600px) {
  .hero-content {
    .text-h6 {
      font-size: 1rem !important;
    }
  }

  .cta-final-section {
    .text-h3 {
      font-size: 1.5rem !important;
    }

    .text-h6 {
      font-size: 1rem !important;
    }
  }
}
</style>

