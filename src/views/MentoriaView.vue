<template>
  <VContainer fluid class="mentoria-view py-10 px-6 px-md-12">
    <section class="hero d-flex flex-column align-center text-center rounded-xl pa-12 pa-md-16 mb-14">
      <VChip variant="elevated" color="primary" class="mb-6" size="large">
        <VIcon icon="ri-graduation-cap-fill" start />
        Mentoria Especializada
      </VChip>
      <h1 class="hero-title mb-6">
        <span class="text-gradient text-ativa">ATIVA</span>
        <span class="text-gradient text-med">MED</span>
        <span class="text-gradient text-mentoria d-block">Mentoria</span>
      </h1>
      <p class="hero-description mb-8">
        Prepare-se para o Revalida com quem já conquistou a aprovação. Mentoria personalizada com profissionais revalidados, experientes e prontos para guiar sua jornada.
      </p>
      <VBtn size="x-large" class="hero-cta" @click="scrollTo(produtosSection)">
        <VIcon icon="ri-rocket-fill" start />
        Conheça Nossos Planos
        <VIcon icon="ri-arrow-down-line" end />
      </VBtn>
    </section>

    <section class="partnership mb-14">
      <VCard class="glass" elevation="12">
        <VCardText class="pa-8 pa-md-10">
          <div class="text-center mb-8">
            <h2 class="section-title mb-3">
              Revalida Flow + Ativa Med
            </h2>
            <p class="section-subtitle mb-4">
              Parceria oficial que combina tecnologia de simulação com mentoria clínica premium para acelerar sua aprovação na 2ª fase.
            </p>
            <p class="section-body">
              O app Revalida Flow reúne dashboards de desempenho, simulados interativos e roteiros inteligentes. A Ativa Med conecta mentores revalidados que interpretam seus dados, personalizam o plano de treino e oferecem sessões práticas semanais. Você recebe diagnóstico, acompanhamento humano e suporte contínuo até o dia da prova.
            </p>
          </div>
          <VRow class="g-6" align="stretch">
            <VCol v-for="beneficio in beneficios" :key="beneficio.titulo" cols="12" md="4">
              <div class="benefit-card h-100 text-center pa-6">
                <VIcon :icon="beneficio.icone" size="36" class="mb-4 icon-bubble" />
                <h3 class="benefit-title mb-2">{{ beneficio.titulo }}</h3>
                <p class="benefit-text">{{ beneficio.texto }}</p>
              </div>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </section>

    <section class="mentors mb-14 text-center">
      <div class="section-header mb-8">
        <VIcon icon="ri-star-fill" size="32" color="warning" class="mb-2" />
        <h2 class="section-title mb-2">Nossos Mentores</h2>
        <p class="section-subtitle">
          Profissionais revalidados que já trilharam o caminho da aprovação
        </p>
      </div>
      <VRow class="mentors-grid" justify="center">
        <VCol v-for="mentor in mentores" :key="mentor.id" cols="10" sm="6" md="4" lg="3">
          <VCard class="mentor-card text-center" elevation="10" hover>
            <VCardText class="pa-6">
              <div class="mentor-photo mb-4">
                <img :src="mentor.imagem" :alt="mentor.nome" />
              </div>
              <h3 class="mentor-name mb-4">{{ mentor.nome }}</h3>
              <VBtn
                :href="whatsUrl(mentor.whatsapp, mentor.mensagem)"
                target="_blank"
                color="success"
                class="whatsapp-btn"
                size="large"
                rounded
              >
                <VIcon icon="ri-whatsapp-fill" size="22" start />
                Falar no WhatsApp
              </VBtn>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section ref="produtosSection" class="products mb-14">
      <div class="section-header text-center mb-10">
        <VIcon icon="ri-gift-fill" size="36" color="primary" class="mb-2" />
        <h2 class="section-title mb-2">Nossos Planos Exclusivos</h2>
        <p class="section-subtitle">
          Três caminhos pensados para acelerar sua performance no Revalida
        </p>
      </div>
      <VRow class="product-grid" justify="center" align="stretch">
        <VCol v-for="produto in produtos" :key="produto.id" cols="12" sm="6" md="4">
          <VCard
            :class="['product-card', { destaque: produto.destaque }]"
            elevation="12"
            hover
          >
            <VCardText class="pa-8 d-flex flex-column">
              <div class="text-center mb-6">
                <VIcon :icon="produto.icon" :color="produto.color" size="60" class="mb-4" />
                <div class="d-flex align-center justify-center gap-2 mb-3">
                  <h3 class="product-title mb-0">{{ produto.titulo }}</h3>
                  <VChip v-if="produto.badge" color="warning" size="small" class="fw-bold">
                    {{ produto.badge }}
                  </VChip>
                </div>
                <p class="product-description">{{ produto.descricao }}</p>
              </div>

              <VDivider class="my-5" />

              <ul class="feature-list mb-6">
                <li v-for="feature in produto.features" :key="feature">
                  <VIcon icon="ri-checkbox-circle-fill" size="20" color="success" class="me-2" />
                  <span>{{ feature }}</span>
                </li>
              </ul>

              <div class="mt-auto">
                <div v-if="produto.opcoes" class="d-flex flex-column gap-3 mb-5">
                  <div v-for="opcao in produto.opcoes" :key="opcao.label" class="price-option">
                    <span>{{ opcao.label }}</span>
                    <strong>R$ {{ opcao.preco }}</strong>
                  </div>
                </div>
                <div v-else class="text-center mb-5">
                  <div class="price-display">R$ {{ produto.preco }}</div>
                  <small class="text-medium-emphasis">{{ produto.prazo }}</small>
                </div>
                <VBtn block size="large" class="product-btn" @click="irParaPagamentos">
                  <VIcon icon="ri-whatsapp-fill" start />
                  Quero Este Plano
                </VBtn>
                <VChip v-if="produto.aulaGratis" class="mt-4" color="success" variant="elevated">
                  Primeira aula grátis
                </VChip>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="cta text-center">
      <VCard class="glass" elevation="14">
        <VCardText class="pa-12">
          <VIcon icon="ri-rocket-fill" size="56" color="white" class="mb-4" />
          <h2 class="section-title text-white mb-3">Pronto para começar sua jornada?</h2>
          <p class="section-subtitle text-white mb-6">
            Converse com um mentor agora mesmo e monte um plano personalizado para o Revalida.
          </p>
          <VBtn size="x-large" class="cta-btn" @click="entrarEmContatoGeral">
            <VIcon icon="ri-whatsapp-fill" start />
            Falar com um Mentor
          </VBtn>
        </VCardText>
      </VCard>
    </section>
  </VContainer>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const produtosSection = ref(null)
const router = useRouter()

const mentores = [
  {
    id: 1,
    nome: 'Gabriel Feruffo',
    imagem: '/gabriel.jpg',
    whatsapp: '+5546999064467',
    mensagem: 'Olá Gabriel! Quero saber mais sobre sua mentoria para o Revalida.'
  },
  {
    id: 2,
    nome: 'Stefferson Ferraz',
    imagem: '/image.png',
    whatsapp: '+595983680985',
    mensagem: 'Olá Stefferson! Vi sua mentoria no Revalida Flow e gostaria de conversar.'
  },
  {
    id: 3,
    nome: 'Hugo Gabriel',
    imagem: '/hugo.jpg',
    whatsapp: '+5515997919323',
    mensagem: 'Olá Hugo! Vi sua mentoria no Revalida Flow e gostaria de conversar.'
  },
]

const beneficios = [
  {
    icone: 'ri-medal-fill',
    titulo: 'Mentores Revalidados',
    texto: 'Acompanhamento direto de profissionais aprovados na 2ª fase com feedbacks aplicáveis.'
  },
  {
    icone: 'ri-book-open-fill',
    titulo: 'Experiência Comprovada',
    texto: 'Simulados dirigidos, planos de estudo práticos e correções comentadas.'
  },
  {
    icone: 'ri-user-heart-fill',
    titulo: 'Acompanhamento Humano',
    texto: 'Mentoria flexível, personalizada e com suporte próximo até o dia da prova.'
  }
]

const produtos = [
  {
    id: 1,
    titulo: 'Ator Revalidado + Feedback',
    descricao: 'Treinos com atores revalidados e devolutivas detalhadas.',
    icon: 'ri-user-star-fill',
    color: 'primary',
    features: [
      'Simulações de estações práticas',
      'Feedback personalizado e gravado',
      'Dicas de quem já passou pela banca',
      'Material complementar incluso'
    ],
    opcoes: [
      { label: '5 Estações', preco: '49' },
      { label: '10 Estações', preco: '89' }
    ]
  },
  {
    id: 2,
    titulo: 'Mentoria Flash',
    descricao: 'Plano intensivo para construir base sólida em poucas semanas.',
    icon: 'ri-flashlight-fill',
    color: 'warning',
    badge: 'Mais Popular',
    features: [
      'Plano de estudo enxuto e objetivo',
      'Simulados dirigidos e correções em vídeo',
      'Acompanhamento individual',
      'Material exclusivo e atualizado'
    ],
    preco: '500',
    prazo: '5 aulas intensivas'
  },
  {
    id: 3,
    titulo: 'Mentoria Completa',
    descricao: 'Acompanhamento total até o dia da prova com mentor exclusivo.',
    icon: 'ri-trophy-fill',
    color: 'success',
    features: [
      'Plano estratégico completo',
      'Treinos semanais com feedback imediato',
      'Suporte via WhatsApp todos os dias',
      'Análise de performance e simulados finais'
    ],
    preco: '1.500',
    prazo: '15 aulas + plantões',
    aulaGratis: true
  }
]

const scrollTo = section => {
  if (section?.value) section.value.scrollIntoView({ behavior: 'smooth' })
}

const whatsUrl = (numero, mensagem) => `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`

const entrarEmContatoGeral = () => {
  const message = 'Olá! Vi a Mentoria Ativa Med no Revalida Flow e gostaria de agendar uma conversa sobre os planos disponíveis.'
  const numero = '5545998606685'
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, '_blank')
}

const irParaPagamentos = () => {
  router.push('/pagamento')
}
</script>

<style scoped lang="scss">
$surface: #151224;
$gradient: linear-gradient(135deg, #7c4dff 0%, #00bcd4 100%);

.mentoria-view {
  background: radial-gradient(circle at top, rgba(124, 77, 255, 0.15), transparent 55%),
    radial-gradient(circle at 15% 80%, rgba(0, 188, 212, 0.12), transparent 45%),
    radial-gradient(circle at 90% 20%, rgba(255, 214, 0, 0.1), transparent 40%),
    $surface;
  color: #f5f5ff;
}

.hero {
  background: $gradient;
  position: relative;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(16, 12, 40, 0.45);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2), transparent 60%),
      radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.2), transparent 55%);
    mix-blend-mode: screen;
    opacity: 0.6;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.hero-title {
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  font-weight: 800;
  letter-spacing: 0.5px;
}

.text-gradient {
  color: #ffffff;
}

.text-ativa {
  margin-right: 0.75rem;
}

.text-med {
  margin-right: 0.75rem;
  color: #d9ccff;
}

.text-mentoria {
  color: #bdf6ff;
}

.hero-description {
  max-width: 720px;
  font-size: 1.35rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}

.hero-cta {
  background: linear-gradient(135deg, #ffe082, #ff9800);
  color: #1a1138 !important;
  font-weight: 700;
  border-radius: 999px;
  padding-inline: clamp(28px, 8vw, 48px);
  box-shadow: 0 18px 45px rgba(255, 184, 0, 0.35);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 24px 55px rgba(255, 184, 0, 0.45);
  }
}

.section-header {
  max-width: 640px;
  margin: 0 auto;
}

.section-title {
  font-size: clamp(1.8rem, 3.2vw, 2.6rem);
  font-weight: 800;
  letter-spacing: 0.4px;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 1.05rem;
}

.section-body {
  max-width: 900px;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.78);
  font-size: 1.05rem;
  line-height: 1.7;
}

.glass {
  background: rgba(21, 18, 36, 0.85) !important;
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 20px 50px rgba(12, 10, 30, 0.35) !important;
}

.benefit-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 35px rgba(10, 10, 30, 0.35);
  }
}

.icon-bubble {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  padding: 14px;
  color: #fff !important;
}

.mentors-grid {
  gap: 20px;
}

.mentor-card {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(14px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 42px rgba(18, 17, 40, 0.45);
  }
}

.mentor-photo {
  width: 96px;
  height: 96px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.mentor-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.whatsapp-btn {
  background: linear-gradient(135deg, #25d366, #128c7e) !important;
  color: white !important;
  box-shadow: 0 12px 28px rgba(18, 140, 126, 0.25) !important;
}

.product-grid {
  gap: 24px;
}

.product-card {
  height: 100%;
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(14px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &.destaque {
    border: 1px solid rgba(255, 193, 7, 0.45) !important;
    box-shadow: 0 30px 60px rgba(255, 193, 7, 0.25) !important;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 24px 50px rgba(10, 10, 30, 0.4);
  }
}

.product-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.product-description {
  color: rgba(255, 255, 255, 0.7);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;

  li {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.8);
  }
}

.price-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.85);
}

.price-display {
  font-size: 2.1rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
}

.product-btn {
  background: linear-gradient(135deg, #7c4dff, #00bcd4) !important;
  color: white !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
}

.cta .glass {
  background: $gradient !important;
  color: white;
}

.cta-btn {
  background: linear-gradient(135deg, #25d366, #128c7e) !important;
  color: white !important;
  font-weight: 700;
  padding-inline: 40px;
  border-radius: 999px;
  box-shadow: 0 14px 32px rgba(18, 140, 126, 0.35) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease !important;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 40px rgba(18, 140, 126, 0.45) !important;
  }
}

@media (max-width: 960px) {
  .hero {
    padding: 64px 32px;
  }

  .product-grid {
    gap: 20px;
  }
}

@media (max-width: 600px) {
  .hero {
    padding: 48px 24px;
  }

  .hero-description {
    font-size: 1.1rem;
  }

  .mentor-name {
    font-size: 1.05rem;
  }
}
</style>
