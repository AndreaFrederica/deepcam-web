<template>
  <div class="q-pa-sm" style="height: 300px">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue';
import type { ChartConfiguration } from 'chart.js';
import { Chart } from 'chart.js';
const props = defineProps<{ points: { x: number; y: number }[] }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;
onMounted(() => {
  if (!canvasRef.value) return;
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: props.points.map((p) => p.x),
      datasets: [{ label: '拟合', data: props.points.map((p) => p.y), fill: false }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  };
  chart = new Chart(canvasRef.value, config);
});
watch(
  () => props.points,
  (newPts) => {
    if (chart) {
      chart.data.labels = newPts.map((p) => p.x);
      chart.data.datasets[0]!.data = newPts.map((p) => p.y);
      chart.update();
    }
  },
  { deep: true },
);
</script>
