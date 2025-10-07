<script setup>
const props = defineProps({
  releasedData: {
    type: Array,
    default: () => []
  },
  isDarkTheme: {
    type: Boolean,
    default: false
  },
  getImageSource: {
    type: Function,
    required: true
  },
  getImageId: {
    type: Function,
    required: true
  },
  openImageZoom: {
    type: Function,
    required: true
  },
  handleImageError: {
    type: Function,
    required: true
  },
  handleImageLoad: {
    type: Function,
    required: true
  }
})
</script>

<template>
  <VCard
    :class="[
      'mb-6 impressos-candidate-card',
      isDarkTheme ? 'impressos-candidate-card--dark' : 'impressos-candidate-card--light'
    ]"
  >
    <VCardTitle>IMPRESSOS RECEBIDOS</VCardTitle>
    <VCardText>
      <VAlert
        v-if="releasedData.length === 0"
        type="info"
        variant="tonal"
      >
        Nenhum "impresso" recebido ainda.
      </VAlert>
      <VExpansionPanels v-else variant="inset" class="mt-4">
        <VExpansionPanel
          v-for="impresso in releasedData"
          :key="'released-' + impresso.idImpresso"
        >
          <VExpansionPanelTitle class="impresso-panel-title">{{ impresso.tituloImpresso }}</VExpansionPanelTitle>
          <VExpansionPanelText class="text-body-1">
            <div
              v-if="impresso.tipoConteudo === 'texto_simples'"
              v-html="impresso.conteudo.texto"
            />
            <div v-else-if="impresso.tipoConteudo === 'imagem_com_texto'">
              <p
                v-if="impresso.conteudo.textoDescritivo"
                v-html="impresso.conteudo.textoDescritivo"
              ></p>
              <img
                v-if="impresso.conteudo.caminhoImagem"
                :src="getImageSource(
                  impresso.conteudo.caminhoImagem,
                  getImageId(impresso.idImpresso, 'candidate-img-texto')
                )"
                :alt="impresso.tituloImpresso"
                class="impresso-imagem impresso-imagem-clickable"
                @click="openImageZoom(
                  getImageSource(
                    impresso.conteudo.caminhoImagem,
                    getImageId(impresso.idImpresso, 'candidate-img-texto')
                  ),
                  impresso.tituloImpresso
                )"
                @error="handleImageError(
                  impresso.conteudo.caminhoImagem,
                  getImageId(impresso.idImpresso, 'candidate-img-texto')
                )"
                @load="handleImageLoad(
                  getImageId(impresso.idImpresso, 'candidate-img-texto')
                )"
              />
              <p v-if="impresso.conteudo.legendaImagem">
                <em>{{ impresso.conteudo.legendaImagem }}</em>
              </p>
              <div
                v-if="impresso.conteudo.laudo"
                class="laudo-impresso"
              >
                <pre>{{ impresso.conteudo.laudo }}</pre>
              </div>
            </div>
            <div
              v-else-if="impresso.tipoConteudo === 'lista_chave_valor_secoes'"
              class="mt-4"
            >
              <div
                v-for="(secao, idxS) in impresso.conteudo.secoes"
                :key="`cand-sec-${impresso.idImpresso}-${idxS}`"
                class="secao-impressos"
              >
                <VDivider v-if="idxS > 0" class="my-4" />
                <div v-if="secao.tituloSecao" class="secao-titulo">
                  <!-- Ícone removido conforme solicitação -->
                  <h6 class="text-h6 font-weight-bold mb-0">
                    {{ secao.tituloSecao }}
                  </h6>
                </div>
                <div class="chave-valor-list">
                  <div
                    v-for="(itemSec, idxI) in (secao.itens || []).filter(item => {
                      if (!item.chave || !secao.tituloSecao) return true;
                      const tituloNormalizado =
                        secao.tituloSecao.trim().toLowerCase();
                      const chaveNormalizada = item.chave
                        .trim()
                        .toLowerCase();
                      return chaveNormalizada !== tituloNormalizado;
                    })"
                    :key="`cand-item-${impresso.idImpresso}-${idxS}-${idxI}`"
                    class="chave-valor-item"
                  >
                    <strong>{{ itemSec.chave }}:</strong>
                    <span v-html="itemSec.valor"></span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="impresso.tipoConteudo === 'tabela_objetos'">
              <VTable>
                <thead>
                  <tr>
                    <th
                      v-for="cab in impresso.conteudo.cabecalhos"
                      :key="`cand-th-${cab.key}`"
                    >
                      {{ cab.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(linha, idxL) in impresso.conteudo.linhas"
                    :key="`cand-lin-${impresso.idImpresso}-${idxL}`"
                  >
                    <td
                      v-for="cab in impresso.conteudo.cabecalhos"
                      :key="`cand-cel-${impresso.idImpresso}-${idxL}-${cab.key}`"
                      v-html="linha[cab.key]"
                    ></td>
                  </tr>
                </tbody>
              </VTable>
            </div>
            <div v-else-if="impresso.tipoConteudo === 'imagem_descritiva'">
              <p
                v-if="impresso.conteudo.descricao"
                v-html="impresso.conteudo.descricao"
              ></p>
              <img
                v-if="impresso.conteudo.caminhoImagem"
                :src="getImageSource(
                  impresso.conteudo.caminhoImagem,
                  getImageId(impresso.idImpresso, 'candidate-img-desc')
                )"
                :alt="impresso.tituloImpresso"
                class="impresso-imagem"
                @error="handleImageError(
                  impresso.conteudo.caminhoImagem,
                  getImageId(impresso.idImpresso, 'candidate-img-desc')
                )"
                @load="handleImageLoad(
                  getImageId(impresso.idImpresso, 'candidate-img-desc')
                )"
              />
            </div>
            <pre v-else>{{ impresso.conteudo }}</pre>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCardText>
  </VCard>
</template>

<style scoped lang="scss">
.impresso-panel-title {
  color: var(--v-theme-primary) !important;
  font-size: 1.05rem !important;
  font-weight: 600;
  margin-bottom: 8px;
}

.secao-titulo h6 {
  color: var(--v-theme-info) !important;
  font-size: 0.95rem !important;
  font-weight: 600;
  margin-bottom: 8px;
  margin-top: 12px;
}

.chave-valor-item {
  padding: 4px 0;
  line-height: 1.5;
  font-size: 0.875rem;
  
  strong {
    color: var(--v-theme-secondary);
    font-weight: 600;
  }
  
  span {
    color: rgba(var(--v-theme-on-surface), 0.87);
  }
}

.text-body-1 {
  font-size: 0.9rem !important;
}
</style>
