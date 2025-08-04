<template>
  <q-page padding>
    <!-- 页面标题和全屏按钮 -->
    <div class="row items-center q-mb-md">
      <q-space />
      <q-btn
        :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
        :label="isFullscreen ? '退出全屏' : '全屏'"
        @click="toggleFullscreen"
        color="primary"
        outline
        size="sm"
      />
    </div>

    <div class="row">
      <!-- 控件区 -->
      <div class="col-6">
        <q-card flat bordered class="q-pa-md">
          <!-- 物理测量 -->
          <div class="flex">
            <div class="text-subtitle2">物理测量</div>
            <div class="text-subtitle2">&nbsp;| 当前电压 {{ voltage.toFixed(3) }} V</div>
            <div class="text-subtitle2">&nbsp;| 当前电流 {{ current.toFixed(3) }} A</div>
            <div class="text-subtitle2">&nbsp;| 当前功率 {{ power.toFixed(3) }} W |</div>
            <div class="text-subtitle2">&nbsp;最大功率 {{ maxPower.toFixed(3) }} W</div>
          </div>
          <div class="row q-gutter-sm q-mt-sm">
            <q-btn
              color="primary"
              label="获取测量数据"
              @click="() => getMeasurements()"
              :loading="measurementsLoading"
            />
            <q-btn
              color="secondary"
              label="最小边缘"
              @click="() => getMinimumSquareMeasurements()"
              :loading="minSquareLoading"
            />
          </div>

          <!-- OCR测量 -->
          <q-separator class="q-my-md" />
          <div class="text-subtitle2">OCR 测量</div>
          <div class="q-mt-sm">
            <div class="row q-gutter-sm q-mt-sm">
              <q-btn
                :color="showVirtualKeyboard ? 'negative' : 'primary'"
                :icon="showVirtualKeyboard ? 'keyboard_hide' : 'keyboard'"
                :label="showVirtualKeyboard ? '隐藏键盘' : '显示键盘'"
                @click="showVirtualKeyboard = !showVirtualKeyboard"
                :outline="!showVirtualKeyboard"
              />
              <q-select
                v-model="ocrMethod"
                :options="[
                  { label: 'OCR测量', value: 0 },
                  { label: 'OCR遮罩测量', value: 1 },
                  { label: 'OCR缩放遮罩测量', value: 2 },
                  { label: 'OCR缩放测量', value: 3 },
                  { label: 'YOLO自动分割测量', value: 4 },
                  { label: 'OCR自动分割测量', value: 5 },
                ]"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                dense
                outlined
                style="min-width: 150px"
                label="识别方法"
              />
              <q-spinner-gears color="primary" size="2em" v-show="ocrLoading && fucked" />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 全局统计 -->
          <div class="text-subtitle2 q-mt-lg">统计信息</div>
          <div class="q-mt-sm">
            <div>
              矩形数量: <strong>{{ stats.count }}</strong>
            </div>
            <div>
              总像素: <strong>{{ stats.total_pixels }}</strong>
            </div>
            <div>
              帧比率: <strong>{{ (stats.frame_ratio * 100).toFixed(2) }}%</strong>
            </div>
            <div>
              黑色比率: <strong>{{ (stats.black_ratio * 100).toFixed(2) }}%</strong>
            </div>
            <div>
              帧率: <strong>{{ stats.fps.toFixed(1) }}</strong>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 检测到的矩形详情 -->
          <div class="text-subtitle2">检测到的矩形</div>
          <div v-for="r in displayedRects" :key="r.id">
            <div>
              <strong>#{{ r.id }}</strong>
            </div>
            <div>外框: {{ r.outer_width }}×{{ r.outer_height }}</div>
            <div>面积: {{ r.area }}px</div>
            <div>新边: {{ r.new_long_px.toFixed(1) }}px</div>
            <div>距离: {{ computeDistance(r.new_long_px).toFixed(1) }} cm</div>
            <div>形状: {{ r.shape_type }}</div>
            <div>内框: {{ r.inner_width }}×{{ r.inner_height }} (面积 {{ r.inner_area }}px)</div>
            <div>信息: {{ r.inner_info }}</div>
          </div>
        </q-card>
      </div>

      <!-- 测量结果区 -->
      <div class="col-6">
        <q-card flat bordered class="q-pa-md">
          <div>
            <p>距离公式：{{ formula }}</p>
            <p>校正系数：{{ correctionFactor }}</p>
            <q-btn label="重新加载配置" @click="loadConfigs" />
          </div>
          <!-- 测量结果展示 -->
          <div v-if="measurements.length > 0" class="q-mt-md">
            <!-- 过滤器控制 -->
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle2">测量结果</div>
              <q-space />
              <q-btn
                :icon="showDetailedInfo ? 'visibility_off' : 'visibility'"
                :label="showDetailedInfo ? '隐藏详情' : '显示详情'"
                size="sm"
                flat
                color="primary"
                @click="showDetailedInfo = !showDetailedInfo"
              />
            </div>
            <div v-for="crop in measurements" :key="crop.crop_index" class="q-mb-md">
              <div class="text-subtitle2">裁剪区域 {{ crop.crop_index }}</div>

              <!-- Target 信息 -->
              <q-card v-if="crop.target" class="q-mb-sm q-pa-sm" style="border-radius: 4px">
                <div>
                  <strong>目标 #{{ crop.target.id }}</strong>
                </div>
                <div>像素尺寸: {{ crop.target.crop_width }}×{{ crop.target.crop_height }}</div>
                <div>面积: {{ crop.target.area }}px</div>
                <div>长边: {{ crop.target.new_long_px.toFixed(1) }}px</div>
                <div>距离: {{ computeDistance(crop.target.new_long_px).toFixed(1) }} cm</div>
              </q-card>

              <!-- 形状测量结果 -->
              <q-card
                v-for="shape in crop.shapes"
                :key="shape.shape_index"
                class="q-mb-sm q-pa-sm"
                style="border-radius: 4px"
              >
                <div class="text-weight-bold">{{ shape.shape_type }} #{{ shape.shape_index }}</div>

                <!-- 像素尺寸 -->
                <div class="q-mt-sm">
                  <div class="text-caption text-weight-bold">像素尺寸:</div>
                  <!-- 如果是边缘检测，只显示长度 -->
                  <div v-if="shape.physical_dimensions.measurement_type === 'minimum_edge'">
                    长度: {{ shape.pixel_dimensions.width.toFixed(1) }}px
                  </div>
                  <!-- 如果是圆形，显示直径 -->
                  <div
                    v-else-if="
                      shape.shape_type.toLowerCase().includes('circle') ||
                      shape.shape_type.toLowerCase().includes('圆') ||
                      shape.shape_type.toLowerCase().includes('round')
                    "
                  >
                    直径:
                    {{
                      Math.max(shape.pixel_dimensions.width, shape.pixel_dimensions.height).toFixed(
                        1,
                      )
                    }}px
                    <div>面积: {{ shape.pixel_dimensions.area }}px</div>
                    <div>周长: {{ shape.pixel_dimensions.perimeter.toFixed(1) }}px</div>
                  </div>
                  <!-- 如果是普通形状，显示完整尺寸信息 -->
                  <template v-else>
                    <div>
                      尺寸: {{ shape.pixel_dimensions.width }}×{{ shape.pixel_dimensions.height }}px
                    </div>
                    <div>面积: {{ shape.pixel_dimensions.area }}px</div>
                    <div v-if="shape.pixel_dimensions.mean_side_length > 0">
                      平均边长: {{ shape.pixel_dimensions.mean_side_length.toFixed(1) }}px
                    </div>
                    <div>周长: {{ shape.pixel_dimensions.perimeter.toFixed(1) }}px</div>
                  </template>
                </div>

                <!-- 物理尺寸 -->
                <div class="q-mt-sm">
                  <div class="text-caption text-weight-bold">物理尺寸:</div>
                  <!-- 如果是边缘检测，只显示长度 -->
                  <div v-if="shape.physical_dimensions.measurement_type === 'minimum_edge'">
                    长度:
                    {{ (shape.physical_dimensions.width_mm * correctionFactor).toFixed(1) }}mm
                  </div>
                  <!-- 如果是圆形，显示直径 -->
                  <div
                    v-else-if="
                      shape.shape_type.toLowerCase().includes('circle') ||
                      shape.shape_type.toLowerCase().includes('圆')
                    "
                  >
                    直径:
                    {{ (shape.physical_dimensions.diameter_mm * correctionFactor).toFixed(1) }}mm
                    <div>
                      面积:
                      {{
                        (
                          shape.physical_dimensions.area_mm2 *
                          correctionFactor *
                          correctionFactor
                        ).toFixed(1)
                      }}mm²
                    </div>
                  </div>
                  <!-- 如果是普通形状，显示完整尺寸信息 -->
                  <template v-else>
                    <div>
                      尺寸:
                      {{ (shape.physical_dimensions.width_mm * correctionFactor).toFixed(1) }}×{{
                        (shape.physical_dimensions.height_mm * correctionFactor).toFixed(1)
                      }}mm
                    </div>
                    <div>
                      面积:
                      {{
                        (
                          shape.physical_dimensions.area_mm2 *
                          correctionFactor *
                          correctionFactor
                        ).toFixed(1)
                      }}mm²
                    </div>
                  </template>

                  <!-- 详细信息 - 根据过滤器显示 -->
                  <template v-if="showDetailedInfo">
                    <div v-if="shape.physical_dimensions.diameter_mm > 0">
                      直径:
                      {{ (shape.physical_dimensions.diameter_mm * correctionFactor).toFixed(1) }}mm
                    </div>
                    <div v-if="shape.physical_dimensions.mean_side_length_mm > 0">
                      平均边长:
                      {{
                        (shape.physical_dimensions.mean_side_length_mm * correctionFactor).toFixed(
                          1,
                        )
                      }}mm
                    </div>
                    <div>
                      周长:
                      {{ (shape.physical_dimensions.perimeter_mm * correctionFactor).toFixed(1) }}mm
                    </div>
                    <div class="text-caption">
                      方法: {{ shape.physical_dimensions.measurement_type }} ({{
                        shape.physical_dimensions.mm_per_pixel.toFixed(3)
                      }}
                      mm/px, 修正: {{ correctionFactor.toFixed(4) }})
                    </div>
                  </template>
                </div>

                <!-- 边长详情 - 根据过滤器显示 -->
                <div
                  v-if="showDetailedInfo && shape.physical_dimensions.side_lengths_mm.length > 0"
                  class="q-mt-sm"
                >
                  <div class="text-caption text-weight-bold">边长:</div>
                  <div
                    v-for="(length, idx) in shape.physical_dimensions.side_lengths_mm"
                    :key="idx"
                  >
                    边 {{ idx + 1 }}: {{ (length * correctionFactor).toFixed(1) }}mm
                  </div>
                </div>

                <!-- OCR 信息 -->
                <div v-if="shape.ocr_data" class="q-mt-sm">
                  <div class="text-caption text-weight-bold">OCR 信息:</div>
                  <div v-if="shape.ocr_data.detected">
                    <div>
                      文本: <strong>"{{ shape.ocr_data.text }}"</strong>
                    </div>
                    <div>置信度: {{ (shape.ocr_data.confidence * 100).toFixed(1) }}%</div>
                    <div class="text-caption">在此形状中检测到 OCR</div>
                  </div>
                  <div v-else class="text-caption text-grey">未检测到 OCR 文本</div>
                </div>
              </q-card>
            </div>

            <!-- A4 参考信息 - 根据过滤器显示 -->
            <div
              v-if="showDetailedInfo && a4Reference"
              class="q-mt-md q-pa-sm"
              style="border-radius: 4px"
            >
              <div class="text-caption text-weight-bold">A4 参考:</div>
              <div>
                {{ (a4Reference.physical_width_mm * correctionFactor).toFixed(1) }}×{{
                  (a4Reference.physical_height_mm * correctionFactor).toFixed(1)
                }}mm
              </div>
              <div class="text-caption">
                {{ a4Reference.note }} (修正系数: {{ correctionFactor.toFixed(4) }})
              </div>
            </div>

            <!-- OCR 处理时间信息 - 始终显示 -->
            <div
              v-if="false && ocrElapsedTime > 0"
              class="q-mt-md q-pa-sm"
              style="border-radius: 4px"
            >
              <div class="text-caption text-weight-bold">OCR 处理时间:</div>
              <div>{{ ocrElapsedTime.toFixed(3) }} 秒</div>
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 软键盘弹窗 -->
    <q-dialog v-model="showVirtualKeyboard" position="standard" maximized full-width full-height>
      <q-card class="virtual-keyboard">
        <q-card-section class="row items-center q-pa-sm bg-primary text-white">
          <div class="text-h6">虚拟键盘</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="closeKeyboard" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- 输入显示 -->
          <q-input v-model="ocrTargetText" label="目标文本" dense outlined class="q-mb-md" />

          <!-- 键盘布局 -->
          <div class="keyboard-layout">
            <!-- 第一行 -->
            <div class="keyboard-row">
              <q-btn
                v-for="key in ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']"
                :key="key"
                :label="key"
                class="keyboard-key"
                @click="onKeyPress(key)"
              />
            </div>

            <!-- 第二行 -->
            <div class="keyboard-row">
              <q-btn
                v-for="key in ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']"
                :key="key"
                :label="key"
                class="keyboard-key"
                @click="onKeyPress(key)"
              />
            </div>

            <!-- 第三行 -->
            <div class="keyboard-row">
              <q-btn
                v-for="key in ['Z', 'X', 'C', 'V', 'B', 'N', 'M']"
                :key="key"
                :label="key"
                class="keyboard-key"
                @click="onKeyPress(key)"
              />
            </div>

            <!-- 数字行 -->
            <div class="keyboard-row">
              <q-btn
                v-for="key in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']"
                :key="key"
                :label="key"
                class="keyboard-key"
                @click="onKeyPress(key)"
              />
            </div>

            <!-- 功能键行 -->
            <div class="keyboard-row">
              <q-btn
                label="空格"
                class="keyboard-key keyboard-key-wide"
                @click="onKeyPress('Space')"
              />
              <q-btn label="⌫" class="keyboard-key" @click="onKeyPress('Backspace')" />
              <q-btn label="清空" class="keyboard-key" @click="onKeyPress('Clear')" />
              <q-btn
                label="搜索"
                class="keyboard-key keyboard-key-primary"
                color="primary"
                @click="onKeyPress('Enter')"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { reactive, ref, onMounted, onUnmounted, watch, onActivated } from 'vue';

const formula = ref<string>('');
const correctionFactor = ref<number>(1);

const DEFAULT_FORMULA = '((524.38/x)**(1/1.003))';
const DEFAULT_FACTOR = 1.0261;

async function loadConfigs() {
  try {
    const res = await fetch('/config/custom_string');
    const { success, custom_config } = await res.json();
    if (success) {
      formula.value = custom_config.distance_formula || DEFAULT_FORMULA;
      correctionFactor.value = parseFloat(custom_config.correction_factor) || DEFAULT_FACTOR;
    } else {
      formula.value = DEFAULT_FORMULA;
      correctionFactor.value = DEFAULT_FACTOR;
    }
  } catch (e) {
    console.error('加载配置失败', e);
    formula.value = DEFAULT_FORMULA;
    correctionFactor.value = DEFAULT_FACTOR;
  }
}

// 首次挂载和每次激活都重新拉
onMounted(loadConfigs);
onActivated(loadConfigs);

const stats = reactive({
  count: 0,
  total_pixels: 0,
  frame_ratio: 0,
  black_ratio: 0,
  fps: 0,
});

// 2. 显示用的矩形列表，带延迟清除
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const displayedRects = ref<any[]>([]);
const removalTimers = new Map<number, number>();

// 物理测量相关
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cachedMeasurements = ref<any[] | undefined>(undefined);
const cached = ref(false);
const fucked = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const measurements = ref<any[]>([]);
const measurementsLoading = ref(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a4Reference = ref<any>(null);

// 最小正方形测量相关
const minSquareLoading = ref(false);

// OCR测量相关
const ocrTargetText = ref('');
const ocrLoading = ref(false);
const ocrElapsedTime = ref(0);
const ocrMethod = ref(5); // 0: ocr_measurement_analysis, 1: ocr_masked_analysis, 2: ocr_masked_measurement_analysis, 3: ocr_scaled_measurement_analysis

// 过滤器相关
const showDetailedInfo = ref(false);

// 软键盘相关
const showVirtualKeyboard = ref(false);

// 全屏相关
const isFullscreen = ref(false);

// 软键盘方法
function onKeyPress(key: string) {
  if (key === 'Backspace') {
    ocrTargetText.value = ocrTargetText.value.slice(0, -1);
  } else if (key === 'Space') {
    ocrTargetText.value += ' ';
  } else if (key === 'Enter') {
    showVirtualKeyboard.value = false;
    void getOrWaitOcrMeasurements();
  } else if (key === 'Clear') {
    ocrTargetText.value = '';
  } else {
    ocrTargetText.value += key;
  }
}

function closeKeyboard() {
  showVirtualKeyboard.value = false;
}

// 全屏切换方法
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // 进入全屏
    document.documentElement
      .requestFullscreen()
      .then(() => {
        isFullscreen.value = true;
      })
      .catch((err) => {
        console.error('进入全屏时出错:', err);
      });
  } else {
    // 退出全屏
    document
      .exitFullscreen()
      .then(() => {
        isFullscreen.value = false;
      })
      .catch((err) => {
        console.error('退出全屏时出错:', err);
      });
  }
}

// 监听全屏状态变化
function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

// 计算距离：使用拟合公式进行逆运算
function computeDistance(px: number) {
  // 将像素高度传入公式计算距离
  try {
    // 替换公式中的 x 为实际像素值
    const formulaWithValue = formula.value.replace(/x/g, px.toString());
    const result = eval(formulaWithValue);
    // 乘以100将米转换为厘米
    return result * 100;
  } catch (error) {
    console.error('计算距离时出错:', error, '公式:', formula.value, '像素:', px);
    return 0;
  }
}

async function getPower() {
  try {
    const response = await fetch('/api/ina226/measurements');
    const data = await response.json();
    if (response.status === 200) {
      power.value = data.data.power_w || 0;
      current.value = data.data.current_a || 0;
      voltage.value = data.data.bus_voltage_v || 0;
      if (data.data.power_w > maxPower.value) {
        maxPower.value = data.data.power_w;
      }
    } else {
      console.error('获取功率数据失败:', data);
    }
  } catch (error) {
    console.error('获取功率数据时出错:', error);
  }
}

// 获取物理测量数据 - 带重试机制
async function getMeasurements(maxRetries = 10, retryDelay = 100) {
  measurementsLoading.value = true;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`尝试获取物理测量数据 - 第 ${attempt} 次`);

      const response = await fetch('/api/physical_measurements');
      const data = await response.json();

      if (data.success && data.measurements && data.measurements.length > 0) {
        // 成功获取到数据
        measurements.value = data.measurements;
        a4Reference.value = data.a4_reference || null;
        console.log(`✓ 成功获取物理测量数据，共 ${data.measurements.length} 个测量结果`);
        break;
      } else {
        console.warn(`第 ${attempt} 次尝试：未获取到有效测量数据`);

        // 如果是最后一次尝试，设置空数据
        if (attempt >= maxRetries) {
          console.error('达到最大重试次数，未能获取到有效数据');
          measurements.value = [];
          a4Reference.value = null;
          break;
        }

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    } catch (error) {
      console.error(`第 ${attempt} 次尝试获取测量数据时出错:`, error);

      // 如果是最后一次尝试，设置空数据
      if (attempt >= maxRetries) {
        measurements.value = [];
        a4Reference.value = null;
        break;
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  measurementsLoading.value = false;
}

// 获取最小正方形测量数据
async function getMinimumSquareMeasurements(maxRetries = 10, retryDelay = 100) {
  minSquareLoading.value = true;

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch('/api/minimum_square');
      const data = await response.json();

      if (data.found) {
        // 将最短边数据格式转换为兼容现有显示格式
        const convertedMeasurements = [
          {
            crop_index: 1,
            target: {
              id: 1,
              crop_width: Math.abs(data.end_point[0] - data.start_point[0]),
              crop_height: Math.abs(data.end_point[1] - data.start_point[1]),
              area:
                Math.abs(data.end_point[0] - data.start_point[0]) *
                Math.abs(data.end_point[1] - data.start_point[1]),
              new_long_px: data.edge_length_px,
            },
            shapes: [
              {
                shape_index: 1,
                shape_type: `Minimum Edge (${data.type})`,
                pixel_dimensions: {
                  width: data.edge_length_px, // 边长像素值
                  height: 0, // 边长没有高度
                  area: 0, // 边长没有面积
                  side_lengths: [data.edge_length_px],
                  mean_side_length: data.edge_length_px,
                  perimeter: 0, // 边长没有周长
                },
                physical_dimensions: {
                  width_mm: data.edge_length_mm, // 边长毫米值
                  height_mm: 0, // 边长没有高度
                  area_mm2: 0, // 边长没有面积
                  diameter_mm: 0,
                  side_lengths_mm: [data.edge_length_mm],
                  mean_side_length_mm: data.edge_length_mm,
                  perimeter_mm: 0, // 边长没有周长
                  measurement_type: 'minimum_edge',
                  mm_per_pixel: data.edge_length_mm / data.edge_length_px,
                },
              },
            ],
          },
        ];

        measurements.value = convertedMeasurements;
        a4Reference.value = {
          physical_width_mm: data.edge_length_mm,
          physical_height_mm: data.edge_length_mm,
          note: `在中心 (${data.center[0]}, ${data.center[1]}) 检测到最小边缘，长度: ${data.edge_length_mm.toFixed(2)}mm`,
        };
        minSquareLoading.value = false;
        return; // 成功获取数据，退出重试循环
      } else {
        // 如果没有找到数据且还有重试次数，等待后重试
        if (attempt < maxRetries - 1) {
          console.log(`最小边长测量第 ${attempt + 1} 次尝试未找到数据，${retryDelay}ms 后重试...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    } catch (error) {
      console.error(`最小边长测量第 ${attempt + 1} 次尝试失败:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
    attempt++;
  }

  // 所有重试都失败后
  console.error(`最小边长测量在 ${maxRetries} 次尝试后仍未获取到数据`);
  measurements.value = [];
  a4Reference.value = null;
  minSquareLoading.value = false;
}

async function getOrWaitOcrMeasurements() {
  // 等待数据加载完成
  fucked.value = true; // 设置状态为已获取数据
  while (!cached.value || !cachedMeasurements.value) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(cachedMeasurements.value);
  // 数据准备好后，过滤并设置measurements
  measurements.value = cachedMeasurements.value
    .map((crop) => ({
      ...crop,
      shapes: crop.shapes.filter((shape: { ocr_data: { detected: boolean; text: string } }) => {
        // 如果输入框为空，显示所有检测到OCR的形状
        if (!ocrTargetText.value.trim()) {
          return shape.ocr_data.detected;
        }
        // 否则只显示包含目标文字的形状
        return (
          shape.ocr_data.detected &&
          shape.ocr_data.text.toLowerCase().includes(ocrTargetText.value.toLowerCase())
        );
      }),
    }))
    .filter((crop) => crop.shapes.length > 0);
  cached.value = false; // 重置缓存状态
  cachedMeasurements.value = undefined; // 清除缓存数据
  fucked.value = false; // 重置状态
}

// 获取OCR测量数据
async function getOcrMeasurements() {
  ocrLoading.value = true;
  try {
    // 根据选择的方法确定API端点
    const apiEndpoints = [
      '/api/ocr_measurement_analysis', // 0
      '/api/ocr_masked_analysis', // 1
      '/api/ocr_masked_measurement_analysis', // 2
      '/api/ocr_scaled_measurement_analysis', // 3
      '/api/ocr_auto_segment_analysis', //4
      '/api/ocr_auto_segment_easyocr_analysis', // 5
    ];
    const endpoint =
      apiEndpoints[
        typeof ocrMethod.value === 'number' &&
        ocrMethod.value >= 0 &&
        ocrMethod.value < apiEndpoints.length
          ? ocrMethod.value
          : 0
      ];
    const response = await fetch(<string>endpoint);
    // const response = await fetch('/api/ocr');
    const data = await response.json();

    if (data.success) {
      // 保存处理时间
      ocrElapsedTime.value = data.elapsed_seconds || 0;

      // 过滤出包含目标文字的形状
      const filteredMeasurements = data.analysis
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((crop: any) => ({
          crop_index: crop.crop_index,
          target: crop.target,
          shapes: crop.shapes
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((shape: any) => ({
              shape_index: shape.shape_index,
              shape_type: `${shape.shape_type} (OCR: "${shape.ocr_data.text}")`,
              pixel_dimensions: {
                width: shape.pixel_dimensions.width,
                height: shape.pixel_dimensions.height,
                area: shape.pixel_dimensions.area,
                side_lengths: shape.pixel_dimensions.side_lengths || [],
                mean_side_length: shape.pixel_dimensions.mean_side_length || 0,
                perimeter: shape.pixel_dimensions.perimeter,
              },
              physical_dimensions: {
                width_mm: shape.physical_dimensions.width_mm,
                height_mm: shape.physical_dimensions.height_mm,
                area_mm2: shape.physical_dimensions.area_mm2,
                diameter_mm: shape.physical_dimensions.diameter_mm || 0,
                side_lengths_mm: shape.physical_dimensions.side_lengths_mm || [],
                mean_side_length_mm: shape.physical_dimensions.mean_side_length_mm || 0,
                perimeter_mm: shape.physical_dimensions.perimeter_mm,
                measurement_type: shape.physical_dimensions.measurement_type,
                mm_per_pixel: shape.physical_dimensions.mm_per_pixel,
              },
              ocr_data: shape.ocr_data,
            })),
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((crop: any) => crop.shapes.length > 0); // 只保留有匹配形状的crop

      cachedMeasurements.value = filteredMeasurements;
      cached.value = true;
      // a4Reference.value = data.references || null;
    } else {
      console.error('获取 OCR 测量数据失败:', data);
      cachedMeasurements.value = undefined;
    }
  } catch (error) {
    console.error('获取 OCR 测量数据时出错:', error);
    cachedMeasurements.value = undefined;
  } finally {
    ocrLoading.value = false;
  }
}

onMounted(async () => {
  // 添加全屏状态监听
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  // 直接加载保存的距离公式配置
  try {
    const formulaResponse = await fetch('/config/custom_string?key=distance_formula');
    if (formulaResponse.ok) {
      const formulaData = await formulaResponse.json();
      if (formulaData.success && formulaData.value) {
        formula.value = formulaData.value;
        console.log('已加载距离公式:', formula.value);
      } else {
        console.log('未找到保存的距离公式，使用默认值');
      }
    }
  } catch (error) {
    console.error('加载公式配置时出错:', error);
  }

  // 加载边长修正系数配置
  try {
    const correctionResponse = await fetch('/config/custom_string?key=correction_factor');
    if (correctionResponse.ok) {
      const correctionData = await correctionResponse.json();
      if (correctionData.success && correctionData.value) {
        const factor = parseFloat(correctionData.value);
        if (!isNaN(factor) && factor > 0) {
          correctionFactor.value = factor;
          console.log('已加载修正系数:', factor);
        }
      } else {
        console.log('未找到保存的修正系数，使用默认值:', correctionFactor.value);
      }
    }
  } catch (error) {
    console.error('加载修正系数配置时出错:', error);
  }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${proto}://${location.host}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (e) => {
    const s = JSON.parse(e.data);
    // 更新统计
    stats.count = s.count;
    stats.total_pixels = s.total_pixels;
    stats.frame_ratio = s.frame_ratio;
    stats.black_ratio = s.black_ratio;
    stats.fps = s.fps;

    // 新推送的 rect id 集合
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incoming = s.rects as any[];
    const newIds = new Set(incoming.map((r) => r.id));

    // ① 添加或更新
    incoming.forEach((r) => {
      const idx = displayedRects.value.findIndex((x) => x.id === r.id);
      if (idx === -1) {
        displayedRects.value.push(r);
      } else {
        displayedRects.value[idx] = r;
      }
      // 取消可能存在的删除定时
      if (removalTimers.has(r.id)) {
        clearTimeout(removalTimers.get(r.id));
        removalTimers.delete(r.id);
      }
    });

    // ② 对不再出现的 rect 延迟 100ms 清除
    displayedRects.value.slice().forEach((r) => {
      if (!newIds.has(r.id) && !removalTimers.has(r.id)) {
        const tid = window.setTimeout(() => {
          const j = displayedRects.value.findIndex((x) => x.id === r.id);
          if (j !== -1) displayedRects.value.splice(j, 1);
          removalTimers.delete(r.id);
        }, 100);
        removalTimers.set(r.id, tid);
      }
    });
  };
});

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = undefined;
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timer = ref<any>(undefined);
const power = ref(0);
const current = ref(0);
const voltage = ref(0);
const maxPower = ref(0);

onMounted(() => {
  // 每 5 秒获取物理测量数据
  timer.value = setInterval(() => {
    void getPower();
  }, 1000);
});

watch(showVirtualKeyboard, async (newValue) => {
  if (newValue) {
    await getOcrMeasurements();
  }
});

const $q = useQuasar();
$q.dark.set(true); // 设置为暗黑模式
</script>

<style scoped>
.container {
  display: flex;
}
.video {
  margin-right: 20px;
}
.controls label {
  display: block;
  margin-top: 8px;
}
.stats,
#rects {
  margin-top: 16px;
}
#rects div {
  margin-bottom: 12px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* 软键盘样式 */
.virtual-keyboard {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.keyboard-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.keyboard-key {
  min-width: 48px;
  min-height: 48px;
  font-size: 16px;
  font-weight: bold;
}

.keyboard-key-wide {
  min-width: 200px;
}

.keyboard-key-primary {
  min-width: 80px;
}

@media (max-width: 600px) {
  .keyboard-key {
    min-width: 40px;
    min-height: 40px;
    font-size: 14px;
  }

  .keyboard-key-wide {
    min-width: 160px;
  }

  .keyboard-key-primary {
    min-width: 70px;
  }
}
</style>
