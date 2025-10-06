<script setup>
import { ref, onMounted } from 'vue'

// Estado para animações
const feynmanVisible = ref(false)
const activeStep = ref(0)

// Dados do método Feynman
const feynmanSteps = [
  {
    number: 1,
    title: 'Escolha o Conceito',
    description: 'Selecione um tema ou conceito que deseja dominar completamente.',
    icon: 'ri-book-open-line',
    color: '#667eea',
    details: 'Identifique lacunas no seu conhecimento e foque em conceitos fundamentais.'
  },
  {
    number: 2,
    title: 'Explique Simplesmente',
    description: 'Escreva ou fale sobre o conceito como se estivesse explicando para uma criança.',
    icon: 'ri-mic-line',
    color: '#764ba2',
    details: 'Use analogias, evite jargões técnicos e seja claro e objetivo.'
  },
  {
    number: 3,
    title: 'Identifique Lacunas',
    description: 'Quando não conseguir explicar algo simplesmente, identifique o que não sabe.',
    icon: 'ri-search-line',
    color: '#f093fb',
    details: 'As dificuldades na explicação revelam pontos que precisam ser estudados.'
  },
  {
    number: 4,
    title: 'Volte às Fontes',
    description: 'Retorne ao material original para preencher as lacunas identificadas.',
    icon: 'ri-refresh-line',
    color: '#f5576c',
    details: 'Estude profundamente até conseguir explicar o conceito com clareza.'
  }
]

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    feynmanVisible.value = true
  }, 300)

  // Animação automática dos steps
  let stepIndex = 0
  const stepInterval = setInterval(() => {
    activeStep.value = stepIndex
    stepIndex = (stepIndex + 1) % feynmanSteps.length
  }, 3000)

  // Limpar intervalo quando componente for destruído
  return () => clearInterval(stepInterval)
})

// Função para mudar step manualmente
const setActiveStep = (index) => {
  activeStep.value = index
}
</script>

<template>
  <section class="feynman-section" :class="{ 'feynman-visible': feynmanVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-lightbulb-line" class="badge-icon" />
          <span class="badge-text">Método Comprovado</span>
        </div>

        <h2 class="section-title">
          O Método Feynman:
          <span class="title-gradient">Aprenda Ensinando</span>
        </h2>

        <p class="section-subtitle">
          Técnica revolucionária usada por Einstein, Feynman e outros gênios.
          Agora potenciada por IA para acelerar seu aprendizado médico.
        </p>
      </div>

      <v-row class="feynman-content">
        <!-- Lado esquerdo - Explicação -->
        <v-col cols="12" lg="6" class="feynman-explanation">
          <div class="explanation-content">
            <div class="quote-container mb-6">
              <div class="quote-icon">
                <v-icon icon="ri-double-quotes-l" size="32" />
              </div>
              <blockquote class="feynman-quote">
                "Se você não consegue explicar algo de forma simples,
                então você não entende bem o suficiente."
              </blockquote>
              <cite class="quote-author">- Richard Feynman</cite>
            </div>

            <div class="method-benefits">
              <h3 class="benefits-title">Por que funciona?</h3>
              <div class="benefits-grid">
                <div class="benefit-item">
                  <v-icon icon="ri-check-circle-line" class="benefit-icon" />
                  <span>Identifica lacunas no conhecimento</span>
                </div>
                <div class="benefit-item">
                  <v-icon icon="ri-check-circle-line" class="benefit-icon" />
                  <span>Fortalece a compreensão profunda</span>
                </div>
                <div class="benefit-item">
                  <v-icon icon="ri-check-circle-line" class="benefit-icon" />
                  <span>Memorização de longo prazo</span>
                </div>
                <div class="benefit-item">
                  <v-icon icon="ri-check-circle-line" class="benefit-icon" />
                  <span>Feedback instantâneo com IA</span>
                </div>
              </div>
            </div>

            <div class="ai-enhancement mt-6">
              <div class="enhancement-header">
                <v-icon icon="ri-robot-line" class="ai-icon" />
                <h4 class="enhancement-title">Potencializado por IA</h4>
              </div>
              <p class="enhancement-text">
                Nossa IA analisa suas explicações em tempo real, identifica conceitos
                mal compreendidos e sugere melhorias específicas para cada caso clínico.
              </p>
            </div>
          </div>
        </v-col>

        <!-- Lado direito - Steps interativos -->
        <v-col cols="12" lg="6" class="feynman-steps">
          <div class="steps-container">
            <!-- Navegação dos steps -->
            <div class="steps-navigation">
              <div
                v-for="(step, index) in feynmanSteps"
                :key="index"
                class="step-nav-item"
                :class="{ 'active': activeStep === index }"
                @click="setActiveStep(index)"
              >
                <div class="nav-number" :style="{ backgroundColor: step.color }">
                  {{ step.number }}
                </div>
                <span class="nav-title">{{ step.title }}</span>
              </div>
            </div>

            <!-- Card do step ativo -->
            <div class="active-step-card">
              <div class="step-header">
                <div
                  class="step-icon-container"
                  :style="{ backgroundColor: `${feynmanSteps[activeStep].color}20` }"
                >
                  <v-icon
                    :icon="feynmanSteps[activeStep].icon"
                    size="32"
                    :color="feynmanSteps[activeStep].color"
                    class="step-icon"
                  />
                </div>
                <div class="step-info">
                  <div class="step-number-badge" :style="{ backgroundColor: feynmanSteps[activeStep].color }">
                    Passo {{ feynmanSteps[activeStep].number }}
                  </div>
                  <h3 class="step-title">{{ feynmanSteps[activeStep].title }}</h3>
                </div>
              </div>

              <div class="step-content">
                <p class="step-description">{{ feynmanSteps[activeStep].description }}</p>
                <div class="step-details">
                  <v-icon icon="ri-information-line" class="details-icon" />
                  <span class="details-text">{{ feynmanSteps[activeStep].details }}</span>
                </div>
              </div>

              <!-- Indicador de progresso -->
              <div class="step-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{
                      width: `${((activeStep + 1) / feynmanSteps.length) * 100}%`,
                      backgroundColor: feynmanSteps[activeStep].color
                    }"
                  ></div>
                </div>
                <span class="progress-text">
                  {{ activeStep + 1 }} de {{ feynmanSteps.length }}
                </span>
              </div>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Call to action -->
      <div class="feynman-cta text-center mt-16">
        <div class="cta-card">
          <h3 class="cta-title">Experimente o Método Feynman com IA</h3>
          <p class="cta-subtitle">
            Comece seu teste gratuito e veja como a combinação de método comprovado
            com tecnologia avançada acelera seu aprendizado.
          </p>
          <v-btn
            to="/register"
            size="x-large"
            color="primary"
            class="btn-primary-custom cta-button"
            elevation="8"
          >
            <span>Testar Método Feynman</span>
            <v-icon class="ml-2">ri-arrow-right-line</v-icon>
          </v-btn>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/feynman-section.scss';
</style>
