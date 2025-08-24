<template>
  <div>
    <canvas ref="chartCanvas" aria-label="Gráfico de desempenho"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, type PropType } from 'vue';

const props = defineProps({
  history: {
    type: Array as PropType<Array<{ data: string; score: number | string }>>,
    required: true
  }
})

const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null

onMounted(() => {
  renderChart()
})

watch(() => props.history, () => {
  renderChart()
})

function renderChart() {
  if (!chartCanvas.value) return
  if (chartInstance) {
    chartInstance.destroy()
  }
  // Chart.js import dinâmico
  import('chart.js/auto').then(({ default: Chart }) => {
    chartInstance = new Chart(chartCanvas.value!, {
      type: 'line',
      data: {
        labels: props.history.map(item => item.data),
        datasets: [
          {
            label: 'Nota',
            data: props.history.map(item => Number(item.score)),
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    })
  })
}
</script>
