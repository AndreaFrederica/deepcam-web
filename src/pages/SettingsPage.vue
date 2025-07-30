<template>
  <q-page padding>
    <q-card class="q-pa-md">
      <!-- 拟合配置区 -->
      <div class="row items-center q-col-gutter-md q-mb-md">
        <q-select
          v-model="trendType"
          :options="trendOptions"
          label="趋势类型"
          dense
          emit-value
          map-options
        />
        <q-input
          v-if="trendType === 'Polynomial'"
          v-model.number="polyDegree"
          label="多项式阶数"
          type="number"
          dense
          style="width: 80px; margin-left: 8px"
        />
        <q-btn class="q-ml-auto" label="重新计算" color="primary" dense @click="computeFit" />
      </div>
      <q-separator />

      <!-- 显示公式与R² -->
      <div class="q-my-md text-subtitle2">
        <div>
          拟合公式：<span class="text-primary">{{ equation }}</span>
        </div>
        <div>
          R²: <span class="text-primary">{{ r2.toFixed(4) }}</span>
        </div>
      </div>

      <!-- 曲线展示区 -->
      <div class="q-mt-lg">
        <CurveChart :points="fitResults" />
      </div>

      <!-- 点管理区 -->
      <div class="row q-col-gutter-md q-mt-md">
        <div v-for="(p, idx) in sortedPoints" :key="idx" class="col-3">
          <q-input v-model.number="p.x" label="距离 (m)" type="number" dense />
          <q-input v-model.number="p.y" label="像素高度" type="number" dense class="q-mt-sm" />
          <q-btn icon="delete" flat dense color="negative" @click="removePoint(idx)" />
        </div>
        <div class="col-3 flex items-center justify-center">
          <q-btn icon="add" round color="primary" @click="addPoint" />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CurveChart from 'components/CurveChart.vue';
import regression from 'regression';

// 拟合类型选项
const trendOptions = [
  { label: '线性 (Linear)', value: 'Linear' },
  { label: '对数 (Logarithmic)', value: 'Logarithmic' },
  { label: '指数 (Exponential)', value: 'Exponential' },
  { label: '幂 (Power)', value: 'Power' },
  { label: '多项式 (Polynomial)', value: 'Polynomial' },
];
const trendType = ref<'Linear' | 'Logarithmic' | 'Exponential' | 'Power' | 'Polynomial'>('Power');
const polyDegree = ref<number>(2);

// 初始测距数据
const points = ref<{ x: number; y: number }[]>([
  { x: 0.5, y: 408 },
  { x: 0.6, y: 338 },
  { x: 0.7, y: 288 },
  { x: 0.8, y: 251 },
  { x: 0.9, y: 224 },
  { x: 1.0, y: 200 },
  { x: 1.1, y: 180 },
  { x: 1.2, y: 165 },
  { x: 1.3, y: 152 },
  { x: 1.4, y: 142 },
  { x: 1.5, y: 132 },
  { x: 1.6, y: 124 },
  { x: 1.7, y: 116 },
  { x: 1.8, y: 111 },
  { x: 1.9, y: 104 },
  { x: 2.0, y: 99 },
]);

// 排序后的点
const sortedPoints = computed(() => [...points.value].sort((a, b) => a.x - b.x));

// 拟合结果
const fitResults = ref<{ x: number; y: number }[]>([]);
const equation = ref<string>('');
const r2 = ref<number>(0);

// 拟合计算函数
function computeFit() {
  const data: [number, number][] = sortedPoints.value.map((p) => [p.x, p.y]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let result: any;

  switch (trendType.value) {
    case 'Linear':
      result = regression.linear(data);
      break;
    case 'Logarithmic':
      result = regression.logarithmic(data);
      break;
    case 'Exponential':
      result = regression.exponential(data);
      break;
    case 'Power':
      result = regression.power(data);
      break;
    case 'Polynomial':
      result = regression.polynomial(data, { order: polyDegree.value });
      break;
  }

  // 设置公式和R²
  equation.value = result.string;
  r2.value = result.r2;

  // 更新拟合点
  fitResults.value = sortedPoints.value.map((p) => {
    const yPred = (result.predict(p.x) as [number, number])[1];
    return { x: p.x, y: yPred };
  });
}

// 增删点
function addPoint() {
  points.value.push({ x: 1, y: 0 });
  computeFit();
}
function removePoint(idx: number) {
  points.value.splice(idx, 1);
  computeFit();
}

// 监听参数变化，自动重算
watch([trendType, polyDegree, sortedPoints], computeFit, { immediate: true });
</script>

<style scoped>
/* 可根据需求调整样式 */
</style>
