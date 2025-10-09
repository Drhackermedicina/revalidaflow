<template>
  <div>
    <canvas ref="chartCanvas" aria-label="Gráfico de desempenho"></canvas>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  history: {
    type: Array,
    required: true,
    validator: (value) => Array.isArray(value) && value.every(item =>
      typeof item === 'object' &&
      typeof item.data === 'string' &&
      (typeof item.score === 'number' || typeof item.score === 'string')
    )
  }
})

const chartCanvas = ref(null)
let chartInstance = null

onMounted(() => {
  renderChart()
})

watch(() => props.history, () => {
  renderChart()
})

function renderChart() {
  if (!chartCanvas.value) return

  // Destruir instância anterior se existir
  if (chartInstance) {
    chartInstance.destroy()
  }

  // Verificar se há dados para exibir
  if (!props.history || props.history.length === 0) {
    return
  }

  // Chart.js import dinâmico com tratamento de erro
  import('chart.js/auto').then(({ default: Chart }) => {
    try {
      // Filtrar dados válidos
      const validData = props.history.filter(item =>
        item.data && (item.score !== null && item.score !== undefined && item.score !== '-')
      )

      if (validData.length === 0) {
        return
      }

      chartInstance = new Chart(chartCanvas.value, {
        type: 'line',
        data: {
          labels: validData.map(item => item.data),
          datasets: [
            {
              label: 'Nota',
              data: validData.map(item => Number(item.score) || 0),
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              fill: true,
              tension: 0.3,
              pointBackgroundColor: '#1976d2',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              callbacks: {
                label: (context) => `Nota: ${context.parsed.y}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: {
                stepSize: 1
              }
            },
            x: {
              display: true,
              title: {
                display: true,
                text: 'Data'
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      })
    } catch (error) {
      console.error('Erro ao renderizar gráfico:', error)
    }
  }).catch(error => {
    console.error('Erro ao carregar Chart.js:', error)
  })
}
</script>
