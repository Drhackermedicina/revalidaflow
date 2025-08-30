<script setup>
import { currentUser } from '@/plugins/auth'
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const performanceData = computed(() => {
  if (!currentUser.value || !currentUser.value.estacoesConcluidas) {
    return {
      areas: [],
      estacoes: [],
      areaSeries: [],
      estacaoSeries: [],
    }
  }

  const estacoesConcluidas = currentUser.value.estacoesConcluidas

  // Dados para desempenho por área
  const areaScores = {
    anmnese: [],
    exameFisico: [],
    laboratoriaisImagem: [],
    diagnosticoConduta: [],
  }

  const estacaoScores = {}

  estacoesConcluidas.forEach(estacao => {
    if (estacao.detalhesAvaliacao) {
      for (const area in estacao.detalhesAvaliacao) {
        if (areaScores[area]) {
          areaScores[area].push(estacao.detalhesAvaliacao[area])
        }
      }
    }
    if (estacao.idEstacao && estacao.nota !== undefined) {
      if (!estacaoScores[estacao.idEstacao]) {
        estacaoScores[estacao.idEstacao] = []
      }
      estacaoScores[estacao.idEstacao].push(estacao.nota)
    }
  })

  const areas = Object.keys(areaScores)
  const areaAverages = areas.map(area => {
    const sum = areaScores[area].reduce((a, b) => a + b, 0)
    return areaScores[area].length > 0 ? (sum / areaScores[area].length) : 0
  })

  const estacoes = Object.keys(estacaoScores)
  const estacaoAverages = estacoes.map(estacaoId => {
    const sum = estacaoScores[estacaoId].reduce((a, b) => a + b, 0)
    return estacaoScores[estacaoId].length > 0 ? (sum / estacaoScores[estacaoId].length) : 0
  })

  return {
    areas,
    estacoes,
    areaSeries: [{ name: 'Média', data: areaAverages }],
    estacaoSeries: [{ name: 'Média', data: estacaoAverages }],
  }
})

const areaChartOptions = computed(() => ({
  chart: {
    type: 'radar',
    toolbar: { show: false },
  },
  xaxis: {
    categories: performanceData.value.areas,
  },
  yaxis: {
    max: 10, // Assumindo notas de 0 a 10
  },
  stroke: { width: 0 },
  fill: { opacity: 0.4 },
}))

const estacaoChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
  },
  xaxis: {
    categories: performanceData.value.estacoes,
    title: { text: 'Estação' },
  },
  yaxis: {
    title: { text: 'Nota Média' },
    max: 10, // Assumindo notas de 0 a 10
  },
  plotOptions: {
    bar: { horizontal: false, columnWidth: '50%' },
  },
  dataLabels: { enabled: false },
}))
</script>

<template>
  <VCard title="Desempenho do Usuário">
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <h6 class="text-h6">Desempenho por Área</h6>
          <VueApexCharts
            type="radar"
            height="350"
            :options="areaChartOptions"
            :series="performanceData.areaSeries"
          />
        </VCol>
        <VCol cols="12" md="6">
          <h6 class="text-h6">Desempenho por Estação</h6>
          <VueApexCharts
            type="bar"
            height="350"
            :options="estacaoChartOptions"
            :series="performanceData.estacaoSeries"
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
