<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">曲线拟合设置</div>

    <div class="row no-wrap" style="gap: 16px; align-items: flex-start">
      <!-- 左侧：视频流预览区 -->
      <div style="width: 50%; display: flex; flex-direction: column">
        <q-card flat bordered style="min-height: 400px">
          <q-card-section style="display: flex; flex-direction: column">
            <div class="text-h6 q-mb-md">视频流预览</div>

            <div style="display: flex; flex-direction: column; gap: 16px">
              <div style="display: flex; flex-direction: column">
                <div class="text-subtitle2 q-mb-xs">Processed Stream</div>
                <img
                  :src="`/video/processed?formula=${encodeURIComponent(equation)}`"
                  width="100%"
                  alt="Processed"
                  style="border: 1px solid #ddd; border-radius: 4px; object-fit: contain"
                />
              </div>

              <div style="display: flex; flex-direction: column">
                <div class="text-subtitle2 q-mb-xs">Mask Stream</div>
                <img
                  :src="`/video/mask`"
                  width="100%"
                  alt="Mask"
                  style="border: 1px solid #ddd; border-radius: 4px; object-fit: contain"
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
                    R²: <span class="text-primary">{{ r2.toFixed(8) }}</span>
                  </div>
                  <div class="text-caption text-grey-6">
                    数据点数: {{ sortedPoints.length }} | 拟合类型:
                    {{ getTrendTypeName(trendType) }}
                  </div>
                </div>

                <!-- 曲线展示区 -->
                <div class="q-mt-lg" style="min-height: 200px">
                  <CurveChart
                    :points="fitResults"
                    :currentDistance="currentDistance"
                    :currentPixelHeight="currentPixelHeight"
                  />
                </div>

                <!-- 实时距离显示 -->
                <div v-if="currentDistance > 0" class="q-mt-sm text-subtitle2 text-center">
                  <div class="text-info">
                    当前实时距离:
                    <span class="text-primary">{{ (currentDistance * 100).toFixed(1) }} cm</span> |
                    像素高度:
                    <span class="text-primary">{{ currentPixelHeight.toFixed(0) }} px</span>
                  </div>
                </div>

                <!-- 点管理区 -->
                <div class="q-mt-md">
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

        <!-- 修正系数设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="tune" label="修正系数设置" header-class="text-primary">
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
              <div class="text-caption text-grey-6 q-mt-xs">
                用于距离计算的公式，格式如：((524.38/x)**(1/1.003))*100
              </div>

              <q-separator class="q-my-md" />

              <!-- 边长修正系数 -->
              <div class="text-subtitle2 q-mb-sm">边长修正系数</div>
              <q-input
                v-model.number="correctionFactor"
                label="边长修正系数"
                type="number"
                step="0.0001"
                dense
                @update:model-value="saveCorrectionFactor"
              />
              <div class="text-caption text-grey-6 q-mt-xs">
                用于修正物理边长测量的系数，默认值：1.0261
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>

        <!-- HSV颜色检测设置卡片 -->
        <q-card flat bordered>
          <q-expansion-item icon="palette" label="HSV颜色检测设置" header-class="text-primary">
            <q-card-section>
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
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue';
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

// 边长修正系数
const correctionFactor = ref<number>(1.0261);

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

// 实时距离信息
const currentDistance = ref<number>(0);
const currentPixelHeight = ref<number>(0);

// 距离平滑处理
const distanceHistory = ref<number[]>([]);
const maxHistoryLength = 5; // 保持最近5次测量的平均值

// 实时监控定时器
let monitoringInterval: number | null = null;

// 停止实时监控
function stopRealTimeMonitoring() {
  if (monitoringInterval !== null) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('实时监控已停止');
  }
}

// 获取趋势类型的中文名称
function getTrendTypeName(type: string) {
  const typeMap: Record<string, string> = {
    Linear: '线性',
    Logarithmic: '对数',
    Exponential: '指数',
    Power: '幂函数',
    Polynomial: '多项式',
  };
  return typeMap[type] || type;
}

// 拟合计算函数
function computeFit() {
  try {
    console.log('开始计算拟合...');
    console.log('当前点数据:', points.value);
    console.log('拟合类型:', trendType.value);

    // 检查数据有效性
    if (!Array.isArray(points.value) || points.value.length === 0) {
      console.error('点数据无效，无法进行拟合');
      equation.value = 'Error: No data points';
      r2.value = 0;
      return;
    }

    // 过滤掉无效的数据点
    const validPoints = points.value.filter(
      (p) =>
        p &&
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        !isNaN(p.x) &&
        !isNaN(p.y) &&
        p.x > 0 &&
        p.y > 0,
    );

    if (validPoints.length < 2) {
      console.error('有效数据点不足，需要至少2个点');
      equation.value = 'Error: Insufficient valid data points';
      r2.value = 0;
      return;
    }

    console.log('有效数据点:', validPoints.length, '个');

    const data: [number, number][] = validPoints.map((p) => [p.x, p.y]);
    let result: { string: string; r2: number; predict: (x: number) => [number, number] };

    console.log('准备进行', trendType.value, '拟合');

    switch (trendType.value) {
      case 'Linear':
        result = regression.linear(data, { precision: 15 });
        break;
      case 'Logarithmic':
        result = regression.logarithmic(data, { precision: 15 });
        break;
      case 'Exponential':
        result = regression.exponential(data, { precision: 15 });
        break;
      case 'Power':
        // 使用 regression 库的 power 方法，设置高精度
        result = regression.power(data, { precision: 15 });
        break;
      case 'Polynomial':
        result = regression.polynomial(data, {
          order: polyDegree.value,
          precision: 15,
        });
        break;
      default:
        result = regression.power(data, { precision: 15 });
        break;
    }

    // 检查拟合结果有效性
    if (!result || typeof result.string !== 'string' || typeof result.r2 !== 'number') {
      throw new Error('拟合结果无效');
    }

    // 设置公式和R²
    equation.value = result.string;
    r2.value = result.r2;

    // 更新拟合点
    fitResults.value = validPoints.map((p) => {
      try {
        const yPred = result.predict(p.x)[1];
        return { x: p.x, y: yPred };
      } catch {
        console.warn('预测点计算失败，使用原始值');
        return { x: p.x, y: p.y }; // 使用原始值作为备选
      }
    }); // 输出调试信息
    console.log('✓ 拟合计算成功:', {
      type: trendType.value,
      equation: result.string,
      r2: result.r2,
      dataPoints: data.length,
      validPoints: validPoints.length,
    });

    // 保存公式到配置
    void saveFormula();
  } catch (error) {
    console.error('Regression calculation error:', error);

    // 回退到基础计算（不使用precision参数）
    try {
      console.log('尝试基础拟合计算...');
      const validPoints = points.value.filter(
        (p) =>
          p &&
          typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          !isNaN(p.x) &&
          !isNaN(p.y) &&
          p.x > 0 &&
          p.y > 0,
      );

      if (validPoints.length < 2) {
        throw new Error('有效数据点不足');
      }

      const data: [number, number][] = validPoints.map((p) => [p.x, p.y]);
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

      equation.value = result.string;
      r2.value = result.r2;

      // 更新拟合点
      fitResults.value = validPoints.map((p) => {
        try {
          const yPred = result.predict(p.x)[1];
          return { x: p.x, y: yPred };
        } catch {
          return { x: p.x, y: p.y };
        }
      });

      console.log('✓ 基础拟合计算成功');
      void saveFormula();
    } catch (fallbackError) {
      console.error('基础拟合计算也失败:', fallbackError);
      // 最后的备选方案
      equation.value = 'Error: Calculation failed';
      r2.value = 0;
      fitResults.value = [];
    }
  }
}

// 获取实时距离信息
async function fetchCurrentDistance() {
  try {
    const response = await fetch('/api/physical_measurements');
    const data = await response.json();

    if (data && data.success && data.measurements && data.measurements.length > 0) {
      const measurement = data.measurements[0];
      const newLongPx = measurement.target?.new_long_px;

      if (newLongPx && equation.value) {
        currentPixelHeight.value = newLongPx;

        // 使用当前拟合公式计算距离（逆向计算）
        // 拟合公式: y = ax^b (y是像素高度，x是距离)
        // 逆运算求距离: x = (y/a)^(1/b)
        const equationStr = equation.value;
        const match = equationStr.match(/y\s*=\s*([0-9.-]+)(?:\s*\*\s*)?x\^?([0-9.-]+)/);

        if (match && match[1] && match[2]) {
          const coefficient = parseFloat(match[1]); // 系数 a
          const exponent = parseFloat(match[2]); // 指数 b

          console.log(`Equation parsing: coefficient=${coefficient}, exponent=${exponent}`);
          console.log(`Current pixel height: ${newLongPx}px`);
          console.log(`Equation: ${equationStr}`);

          // 从像素高度反推距离: x = (y/a)^(1/b)
          const calculatedDistance = Math.pow(newLongPx / coefficient, 1 / exponent);

          console.log(
            `Raw calculation: (${newLongPx} / ${coefficient})^(1 / ${exponent}) = ${calculatedDistance}`,
          );

          // 检查计算结果是否合理
          if (isFinite(calculatedDistance) && calculatedDistance > 0) {
            // 添加到历史记录进行平滑处理
            distanceHistory.value.push(calculatedDistance);
            if (distanceHistory.value.length > maxHistoryLength) {
              distanceHistory.value.shift(); // 移除最旧的数据
            }

            // 计算平均值来平滑距离
            const smoothedDistance =
              distanceHistory.value.reduce((sum, dist) => sum + dist, 0) /
              distanceHistory.value.length;

            // 只有当距离变化超过阈值时才更新显示（防止小幅抖动）
            const changeThreshold = 0.01; // 1cm的变化阈值
            if (
              Math.abs(smoothedDistance - currentDistance.value) > changeThreshold ||
              currentDistance.value === 0
            ) {
              currentDistance.value = smoothedDistance;
              console.log(
                `✓ Smoothed distance: ${smoothedDistance.toFixed(3)}m (${(smoothedDistance * 100).toFixed(1)}cm) [history: ${distanceHistory.value.length} samples]`,
              );
            }
          } else {
            console.warn('Invalid distance calculation result:', calculatedDistance);
            // 不立即重置，给一些容错机会
            if (distanceHistory.value.length === 0) {
              currentDistance.value = 0;
            }
          }
        } else {
          console.warn('Failed to parse equation for distance calculation:', equationStr);
          currentDistance.value = 0;
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch current distance:', error);
    // 出错时重置值
    currentDistance.value = 0;
    currentPixelHeight.value = 0;
  }
}

// 开始实时监控
function startRealTimeMonitoring() {
  // 先停止之前的监控
  stopRealTimeMonitoring();

  // 初始获取一次
  void fetchCurrentDistance();

  // 每1000ms更新一次（降低频率减少抖动）
  monitoringInterval = window.setInterval(() => {
    void fetchCurrentDistance();
  }, 1000);

  console.log('实时监控已启动');
}

// 配置管理函数
async function loadConfig() {
  try {
    configLoading.value = true;
    console.log('开始加载配置...');

    // 获取主配置
    const configResponse = await fetch('/config');
    if (!configResponse.ok) {
      throw new Error(`Config API failed: ${configResponse.status}`);
    }
    const configData = await configResponse.json();

    // 获取自定义配置
    const customResponse = await fetch('/config/custom_string');
    if (!customResponse.ok) {
      throw new Error(`Custom config API failed: ${customResponse.status}`);
    }
    const customData = await customResponse.json();

    // 检查API响应结构
    console.log('Config API Response:', configData);
    console.log('Custom Config API Response:', customData);

    // 获取配置对象
    const configs = customData.success && customData.custom_config ? customData.custom_config : {};

    // 加载趋势类型
    if (configs.trendType) {
      trendType.value = configs.trendType;
      console.log('加载趋势类型:', configs.trendType);
    }

    // 加载多项式阶数
    if (configs.polyDegree) {
      polyDegree.value = parseInt(configs.polyDegree);
      console.log('加载多项式阶数:', configs.polyDegree);
    }

    // 加载测距点数据
    if (configs.distancePoints) {
      try {
        const parsedPoints = JSON.parse(configs.distancePoints);
        if (Array.isArray(parsedPoints) && parsedPoints.length > 0) {
          points.value = parsedPoints;
          console.log('加载测距点数据:', parsedPoints.length, '个点');
        } else {
          throw new Error('解析的点数据无效');
        }
      } catch (parseError) {
        console.error('解析测距点数据失败:', parseError);
        points.value = [...defaultPoints];
        await savePoints();
      }
    } else {
      // 如果没有保存的数据，使用默认值并保存
      console.log('使用默认测距点数据');
      points.value = [...defaultPoints];
      await savePoints();
    }

    // 确保点数据有效
    if (!Array.isArray(points.value) || points.value.length === 0) {
      console.warn('点数据无效，使用默认值');
      points.value = [...defaultPoints];
    }

    // 初始化矫正状态数组
    calibrating.value = new Array(points.value.length).fill(false);

    // 加载距离公式 - 支持多种字段名，按优先级加载
    if (configs.distance_formula) {
      formula.value = configs.distance_formula;
    } else if (configs.Formula) {
      formula.value = configs.Formula;
    } else if (configs.formula) {
      // 检查是否是拟合公式被误保存了
      // 如果公式包含 "y = " 说明是拟合公式，跳过
      if (!configs.formula.includes('y = ')) {
        formula.value = configs.formula;
      }
    }

    // 加载边长修正系数
    if (configs.correction_factor) {
      const factor = parseFloat(configs.correction_factor);
      if (!isNaN(factor) && factor > 0) {
        correctionFactor.value = factor;
        console.log('加载边长修正系数:', factor);
      }
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

    // 加载后重新计算拟合（如果没有保存的拟合公式）
    if (configs.fitting_equation) {
      equation.value = configs.fitting_equation;
      console.log('加载保存的拟合公式:', configs.fitting_equation);
      // 如果有保存的拟合公式，尝试从中提取R²值
      // 这里可以添加更复杂的逻辑来解析保存的公式
    } else {
      // 没有保存的拟合公式，重新计算
      console.log('没有保存的拟合公式，开始重新计算...');
      computeFit();
    }

    console.log('配置加载完成');
  } catch (error) {
    console.error('Failed to load config:', error);
    // 出错时使用默认值
    console.log('加载配置失败，使用默认值');
    points.value = [...defaultPoints];
    // 初始化矫正状态数组
    calibrating.value = new Array(points.value.length).fill(false);

    // 确保即使出错也要计算拟合
    try {
      computeFit();
    } catch (fitError) {
      console.error('默认拟合计算也失败:', fitError);
      // 设置一个基本的默认公式
      equation.value = 'y = 524.38x^-1.003';
      r2.value = 0;
    }
  } finally {
    configLoading.value = false;
    console.log('配置加载状态重置为false');
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
  await saveConfig('fitting_equation', equation.value);
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

// 保存边长修正系数
async function saveCorrectionFactor() {
  await saveConfig('correction_factor', correctionFactor.value.toString());
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
      saveCorrectionFactor(),
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

    // 重置边长修正系数为默认值
    correctionFactor.value = 1.0261;

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

    // 清除可能存在的旧公式键
    await Promise.all([saveConfig('fitting_equation', ''), saveConfig('Formula', '')]);

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

      // 转换为距离公式格式
      // 拟合公式: y = ax^b (y是像素高度，x是距离)
      // 转换为: x = (y/a)^(1/b)
      // 再转换为 ((A/y)**(1/B))*C 的格式，其中y对应像素值

      if (exponent < 0) {
        // 对于负指数，如 y = ax^(-b)
        // 转换: x = (y/a)^(1/(-b)) = (y/a)^(-1/b)
        // 重写为: x = (a/y)^(1/b)
        // 所以 A = a, B = |b|, C = 1

        const A = coefficient; // 直接使用系数
        const B = Math.abs(exponent); // 使用指数的绝对值
        const C = 1;

        const convertedFormula = `((${A.toFixed(2)}/x)**(1/${B.toFixed(3)}))*${C}`;

        // 保存到配置
        await saveConfig('distance_formula', convertedFormula);

        // 同时更新本地的formula变量
        formula.value = convertedFormula;

        console.log(`Original equation: ${equationStr}`);
        console.log(`Coefficient: ${coefficient}, Exponent: ${exponent}`);
        console.log(`Converted formula: ${convertedFormula}`);

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
  console.log('SettingsPage 组件挂载');

  // 重置状态
  configLoading.value = true;
  equation.value = '';
  r2.value = 0;
  fitResults.value = [];

  // 加载配置
  void loadConfig()
    .then(() => {
      console.log('配置加载完成，开始实时监控');
      // 启动实时距离监控
      startRealTimeMonitoring();
    })
    .catch((error) => {
      console.error('配置加载失败:', error);
      configLoading.value = false;
    });
});

// 组件卸载时清理
onUnmounted(() => {
  console.log('SettingsPage 组件卸载，清理资源');
  stopRealTimeMonitoring();
});
</script>

<style scoped>
/* 可根据需求调整样式 */
</style>
