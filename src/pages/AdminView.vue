<template>
  <div class="pa-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">🎯 Admin Dashboard - Gestão de Estações</h1>
      </v-col>
    </v-row>

    <!-- Seção do Agente de IA -->
    <v-card class="mb-6" color="blue-lighten-5">
      <v-card-title class="text-blue-darken-2">
        <v-icon class="mr-2">mdi-robot</v-icon>
        🤖 Agente de IA: Gerador e Auditor de Estações
      </v-card-title>
      <v-card-text>
        <!-- Formulário de Geração -->
        <v-row class="mb-4">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="agentState.tema"
              label="Tema/Condição Principal"
              placeholder="Ex: Crise Asmática"
              outlined
              dense
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="5">
            <v-select
              v-model="agentState.especialidade"
              :items="especialidades"
              label="Especialidade"
              placeholder="Selecione a especialidade"
              outlined
              dense
            ></v-select>
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-switch
              v-model="enableWebSearch"
              label="Busca Web"
              hide-details
            ></v-switch>
          </v-col>
        </v-row>

        <v-alert
          v-if="enableWebSearch"
          type="info"
          density="compact"
          class="mb-2"
        >
          <small>ℹ️ Busca web habilitada. Se aparecer aviso sobre SERPAPI_KEY, a funcionalidade será ignorada automaticamente.</small>
        </v-alert>

        <v-alert type="info" density="compact" class="mb-4">
          <strong>🧠 Sistema RAG Integrado!</strong><br>
          • Fase 1: Busca automática em PDFs indexados na memória<br>
          • Fase 2: Consulta às estações INEP armazenadas<br>
        </v-alert>

        <v-btn
          @click="handleStartCreation"
          :loading="agentState.isLoading"
          :disabled="!agentState.tema || !agentState.especialidade"
          color="primary"
          size="large"
          block
        >
          <v-icon class="mr-2">mdi-rocket-launch</v-icon>
          {{ agentState.isLoading ? '🔄 ' + agentState.loadingMessage : '🚀 Iniciar Análise Clínica (Fase 1 com RAG)' }}
        </v-btn>

        <!-- Resultados das Fases -->
        <div v-if="agentState.currentStep >= 2 && !agentState.isLoading" class="mt-6">
          <!-- Fase 1: Resumo Clínico -->
          <v-card v-if="agentState.resumoClinico" class="mb-4" color="green-lighten-5">
            <v-card-title class="text-green-darken-2">
              ✅ Fase 1: Resumo Clínico Gerado (com RAG)
              <v-chip class="ml-2" color="blue" size="small">Modelo de IA + RAG</v-chip>
            </v-card-title>
            <v-card-text>
              <div class="prose-content" v-html="renderMarkdown(agentState.resumoClinico)"></div>
            </v-card-text>
          </v-card>

          <!-- Fase 2: Propostas Estratégicas -->
          <v-card v-if="agentState.propostas.length > 0" class="mb-4" color="purple-lighten-5">
            <v-card-title class="text-purple-darken-2">
              ✅ Fase 2: Propostas Estratégicas Geradas
              <v-chip class="ml-2" color="blue" size="small">Modelo de IA + RAG</v-chip>
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="(proposta, index) in agentState.propostas" :key="index" cols="12" :md="agentState.propostas.length === 1 ? 12 : 6" :lg="agentState.propostas.length === 1 ? 12 : 4">
                  <v-card class="proposal-card h-100" elevation="2">
                    <v-card-text>
                      <div class="prose-content" v-html="renderMarkdown(proposta)"></div>
                    </v-card-text>
                    <v-card-actions>
                      <v-btn
                        @click="handleGenerateFinalStation(proposta)"
                        color="success"
                        block
                      >
                        Gerar Estação com esta Opção
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Fase 3: Estação Gerada -->
          <v-card v-if="agentState.finalStationJson" class="mb-4" color="orange-lighten-5">
            <v-card-title class="text-orange-darken-2">
              ✅ Fase 3: Estação Gerada e Salva no Firestore!
              <v-chip class="ml-2" color="purple" size="small">Modelo de IA</v-chip>
            </v-card-title>
            <v-card-text>
              <v-alert type="success" class="mb-4">
                <strong>ID da Nova Estação:</strong> 
                <code class="ml-2">{{ agentState.newStationId }}</code>
              </v-alert>
              <v-expansion-panels>
                <v-expansion-panel title="Ver JSON da Estação">
                  <v-expansion-panel-text>
                    <pre class="code-block">{{ agentState.finalStationJson }}</pre>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>

          <!-- Fase 4: Auditoria -->
          <v-card v-if="agentState.finalStationJson && !agentState.analysisResult && agentState.currentStep === 3" class="mb-4" color="red-lighten-5">
            <v-card-title class="text-red-darken-2">
              🔬 Fase 4: Auditoria Manual (Opcional)
              <v-chip class="ml-2" color="purple" size="small">Modelo de IA</v-chip>
            </v-card-title>
            <v-card-text>
              <v-textarea
                v-model="agentState.auditFeedback"
                label="Orientações para o Auditor de IA (opcional)"
                placeholder="Ex: Verifique se o checklist cobre todos os pontos da anamnese."
                rows="3"
                outlined
                class="mb-4"
              ></v-textarea>
              <v-btn
                @click="handleAuditStation(agentState.newStationId, true)"
                :loading="agentState.isLoading"
                color="deep-purple"
                block
              >
                <v-icon class="mr-2">mdi-magnify</v-icon>
                {{ agentState.isLoading ? '🔄 Auditando...' : '🔍 Fazer Auditoria' }}
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Resultado da Auditoria -->
          <v-card v-if="agentState.analysisResult" class="mb-4" color="teal-lighten-5">
            <v-card-title class="text-teal-darken-2">
              ✅ Fase 4: Auditoria da Nova Estação
              <v-chip class="ml-2" color="purple" size="small">Modelo de IA</v-chip>
            </v-card-title>
            <v-card-text>
              <div class="prose-content" v-html="renderMarkdown(agentState.analysisResult)"></div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                @click="handleApplyAuditChanges"
                :loading="agentState.isLoading"
                color="success"
                block
              >
                <v-icon class="mr-2">mdi-check-circle</v-icon>
                {{ agentState.isLoading ? '🔄 Aplicando...' : '✨ Aplicar Mudanças' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

    <!-- Seção do Agente de IA - Geração Múltipla -->
    <v-card class="mb-6" color="purple-lighten-5">
      <v-card-title class="text-purple-darken-2">
        <v-icon class="mr-2">mdi-auto-fix</v-icon>
        🔄 Geração Múltipla de Estações - Modo Lote
      </v-card-title>
      <v-card-text>
        <v-alert type="warning" density="compact" class="mb-4">
          <strong>⚡ Modo Avançado:</strong> Gera múltiplas estações automaticamente com abordagem pré-selecionada.<br>
          • Fluxo: Fase 1 → 2 → 3 (sem pausas) • Sem Fase 4 (auditoria) • Processamento sequencial
        </v-alert>

        <!-- Formulário de Geração Múltipla -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-textarea
              v-model="multipleGenState.temasInput"
              label="Lista de Temas (um por linha)"
              placeholder="Ex:&#10;Crise Asmática&#10;Infarto Agudo do Miocárdio&#10;Pneumonia Adquirida na Comunidade"
              outlined
              rows="4"
              :disabled="multipleGenState.isGenerating"
            ></v-textarea>
            <div class="text-caption text-grey-darken-1 mt-1">
              📝 {{ multipleGenState.temasParsed.length }} tema(s) identificado(s)
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="multipleGenState.especialidade"
              :items="especialidades"
              label="Especialidade"
              placeholder="Selecione a especialidade"
              outlined
              dense
              :disabled="multipleGenState.isGenerating"
            ></v-select>

            <v-select
              v-model="multipleGenState.abordagemSelecionada"
              :items="abordagensParaMultipla"
              item-title="label"
              item-value="id"
              label="Abordagem (Pré-selecionada)"
              placeholder="Escolha a abordagem que será aplicada a todos"
              outlined
              dense
              class="mt-3"
              :disabled="multipleGenState.isGenerating"
            ></v-select>

            <v-switch
              v-model="multipleGenState.enableWebSearch"
              label="Busca Web para cada tema"
              hide-details
              class="mt-3"
              :disabled="multipleGenState.isGenerating"
            ></v-switch>
            
            <v-alert
              v-if="multipleGenState.enableWebSearch"
              type="info"
              density="compact"
              class="mt-2"
            >
              <small>ℹ️ Busca web habilitada. Se aparecer aviso sobre SERPAPI_KEY, a funcionalidade será ignorada automaticamente.</small>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Controles de Geração -->
        <v-row>
          <v-col cols="12">
            <v-btn
              @click="handleStartMultipleGeneration"
              :loading="multipleGenState.isGenerating"
              :disabled="!canStartMultipleGeneration"
              color="purple"
              size="large"
              block
              class="mb-3"
            >
              <v-icon class="mr-2">mdi-play-circle</v-icon>
              {{ multipleGenState.isGenerating ? 
                `🔄 ${multipleGenState.progress.current}/${multipleGenState.progress.total} - ${multipleGenState.loadingMessage}` :
                `🚀 Gerar ${multipleGenState.temasParsed.length} Estações` 
              }}
            </v-btn>

            <v-btn
              v-if="multipleGenState.isGenerating"
              @click="handleCancelMultipleGeneration"
              color="red"
              variant="outlined"
              block
            >
              <v-icon class="mr-2">mdi-stop</v-icon>
              ⏹️ Cancelar Geração
            </v-btn>
          </v-col>
        </v-row>

        <!-- Progresso da Geração Múltipla -->
        <div v-if="multipleGenState.showProgress" class="mt-4">
          <v-progress-linear
            :model-value="progressPercentage"
            height="20"
            color="purple"
            class="mb-3"
          >
            <template v-slot:default="{ value }">
              <strong>{{ Math.ceil(value) }}%</strong>
            </template>
          </v-progress-linear>

          <v-row>
            <v-col cols="4">
              <v-card color="green-lighten-5" class="text-center pa-2">
                <div class="text-h6 text-green-darken-2">{{ multipleGenState.stats.sucessos }}</div>
                <div class="text-caption">Sucessos</div>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card color="red-lighten-5" class="text-center pa-2">
                <div class="text-h6 text-red-darken-2">{{ multipleGenState.stats.falhas }}</div>
                <div class="text-caption">Falhas</div>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card color="blue-lighten-5" class="text-center pa-2">
                <div class="text-h6 text-blue-darken-2">{{ multipleGenState.progress.current }}</div>
                <div class="text-caption">Processados</div>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Resultados da Geração Múltipla -->
        <div v-if="multipleGenState.results.length > 0" class="mt-6">
          <h3 class="text-h6 mb-3">📊 Resultados da Geração</h3>
          
          <v-expansion-panels v-model="multipleGenState.expandedResults" multiple>
            <v-expansion-panel
              v-for="(resultado, index) in multipleGenState.results"
              :key="index"
              :title="`${resultado.index}. ${resultado.tema}`"
            >
              <template v-slot:text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-chip
                      :color="resultado.status === 'success' ? 'green' : 'red'"
                      text-color="white"
                      small
                      class="mb-2"
                    >
                      {{ resultado.status === 'success' ? '✅ Sucesso' : '❌ Erro' }}
                    </v-chip>
                    
                    <div v-if="resultado.status === 'success'">
                      <p><strong>ID da Estação:</strong> {{ resultado.station_id }}</p>
                      <p><strong>Abordagem:</strong> {{ resultado.abordagem_usada }}</p>
                      <p><strong>Status de Validação:</strong> 
                        <v-chip :color="resultado.validation_status === 'valid' ? 'green' : 'orange'" size="small">
                          {{ resultado.validation_status }}
                        </v-chip>
                      </p>
                    </div>
                    
                    <div v-if="resultado.status === 'error'">
                      <p><strong>Erro:</strong></p>
                      <v-alert type="error" density="compact">
                          {{ resultado.error }}
                      </v-alert>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div v-if="resultado.status === 'success'">
                      <v-btn
                        :href="`/stations/${resultado.station_id}`"
                        target="_blank"
                        color="primary"
                        size="small"
                        class="mr-2"
                      >
                        <v-icon class="mr-1">mdi-eye</v-icon>
                        Ver Estação
                      </v-btn>
                    </div>
                    
                    <div v-if="resultado.validation_warnings && resultado.validation_warnings.length > 0">
                      <p><strong>Avisos:</strong></p>
                      <ul class="text-caption">
                        <li v-for="warning in resultado.validation_warnings" :key="warning">
                          {{ warning }}
                        </li>
                      </ul>
                    </div>
                  </v-col>
                </v-row>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>
    </v-card>

    <!-- Cards de Estatísticas -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card color="primary" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stations.length }}</div>
            <div class="text-subtitle1">Total de Estações</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card color="success" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stationsEdited.length }}</div>
            <div class="text-subtitle1">Estações Editadas</div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="4">
        <v-card color="warning" dark>
          <v-card-text class="text-center">
            <div class="text-h3">{{ stationsNotEdited.length }}</div>
            <div class="text-subtitle1">Não Editadas</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs para diferentes visualizações -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="recent">Adicionadas recentemente ({{ stationsRecent.length }})</v-tab>
      <v-tab value="not-edited">Não Editadas ({{ stationsNotEdited.length }})</v-tab>
      <v-tab value="edited">Editadas ({{ stationsEdited.length }})</v-tab>
      <v-tab value="agent-learning">🧠 Memória do Agente</v-tab>
      <v-tab value="version-control">📦 Versionamento</v-tab>
      <v-tab value="monitoring">📊 Monitoramento</v-tab>
    </v-tabs>

    <v-card>
      <v-tabs-window v-model="activeTab">
        <!-- Aba: Adicionadas recentemente -->
        <v-tabs-window-item value="recent">
          <v-card-title>
            🆕 Estações Adicionadas nos Últimos 5 Dias
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersRecent"
              :items="stationsRecent"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsRecent.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.normalizedCreatedAt) }}
              </template>
              <template v-slot:item.editada="{ item }">
                <v-chip
                  :color="item.hasBeenEdited ? 'success' : 'warning'"
                  size="small"
                >
                  {{ item.hasBeenEdited ? 'Sim' : 'Não' }}
                </v-chip>
              </template>
              <template v-slot:item.ultimaEdicao="{ item }">
                {{ item.hasBeenEdited ? formatDate(item.normalizedUpdatedAt) : 'N/A' }}
              </template>
              <template v-slot:item.editadoPor="{ item }">
                <v-chip size="small" color="blue" v-if="item.hasBeenEdited && item.lastEditBy">
                  {{ item.lastEditBy }}
                </v-chip>
                <span v-else class="text-grey">N/A</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                  <v-btn
                    @click="openAuditModal(item)"
                    size="small"
                    color="purple"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-magnify</v-icon>
                    Auditar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba: Estações Não Editadas -->
        <v-tabs-window-item value="not-edited">
          <v-card-title>
            🔄 Estações Aguardando Primeira Edição
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersNotEdited"
              :items="stationsNotEdited"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsNotEdited.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.criadoEmTimestamp) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                  <v-btn
                    @click="openAuditModal(item)"
                    size="small"
                    color="purple"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-magnify</v-icon>
                    Auditar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba: Estações Editadas -->
        <v-tabs-window-item value="edited">
          <v-card-title>
            ✅ Estações Já Editadas
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="headersEdited"
              :items="stationsEdited"
              :items-per-page="10"
              :loading="isLoading"
              :virtual="stationsEdited.length > 100"
              class="elevation-1"
            >
              <template v-slot:item.especialidade="{ item }">
                <v-chip size="small" color="teal">{{ simplifySpecialty(item.especialidade) }}</v-chip>
              </template>
              <template v-slot:item.criadoEm="{ item }">
                {{ formatDate(item.criadoEmTimestamp) }}
              </template>
              <template v-slot:item.atualizadoEm="{ item }">
                {{ formatDate(item.editHistory && item.editHistory.length > 0 ? item.editHistory[item.editHistory.length - 1].timestamp : null) }}
              </template>
              <template v-slot:item.totalEdits="{ item }">
                <v-chip 
                  :color="item.totalEdits > 5 ? 'red' : item.totalEdits > 2 ? 'orange' : 'green'"
                  size="small"
                >
                  {{ item.totalEdits }} edições
                </v-chip>
              </template>
              <template v-slot:item.atualizadoPor="{ item }">
                <v-chip size="small" color="green">
                  {{ item.editHistory && item.editHistory.length > 0 ? item.editHistory[item.editHistory.length - 1].userName : (item.atualizadoPor || 'N/A') }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn
                    @click="editStation(item.id)"
                    size="small"
                    color="primary"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-pencil</v-icon>
                    Editar
                  </v-btn>
                  <v-btn
                    @click="openAuditModal(item)"
                    size="small"
                    color="purple"
                    variant="outlined"
                    density="compact"
                  >
                    <v-icon size="small">mdi-magnify</v-icon>
                    Auditar
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba: Gerenciar Memória do Agente -->
        <v-tabs-window-item value="agent-learning">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>🧠 Sistema de Aprendizado do Agente IA</span>
            <div class="d-flex gap-2">
              <v-chip 
                v-if="agentState.currentStep > 0"
                color="primary"
                size="small"
              >
                <v-icon icon="mdi-sync" size="small" class="mr-1"></v-icon>
                Sincronizado com Fase {{ agentState.currentStep }}
              </v-chip>
              <v-chip 
                :color="backendStatus === 'online' ? 'success' : backendStatus === 'offline' ? 'error' : 'warning'"
                size="small"
              >
                <v-icon 
                  :icon="backendStatus === 'online' ? 'mdi-check-circle' : backendStatus === 'offline' ? 'mdi-close-circle' : 'mdi-help-circle'"
                  size="small" 
                  class="mr-1"
                ></v-icon>
                {{ backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Backend Offline' : 'Verificando...' }}
              </v-chip>
            </div>
          </v-card-title>
          <v-card-text>
            <!-- Stepper para Fases do Aprendizado -->
            <v-stepper v-model="currentStep" class="mb-6">
              <v-stepper-header>
                <v-stepper-item 
                  :complete="currentStep > 1" 
                  step="1" 
                  title="Fase 1"
                  subtitle="Análise Inicial"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item 
                  :complete="currentStep > 2" 
                  step="2" 
                  title="Fase 2"
                  subtitle="Geração de Estratégias"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item 
                  :complete="currentStep > 3" 
                  step="3" 
                  title="Fase 3"
                  subtitle="JSON Final"
                ></v-stepper-item>
                <v-divider></v-divider>
                <v-stepper-item 
                  :complete="currentStep > 4" 
                  step="4" 
                  title="Fase 4"
                  subtitle="Validação"
                ></v-stepper-item>
              </v-stepper-header>

              <v-stepper-window>
                <!-- Fase 1: Análise Inicial -->
                <v-stepper-window-item step="1">
                  <v-card class="mb-4" color="blue-lighten-5">
                    <v-card-title class="text-blue-darken-2">
                      📋 Fase 1: Análise e Contextualização Específica
                    </v-card-title>
                    <v-card-text>
                      <p><strong>Objetivo:</strong> Ensinar o agente sobre análise clínica e criação de resumos focados.</p>
                      <p><strong>Processo:</strong> Extração de PDF, pesquisa de normativas e síntese de conhecimento.</p>
                    </v-card-text>
                  </v-card>
                  
                  <v-textarea
                    v-model="feedbackFase1"
                    label="📝 Feedback para Fase 1 (Análise Inicial)"
                    placeholder="Ex: 'Na análise de hipertensão, sempre incluir classificação da AHA 2017...'"
                    rows="4"
                    outlined
                    clearable
                    class="mb-4"
                  ></v-textarea>
                  
                  <div class="d-flex justify-space-between">
                    <v-btn 
                      @click="enviarFeedback(1, feedbackFase1)"
                      :loading="loadingFeedback"
                      :disabled="!feedbackFase1?.trim()"
                      color="blue"
                      variant="outlined"
                    >
                      🧠 Ensinar Agente
                    </v-btn>
                    <v-btn 
                      @click="proximaFase"
                      color="primary"
                    >
                      Próxima Fase →
                    </v-btn>
                  </div>
                </v-stepper-window-item>

                <!-- Fase 2: Geração de Estratégias -->
                <v-stepper-window-item step="2">
                  <v-card class="mb-4" color="green-lighten-5">
                    <v-card-title class="text-green-darken-2">
                      🎯 Fase 2: Geração de Estratégias
                    </v-card-title>
                    <v-card-text>
                      <p><strong>Objetivo:</strong> Melhorar a geração de propostas estratégicas para estações clínicas.</p>
                      <p><strong>Processo:</strong> Variação de tipos e focos usando diretrizes otimizadas.</p>
                    </v-card-text>
                  </v-card>
                  
                  <v-textarea
                    v-model="feedbackFase2"
                    label="📝 Feedback para Fase 2 (Estratégias)"
                    placeholder="Ex: 'Para cardiologia, sempre incluir estratégia de ECG interpretação...'"
                    rows="4"
                    outlined
                    clearable
                    class="mb-4"
                  ></v-textarea>
                  
                  <div class="d-flex justify-space-between">
                    <v-btn 
                      @click="faseAnterior"
                      color="grey"
                      variant="outlined"
                    >
                      ← Fase Anterior
                    </v-btn>
                    <div class="d-flex gap-2">
                      <v-btn 
                        @click="enviarFeedback(2, feedbackFase2)"
                        :loading="loadingFeedback"
                        :disabled="!feedbackFase2?.trim()"
                        color="green"
                        variant="outlined"
                      >
                        🧠 Ensinar Agente
                      </v-btn>
                      <v-btn 
                        @click="proximaFase"
                        color="primary"
                      >
                        Próxima Fase →
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-window-item>

                <!-- Fase 3: JSON Final -->
                <v-stepper-window-item step="3">
                  <v-card class="mb-4" color="purple-lighten-5">
                    <v-card-title class="text-purple-darken-2">
                      📄 Fase 3: Geração do JSON Completo
                    </v-card-title>
                    <v-card-text>
                      <p><strong>Objetivo:</strong> Otimizar a geração do JSON final das estações clínicas.</p>
                      <p><strong>Processo:</strong> Uso de seções específicas do referencias.md + gabarito.json.</p>
                    </v-card-text>
                  </v-card>
                  
                  <v-textarea
                    v-model="feedbackFase3"
                    label="📝 Feedback para Fase 3 (JSON Final)"
                    placeholder="Ex: 'No JSON, o campo pontuação deve sempre seguir o padrão INEP...'"
                    rows="4"
                    outlined
                    clearable
                    class="mb-4"
                  ></v-textarea>
                  
                  <div class="d-flex justify-space-between">
                    <v-btn 
                      @click="faseAnterior"
                      color="grey"
                      variant="outlined"
                    >
                      ← Fase Anterior
                    </v-btn>
                    <div class="d-flex gap-2">
                      <v-btn 
                        @click="enviarFeedback(3, feedbackFase3)"
                        :loading="loadingFeedback"
                        :disabled="!feedbackFase3?.trim()"
                        color="purple"
                        variant="outlined"
                      >
                        🧠 Ensinar Agente
                      </v-btn>
                      <v-btn 
                        @click="proximaFase"
                        :disabled="!feedbackFase3?.trim()"
                        color="primary"
                      >
                        Próxima Fase →
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-window-item>

                <!-- Fase 4: Validação -->
                <v-stepper-window-item step="4">
                  <v-card class="mb-4" color="orange-lighten-5">
                    <v-card-title class="text-orange-darken-2">
                      ✅ Fase 4: Análise e Validação
                    </v-card-title>
                    <v-card-text>
                      <p><strong>Objetivo:</strong> Melhorar o sistema de análise e validação de estações.</p>
                      <p><strong>Processo:</strong> Checklist de validação e aplicação de auditorias.</p>
                    </v-card-text>
                  </v-card>
                  
                  <v-textarea
                    v-model="feedbackFase4"
                    label="📝 Feedback para Fase 4 (Validação)"
                    placeholder="Ex: 'Na validação, sempre verificar se os critérios INEP estão completos...'"
                    rows="4"
                    outlined
                    clearable
                    class="mb-4"
                  ></v-textarea>
                  
                  <div class="d-flex justify-space-between">
                    <v-btn 
                      @click="faseAnterior"
                      color="grey"
                      variant="outlined"
                    >
                      ← Fase Anterior
                    </v-btn>
                    <div class="d-flex gap-2">
                      <v-btn 
                        @click="enviarFeedback(4, feedbackFase4)"
                        :loading="loadingFeedback"
                        :disabled="!feedbackFase4?.trim()"
                        color="orange"
                        variant="outlined"
                      >
                        🧠 Ensinar Agente
                      </v-btn>
                      <v-btn 
                        @click="reiniciarFases"
                        color="success"
                      >
                        🔄 Reiniciar Ciclo
                      </v-btn>
                    </div>
                  </div>
                </v-stepper-window-item>
              </v-stepper-window>
            </v-stepper>

            <!-- Histórico de Aprendizado -->
            <v-card class="mt-6">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>📚 Histórico de Aprendizado</span>
                <v-btn 
                  @click="testarBackend"
                  size="small"
                  variant="outlined"
                  color="primary"
                  :loading="backendStatus === 'unknown'"
                >
                  🔄 Testar Conexão
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div v-if="historicoAprendizado.length === 0" class="text-center text-grey pa-4">
                  <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-robot-outline</v-icon>
                  <p>Nenhum feedback enviado ainda.</p>
                  <p class="text-caption">Comece ensinando o agente usando as fases acima!</p>
                </div>
                <v-timeline v-else density="compact">
                  <v-timeline-item
                    v-for="(item, index) in historicoAprendizado"
                    :key="index"
                    :dot-color="getFaseColor(item.fase)"
                    size="small"
                  >
                    <template v-slot:opposite>
                      <span class="text-caption">{{ item.timestamp }}</span>
                    </template>
                    <div>
                      <div class="d-flex align-center gap-2 mb-1">
                        <strong>Fase {{ item.fase }}</strong>
                        <v-chip 
                          :color="item.sucesso ? 'success' : 'error'" 
                          size="x-small"
                        >
                          {{ item.sucesso ? 'Sucesso' : 'Erro' }}
                        </v-chip>
                      </div>
                      <p class="text-body-2 mt-1 mb-2">{{ item.feedback }}</p>
                      <p v-if="item.detalhes" class="text-caption text-grey">
                        {{ item.detalhes }}
                      </p>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba de Versionamento -->
        <v-tabs-window-item value="version-control">
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-6">
              <div>
                <h2 class="text-h5 mb-2">📦 Sistema de Versionamento</h2>
                <p class="text-body-2 text-medium-emphasis">
                  Gerencie versões do sistema híbrido de memória local
                </p>
              </div>
              <v-btn 
                color="primary" 
                @click="loadVersions"
                :loading="versionsLoading"
                prepend-icon="mdi-refresh"
              >
                Atualizar
              </v-btn>
            </div>

            <!-- Status do Sistema -->
            <v-card class="mb-6" variant="outlined">
              <v-card-title class="bg-blue-lighten-5">
                <v-icon class="mr-2">mdi-information</v-icon>
                Status do Sistema
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="4">
                    <v-card variant="flat" color="success-lighten-5" class="pa-4">
                      <div class="text-center">
                        <v-icon size="40" color="success" class="mb-2">mdi-check-circle</v-icon>
                        <div class="text-h6">{{ systemStatus?.version_system?.active ? 'Ativo' : 'Inativo' }}</div>
                        <div class="text-caption">Sistema de Versionamento</div>
                      </div>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card variant="flat" color="info-lighten-5" class="pa-4">
                      <div class="text-center">
                        <v-icon size="40" color="info" class="mb-2">mdi-package-variant</v-icon>
                        <div class="text-h6">{{ systemStatus?.version_system?.total_versions || 0 }}</div>
                        <div class="text-caption">Total de Versões</div>
                      </div>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-card variant="flat" color="warning-lighten-5" class="pa-4">
                      <div class="text-center">
                        <v-icon size="40" color="warning" class="mb-2">mdi-tag</v-icon>
                        <div class="text-h6">{{ systemStatus?.version_system?.current_version || 'N/A' }}</div>
                        <div class="text-caption">Versão Atual</div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Ações Rápidas -->
            <v-card class="mb-6" variant="outlined">
              <v-card-title class="bg-green-lighten-5">
                <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
                Ações Rápidas
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-btn 
                      block 
                      color="primary" 
                      size="large"
                      @click="showCreateVersionDialog = true"
                      prepend-icon="mdi-plus"
                      :disabled="!systemStatus?.version_system?.active"
                    >
                      Criar Nova Versão
                    </v-btn>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-btn 
                      block 
                      color="orange" 
                      size="large"
                      @click="loadVersions"
                      prepend-icon="mdi-history"
                      :disabled="!systemStatus?.version_system?.active"
                    >
                      Histórico de Versões
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Lista de Versões -->
            <v-card variant="outlined">
              <v-card-title class="bg-purple-lighten-5">
                <v-icon class="mr-2">mdi-history</v-icon>
                Histórico de Versões
              </v-card-title>
              <v-card-text>
                <div v-if="versionsLoading" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <p class="mt-3">Carregando versões...</p>
                </div>

                <div v-else-if="versions.length === 0" class="text-center py-8">
                  <v-icon size="60" color="grey-lighten-1">mdi-package-variant-closed</v-icon>
                  <p class="text-h6 mt-3">Nenhuma versão encontrada</p>
                  <p class="text-body-2 text-medium-emphasis">Crie sua primeira versão para começar</p>
                </div>

                <div v-else>
                  <v-timeline density="compact">
                    <v-timeline-item
                      v-for="version in versions"
                      :key="version.id"
                      dot-color="primary"
                      size="small"
                    >
                      <template v-slot:icon>
                        <v-icon 
                          :color="version.id === systemStatus?.version_system?.current_version ? 'success' : 'primary'"
                        >
                          {{ version.id === systemStatus?.version_system?.current_version ? 'mdi-check-circle' : 'mdi-package-variant' }}
                        </v-icon>
                      </template>
                      
                      <v-card class="mb-3" variant="outlined">
                        <v-card-text>
                          <div class="d-flex justify-space-between align-start mb-2">
                            <div>
                              <h4 class="text-h6">
                                {{ version.id }}
                                <v-chip 
                                  v-if="version.id === systemStatus?.version_system?.current_version"
                                  color="success" 
                                  size="small" 
                                  class="ml-2"
                                >
                                  ATUAL
                                </v-chip>
                              </h4>
                              <p class="text-body-2 text-medium-emphasis mb-1">
                                {{ formatDate(version.timestamp) }}
                              </p>
                              <p class="text-body-2">{{ version.description }}</p>
                            </div>
                            <div class="text-right">
                              <v-chip color="blue" size="small" class="mb-1">
                                {{ version.type }}
                              </v-chip>
                              <br>
                              <span class="text-caption">
                                {{ version.files_count }} arquivos
                              </span>
                            </div>
                          </div>
                          
                          <v-divider class="my-3"></v-divider>
                          
                          <div class="d-flex justify-end gap-2">
                            <v-btn
                              size="small"
                              color="info"
                              @click="viewVersionDetails(version.id)"
                              prepend-icon="mdi-eye"
                            >
                              Detalhes
                            </v-btn>
                            <v-btn
                              v-if="version.id !== systemStatus?.version_system?.current_version"
                              size="small"
                              color="warning"
                              @click="confirmRollback(version.id)"
                              prepend-icon="mdi-restore"
                            >
                              Restaurar
                            </v-btn>
                            <v-btn
                              v-if="version.id !== systemStatus?.version_system?.current_version"
                              size="small"
                              color="error"
                              @click="confirmDeleteVersion(version.id)"
                              prepend-icon="mdi-delete"
                            >
                              Excluir
                            </v-btn>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-timeline-item>
                  </v-timeline>
                </div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Aba de Monitoramento -->
        <v-tabs-window-item value="monitoring">
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-6">
              <div>
                <h2 class="text-h5 mb-2">📊 Sistema de Monitoramento</h2>
                <p class="text-body-2 text-medium-emphasis">
                  Métricas em tempo real e análise de performance
                </p>
              </div>
              <v-btn 
                color="primary" 
                @click="loadMonitoringData"
                :loading="monitoringLoading"
                prepend-icon="mdi-refresh"
              >
                Atualizar
              </v-btn>
            </div>

            <!-- Cards de Status Geral -->
            <v-row class="mb-6">
              <v-col cols="12" md="3">
                <v-card color="success-lighten-5" variant="flat" class="pa-4">
                  <div class="text-center">
                    <v-icon size="40" color="success" class="mb-2">mdi-check-circle</v-icon>
                    <div class="text-h6">{{ monitoringData?.health?.overall || 'N/A' }}</div>
                    <div class="text-caption">Status Geral</div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="info-lighten-5" variant="flat" class="pa-4">
                  <div class="text-center">
                    <v-icon size="40" color="info" class="mb-2">mdi-clock</v-icon>
                    <div class="text-h6">{{ monitoringData?.uptime_hours || 0 }}h</div>
                    <div class="text-caption">Uptime</div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="warning-lighten-5" variant="flat" class="pa-4">
                  <div class="text-center">
                    <v-icon size="40" color="warning" class="mb-2">mdi-memory</v-icon>
                    <div class="text-h6">{{ monitoringData?.avg_memory_percent || 0 }}%</div>
                    <div class="text-caption">Uso Memória</div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card color="purple-lighten-5" variant="flat" class="pa-4">
                  <div class="text-center">
                    <v-icon size="40" color="purple" class="mb-2">mdi-speedometer</v-icon>
                    <div class="text-h6">{{ monitoringData?.avg_response_time_ms || 0 }}ms</div>
                    <div class="text-caption">Tempo Resposta</div>
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Métricas de Sistema -->
            <v-row class="mb-6">
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="bg-blue-lighten-5">
                    <v-icon class="mr-2">mdi-chart-line</v-icon>
                    Métricas de Requisições
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="6">
                        <div class="text-center">
                          <div class="text-h4 text-primary">{{ monitoringData?.total_requests || 0 }}</div>
                          <div class="text-caption">Total Requisições</div>
                        </div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-center">
                          <div class="text-h4" :class="getErrorRateColor(monitoringData?.error_rate)">
                            {{ monitoringData?.error_rate || 0 }}%
                          </div>
                          <div class="text-caption">Taxa de Erro</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="bg-green-lighten-5">
                    <v-icon class="mr-2">mdi-content-save</v-icon>
                    Economia de Tokens
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="6">
                        <div class="text-center">
                          <div class="text-h4 text-success">{{ monitoringData?.tokens_saved || 0 }}</div>
                          <div class="text-caption">Tokens Economizados</div>
                        </div>
                      </v-col>
                      <v-col cols="6">
                        <div class="text-center">
                          <div class="text-h4 text-success">82%</div>
                          <div class="text-caption">Redução Total</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Status dos Sistemas -->
            <v-card class="mb-6" variant="outlined">
              <v-card-title class="bg-purple-lighten-5">
                <v-icon class="mr-2">mdi-cog</v-icon>
                Status dos Sistemas
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="4">
                    <div class="d-flex align-center mb-3">
                      <v-icon 
                        :color="monitoringData?.hybrid_system_status?.active ? 'success' : 'error'" 
                        class="mr-2"
                      >
                        {{ monitoringData?.hybrid_system_status?.active ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                      </v-icon>
                      <div>
                        <div class="font-weight-medium">Sistema Híbrido</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ monitoringData?.hybrid_system_status?.files_loaded || 0 }} arquivos carregados
                        </div>
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="d-flex align-center mb-3">
                      <v-icon 
                        :color="monitoringData?.version_system_status?.active ? 'success' : 'error'" 
                        class="mr-2"
                      >
                        {{ monitoringData?.version_system_status?.active ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                      </v-icon>
                      <div>
                        <div class="font-weight-medium">Versionamento</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ monitoringData?.version_system_status?.total_versions || 0 }} versões
                        </div>
                      </div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="d-flex align-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                      <div>
                        <div class="font-weight-medium">Aprendizado</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ monitoringData?.learning_events || 0 }} eventos registrados
                        </div>
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Alertas Recentes -->
            <v-card variant="outlined">
              <v-card-title class="bg-orange-lighten-5">
                <v-icon class="mr-2">mdi-alert</v-icon>
                Alertas Recentes
                <v-spacer></v-spacer>
                <v-btn 
                  size="small" 
                  color="orange" 
                  @click="clearAlerts"
                  :disabled="!monitoringData?.recent_alerts?.length"
                >
                  Limpar Alertas
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div v-if="monitoringData?.recent_alerts?.length">
                  <v-timeline density="compact">
                    <v-timeline-item
                      v-for="alert in monitoringData.recent_alerts"
                      :key="alert.timestamp"
                      dot-color="orange"
                      size="small"
                    >
                      <v-card class="mb-2" color="orange-lighten-5" variant="flat">
                        <v-card-text class="py-2">
                          <div class="d-flex justify-space-between align-center">
                            <div>
                              <div class="font-weight-medium">{{ alert.type }}</div>
                              <div class="text-body-2">{{ alert.message }}</div>
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              {{ formatDate(alert.timestamp) }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-timeline-item>
                  </v-timeline>
                </div>
                <div v-else class="text-center py-8">
                  <v-icon size="60" color="success">mdi-check-circle</v-icon>
                  <p class="text-h6 mt-3">Nenhum alerta ativo</p>
                  <p class="text-body-2 text-medium-emphasis">Sistema funcionando normalmente</p>
                </div>
              </v-card-text>
            </v-card>
          </v-card-text>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- Diálogos do Sistema de Versionamento -->
    
    <!-- Dialog: Criar Nova Versão -->
    <v-dialog v-model="showCreateVersionDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Criar Nova Versão
        </v-card-title>
        <v-card-text class="pt-4">
          <v-form @submit.prevent="createNewVersion">
            <v-text-field
              v-model="newVersionDescription"
              label="Descrição da Versão"
              placeholder="Ex: Adicionada nova funcionalidade de..."
              outlined
              required
              class="mb-4"
            ></v-text-field>
            
            <v-select
              v-model="newVersionType"
              :items="['manual', 'feature', 'bugfix', 'backup']"
              label="Tipo da Versão"
              outlined
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showCreateVersionDialog = false">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="createNewVersion"
            :loading="creatingVersion"
            :disabled="!newVersionDescription"
          >
            Criar Versão
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Detalhes da Versão -->
    <v-dialog v-model="showVersionDetailsDialog" max-width="800">
      <v-card>
        <v-card-title class="bg-info text-white">
          <v-icon class="mr-2">mdi-eye</v-icon>
          Detalhes da Versão: {{ selectedVersionDetails?.id }}
        </v-card-title>
        <v-card-text class="pt-4" v-if="selectedVersionDetails">
          <v-row>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>ID:</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedVersionDetails.id }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Tipo:</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedVersionDetails.type }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Data:</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(selectedVersionDetails.timestamp) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Arquivos:</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedVersionDetails.files_count }} arquivos</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Tamanho:</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedVersionDetails.total_size }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
          
          <v-divider class="my-4"></v-divider>
          
          <h4 class="mb-3">Descrição:</h4>
          <p>{{ selectedVersionDetails.description }}</p>
          
          <h4 class="mb-3 mt-4">Arquivos na Versão:</h4>
          <v-chip-group v-if="selectedVersionDetails.files">
            <v-chip 
              v-for="(fileInfo, filename) in selectedVersionDetails.files"
              :key="filename"
              size="small"
            >
              {{ filename }}
            </v-chip>
          </v-chip-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showVersionDetailsDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Rollback -->
    <v-dialog v-model="showRollbackDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="bg-warning text-white">
          <v-icon class="mr-2">mdi-alert</v-icon>
          Confirmar Rollback
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="warning" class="mb-4">
            <strong>Atenção!</strong> Esta ação irá restaurar o sistema para a versão <strong>{{ rollbackVersionId }}</strong>.
            Um backup da versão atual será criado automaticamente.
          </v-alert>
          <p>Tem certeza que deseja continuar?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRollbackDialog = false">Cancelar</v-btn>
          <v-btn 
            color="warning" 
            @click="performRollback"
            :loading="performingRollback"
          >
            Confirmar Rollback
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Exclusão -->
    <v-dialog v-model="showDeleteDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon class="mr-2">mdi-delete</v-icon>
          Confirmar Exclusão
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="error" class="mb-4">
            <strong>Cuidado!</strong> Esta ação irá excluir permanentemente a versão <strong>{{ deleteVersionId }}</strong>.
            Esta operação não pode ser desfeita.
          </v-alert>
          <p>Tem certeza que deseja excluir esta versão?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showDeleteDialog = false">Cancelar</v-btn>
          <v-btn 
            color="error" 
            @click="performDeleteVersion"
            :loading="deletingVersion"
          >
            Excluir Versão
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal de Auditoria para Estações Existentes -->
    <v-dialog v-model="showAuditModal" max-width="800" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="purple">mdi-magnify</v-icon>
          🔍 Auditoria da Estação
          <v-spacer></v-spacer>
          <v-btn
            @click="showAuditModal = false"
            icon="mdi-close"
            variant="text"
            size="small"
          ></v-btn>
        </v-card-title>
        
        <v-card-text>
          <v-alert type="info" class="mb-4" v-if="selectedStation">
            <strong>Estação:</strong> {{ selectedStation.tituloEstacao || 'Sem título' }}<br>
            <strong>Especialidade:</strong> {{ selectedStation.especialidade || 'N/A' }}<br>
            <strong>ID:</strong> {{ selectedStation.id }}
          </v-alert>

          <div v-if="agentState.isLoading" class="text-center py-6">
            <v-progress-circular
              indeterminate
              color="purple"
              size="64"
            ></v-progress-circular>
            <p class="mt-4">Auditando com o Agente de IA...</p>
          </div>

          <div v-else-if="auditResult" class="audit-result">
            <v-alert type="success" class="mb-4">
              ✅ Auditoria concluída!
            </v-alert>
            <div class="prose-content" v-html="renderMarkdown(auditResult)"></div>
          </div>

          <div v-else>
            <v-textarea
              v-model="auditFeedback"
              label="Orientações para o Auditor de IA (opcional)"
              placeholder="Ex: Foque na clareza do checklist para o candidato."
              rows="3"
              outlined
            ></v-textarea>
          </div>
        </v-card-text>

        <v-card-actions v-if="!auditResult">
          <v-spacer></v-spacer>
          <v-btn
            @click="showAuditModal = false"
            variant="outlined"
          >
            Cancelar
          </v-btn>
          <v-btn
            @click="performAudit"
            :loading="agentState.isLoading"
            color="purple"
          >
            <v-icon class="mr-2">mdi-magnify</v-icon>
            {{ agentState.isLoading ? 'Auditando...' : 'Iniciar Auditoria' }}
          </v-btn>
        </v-card-actions>

        <v-card-actions v-else>
          <v-spacer></v-spacer>
          <v-btn
            @click="closeAuditModal"
            color="success"
          >
            <v-icon class="mr-2">mdi-check</v-icon>
            Fechar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
  </div>
</template>

<script setup>
import { db } from '@/plugins/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { debounce } from 'lodash-es'
import { marked } from 'marked'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isLoading = ref(true)
const stations = ref([])
const activeTab = ref('recent')

// ===== SISTEMA DO AGENTE DE IA =====
const agentState = ref({
  tema: '',
  especialidade: '',
  isLoading: false,
  loadingMessage: '',
  currentStep: 0,
  resumoClinico: '',
  propostas: [],
  finalStationJson: '',
  newStationId: '',
  analysisResult: '',
  auditFeedback: ''
})

// ===== SISTEMA DE GERAÇÃO MÚLTIPLA =====
const multipleGenState = ref({
  temasInput: '',
  temasParsed: [],
  especialidade: '',
  abordagemSelecionada: '',
  enableWebSearch: false,
  isGenerating: false,
  showProgress: false,
  loadingMessage: '',
  progress: {
    current: 0,
    total: 0
  },
  stats: {
    sucessos: 0,
    falhas: 0
  },
  results: [],
  expandedResults: [],
  cancelled: false
})

// Flag local para ativar/desativar busca web (persistida em localStorage)
const enableWebSearch = ref(localStorage.getItem('enableWebSearch') === '1')

// Persistir escolha do admin no localStorage
watch(enableWebSearch, (val) => {
  try {
    localStorage.setItem('enableWebSearch', val ? '1' : '0')
  } catch (e) {
    // localStorage pode falhar em alguns ambientes; ignorar silenciosamente
    console.warn('LocalStorage not available for enableWebSearch:', e)
  }
})

// Opções de especialidades
const especialidades = [
  'Clínica Médica',
  'Cirurgia',
  'Pediatria',
  'G.O (Ginecologia e Obstetrícia)',
  'Medicina da Família e Comunidade'
]

// Abordagens disponíveis para geração múltipla
const abordagensParaMultipla = [
  { id: 'completa', label: '🎯 Completa - Avaliação abrangente' },
  { id: 'procedimental', label: '🔧 Procedimental - Foco em técnicas' },
  { id: 'comunicacao', label: '💬 Comunicação - Relação médico-paciente' },
  { id: 'emergencia', label: '🚨 Emergência - Situações críticas' },
  { id: 'diagnostico', label: '🔍 Diagnóstico - Raciocínio clínico' }
]

// Computed para parsear temas
const temasParsed = computed(() => {
  if (!multipleGenState.value.temasInput) return []
  return multipleGenState.value.temasInput
    .split('\n')
    .map(tema => tema.trim())
    .filter(tema => tema.length > 0)
})

// Computed para habilitar botão de geração múltipla
const canStartMultipleGeneration = computed(() => {
  return temasParsed.value.length > 0 && 
         multipleGenState.value.especialidade && 
         multipleGenState.value.abordagemSelecionada &&
         !multipleGenState.value.isGenerating
})

// Computed para percentual de progresso
const progressPercentage = computed(() => {
  if (multipleGenState.value.progress.total === 0) return 0
  return (multipleGenState.value.progress.current / multipleGenState.value.progress.total) * 100
})

// Watcher para atualizar temas parseados
watch(() => multipleGenState.value.temasInput, (newVal) => {
  multipleGenState.value.temasParsed = temasParsed.value
})

// ===== SISTEMA DE VERSIONAMENTO =====
const versions = ref([])
const versionsLoading = ref(false)
const systemStatus = ref(null)

// Diálogos de versionamento
const showCreateVersionDialog = ref(false)
const showVersionDetailsDialog = ref(false)
const showRollbackDialog = ref(false)
const showDeleteDialog = ref(false)

// Estados de operação
const creatingVersion = ref(false)
const performingRollback = ref(false)
const deletingVersion = ref(false)

// Dados de formulários
const newVersionDescription = ref('')
const newVersionType = ref('manual')
const selectedVersionDetails = ref(null)
const rollbackVersionId = ref('')
const deleteVersionId = ref('')

// ===== SISTEMA DE MONITORAMENTO =====
const monitoringData = ref(null)
const monitoringLoading = ref(false)
const alertsData = ref([])

// ===== OTIMIZAÇÕES DE PERFORMANCE =====
const stationsCache = shallowRef(new Map())
const renderMarkdownCache = new Map()

// Debounced markdown renderer (otimizado)
const renderMarkdownLazy = debounce((text) => {
  if (!text) return ''
  if (renderMarkdownCache.has(text)) {
    return renderMarkdownCache.get(text)
  }
  
  // Usar requestIdleCallback para não bloquear UI
  const processMarkdown = () => {
    const formattedText = text.replace(/\n/g, '<br>')
    const result = marked.parse(formattedText)
    renderMarkdownCache.set(text, result)
    return result
  }
  
  if (window.requestIdleCallback) {
    return new Promise(resolve => {
      requestIdleCallback(() => resolve(processMarkdown()))
    })
  } else {
    return processMarkdown()
  }
}, 25) // Otimizado para 25ms

// Processamento em lotes para estações grandes
const processStationsInBatches = (stationsArray, batchSize = 50) => {
  return new Promise((resolve) => {
    if (stationsArray.length <= batchSize) {
      resolve(stationsArray)
      return
    }

    const batches = []
    for (let i = 0; i < stationsArray.length; i += batchSize) {
      batches.push(stationsArray.slice(i, i + batchSize))
    }
    
    let processed = []
    const processBatch = (index) => {
      if (index >= batches.length) {
        resolve(processed)
        return
      }
      
      const batch = batches[index]
      const batchProcessed = batch.map(station => ({
        ...station,
        editInfo: verificarEdicaoHibridaAdmin(station)
      }))
      
      processed = [...processed, ...batchProcessed]
      
      // Próximo lote em microtask para não bloquear UI
      setTimeout(() => processBatch(index + 1), 0)
    }
    
    processBatch(0)
  })
}

// URL do backend Python (configurable via ambiente)
const agentApiUrl = import.meta.env.VITE_AGENT_API_URL || ''

// Função para renderizar Markdown (otimizada)
const renderMarkdown = (text) => {
  if (!text) return ''
  if (renderMarkdownCache.has(text)) {
    return renderMarkdownCache.get(text)
  }
  const formattedText = text.replace(/\n/g, '<br>')
  const result = marked.parse(formattedText)
  renderMarkdownCache.set(text, result)
  return result
}

// Função para resetar estado do agente
const resetAgentState = () => {
  agentState.value = {
    ...agentState.value,
    isLoading: false,
    loadingMessage: '',
    currentStep: 0,
    resumoClinico: '',
    propostas: [],
    finalStationJson: '',
    newStationId: '',
    analysisResult: ''
  }
}

// Função para iniciar criação (Fases 1 e 2)
const handleStartCreation = async () => {
  if (!agentState.value.tema || !agentState.value.especialidade) {
    alert('Por favor, preencha o Tema e a Especialidade.')
    return
  }
  
  resetAgentState()
  agentState.value.isLoading = true
  agentState.value.loadingMessage = 'Executando Fases 1 e 2: Análise Clínica e Geração de Propostas...'

  try {
    const response = await fetch(`${agentApiUrl}/api/agent/create-station`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tema: agentState.value.tema,
        especialidade: agentState.value.especialidade,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro nas Fases 1-2: ${errorText}`)
    }

    const result = await response.json()
    agentState.value.resumoClinico = result.resumo_clinico
    agentState.value.propostas = result.propostas.split('---').filter(p => p.trim() !== '')
    agentState.value.currentStep = 2 // Pula direto para a exibição das propostas

  } catch (error) {
    console.error('Erro ao iniciar criação:', error)
    alert(`Falha na comunicação com o Agente de IA: ${error.message}`)
    resetAgentState()
  } finally {
    agentState.value.isLoading = false
  }
}

// Função para gerar estação final (Fase 3)
const handleGenerateFinalStation = async (chosenProposal) => {
  agentState.value.isLoading = true
  agentState.value.loadingMessage = 'Gerando e salvando estação com Modelo de IA...'
  agentState.value.currentStep = 3

  try {
    const response = await fetch(`${agentApiUrl}/api/agent/generate-final-station`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumo_clinico: agentState.value.resumoClinico,
        proposta_escolhida: chosenProposal,
        tema: agentState.value.tema,
        especialidade: agentState.value.especialidade,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro na Fase 3: ${errorText}`)
    }

    const result = await response.json()
    agentState.value.finalStationJson = JSON.stringify(result.station_data, null, 2)
    agentState.value.newStationId = result.station_id

  } catch (error) {
    console.error('Erro ao gerar estação final:', error)
    alert(`Falha ao gerar estação: ${error.message}`)
    resetAgentState()
  } finally {
    agentState.value.isLoading = false
  }
}

// Função para auditar estação (Fase 4)
const handleAuditStation = async (stationId) => {
  agentState.value.isLoading = true
  agentState.value.loadingMessage = 'Auditando estação com Modelo de IA...'
  
  const targetStationId = stationId || agentState.value.newStationId

  if (agentState.value.newStationId === targetStationId) {
    agentState.value.currentStep = 4
  }

  try {
    const response = await fetch(`${agentApiUrl}/api/agent/analyze-station`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: targetStationId,
        feedback: agentState.value.auditFeedback,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro na Auditoria: ${errorText}`)
    }

    const result = await response.json()
    agentState.value.analysisResult = result.analysis

  } catch (error) {
    console.error('Erro ao auditar estação:', error)
    agentState.value.analysisResult = `Falha ao auditar: ${error.message}`
  } finally {
    agentState.value.isLoading = false
  }
}

// Função para aplicar mudanças da auditoria
const handleApplyAuditChanges = async () => {
  agentState.value.isLoading = true
  agentState.value.loadingMessage = 'Aplicando sugestões da auditoria com Modelo de IA...'

  try {
    const response = await fetch(`${agentApiUrl}/api/agent/apply-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: agentState.value.newStationId,
        analysis_result: agentState.value.analysisResult,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro ao aplicar mudanças: ${errorText}`)
    }

    const result = await response.json()
    agentState.value.finalStationJson = JSON.stringify(result.updated_station_data, null, 2)
    alert('Mudanças aplicadas com sucesso!')
    
    agentState.value.analysisResult = ''
    agentState.value.auditFeedback = ''

  } catch (error) {
    console.error('Erro ao aplicar mudanças da auditoria:', error)
    alert(`Falha ao aplicar mudanças: ${error.message}`)
  } finally {
    agentState.value.isLoading = false
  }
}

// ===== SISTEMA DE GERAÇÃO MÚLTIPLA - FUNÇÕES =====

// Função para iniciar geração múltipla
const handleStartMultipleGeneration = async () => {
  if (!canStartMultipleGeneration.value) return

  // Resetar estado
  multipleGenState.value.isGenerating = true
  multipleGenState.value.showProgress = true
  multipleGenState.value.cancelled = false
  multipleGenState.value.results = []
  multipleGenState.value.stats = { sucessos: 0, falhas: 0 }
  multipleGenState.value.progress = { current: 0, total: temasParsed.value.length }
  multipleGenState.value.loadingMessage = 'Iniciando processamento...'
  multipleGenState.value.expandedResults = []

  const agentApiUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8080'

  try {
    const requestData = {
      temas: temasParsed.value,
      especialidade: multipleGenState.value.especialidade,
      abordagem_selecionada: multipleGenState.value.abordagemSelecionada,
      enable_web_search: multipleGenState.value.enableWebSearch ? 'true' : 'false'
    }

    multipleGenState.value.loadingMessage = 'Enviando requisição para o servidor...'

    const response = await fetch(`${agentApiUrl}/api/agent/generate-multiple-stations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro na requisição: ${response.status} - ${errorText}`)
    }

    multipleGenState.value.loadingMessage = 'Processando resposta...'
    const result = await response.json()

    // Processar resultados
    multipleGenState.value.results = result.resultados || []
    multipleGenState.value.stats.sucessos = result.summary?.sucessos || 0
    multipleGenState.value.stats.falhas = result.summary?.falhas || 0
    multipleGenState.value.progress.current = result.summary?.total_temas || 0

    // Exibir mensagem de conclusão
    const summary = result.summary
    const mensagem = `Geração concluída! ${summary.sucessos} sucessos, ${summary.falhas} falhas de ${summary.total_temas} temas (${summary.taxa_sucesso}% de sucesso)`
    
    multipleGenState.value.loadingMessage = mensagem

    // Expandir todos os resultados por padrão
    multipleGenState.value.expandedResults = multipleGenState.value.results.map((_, index) => index)

    // Recarregar lista de estações para mostrar as novas
    setTimeout(() => {
      fetchStations()
    }, 1000)

    // Notificação de sucesso
    console.log('Geração múltipla concluída:', result)

  } catch (error) {
    console.error('Erro na geração múltipla:', error)
    multipleGenState.value.loadingMessage = `Erro: ${error.message}`
    
    // Adicionar resultado de erro geral se não temos resultados parciais
    if (multipleGenState.value.results.length === 0) {
      multipleGenState.value.results = temasParsed.value.map((tema, index) => ({
        index: index + 1,
        tema,
        status: 'error',
        station_id: null,
        abordagem_usada: multipleGenState.value.abordagemSelecionada,
        validation_status: 'failed',
        validation_warnings: [],
        error: error.message,
        processing_time: 'N/A'
      }))
      multipleGenState.value.stats.falhas = temasParsed.value.length
    }

  } finally {
    multipleGenState.value.isGenerating = false
  }
}

// Função para cancelar geração múltipla
const handleCancelMultipleGeneration = () => {
  multipleGenState.value.cancelled = true
  multipleGenState.value.isGenerating = false
  multipleGenState.value.loadingMessage = 'Cancelado pelo usuário'
  
  console.log('Geração múltipla cancelada pelo usuário')
}

// Função para resetar estado de geração múltipla
const resetMultipleGeneration = () => {
  multipleGenState.value.temasInput = ''
  multipleGenState.value.temasParsed = []
  multipleGenState.value.especialidade = ''
  multipleGenState.value.abordagemSelecionada = ''
  multipleGenState.value.enableWebSearch = false
  multipleGenState.value.isGenerating = false
  multipleGenState.value.showProgress = false
  multipleGenState.value.loadingMessage = ''
  multipleGenState.value.progress = { current: 0, total: 0 }
  multipleGenState.value.stats = { sucessos: 0, falhas: 0 }
  multipleGenState.value.results = []
  multipleGenState.value.expandedResults = []
  multipleGenState.value.cancelled = false
}

// ===== SISTEMA DE APRENDIZADO DO AGENTE =====
// Computed property que sincroniza com o progresso real do agente
const currentStep = computed({
  get: () => {
    // Se o agente está ativo e em progresso, usa o currentStep do agente
    if (agentState.value.currentStep > 0) {
      return agentState.value.currentStep
    }
    // Caso contrário, volta para a fase 1
    return 1
  },
  set: (value) => {
    // Permite navegar manualmente se necessário
    // (mas o agente vai sobrescrever quando estiver ativo)
  }
})

const loadingFeedback = ref(false)
const historicoAprendizado = ref([])
const backendStatus = ref('unknown') // 'online', 'offline', 'unknown'

// Feedbacks para cada fase
const feedbackFase1 = ref('')
const feedbackFase2 = ref('')
const feedbackFase3 = ref('')
const feedbackFase4 = ref('')

// ===== SISTEMA DE AUDITORIA PARA ESTAÇÕES EXISTENTES =====
const showAuditModal = ref(false)
const selectedStation = ref(null)
const auditResult = ref('')
const auditFeedback = ref('')

// Função para abrir modal de auditoria
const openAuditModal = (station) => {
  selectedStation.value = station
  auditResult.value = ''
  auditFeedback.value = ''
  showAuditModal.value = true
}

// Função para fechar modal de auditoria
const closeAuditModal = () => {
  showAuditModal.value = false
  selectedStation.value = null
  auditResult.value = ''
  auditFeedback.value = ''
}

// Função para realizar auditoria
const performAudit = async () => {
  if (!selectedStation.value) return
  
  agentState.value.isLoading = true
  
  try {
    const response = await fetch(`${agentApiUrl}/api/agent/analyze-station`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_id: selectedStation.value.id,
        feedback: auditFeedback.value,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro na Auditoria: ${errorText}`)
    }

    const result = await response.json()
    auditResult.value = result.analysis

  } catch (error) {
    console.error('Erro ao auditar estação:', error)
    auditResult.value = `**Falha ao auditar:** ${error.message}`
  } finally {
    agentState.value.isLoading = false
  }
}

// Função para navegar para edição de estação
const editStation = (stationId) => {
  router.push(`/app/edit-station/${stationId}`)
}

// URL do backend (configurable via ambiente)
const BACKEND_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8080'

// Função para testar conectividade com o backend
const testarBackend = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 5000
    })
    
    if (response.ok) {
      backendStatus.value = 'online'
      console.log('✅ Backend Python Agent está online')
      return true
    } else {
      backendStatus.value = 'offline'
      return false
    }
  } catch (error) {
    backendStatus.value = 'offline'
    console.warn('⚠️ Backend Python Agent não está acessível:', error.message)
    return false
  }
}

// Função para enviar feedback para o agente
const enviarFeedback = async (fase, feedback) => {
  if (!feedback?.trim()) {
    alert('Por favor, insira um feedback válido.')
    return
  }

  // Verificar conectividade primeiro
  const isOnline = await testarBackend()
  if (!isOnline) {
    alert('❌ Backend não está acessível. Verifique se o servidor Python está rodando na porta 8080.')
    return
  }

  loadingFeedback.value = true
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/update-rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedback: `FASE ${fase}: ${feedback.trim()}`
      })
    })

    const result = await response.json()
    
    if (response.ok) {
      // Adicionar ao histórico
      historicoAprendizado.value.unshift({
        fase,
        feedback: feedback.trim(),
        timestamp: new Date().toLocaleString('pt-BR'),
        sucesso: true,
        detalhes: result.message || 'Memória atualizada com sucesso'
      })
      
      // Limpar o campo de feedback
      switch(fase) {
        case 1: feedbackFase1.value = ''; break
        case 2: feedbackFase2.value = ''; break
        case 3: feedbackFase3.value = ''; break
        case 4: feedbackFase4.value = ''; break
      }
      
      alert(`✅ Agente aprendeu com sucesso! ${result.message || 'Fase ' + fase + ' atualizada.'}`)
      console.log('🧠 Feedback enviado:', result)
    } else {
      throw new Error(result.detail || 'Erro desconhecido')
    }
  } catch (error) {
    // Adicionar erro ao histórico
    historicoAprendizado.value.unshift({
      fase,
      feedback: feedback.trim(),
      timestamp: new Date().toLocaleString('pt-BR'),
      sucesso: false,
      detalhes: error.message
    })
    
    console.error('❌ Erro ao enviar feedback:', error)
    alert(`❌ Erro ao ensinar agente: ${error.message}`)
  } finally {
    loadingFeedback.value = false
  }
}

// Navegação entre fases (apenas permitida quando agente não está ativo)
const proximaFase = () => {
  // Apenas permite navegação manual se o agente não está processando
  if (agentState.value.currentStep === 0 && currentStep.value < 4) {
    // Como currentStep é computed, navegação manual não funciona mais
    // Esta função mantida para compatibilidade, mas não altera o stepper
    console.log('Navegação manual não disponível - stepper sincronizado com progresso do agente')
  }
}

const faseAnterior = () => {
  // Apenas permite navegação manual se o agente não está processando  
  if (agentState.value.currentStep === 0 && currentStep.value > 1) {
    // Como currentStep é computed, navegação manual não funciona mais
    // Esta função mantida para compatibilidade, mas não altera o stepper
    console.log('Navegação manual não disponível - stepper sincronizado com progresso do agente')
  }
}

const reiniciarFases = () => {
  // Reseta o progresso do agente e limpa feedbacks
  agentState.value.currentStep = 0
  feedbackFase1.value = ''
  feedbackFase2.value = ''
  feedbackFase3.value = ''
  feedbackFase4.value = ''
}

// Função para cores das fases
const getFaseColor = (fase) => {
  const cores = {
    1: 'blue',
    2: 'green', 
    3: 'purple',
    4: 'orange'
  }
  return cores[fase] || 'grey'
}

// Computed properties otimizados para filtrar estações
const stationsNotEdited = computed(() => {
  const cacheKey = `not-edited-${stations.value.length}-${stations.value.map(s => s.id).join(',').slice(0, 50)}`
  if (stationsCache.value.has(cacheKey)) {
    return stationsCache.value.get(cacheKey)
  }

  const result = stations.value.filter(station => {
    // Usar normalização aprimorada
    const normalized = normalizeStationTimestamps(station)
    return !normalized.hasBeenEdited
  }).map(station => {
    // Adicionar campos normalizados para facilitar acesso nos templates
    const normalized = normalizeStationTimestamps(station)
    return {
      ...station,
      normalizedCreatedAt: normalized.normalizedCreatedAt,
      normalizedUpdatedAt: normalized.normalizedUpdatedAt,
      hasBeenEdited: normalized.hasBeenEdited
    }
  }).sort((a, b) => {
    // Ordenar por data de criação - mais recente primeiro
    const dateA = normalizeTimestampToMs(a.normalizedCreatedAt) || 0
    const dateB = normalizeTimestampToMs(b.normalizedCreatedAt) || 0
    return dateB - dateA
  })

  stationsCache.value.set(cacheKey, result)
  return result
})

const stationsEdited = computed(() => {
  const cacheKey = `edited-${stations.value.length}-${stations.value.map(s => s.id).join(',').slice(0, 50)}`
  if (stationsCache.value.has(cacheKey)) {
    return stationsCache.value.get(cacheKey)
  }

  const result = stations.value.filter(station => {
    // Usar normalização aprimorada
    const normalized = normalizeStationTimestamps(station)
    return normalized.hasBeenEdited
  }).map(station => {
    // Adicionar campos normalizados e informações de edição
    const normalized = normalizeStationTimestamps(station)
    const editInfo = verificarEdicaoHibridaAdmin(station)

    return {
      ...station,
      normalizedCreatedAt: normalized.normalizedCreatedAt,
      normalizedUpdatedAt: normalized.normalizedUpdatedAt,
      hasBeenEdited: normalized.hasBeenEdited,
      totalEdits: editInfo.totalEdits,
      lastEditBy: editInfo.lastEditBy,
      lastEditDate: editInfo.lastEditDate
    }
  }).sort((a, b) => {
    // Ordenar por última edição - mais recente primeiro
    const dateA = normalizeTimestampToMs(a.lastEditDate) || normalizeTimestampToMs(a.normalizedUpdatedAt) || 0
    const dateB = normalizeTimestampToMs(b.lastEditDate) || normalizeTimestampToMs(b.normalizedUpdatedAt) || 0
    return dateB - dateA
  })

  stationsCache.value.set(cacheKey, result)
  return result
})

// Computed para estações adicionadas nos últimos 5 dias
const stationsRecent = computed(() => {
  const cacheKey = `recent-${stations.value.length}-${stations.value.map(s => s.id).join(',').slice(0, 50)}`
  if (stationsCache.value.has(cacheKey)) {
    return stationsCache.value.get(cacheKey)
  }

  // Data de 5 dias atrás
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const fiveDaysAgoTimestamp = fiveDaysAgo.getTime()

  const result = stations.value.filter(station => {
    // Usar normalização para verificar data de criação
    const normalized = normalizeStationTimestamps(station)
    const createdTime = normalizeTimestampToMs(normalized.normalizedCreatedAt)

    if (!createdTime) return false

    return createdTime >= fiveDaysAgoTimestamp
  }).map(station => {
    // Adicionar campos normalizados
    const normalized = normalizeStationTimestamps(station)
    return {
      ...station,
      normalizedCreatedAt: normalized.normalizedCreatedAt,
      normalizedUpdatedAt: normalized.normalizedUpdatedAt,
      hasBeenEdited: normalized.hasBeenEdited
    }
  }).sort((a, b) => {
    // Ordenar por data de criação - mais recente primeiro
    const dateA = normalizeTimestampToMs(a.normalizedCreatedAt) || 0
    const dateB = normalizeTimestampToMs(b.normalizedCreatedAt) || 0
    return dateB - dateA
  })

  stationsCache.value.set(cacheKey, result)
  return result
})

// Função para simplificar especialidades
const simplifySpecialty = (especialidade) => {
  if (!especialidade) return 'N/A'
  
  // Normalizar para maiúsculo para comparação
  const especialidadeUpper = especialidade.toUpperCase().trim()
  
  const especialidadeMap = {
    // Clínica Médica - todas as variações
    'CLÍNICA MÉDICA': 'CM',
    'CLINICA MÉDICA': 'CM',
    'CLINICA MEDICA': 'CM',
    'Clínica Médica': 'CM',
    
    // Cirurgia - variações
    'CIRURGIA': 'CR',
    'CIRURGIA GERAL': 'CR',
    
    // Pediatria - variações  
    'PEDIATRIA': 'PED',
    'PEDIATRÍA': 'PED',
    
    // Ginecologia e Obstetrícia
    'GINECOLOGIA E OBSTETRÍCIA': 'G.O',
    'GINECOLOGIA E OBSTETRICIA': 'G.O',
    
    // Medicina da Família - todas as variações
    'MEDICINA DA FAMÍLIA E COMUNIDADE': 'MED F.C',
    'MEDICINA DA FAMILIA E COMUNIDADE': 'MED F.C',
    'MEDICINA DE FAMÍLIA E COMUNIDADE': 'MED F.C',
    'MEDICINA DA FAMÍLIA E COMUNIDADE (PREVENTIVA)': 'MED F.C',
    'MEDICINA DA FAMILIA E COMUNIDADE (PREVENTIVA)': 'MED F.C'
  }
  
  // Buscar primeiro por correspondência exata
  if (especialidadeMap[especialidade]) {
    return especialidadeMap[especialidade]
  }
  
  // Buscar por correspondência normalizada (maiúscula)
  if (especialidadeMap[especialidadeUpper]) {
    return especialidadeMap[especialidadeUpper]
  }
  
  // Se não encontrou, retornar valor original
  return especialidade
}

// Headers para as tabelas
const headersNotEdited = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'Criado em', key: 'criadoEm', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

const headersRecent = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'CRIADO EM', key: 'criadoEm', sortable: true },
  { title: 'Editada', key: 'editada', sortable: true },
  { title: 'ÚLTIMA EDIÇÃO', key: 'ultimaEdicao', sortable: true },
  { title: 'EDITADO POR', key: 'editadoPor', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

const headersEdited = [
  { title: 'Título', key: 'tituloEstacao', sortable: true },
  { title: 'Especialidade', key: 'especialidade', sortable: true },
  { title: 'CRIADO EM', key: 'criadoEm', sortable: true },
  { title: 'Edições', key: 'totalEdits', sortable: true },
  { title: 'ÚLTIMA EDIÇÃO', key: 'atualizadoEm', sortable: true },
  { title: 'EDITADO POR', key: 'atualizadoPor', sortable: true },
  { title: 'Ações', key: 'actions', sortable: false, width: 150 }
]

// Função aprimorada para formatar datas com normalização de timestamps
const formatDate = (timestamp, options = {}) => {
  if (!timestamp) return 'N/A'

  const {
    showTime = true,
    showSeconds = true,
    fallbackText = 'N/A'
  } = options

  let date

  try {
    // Normalização de diferentes formatos de timestamp

    // 1. Firebase Timestamp (objeto com .seconds)
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    }
    // 2. Timestamp em milissegundos (número grande)
    else if (typeof timestamp === 'number' && timestamp > 1000000000000) {
      date = new Date(timestamp)
    }
    // 3. Timestamp em segundos (número menor)
    else if (typeof timestamp === 'number' && timestamp > 1000000000) {
      date = new Date(timestamp * 1000)
    }
    // 4. String de data ISO ou formato brasileiro
    else if (typeof timestamp === 'string') {
      // Tentar diferentes formatos de string
      const formats = [
        timestamp, // formato original
        timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'), // BR para ISO
        timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}) às (.+)/, '$3-$2-$1T$4'), // BR com hora
      ]

      for (const format of formats) {
        date = new Date(format)
        if (!isNaN(date.getTime())) break
      }
    }
    // 5. Objeto Date
    else if (timestamp instanceof Date) {
      date = timestamp
    }
    // 6. Outros objetos com métodos toDate (ex: Firestore)
    else if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    }
    else {
      return fallbackText
    }

    // Verificar se a data é válida
    if (!date || isNaN(date.getTime())) {
      return fallbackText
    }

    // Formatação da data
    const dateStr = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    if (!showTime) {
      return dateStr
    }

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' })
    }

    const timeStr = date.toLocaleTimeString('pt-BR', timeOptions)

    return `${dateStr} às ${timeStr}`

  } catch (error) {
    console.warn('Erro ao formatar data:', error, timestamp)
    return fallbackText
  }
}

// Função aprimorada para normalizar timestamps de estações
const normalizeStationTimestamps = (station) => {
  const normalized = { ...station }

  // Normalizar data de criação
  const possibleCreatedFields = ['criadoEmTimestamp', 'dataCadastro', 'createdAt', 'timestamp']
  let createdTimestamp = null

  for (const field of possibleCreatedFields) {
    if (station[field]) {
      createdTimestamp = station[field]
      break
    }
  }

  // Normalizar data de atualização
  const possibleUpdatedFields = ['atualizadoEmTimestamp', 'dataUltimaAtualizacao', 'updatedAt', 'editHistory']
  let updatedTimestamp = null

  // Primeiro verificar editHistory (sistema moderno)
  if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
    const lastEdit = station.editHistory[station.editHistory.length - 1]
    updatedTimestamp = lastEdit.timestamp || lastEdit.data || lastEdit.date
  } else {
    // Verificar outros campos de atualização
    for (const field of possibleUpdatedFields) {
      if (station[field] && field !== 'editHistory') {
        updatedTimestamp = station[field]
        break
      }
    }
  }

  // Adicionar campos normalizados
  normalized.normalizedCreatedAt = createdTimestamp
  normalized.normalizedUpdatedAt = updatedTimestamp

  // Determinar se foi editada
  const hasBeenEdited = (() => {
    // Sistema moderno: tem editHistory
    if (station.editHistory && Array.isArray(station.editHistory) && station.editHistory.length > 0) {
      return true
    }

    // Sistema legacy: comparar timestamps
    if (createdTimestamp && updatedTimestamp) {
      try {
        const createdTime = normalizeTimestampToMs(createdTimestamp)
        const updatedTime = normalizeTimestampToMs(updatedTimestamp)
        return updatedTime > createdTime
      } catch (error) {
        console.warn('Erro ao comparar timestamps:', error)
        return false
      }
    }

    // Fallback para campo boolean
    return !!station.hasBeenEdited
  })()

  normalized.hasBeenEdited = hasBeenEdited

  return normalized
}

// Helper para normalizar timestamp para milissegundos
const normalizeTimestampToMs = (timestamp) => {
  if (!timestamp) return null

  // Firebase Timestamp
  if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
    return timestamp.seconds * 1000
  }

  // Já é número em milissegundos
  if (typeof timestamp === 'number' && timestamp > 1000000000000) {
    return timestamp
  }

  // É número em segundos
  if (typeof timestamp === 'number' && timestamp > 1000000000) {
    return timestamp * 1000
  }

  // String ou Date
  const date = new Date(timestamp)
  if (!isNaN(date.getTime())) {
    return date.getTime()
  }

  // Método toDate (Firestore)
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }

  return null
}

// Função aprimorada para verificar edição híbrida (compatibilidade com sistema antigo)
const verificarEdicaoHibridaAdmin = (station) => {
  const normalized = normalizeStationTimestamps(station)

  // Sistema moderno (com editHistory)
  if (station.editHistory && Array.isArray(station.editHistory)) {
    const hasModernEdit = station.editHistory.length > 0
    const lastEdit = hasModernEdit ? station.editHistory[station.editHistory.length - 1] : null
    return {
      hasBeenEdited: hasModernEdit,
      method: 'modern',
      lastEditDate: lastEdit?.timestamp || lastEdit?.data || lastEdit?.date || null,
      createdDate: normalized.normalizedCreatedAt,
      createdBy: station.criadoPor || station.createdBy || null,
      lastEditBy: lastEdit?.editadoPor || lastEdit?.userId || lastEdit?.userName || null,
      totalEdits: station.editHistory.length
    }
  }

  // Sistema legacy (comparação de timestamps)
  const createdDate = normalized.normalizedCreatedAt
  const updatedDate = normalized.normalizedUpdatedAt

  if (createdDate && updatedDate) {
    try {
      const createdTime = normalizeTimestampToMs(createdDate)
      const updatedTime = normalizeTimestampToMs(updatedDate)

      if (createdTime && updatedTime) {
        const hasLegacyEdit = updatedTime > createdTime
        return {
          hasBeenEdited: hasLegacyEdit,
          method: 'legacy',
          totalEdits: hasLegacyEdit ? 1 : 0,
          lastEditDate: hasLegacyEdit ? updatedDate : null,
          lastEditBy: station.atualizadoPor || station.editadoPor || station.updatedBy || station.criadoPor,
          createdDate: createdDate,
          createdBy: station.criadoPor || station.createdBy
        }
      }
    } catch (error) {
      console.warn('Erro ao processar timestamps legacy:', error)
    }
  }

  // Sistema boolean ou nenhum (fallback)
  return {
    hasBeenEdited: normalized.hasBeenEdited,
    method: station.hasBeenEdited !== undefined ? 'boolean' : 'none',
    totalEdits: normalized.hasBeenEdited ? 1 : 0,
    lastEditDate: updatedDate,
    lastEditBy: station.atualizadoPor || station.updatedBy,
    createdDate: createdDate,
    createdBy: station.criadoPor || station.createdBy
  }
}

// Função para calcular dias sem edição
const getDaysWithoutEdit = (dateInput) => {
  if (!dateInput) return 'N/A'
  try {
    const inputDate = dateInput.toDate ? dateInput.toDate() : new Date(dateInput)
    const now = new Date()
    const diffTime = Math.abs(now - inputDate)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } catch {
    return 'N/A'
  }
}

// Função para obter campos alterados na última edição
const getLastChangedFields = (editHistory) => {
  if (!editHistory || editHistory.length === 0) return 'N/A'
  const lastEdit = editHistory[editHistory.length - 1]
  return lastEdit.changedFields ? lastEdit.changedFields.join(', ') : 'N/A'
}

// Listener otimizado para Firestore (delay reduzido e logs minimizados)
const optimizedStationsListener = debounce((snapshot) => {
  
  // Limpar cache primeiro para evitar conflitos
  stationsCache.value.clear()
  
  // Processar dados de forma mais eficiente
  const stationsData = snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data
    }
  })
  
  // Processar com otimização de performance
  if (stationsData.length > 100) {
    // Para grandes volumes, usar processamento em microtasks (mais rápido)
    const chunkSize = 50 // Chunks maiores = menos overhead
    stations.value = stationsData.slice(0, chunkSize) // Primeiro chunk imediato
    
    // Chunks restantes com queueMicrotask (evita setTimeout lento)
    for (let i = chunkSize; i < stationsData.length; i += chunkSize) {
      const chunk = stationsData.slice(i, i + chunkSize)
      queueMicrotask(() => {
        stations.value = [...stations.value, ...chunk]
      })
    }
    isLoading.value = false
  } else {
    // Volume pequeno: processamento direto
    stations.value = stationsData
    isLoading.value = false
  }
}, 25) // Otimizado para 25ms

// ===== MÉTODOS DO SISTEMA DE VERSIONAMENTO =====

// Carregar status do sistema e versões
const loadSystemStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/system-status`)
    if (response.ok) {
      systemStatus.value = await response.json()
    } else {
      console.error('Erro ao carregar status do sistema:', response.statusText)
    }
  } catch (error) {
    console.error('Erro ao carregar status do sistema:', error)
  }
}

// Carregar lista de versões
const loadVersions = async () => {
  versionsLoading.value = true
  try {
    await loadSystemStatus() // Atualizar status também
    
    const response = await fetch(`${BACKEND_URL}/api/agent/versions`)
    if (response.ok) {
      const data = await response.json()
      versions.value = data.versions || []
    } else {
      console.error('Erro ao carregar versões:', response.statusText)
      versions.value = []
    }
  } catch (error) {
    console.error('Erro ao carregar versões:', error)
    versions.value = []
  } finally {
    versionsLoading.value = false
  }
}

// Criar nova versão
const createNewVersion = async () => {
  if (!newVersionDescription.value.trim()) {
    alert('Por favor, forneça uma descrição para a versão')
    return
  }
  
  creatingVersion.value = true
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/create-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: newVersionType.value,
        description: newVersionDescription.value.trim()
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      alert(`✅ Versão ${result.version_created.id} criada com sucesso!`)
      
      // Limpar formulário
      newVersionDescription.value = ''
      newVersionType.value = 'manual'
      showCreateVersionDialog.value = false
      
      // Recarregar versões
      await loadVersions()
    } else {
      const error = await response.json()
      alert(`❌ Erro ao criar versão: ${error.detail}`)
    }
  } catch (error) {
    console.error('Erro ao criar versão:', error)
    alert('❌ Erro de conexão ao criar versão')
  } finally {
    creatingVersion.value = false
  }
}

// Ver detalhes de uma versão
const viewVersionDetails = async (versionId) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/version-details/${versionId}`)
    if (response.ok) {
      const data = await response.json()
      selectedVersionDetails.value = data.version
      showVersionDetailsDialog.value = true
    } else {
      const error = await response.json()
      alert(`❌ Erro ao carregar detalhes: ${error.detail}`)
    }
  } catch (error) {
    console.error('Erro ao carregar detalhes da versão:', error)
    alert('❌ Erro de conexão ao carregar detalhes')
  }
}

// Confirmar rollback
const confirmRollback = (versionId) => {
  rollbackVersionId.value = versionId
  showRollbackDialog.value = true
}

// Realizar rollback
const performRollback = async () => {
  performingRollback.value = true
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/rollback-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version_id: rollbackVersionId.value
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      alert(`✅ Sistema restaurado para versão ${result.rolled_back_to}!\nBackup criado: ${result.backup_created}`)
      
      showRollbackDialog.value = false
      rollbackVersionId.value = ''
      
      // Recarregar versões e status
      await loadVersions()
    } else {
      const error = await response.json()
      alert(`❌ Erro ao fazer rollback: ${error.detail}`)
    }
  } catch (error) {
    console.error('Erro ao fazer rollback:', error)
    alert('❌ Erro de conexão ao fazer rollback')
  } finally {
    performingRollback.value = false
  }
}

// Confirmar exclusão de versão
const confirmDeleteVersion = (versionId) => {
  deleteVersionId.value = versionId
  showDeleteDialog.value = true
}

// Realizar exclusão de versão
const performDeleteVersion = async () => {
  deletingVersion.value = true
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/delete-version/${deleteVersionId.value}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      const result = await response.json()
      alert(`✅ Versão ${deleteVersionId.value} excluída com sucesso!`)
      
      showDeleteDialog.value = false
      deleteVersionId.value = ''
      
      // Recarregar versões
      await loadVersions()
    } else {
      const error = await response.json()
      alert(`❌ Erro ao excluir versão: ${error.detail}`)
    }
  } catch (error) {
    console.error('Erro ao excluir versão:', error)
    alert('❌ Erro de conexão ao excluir versão')
  } finally {
    deletingVersion.value = false
  }
}

// ===== MÉTODOS DO SISTEMA DE MONITORAMENTO =====

// Carregar dados do dashboard de monitoramento
const loadMonitoringData = async () => {
  monitoringLoading.value = true
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/monitoring`)
    if (response.ok) {
      const data = await response.json()
      monitoringData.value = data.dashboard
    } else {
      console.error('Erro ao carregar dados de monitoramento:', response.statusText)
      monitoringData.value = null
    }
  } catch (error) {
    console.error('Erro ao carregar dados de monitoramento:', error)
    monitoringData.value = null
  } finally {
    monitoringLoading.value = false
  }
}

// Limpar alertas do sistema
const clearAlerts = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/agent/monitoring/clear-alerts`, {
      method: 'POST'
    })
    
    if (response.ok) {
      alert('✅ Alertas limpos com sucesso!')
      await loadMonitoringData() // Recarregar dados
    } else {
      const error = await response.json()
      alert(`❌ Erro ao limpar alertas: ${error.detail}`)
    }
  } catch (error) {
    console.error('Erro ao limpar alertas:', error)
    alert('❌ Erro de conexão ao limpar alertas')
  }
}

// Obter cor baseada na taxa de erro
const getErrorRateColor = (errorRate) => {
  if (!errorRate) return 'text-success'
  if (errorRate < 1) return 'text-success'
  if (errorRate < 5) return 'text-warning'
  return 'text-error'
}

onMounted(() => {
  const stationsRef = collection(db, 'estacoes_clinicas')

  onSnapshot(stationsRef, optimizedStationsListener, (error) => {
    console.error('🎯 AdminView: Erro ao carregar dados:', error)
    console.error('🔍 Detalhes do erro Firestore:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    })

    // Diagnóstico específico para erros de permissão
    if (error.code === 'permission-denied') {
      console.error('🚫 ERRO DE PERMISSÃO: Verifique se o usuário está autenticado')
      console.error('🔧 Soluções possíveis:')
      console.error('  - Verificar se usuário fez login')
      console.error('  - Verificar regras Firestore')
      console.error('  - Verificar chaves Firebase')
    }

    isLoading.value = false
  })
})

// Watcher para limpar cache quando stations mudam
watch(stations, () => {
  // Limpar cache de markdown se necessário
  if (renderMarkdownCache.size > 100) {
    renderMarkdownCache.clear()
  }
}, { deep: false })

// Watcher para testar backend quando acessar a aba do agente
watch(activeTab, (newTab) => {
  if (newTab === 'agent-learning') {
    console.log('🧠 Acessando aba do Agente - testando conectividade...')
    testarBackend()
  } else if (newTab === 'version-control') {
    console.log('📦 Acessando aba do Versionamento - carregando dados...')
    loadVersions()
  } else if (newTab === 'monitoring') {
    console.log('📊 Acessando aba do Monitoramento - carregando métricas...')
    loadMonitoringData()
  }
})


</script>

<style scoped>
/* Estilos para o sistema de geração de estações */
.prose-content {
  line-height: 1.6;
}

.prose-content h1, 
.prose-content h2, 
.prose-content h3, 
.prose-content h4 {
  margin-bottom: 0.5em;
  margin-top: 1em;
}

.prose-content ul {
  list-style-position: inside;
  margin-bottom: 1em;
}

.prose-content p {
  margin-bottom: 0.8em;
}

.proposal-card {
  border: 1px solid #e0e0e0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.proposal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.code-block {
  background-color: #2d2d2d;
  color: #f8f8f2;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

code {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

/* Melhorias visuais */
.v-card {
  border-radius: 12px !important;
}

.v-chip {
  font-weight: 500;
}

.v-btn {
  border-radius: 8px !important;
  font-weight: 500;
}

.v-alert {
  border-radius: 8px !important;
}

.v-text-field, .v-textarea, .v-file-input {
  border-radius: 8px !important;
}
</style>
