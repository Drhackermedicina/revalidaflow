<script setup>
import { ref, onMounted } from 'vue'
import { firstPhaseFeatures, secondPhaseFeatures } from '../data/features.js'

// Estado para animações e tabs
const phasesVisible = ref(false)
const activeTab = ref(0)

// Dados das fases
const phases = [
  {
    id: 0,
    title: '1ª Fase: Teórica',
    subtitle: 'Domínio do Conhecimento',
    description: 'Base sólida em todas as disciplinas do REVALIDA através de questões atualizadas e material premium.',
    color: '#667eea',
    icon: 'ri-book-open-line',
    features: firstPhaseFeatures
  },
  {
    id: 1,
    title: '2ª Fase: Prática',
    subtitle: 'Simulações em Tempo Real',
    description: 'Estações clínicas ao vivo com atores profissionais, feedback instantâneo e ambiente realista.',
    color: '#764ba2',
    icon: 'ri-user-voice-line',
    features: secondPhaseFeatures
  }
]

// Animações ao montar
onMounted(() => {
  setTimeout(() => {
    phasesVisible.value = true
  }, 400)
})

// Função para trocar de tab
const switchTab = (tabIndex) => {
  activeTab.value = tabIndex
}
</script>

<template>
  <section class="phases-section" :class="{ 'phases-visible': phasesVisible }">
    <v-container>
      <!-- Header da seção -->
      <div class="section-header text-center mb-16">
        <div class="section-badge mb-4">
          <v-icon icon="ri-route-line" class="badge-icon" />
          <span class="badge-text">Jornada Completa</span>
        </div>

        <h2 class="section-title">
          Duas Fases para o
          <span class="title-gradient">Sucesso Total</span>
        </h2>

        <p class="section-subtitle">
          Metodologia estruturada que combina teoria sólida com prática realista,
          garantindo sua aprovação no REVALIDA 2025.
        </p>
      </div>

      <!-- Tabs de navegação -->
      <div class="phases-tabs">
        <div class="tabs-container">
          <div
            v-for="(phase, index) in phases"
            :key="index"
            class="tab-item"
            :class="{ 'active': activeTab === index }"
            @click="switchTab(index)"
          >
            <div class="tab-icon-container" :style="{ backgroundColor: `${phase.color}20` }">
              <v-icon :icon="phase.icon" :color="phase.color" size="24" class="tab-icon" />
            </div>
            <div class="tab-content">
              <h3 class="tab-title">{{ phase.title }}</h3>
              <p class="tab-subtitle">{{ phase.subtitle }}</p>
            </div>
            <div class="tab-indicator" :style="{ backgroundColor: phase.color }"></div>
          </div>
        </div>
      </div>

      <!-- Conteúdo da fase ativa -->
      <div class="phase-content">
        <v-row class="phase-row">
          <!-- Lado esquerdo - Descrição -->
          <v-col cols="12" lg="6" class="phase-description">
            <div class="description-content">
              <div class="phase-header">
                <div
                  class="phase-badge"
                  :style="{ backgroundColor: phases[activeTab].color }"
                >
                  {{ phases[activeTab].title }}
                </div>
                <h3 class="phase-title">{{ phases[activeTab].subtitle }}</h3>
              </div>

              <p class="phase-description-text">
                {{ phases[activeTab].description }}
              </p>

              <!-- Destaques da fase -->
              <div class="phase-highlights">
                <div
                  v-for="(feature, index) in phases[activeTab].features"
                  :key="index"
                  class="highlight-item"
                  :style="{ animationDelay: `${index * 0.1}s` }"
                >
                  <div class="highlight-icon" :style="{ color: phases[activeTab].color }">
                    <v-icon :icon="feature.icon" size="20" />
                  </div>
                  <div class="highlight-text">
                    <h4 class="highlight-title">{{ feature.title }}</h4>
                    <p class="highlight-description">{{ feature.text }}</p>
                  </div>
                </div>
              </div>

              <!-- CTA da fase -->
              <div class="phase-cta">
                <v-btn
                  to="/register"
                  :color="phases[activeTab].color"
                  size="large"
                  class="phase-cta-button"
                  elevation="4"
                >
                  <span>Começar {{ activeTab === 0 ? '1ª' : '2ª' }} Fase</span>
                  <v-icon class="ml-2">ri-arrow-right-line</v-icon>
                </v-btn>
              </div>
            </div>
          </v-col>

          <!-- Lado direito - Visual/Ilustração -->
          <v-col cols="12" lg="6" class="phase-visual">
            <div class="visual-content">
              <!-- Card principal da fase -->
              <div class="phase-card">
                <div class="card-header">
                  <div
                    class="card-icon-bg"
                    :style="{ backgroundColor: `${phases[activeTab].color}15` }"
                  >
                    <v-icon
                      :icon="phases[activeTab].icon"
                      :color="phases[activeTab].color"
                      size="40"
                      class="card-icon"
                    />
                  </div>
                  <div class="card-info">
                    <h4 class="card-title">{{ phases[activeTab].title }}</h4>
                    <p class="card-subtitle">{{ phases[activeTab].subtitle }}</p>
                  </div>
                </div>

                <!-- Elementos visuais da fase -->
                <div class="phase-elements">
                  <div
                    v-for="(feature, index) in phases[activeTab].features.slice(0, 3)"
                    :key="index"
                    class="element-item"
                    :style="{
                      backgroundColor: `${phases[activeTab].color}10`,
                      borderColor: `${phases[activeTab].color}30`,
                      animationDelay: `${index * 0.2}s`
                    }"
                  >
                    <v-icon :icon="feature.icon" :color="phases[activeTab].color" size="24" />
                    <span class="element-text">{{ feature.title }}</span>
                  </div>
                </div>

                <!-- Progress indicator -->
                <div class="phase-progress">
                  <div class="progress-label">
                    <span>Progresso da Fase</span>
                    <span class="progress-percent">{{ activeTab === 0 ? '75%' : '60%' }}</span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{
                        width: activeTab === 0 ? '75%' : '60%',
                        backgroundColor: phases[activeTab].color
                      }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Cards flutuantes -->
              <div class="floating-stats">
                <div class="stat-card stat-1">
                  <div class="stat-number">{{ activeTab === 0 ? '50K+' : '50+' }}</div>
                  <div class="stat-label">{{ activeTab === 0 ? 'Questões' : 'Estações' }}</div>
                </div>
                <div class="stat-card stat-2">
                  <div class="stat-number">{{ activeTab === 0 ? '98%' : '100%' }}</div>
                  <div class="stat-label">{{ activeTab === 0 ? 'Aprovação' : 'Realismo' }}</div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </div>

      <!-- Timeline das fases -->
      <div class="phases-timeline">
        <div class="timeline-container">
          <div
            v-for="(phase, index) in phases"
            :key="index"
            class="timeline-item"
            :class="{ 'active': activeTab === index }"
          >
            <div class="timeline-dot" :style="{ backgroundColor: phase.color }"></div>
            <div class="timeline-content">
              <h4 class="timeline-title">{{ phase.title }}</h4>
              <p class="timeline-description">{{ phase.subtitle }}</p>
            </div>
          </div>
        </div>
      </div>
    </v-container>
  </section>
</template>

<style scoped lang="scss">
@import '../styles/phases-section.scss';
</style>
