<template>
  <div class="q-pa-sm" style="height: 300px">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue';
import type { ChartConfiguration } from 'chart.js';
import { Chart } from 'chart.js';

const props = defineProps<{
  points: { x: number; y: number }[];
  currentDistance?: number;
  currentPixelHeight?: number;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

onMounted(() => {
  if (!canvasRef.value) return;

  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: props.points.map((p) => p.x),
      datasets: [
        {
          label: '拟合曲线',
          data: props.points.map((p) => p.y),
          fill: false,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '距离 (m)',
          },
        },
        y: {
          title: {
            display: true,
            text: '像素高度 (px)',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  };

  chart = new Chart(canvasRef.value, config);
  updateCurrentDistancePoint();
});

// 更新当前距离指示线
function updateCurrentDistancePoint() {
  if (!chart || !props.currentDistance || props.currentDistance <= 0) {
    // 移除当前距离线
    if (chart && chart.data.datasets.length > 1) {
      chart.data.datasets.splice(1, 1);
      chart.update('none'); // 关闭动画
    }
    return;
  }

  const distanceInMeters = props.currentDistance;
  const pixelHeight = props.currentPixelHeight || 0;

  console.log(`Chart update: distance=${distanceInMeters.toFixed(3)}m, pixel=${pixelHeight}px`);

  // 检查当前距离是否在图表范围内，如果不在则扩展范围
  const dataPoints = props.points || [];
  const minX = Math.min(...dataPoints.map((p) => p.x));
  const maxX = Math.max(...dataPoints.map((p) => p.x));

  // 如果当前距离超出范围，调整坐标轴
  if (distanceInMeters < minX - 0.1 || distanceInMeters > maxX + 0.1) {
    const newMinX = Math.min(minX, distanceInMeters - 0.1);
    const newMaxX = Math.max(maxX, distanceInMeters + 0.1);

    if (chart.config.options?.scales?.x) {
      chart.config.options.scales.x.min = newMinX;
      chart.config.options.scales.x.max = newMaxX;
    }

    console.log(`Adjusting X-axis range: ${newMinX.toFixed(2)} to ${newMaxX.toFixed(2)}`);
  }

  // 获取X轴范围来绘制完整的水平线
  const currentMinX = (chart.config.options?.scales?.x?.min as number) || minX;
  const currentMaxX = (chart.config.options?.scales?.x?.max as number) || maxX;

  // 创建水平线数据集（从X轴最小值到最大值，Y值固定为当前像素高度）
  const currentDistanceLine = {
    label: `当前距离: ${(distanceInMeters * 100).toFixed(1)} cm`,
    data: [
      { x: currentMinX, y: pixelHeight },
      { x: currentMaxX, y: pixelHeight },
    ] as { x: number; y: number }[],
    fill: false,
    borderColor: 'rgba(255, 0, 0, 0.8)',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderWidth: 3,
    borderDash: [5, 5], // 虚线样式
    pointRadius: 0, // 不显示数据点
    pointHoverRadius: 0,
    showLine: true,
    tension: 0, // 直线，不弯曲
  };

  // 如果已经有当前距离线数据集，则更新；否则添加
  if (chart.data.datasets.length > 1) {
    chart.data.datasets[1] = currentDistanceLine;
  } else {
    chart.data.datasets.push(currentDistanceLine);
  }

  chart.update('none'); // 关闭动画，立即更新
}

watch(
  () => props.points,
  (newPts) => {
    if (chart) {
      chart.data.labels = newPts.map((p) => p.x);
      chart.data.datasets[0]!.data = newPts.map((p) => p.y);
      chart.update('none'); // 关闭动画
      updateCurrentDistancePoint();
    }
  },
  { deep: true },
);

// 监听当前距离变化
watch(
  () => [props.currentDistance, props.currentPixelHeight],
  () => {
    // 实时更新，无防抖延迟
    updateCurrentDistancePoint();
  },
);
</script>
