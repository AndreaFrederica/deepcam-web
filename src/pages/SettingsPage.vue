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
      <div
        style="
          width: 50%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          height: 100%;
        "
      >
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
                  <div class="col">
                    <q-select
                      v-model="trendType"
                      :options="trendOptions"
                      label="趋势类型"
                      dense
                      emit-value
                      map-options
                      style="min-width: 150px"
                    />
                  </div>
                  <div class="col-auto" v-if="trendType === 'Polynomial'">
                    <q-input
                      v-model.number="polyDegree"
                      label="多项式阶数"
                      type="number"
                      dense
                      style="width: 100px"
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn label="重新计算" color="primary" dense @click="computeFit" />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      label="保存矫正曲线"
                      color="secondary"
                      dense
                      @click="saveCalibrationCurve"
                    />
                  </div>
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

        <!-- HSV颜色检测设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="palette" label="HSV颜色检测设置" header-class="text-primary">
            <q-card-section>
              <!-- 距离公式 -->
              <div class="text-subtitle2 q-mb-sm">距离公式</div>
              <q-input
                v-model="formula"
                label="公式"
                dense
                clearable
                @update:model-value="saveDistanceFormula"
              />

              <q-separator class="q-my-md" />

              <!-- HSV 范围 1 -->
              <div class="text-subtitle2">HSV 范围 1</div>
              <div
                v-for="id in ['h1_min', 'h1_max', 's1_min', 's1_max', 'v1_min', 'v1_max']"
                :key="id"
                class="q-mt-sm"
              >
                <label class="text-caption">
                  {{ id.toUpperCase() }}:
                  <q-slider
                    :model-value="hsv[id as keyof HSVConfig] as number"
                    @update:model-value="
                      (val: number | null) => {
                        if (val !== null) {
                          (hsv as Record<string, number | boolean>)[id] = val;
                          postConfig();
                        }
                      }
                    "
                    :min="id.startsWith('h') ? 0 : 0"
                    :max="id.startsWith('h') ? 179 : 255"
                    label
                    label-always
                  />
                </label>
              </div>

              <!-- HSV 范围 2 -->
              <div class="q-mt-lg">
                <q-checkbox
                  v-model="hsv.use_range2"
                  label="启用第二个HSV范围"
                  @update:model-value="postConfig"
                />
              </div>
              <div v-if="hsv.use_range2" class="q-mt-sm">
                <div class="text-subtitle2">HSV 范围 2</div>
                <div
                  v-for="id in ['h2_min', 'h2_max', 's2_min', 's2_max', 'v2_min', 'v2_max']"
                  :key="id"
                  class="q-mt-sm"
                >
                  <label class="text-caption">
                    {{ id.toUpperCase() }}:
                    <q-slider
                      :model-value="hsv[id as keyof HSVConfig] as number"
                      @update:model-value="
                        (val: number | null) => {
                          if (val !== null) {
                            (hsv as Record<string, number | boolean>)[id] = val;
                            postConfig();
                          }
                        }
                      "
                      :min="id.startsWith('h') ? 0 : 0"
                      :max="id.startsWith('h') ? 179 : 255"
                      label
                      label-always
                    />
                  </label>
                </div>
              </div>

              <!-- 最小面积 -->
              <div class="q-mt-lg">
                <div class="text-subtitle2">最小检测面积</div>
                <q-input
                  v-model.number="controls.min_area"
                  type="number"
                  label="最小面积"
                  @update:model-value="postConfig"
                  dense
                />
              </div>

              <!-- Canny边缘检测 -->
              <div class="text-subtitle2 q-mt-lg">Canny边缘检测</div>
              <div class="q-mt-sm">
                <label class="text-caption">
                  Canny 低阈值:
                  <q-slider
                    v-model="controls.canny_min"
                    :min="0"
                    :max="255"
                    @update:model-value="postConfig"
                    label
                    label-always
                  />
                </label>
              </div>
              <div class="q-mt-sm">
                <label class="text-caption">
                  Canny 高阈值:
                  <q-slider
                    v-model="controls.canny_max"
                    :min="0"
                    :max="255"
                    @update:model-value="postConfig"
                    label
                    label-always
                  />
                </label>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 面积过滤设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="filter_list" label="面积过滤设置" header-class="text-primary">
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.min_crop_area"
                    type="number"
                    label="最小裁剪面积"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.max_crop_area"
                    type="number"
                    label="最大裁剪面积"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
              </div>

              <div class="q-mt-md">
                <q-checkbox
                  v-model="areaFilter.enable_area_filter"
                  label="启用面积过滤"
                  @update:model-value="updateAreaFilter"
                />
              </div>

              <div class="q-mt-md">
                <q-checkbox
                  v-model="areaFilter.enable_a4_check"
                  label="启用A4比例检查"
                  @update:model-value="updateAreaFilter"
                />
              </div>

              <div class="row q-col-gutter-md q-mt-md">
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.a4_ratio_tolerance"
                    type="number"
                    step="0.1"
                    label="A4比例容差"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.max_circularity"
                    type="number"
                    step="0.1"
                    label="最大圆形度"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
              </div>

              <div class="row q-col-gutter-md q-mt-md">
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.min_solidity"
                    type="number"
                    step="0.1"
                    label="最小实心度"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
                <div class="col-6">
                  <q-input
                    v-model.number="areaFilter.max_vertices"
                    type="number"
                    label="最大顶点数"
                    dense
                    @update:model-value="updateAreaFilter"
                  />
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 梯形校正设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="crop" label="梯形校正设置" header-class="text-primary">
            <q-card-section>
              <div class="q-mb-md">
                <q-checkbox
                  v-model="perspective.enable"
                  label="启用梯形校正"
                  @update:model-value="updatePerspective"
                />
              </div>

              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <q-input
                    v-model.number="perspective.target_width"
                    type="number"
                    label="目标宽度 (mm)"
                    dense
                    @update:model-value="updatePerspective"
                  />
                </div>
                <div class="col-6">
                  <q-input
                    v-model.number="perspective.target_height"
                    type="number"
                    label="目标高度 (mm)"
                    dense
                    @update:model-value="updatePerspective"
                  />
                </div>
              </div>

              <div class="row q-col-gutter-md q-mt-md">
                <div class="col-6">
                  <q-input
                    v-model.number="perspective.a4_ratio"
                    type="number"
                    step="0.1"
                    label="A4比例"
                    dense
                    @update:model-value="updatePerspective"
                  />
                </div>
                <div class="col-6">
                  <q-checkbox
                    v-model="perspective.use_short_edge_for_measurement"
                    label="使用短边测量"
                    @update:model-value="updatePerspective"
                  />
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 黑色检测设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="contrast" label="黑色检测设置" header-class="text-primary">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">HSV阈值设置</div>

              <div class="row q-col-gutter-md">
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.lower_h"
                    type="number"
                    label="色调下限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.lower_s"
                    type="number"
                    label="饱和度下限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.lower_v"
                    type="number"
                    label="明度下限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
              </div>

              <div class="row q-col-gutter-md q-mt-md">
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.upper_h"
                    type="number"
                    label="色调上限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.upper_s"
                    type="number"
                    label="饱和度上限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="blackDetection.upper_v"
                    type="number"
                    label="明度上限"
                    dense
                    @update:model-value="updateBlackDetection"
                  />
                </div>
              </div>

              <div class="q-mt-md">
                <q-input
                  v-model.number="blackDetection.morph_kernel_size"
                  type="number"
                  label="形态学核大小"
                  dense
                  @update:model-value="updateBlackDetection"
                />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 摄像头设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="videocam" label="摄像头设置" header-class="text-primary">
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-4">
                  <q-input
                    v-model.number="camera.index"
                    type="number"
                    label="摄像头索引"
                    dense
                    @update:model-value="updateCamera"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="camera.width"
                    type="number"
                    label="分辨率宽度"
                    dense
                    @update:model-value="updateCamera"
                  />
                </div>
                <div class="col-4">
                  <q-input
                    v-model.number="camera.height"
                    type="number"
                    label="分辨率高度"
                    dense
                    @update:model-value="updateCamera"
                  />
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- 全局操作卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="settings" label="全局操作" header-class="text-primary">
            <q-card-section>
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <q-btn
                    color="warning"
                    outline
                    label="重置为默认值"
                    @click="resetAllToDefault"
                    :loading="resetLoading"
                    icon="refresh"
                    class="full-width"
                  />
                </div>
                <div class="col-6">
                  <q-btn
                    color="positive"
                    label="保存所有配置"
                    @click="saveAllConfigs"
                    :loading="saveLoading"
                    icon="save"
                    class="full-width"
                  />
                </div>
              </div>

              <div class="row q-col-gutter-md q-mt-md">
                <div class="col-6">
                  <q-btn
                    color="info"
                    outline
                    label="加载配置"
                    @click="loadAllConfigs"
                    :loading="loadLoading"
                    icon="download"
                    class="full-width"
                  />
                </div>
                <div class="col-6">
                  <q-btn
                    color="secondary"
                    outline
                    label="显示状态"
                    @click="toggleShowRectangles"
                    :loading="showRectanglesLoading"
                    icon="visibility"
                    class="full-width"
                  />
                </div>
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

// 类型定义
interface HSVConfig {
  h1_min: number;
  h1_max: number;
  s1_min: number;
  s1_max: number;
  v1_min: number;
  v1_max: number;
  h2_min: number;
  h2_max: number;
  s2_min: number;
  s2_max: number;
  v2_min: number;
  v2_max: number;
  use_range2: boolean;
  [key: string]: number | boolean; // 索引签名支持动态访问
}

interface ControlsConfig {
  min_area: number;
  canny_min: number;
  canny_max: number;
}

interface AreaFilterConfig {
  min_crop_area: number;
  max_crop_area: number;
  enable_area_filter: boolean;
  a4_ratio_tolerance: number;
  max_circularity: number;
  min_solidity: number;
  max_vertices: number;
  enable_a4_check: boolean;
}

interface PerspectiveConfig {
  enable: boolean;
  target_width: number;
  target_height: number;
  a4_ratio: number;
  use_short_edge_for_measurement: boolean;
}

interface BlackDetectionConfig {
  lower_h: number;
  lower_s: number;
  lower_v: number;
  upper_h: number;
  upper_s: number;
  upper_v: number;
  morph_kernel_size: number;
}

interface CameraConfig {
  index: number;
  width: number;
  height: number;
}

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
const hsv = reactive<HSVConfig>({
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
const controls = reactive<ControlsConfig>({
  min_area: 200,
  canny_min: 50,
  canny_max: 150,
});

// 重置功能相关
const resetLoading = ref(false);
const saveLoading = ref(false);
const loadLoading = ref(false);
const showRectanglesLoading = ref(false);

// 矫正功能相关
const calibrating = ref<boolean[]>([]);

// 面积过滤参数
const areaFilter = reactive<AreaFilterConfig>({
  min_crop_area: 20000,
  max_crop_area: 5200000,
  enable_area_filter: true,
  a4_ratio_tolerance: 0.3,
  max_circularity: 0.7,
  min_solidity: 0.8,
  max_vertices: 8,
  enable_a4_check: true,
});

// 梯形校正参数
const perspective = reactive<PerspectiveConfig>({
  enable: true,
  target_width: 210,
  target_height: 297,
  a4_ratio: 1.414285714285714,
  use_short_edge_for_measurement: true,
});

// 黑色检测参数
const blackDetection = reactive<BlackDetectionConfig>({
  lower_h: 0,
  lower_s: 0,
  lower_v: 0,
  upper_h: 255,
  upper_s: 255,
  upper_v: 80,
  morph_kernel_size: 3,
});

// 摄像头参数
const camera = reactive<CameraConfig>({
  index: 0,
  width: 1920,
  height: 1080,
});

// 初始测距数据（默认值）
const defaultPoints = [
  { x: 1.0, y: 524.9 },
  { x: 1.1, y: 477.2 },
  { x: 1.2, y: 435.4 },
  { x: 1.3, y: 402.7 },
  { x: 1.4, y: 373.9 },
  { x: 1.5, y: 349.6 },
  { x: 1.6, y: 327.5 },
  { x: 1.7, y: 307.6 },
  { x: 1.8, y: 291.5 },
  { x: 1.9, y: 275.5 },
  { x: 2.0, y: 261.2 },
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
  let result: { string: string; r2: number; predict: (x: number) => [number, number] };

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
    default:
      result = regression.power(data);
      break;
  }

  // 设置公式和R²
  equation.value = result.string;
  r2.value = result.r2;

  // 更新拟合点
  fitResults.value = sortedPoints.value.map((p) => {
    const yPred = result.predict(p.x)[1];
    return { x: p.x, y: yPred };
  });

  // 保存公式到配置
  void saveFormula();
}

// 配置管理函数
async function loadConfig() {
  try {
    configLoading.value = true;

    // 获取主配置
    const configResponse = await fetch('/config');
    const configData = await configResponse.json();

    // 获取自定义配置
    const customResponse = await fetch('/config/custom_string');
    const customData = await customResponse.json();

    // 检查API响应结构
    console.log('Config API Response:', configData);
    console.log('Custom Config API Response:', customData);

    // 获取配置对象
    const configs = customData.success && customData.custom_config ? customData.custom_config : {};

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
    } else if (configData.detection_params) {
      // 从主配置加载HSV设置
      const detectionParams = configData.detection_params;
      Object.assign(hsv, {
        h1_min: detectionParams.h1_min || 0,
        h1_max: detectionParams.h1_max || 179,
        s1_min: detectionParams.s1_min || 0,
        s1_max: detectionParams.s1_max || 255,
        v1_min: detectionParams.v1_min || 0,
        v1_max: detectionParams.v1_max || 85,
        h2_min: detectionParams.h2_min || 0,
        h2_max: detectionParams.h2_max || 179,
        s2_min: detectionParams.s2_min || 0,
        s2_max: detectionParams.s2_max || 255,
        v2_min: detectionParams.v2_min || 0,
        v2_max: detectionParams.v2_max || 85,
        use_range2: detectionParams.use_range2 || false,
      });
    }

    // 加载控制配置
    if (configs.control_settings) {
      const controlConfig = JSON.parse(configs.control_settings);
      Object.assign(controls, controlConfig);
    } else if (configData.detection_params) {
      // 从主配置加载控制设置
      const detectionParams = configData.detection_params;
      Object.assign(controls, {
        min_area: detectionParams.min_area || 200,
        canny_min: detectionParams.canny_min || 50,
        canny_max: detectionParams.canny_max || 150,
      });
    }

    // 加载面积过滤配置
    if (configs.area_filter_settings) {
      const areaFilterConfig = JSON.parse(configs.area_filter_settings);
      Object.assign(areaFilter, areaFilterConfig);
    } else if (configData.area_filter_params) {
      Object.assign(areaFilter, configData.area_filter_params);
    }

    // 加载梯形校正配置
    if (configs.perspective_settings) {
      const perspectiveConfig = JSON.parse(configs.perspective_settings);
      Object.assign(perspective, perspectiveConfig);
    } else if (configData.perspective_params) {
      Object.assign(perspective, configData.perspective_params);
    }

    // 加载黑色检测配置
    if (configs.black_detection_settings) {
      const blackDetectionConfig = JSON.parse(configs.black_detection_settings);
      Object.assign(blackDetection, blackDetectionConfig);
    } else if (configData.black_detection_params) {
      Object.assign(blackDetection, configData.black_detection_params);
    }

    // 加载摄像头配置
    if (configs.camera_settings) {
      const cameraConfig = JSON.parse(configs.camera_settings);
      Object.assign(camera, cameraConfig);
    } else if (configData.camera_params) {
      Object.assign(camera, configData.camera_params);
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

// 更新面积过滤参数
async function updateAreaFilter() {
  try {
    await fetch('/config/area_filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(areaFilter),
    });

    // 同时保存到自定义配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'area_filter_settings',
        value: JSON.stringify(areaFilter),
      }),
    });

    console.log('Area filter settings updated');
  } catch (error) {
    console.error('Error updating area filter:', error);
  }
}

// 更新梯形校正参数
async function updatePerspective() {
  try {
    await fetch('/config/perspective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perspective),
    });

    // 同时保存到自定义配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'perspective_settings',
        value: JSON.stringify(perspective),
      }),
    });

    console.log('Perspective settings updated');
  } catch (error) {
    console.error('Error updating perspective:', error);
  }
}

// 更新黑色检测参数
async function updateBlackDetection() {
  try {
    await fetch('/config/black_detection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blackDetection),
    });

    // 同时保存到自定义配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'black_detection_settings',
        value: JSON.stringify(blackDetection),
      }),
    });

    console.log('Black detection settings updated');
  } catch (error) {
    console.error('Error updating black detection:', error);
  }
}

// 更新摄像头参数
async function updateCamera() {
  try {
    await fetch('/config/camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(camera),
    });

    // 同时保存到自定义配置
    await fetch('/config/custom_string', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'camera_settings',
        value: JSON.stringify(camera),
      }),
    });

    console.log('Camera settings updated');
  } catch (error) {
    console.error('Error updating camera:', error);
  }
}

// 保存所有配置
async function saveAllConfigs() {
  saveLoading.value = true;
  try {
    await Promise.all([
      saveConfigurations(),
      updateAreaFilter(),
      updatePerspective(),
      updateBlackDetection(),
      updateCamera(),
      savePoints(),
      saveTrendType(),
      savePolyDegree(),
      saveDistanceFormula(),
    ]);

    console.log('All configurations saved successfully');
    alert('所有配置已保存成功');
  } catch (error) {
    console.error('Error saving all configs:', error);
    alert('保存配置时出错，请检查控制台');
  } finally {
    saveLoading.value = false;
  }
}

// 加载所有配置
async function loadAllConfigs() {
  loadLoading.value = true;
  try {
    // 加载主配置
    const configResponse = await fetch('/config');
    const configData = await configResponse.json();

    if (configData.area_filter_params) {
      Object.assign(areaFilter, configData.area_filter_params);
    }

    if (configData.perspective_params) {
      Object.assign(perspective, configData.perspective_params);
    }

    if (configData.black_detection_params) {
      Object.assign(blackDetection, configData.black_detection_params);
    }

    if (configData.camera_params) {
      Object.assign(camera, configData.camera_params);
    }

    console.log('All configurations loaded successfully');
    alert('所有配置已加载成功');
  } catch (error) {
    console.error('Error loading all configs:', error);
    alert('加载配置时出错，请检查控制台');
  } finally {
    loadLoading.value = false;
  }
}

// 重置所有配置为默认值
async function resetAllToDefault() {
  resetLoading.value = true;
  try {
    // 重置为默认值
    Object.assign(areaFilter, {
      min_crop_area: 20000,
      max_crop_area: 5200000,
      enable_area_filter: true,
      a4_ratio_tolerance: 0.3,
      max_circularity: 0.7,
      min_solidity: 0.8,
      max_vertices: 8,
      enable_a4_check: true,
    });

    Object.assign(perspective, {
      enable: true,
      target_width: 210,
      target_height: 297,
      a4_ratio: 1.414285714285714,
      use_short_edge_for_measurement: true,
    });

    Object.assign(blackDetection, {
      lower_h: 0,
      lower_s: 0,
      lower_v: 0,
      upper_h: 255,
      upper_s: 255,
      upper_v: 80,
      morph_kernel_size: 3,
    });

    Object.assign(camera, {
      index: 0,
      width: 1920,
      height: 1080,
    });

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

    // 重置曲线拟合相关参数
    trendType.value = 'Power';
    polyDegree.value = 2;
    points.value = [...defaultPoints];
    calibrating.value = new Array(defaultPoints.length).fill(false);

    // 重新计算拟合
    computeFit();

    // 保存默认值到服务器
    await saveAllConfigs();

    console.log('All settings reset to default values');
    alert('所有设置已重置为默认值');
  } catch (error) {
    console.error('Error resetting to default:', error);
    alert('重置设置时出错，请检查控制台');
  } finally {
    resetLoading.value = false;
  }
}

// 切换矩形显示状态
async function toggleShowRectangles() {
  showRectanglesLoading.value = true;
  try {
    // 先获取当前状态
    const statusResponse = await fetch('/control/show_rectangles');
    const statusData = await statusResponse.json();
    const currentShow = statusData.show_all_rectangles;

    // 切换状态
    await fetch('/control/show_rectangles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show: !currentShow }),
    });

    console.log(`Rectangle display toggled to: ${!currentShow}`);
    alert(`矩形显示已${!currentShow ? '开启' : '关闭'}`);
  } catch (error) {
    console.error('Error toggling show rectangles:', error);
    alert('切换矩形显示时出错，请检查控制台');
  } finally {
    showRectanglesLoading.value = false;
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

// 保存矫正曲线 - 将拟合公式转换为距离公式格式
async function saveCalibrationCurve() {
  try {
    // 解析当前的拟合公式，例如：y = 198.73x^-1.01
    const equationStr = equation.value;

    // 使用正则表达式提取系数和指数
    // 匹配格式：y = ax^b 或 y = a * x^b
    const match = equationStr.match(/y\s*=\s*([0-9.-]+)(?:\s*\*\s*)?x\^?([0-9.-]+)/);

    if (match && match[1] && match[2]) {
      const coefficient = parseFloat(match[1]); // 系数 a
      const exponent = parseFloat(match[2]); // 指数 b

      console.log(`Parsed equation: coefficient=${coefficient}, exponent=${exponent}`);

      // 转换为 ((A/x)**(1/B))*C 的格式
      // 对于 y = ax^b，转换为 ((A/x)**(1/(-b)))*C
      // 其中 A 和 C 需要根据系数计算

      if (exponent < 0) {
        // 对于负指数，如 y = ax^(-b)
        const A = Math.pow(coefficient, 1 / Math.abs(exponent));
        const B = Math.abs(exponent);
        const C = 1;

        const convertedFormula = `((${A.toFixed(2)}/x)**(1/${B.toFixed(3)}))*${C}`;

        // 保存到配置
        await saveConfig('Formula', convertedFormula);

        // 同时更新本地的formula变量
        formula.value = convertedFormula;

        console.log(`Converted formula saved: ${convertedFormula}`);

        // 可以显示成功消息
        alert(`矫正曲线已保存：${convertedFormula}`);
      } else {
        console.error('Cannot convert positive exponent to distance formula format');
        alert('无法转换正指数公式，请使用幂函数拟合');
      }
    } else {
      console.error('Failed to parse equation:', equationStr);
      alert('无法解析拟合公式，请确保公式格式正确');
    }
  } catch (error) {
    console.error('Failed to save calibration curve:', error);
    alert('保存矫正曲线失败');
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
