<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">曲线拟合设置</div>

    <div class="row no-wrap" style="height: calc(100vh - 150px); gap: 16px">
      <!-- 左侧：视频流预览区 -->
      <div style="width: 50%; display: flex; flex-direction: column">
        <q-card flat bordered style="height: 100%">
          <q-card-section style="height: 100%; display: flex; flex-direction: column">
            <div class="text-h6 q-mb-md">视频流预览</div>

            <div style="flex: 1; display: flex; flex-direction: column; gap: 16px">
              <div style="flex: 1; display: flex; flex-direction: column">
                <div class="text-subtitle2 q-mb-xs">Processed Stream</div>
                <img
                  :src="`/video/processed?formula=${encodeURIComponent(equation)}`"
                  width="100%"
                  alt="Processed"
                  style="border: 1px solid #ddd; border-radius: 4px; flex: 1; object-fit: contain"
                />
              </div>

              <div style="flex: 1; display: flex; flex-direction: column">
                <div class="text-subtitle2 q-mb-xs">Mask Stream</div>
                <img
                  :src="`/video/mask`"
                  width="100%"
                  alt="Mask"
                  style="border: 1px solid #ddd; border-radius: 4px; flex: 1; object-fit: contain"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 右侧：设置卡片 -->
      <div style="width: 50%; display: flex; flex-direction: column; gap: 16px">
        <!-- 曲线拟合设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item
            default-opened
            icon="show_chart"
            label="曲线拟合设置"
            header-class="text-primary"
          >
            <q-card-section>
              <!-- 加载状态 -->
              <div v-if="configLoading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
                <div class="q-mt-sm">Loading configuration...</div>
              </div>

              <div v-else>
                <!-- 拟合配置区 -->
                <div class="row items-center q-col-gutter-md q-mb-md">
                  <q-select
                    v-model="trendType"
                    :options="trendOptions"
                    label="趋势类型"
                    dense
                    emit-value
                    map-options
                    style="min-width: 150px"
                  />
                  <q-input
                    v-if="trendType === 'Polynomial'"
                    v-model.number="polyDegree"
                    label="多项式阶数"
                    type="number"
                    dense
                    style="width: 100px"
                  />
                  <q-btn label="重新计算" color="primary" dense @click="computeFit" />
                </div>
                <q-separator />

                <!-- 显示公式与R² -->
                <div class="q-my-md text-subtitle2">
                  <div>
                    拟合公式：<span class="text-primary">{{ equation }}</span>
                  </div>
                  <div>
                    R²: <span class="text-primary">{{ r2.toFixed(6) }}</span>
                  </div>
                </div>

                <!-- 曲线展示区 -->
                <div class="q-mt-lg" style="min-height: 200px">
                  <CurveChart :points="fitResults" />
                </div>

                <!-- 点管理区 -->
                <div class="q-mt-md" style="max-height: 300px; overflow-y: auto">
                  <div class="text-subtitle2 q-mb-sm">数据点管理</div>
                  <div class="q-col-gutter-sm">
                    <div v-for="(p, idx) in sortedPoints" :key="idx" class="q-mb-sm">
                      <div class="row q-gutter-sm items-end">
                        <q-input v-model.number="p.x" label="距离 (m)" type="number" dense />
                        <q-input v-model.number="p.y" label="像素高度" type="number" dense />
                        <q-btn
                          icon="tune"
                          flat
                          dense
                          color="primary"
                          @click="calibratePoint(idx)"
                          :loading="calibrating[idx]"
                          size="sm"
                          title="矫正此点"
                        />
                        <q-btn
                          icon="delete"
                          flat
                          dense
                          color="negative"
                          @click="removePoint(idx)"
                          size="sm"
                        />
                      </div>
                    </div>
                    <div class="q-mt-sm">
                      <q-btn
                        icon="add"
                        label="添加数据点"
                        color="primary"
                        dense
                        @click="addPoint"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 测距设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item default-opened icon="tune" label="测距设置" header-class="text-primary">
            <q-card-section>
              <!-- 距离公式 -->
              <div class="text-subtitle2 q-mb-sm">Distance Formula</div>
              <q-input
                v-model="formula"
                label="Formula"
                dense
                clearable
                @update:model-value="saveDistanceFormula"
              />

              <q-separator class="q-my-md" />

              <!-- HSV 范围 1 -->
              <div class="text-subtitle2">HSV Range 1</div>
              <div
                v-for="id in ['h1_min', 'h1_max', 's1_min', 's1_max', 'v1_min', 'v1_max']"
                :key="id"
                class="q-mt-sm"
              >
                <label>
                  {{ id.toUpperCase() }}:
                  <q-slider
                    v-model="hsv[id]"
                    :min="id.startsWith('h') ? 0 : 0"
                    :max="id.startsWith('h') ? 179 : 255"
                    @update:model-value="postConfig"
                  />
                  <span>{{ hsv[id] }}</span>
                </label>
              </div>

              <!-- HSV 范围 2 -->
              <div class="q-mt-lg">
                <q-checkbox
                  v-model="hsv.use_range2"
                  label="Enable Range 2"
                  @update:model-value="postConfig"
                />
              </div>
              <div v-if="hsv.use_range2" class="q-mt-sm">
                <div
                  v-for="id in ['h2_min', 'h2_max', 's2_min', 's2_max', 'v2_min', 'v2_max']"
                  :key="id"
                  class="q-mt-sm"
                >
                  <label>
                    {{ id.toUpperCase() }}:
                    <q-slider
                      v-model="hsv[id]"
                      :min="id.startsWith('h') ? 0 : 0"
                      :max="id.startsWith('h') ? 179 : 255"
                      @update:model-value="postConfig"
                    />
                    <span>{{ hsv[id] }}</span>
                  </label>
                </div>
              </div>

              <!-- Min Area -->
              <div class="q-mt-lg">
                <label>
                  Min Area:
                  <q-input
                    v-model.number="controls.min_area"
                    type="number"
                    @update:model-value="postConfig"
                    dense
                  />
                </label>
              </div>

              <!-- Canny -->
              <div class="text-subtitle2 q-mt-lg">Canny</div>
              <div class="q-mt-sm">
                <label>
                  Canny Min:
                  <q-slider
                    v-model="controls.canny_min"
                    :min="0"
                    :max="255"
                    @update:model-value="postConfig"
                  />
                  <span>{{ controls.canny_min }}</span>
                </label>
              </div>
              <div class="q-mt-sm">
                <label>
                  Canny Max:
                  <q-slider
                    v-model="controls.canny_max"
                    :min="0"
                    :max="255"
                    @update:model-value="postConfig"
                  />
                  <span>{{ controls.canny_max }}</span>
                </label>
              </div>

              <!-- 重置按钮 -->
              <div class="q-mt-lg">
                <q-btn
                  color="warning"
                  outline
                  label="Reset to Default"
                  @click="resetToDefault"
                  :loading="resetLoading"
                  icon="refresh"
                  class="full-width"
                />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue';
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

// 距离公式
const formula = ref('((524.38/x)**(1/1.003))*100');

// HSV 控制参数
const hsv = reactive<any>({
  h1_min: 0,
  h1_max: 179,
  s1_min: 0,
  s1_max: 255,
  v1_min: 0,
  v1_max: 85,
  use_range2: false,
  h2_min: 0,
  h2_max: 179,
  s2_min: 0,
  s2_max: 255,
  v2_min: 0,
  v2_max: 85,
});

// 控制参数
const controls = reactive<any>({
  min_area: 200,
  canny_min: 50,
  canny_max: 150,
});

// 重置功能相关
const resetLoading = ref(false);

// 矫正功能相关
const calibrating = ref<boolean[]>([]);

// 初始测距数据（默认值）
const defaultPoints = [
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
];

const points = ref<{ x: number; y: number }[]>([]);

// 配置加载状态
const configLoading = ref(true);

// 排序后的点
const sortedPoints = computed(() => [...points.value].sort((a, b) => a.x - b.x));

// 拟合结果
const fitResults = ref<{ x: number; y: number }[]>([]);
const equation = ref<string>('');
const r2 = ref<number>(0);

// 拟合计算函数
function computeFit() {
  const data: [number, number][] = sortedPoints.value.map((p) => [p.x, p.y]);
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

  // 保存公式到配置
  void saveFormula();
}

// 配置管理函数
async function loadConfig() {
  try {
    configLoading.value = true;

    // 获取所有配置
    const response = await fetch('/config/custom_string');
    const data = await response.json();

    // 检查API响应结构
    console.log('Config API Response:', data);

    // 获取配置对象
    const configs = data.success && data.custom_config ? data.custom_config : {};

    // 加载趋势类型
    if (configs.trendType) {
      trendType.value = configs.trendType;
    }

    // 加载多项式阶数
    if (configs.polyDegree) {
      polyDegree.value = parseInt(configs.polyDegree);
    }

    // 加载测距点数据
    if (configs.distancePoints) {
      points.value = JSON.parse(configs.distancePoints);
    } else {
      // 如果没有保存的数据，使用默认值并保存
      points.value = [...defaultPoints];
      await savePoints();
    }

    // 初始化矫正状态数组
    calibrating.value = new Array(points.value.length).fill(false);

    // 加载距离公式 - 支持两种字段名
    if (configs.distance_formula) {
      formula.value = configs.distance_formula;
    } else if (configs.Formula) {
      formula.value = configs.Formula;
    }

    // 加载 HSV 配置
    if (configs.hsv_settings) {
      const hsvConfig = JSON.parse(configs.hsv_settings);
      Object.assign(hsv, hsvConfig);
    }

    // 加载控制配置
    if (configs.control_settings) {
      const controlConfig = JSON.parse(configs.control_settings);
      Object.assign(controls, controlConfig);
    }

    // 加载后重新计算拟合
    computeFit();
  } catch (error) {
    console.error('Failed to load config:', error);
    // 出错时使用默认值
    points.value = [...defaultPoints];
    // 初始化矫正状态数组
    calibrating.value = new Array(points.value.length).fill(false);
    computeFit();
  } finally {
    configLoading.value = false;
  }
}

async function saveConfig(key: string, value: string) {
  try {
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch (error) {
    console.error(`Failed to save config ${key}:`, error);
  }
}

async function saveFormula() {
  await saveConfig('formula', equation.value);
}

async function savePoints() {
  await saveConfig('distancePoints', JSON.stringify(points.value));
}

async function saveTrendType() {
  await saveConfig('trendType', trendType.value);
}

async function savePolyDegree() {
  await saveConfig('polyDegree', polyDegree.value.toString());
}

// 保存距离公式
async function saveDistanceFormula() {
  await saveConfig('distance_formula', formula.value);
}

// 保存配置
async function saveConfigurations() {
  try {
    // 保存 HSV 配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'hsv_settings',
        value: JSON.stringify(hsv),
      }),
    });

    // 保存控制配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'control_settings',
        value: JSON.stringify(controls),
      }),
    });

    // 保存距离公式
    await saveDistanceFormula();
  } catch (error) {
    console.error('Error saving configurations:', error);
  }
}

// 删除服务端配置
async function deleteConfigurations() {
  try {
    // 删除 HSV 配置
    await fetch('/config/custom_string?key=hsv_settings', {
      method: 'DELETE',
    });

    // 删除控制配置
    await fetch('/config/custom_string?key=control_settings', {
      method: 'DELETE',
    });

    // 删除距离公式
    await fetch('/config/custom_string?key=distance_formula', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting configurations:', error);
  }
}

// 重置到默认值
async function resetToDefault() {
  resetLoading.value = true;
  try {
    // 删除服务端配置
    await deleteConfigurations();

    // 重置为 Vue 文件中的默认值
    formula.value = '((524.38/x)**(1/1.003))*100';

    Object.assign(hsv, {
      h1_min: 0,
      h1_max: 179,
      s1_min: 0,
      s1_max: 255,
      v1_min: 0,
      v1_max: 85,
      use_range2: false,
      h2_min: 0,
      h2_max: 179,
      s2_min: 0,
      s2_max: 255,
      v2_min: 0,
      v2_max: 85,
    });

    Object.assign(controls, {
      min_area: 200,
      canny_min: 50,
      canny_max: 150,
    });

    // 将默认值发送到服务端并保存
    postConfig();

    console.log('Settings reset to default values');
  } catch (error) {
    console.error('Error resetting to default:', error);
  } finally {
    resetLoading.value = false;
  }
}

// 每次滑条或输入变化都 POST 到后端并保存配置
function postConfig() {
  void fetch('/control/hsv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hsv),
  });
  void fetch('/control/canny', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(controls),
  });

  // 保存配置到持久化存储
  void saveConfigurations();
}

// 增删点
async function addPoint() {
  points.value.push({ x: 1, y: 0 });
  calibrating.value.push(false);
  await savePoints();
  computeFit();
}

async function removePoint(idx: number) {
  points.value.splice(idx, 1);
  calibrating.value.splice(idx, 1);
  await savePoints();
  computeFit();
}

// 矫正数据点
async function calibratePoint(idx: number) {
  try {
    calibrating.value[idx] = true;

    // 调用API获取当前物理测量值
    const response = await fetch('/api/physical_measurements');
    const data = await response.json();

    // 检查API响应结构
    console.log('API Response:', data);

    if (data && data.success && data.measurements && data.measurements.length > 0) {
      const measurement = data.measurements[0]; // 取第一个测量结果
      const newLongPx = measurement.target?.new_long_px;

      if (newLongPx && points.value[idx]) {
        // 更新该点的像素高度
        points.value[idx].y = newLongPx;

        // 保存数据并重新计算拟合
        await savePoints();
        computeFit();

        console.log(`Point ${idx} calibrated: x=${points.value[idx].x}, y=${newLongPx}`);
      } else {
        console.error('Failed to get new_long_px from measurement target:', measurement);
      }
    } else {
      console.error('Invalid API response structure:', data);
    }
  } catch (error) {
    console.error('Failed to calibrate point:', error);
  } finally {
    calibrating.value[idx] = false;
  }
}

// 监听参数变化，自动重算和保存
watch(trendType, async () => {
  await saveTrendType();
  computeFit();
});

watch(polyDegree, async () => {
  await savePolyDegree();
  computeFit();
});

// 监听点数据变化（深度监听）
watch(
  points,
  async () => {
    await savePoints();
    computeFit();
  },
  { deep: true },
);

// 组件挂载时加载配置
onMounted(() => {
  void loadConfig();
});
</script>

<style scoped>
/* 可根据需求调整样式 */
</style>
