<template>
  <q-page padding>
    <!-- 页面标题和全屏按钮 -->
    <div class="row items-center q-mb-md">
      <div class="text-h5 q-mr-md">CV Debug Extended</div>
      <q-btn
        :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
        :label="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'"
        @click="toggleFullscreen"
        color="primary"
        outline
        size="sm"
      />
      <q-space />
    </div>

    <div class="row">
      <!-- 流媒体显示 -->
      <div class="col-6">
        <q-card flat bordered>
          <q-expansion-item
            default-opened
            icon="videocam"
            label="Video Streams"
            header-class="text-primary"
          >
            <q-card-section>
              <div class="text-subtitle2">Processed Stream</div>
              <img
                :src="`/video/processed?formula=${encodeURIComponent(formula)}`"
                width="100%"
                alt="Processed"
              />
            </q-card-section>
            <q-separator />
            <q-card-section>
              <div class="text-subtitle2">Mask Stream</div>
              <img :src="`/video/mask`" width="100%" alt="Mask" />
            </q-card-section>
          </q-expansion-item>
        </q-card>
      </div>

      <!-- 控件区 -->
      <div class="col-6">
        <q-card flat bordered class="q-pa-md">
          <!-- 物理测量 -->
          <div class="text-subtitle2">Physical Measurements</div>
          <div class="row q-gutter-sm q-mt-sm">
            <q-btn
              color="primary"
              label="Get Measurements"
              @click="getMeasurements"
              :loading="measurementsLoading"
            />
            <q-btn
              color="secondary"
              label="Minimum Square"
              @click="getMinimumSquareMeasurements"
              :loading="minSquareLoading"
            />
          </div>

          <!-- OCR测量 -->
          <q-separator class="q-my-md" />
          <div class="text-subtitle2">OCR Measurement</div>
          <div class="q-mt-sm">
            <q-input
              v-model="ocrTargetText"
              label="Target Text"
              dense
              clearable
              placeholder="Enter text to search for shapes"
            />
            <div class="row q-gutter-sm q-mt-sm">
              <q-btn
                color="accent"
                label="OCR Analysis"
                @click="getOcrMeasurements"
                :loading="ocrLoading"
              />
              <q-btn
                :color="showVirtualKeyboard ? 'negative' : 'primary'"
                :icon="showVirtualKeyboard ? 'keyboard_hide' : 'keyboard'"
                :label="showVirtualKeyboard ? 'Hide Keyboard' : 'Show Keyboard'"
                @click="showVirtualKeyboard = !showVirtualKeyboard"
                :outline="!showVirtualKeyboard"
              />
            </div>
          </div>

          <!-- 测量结果展示 -->
          <div v-if="measurements.length > 0" class="q-mt-md">
            <!-- 过滤器控制 -->
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle2">Measurement Results</div>
              <q-space />
              <q-btn
                :icon="showDetailedInfo ? 'visibility_off' : 'visibility'"
                :label="showDetailedInfo ? 'Hide Details' : 'Show Details'"
                size="sm"
                flat
                color="primary"
                @click="showDetailedInfo = !showDetailedInfo"
              />
            </div>
            <div v-for="crop in measurements" :key="crop.crop_index" class="q-mb-md">
              <div class="text-subtitle2">Crop {{ crop.crop_index }}</div>

              <!-- Target 信息 -->
              <div
                v-if="crop.target"
                class="q-mb-sm q-pa-sm"
                style="background: #f5f5f5; border-radius: 4px"
              >
                <div>
                  <strong>Target #{{ crop.target.id }}</strong>
                </div>
                <div>Pixel Size: {{ crop.target.crop_width }}×{{ crop.target.crop_height }}</div>
                <div>Area: {{ crop.target.area }}px</div>
                <div>Long Edge: {{ crop.target.new_long_px.toFixed(1) }}px</div>
                <div>Distance: {{ computeDistance(crop.target.new_long_px).toFixed(1) }} cm</div>
              </div>

              <!-- 形状测量结果 -->
              <div
                v-for="shape in crop.shapes"
                :key="shape.shape_index"
                class="q-mb-sm q-pa-sm"
                style="background: #e8f4fd; border-radius: 4px"
              >
                <div class="text-weight-bold">{{ shape.shape_type }} #{{ shape.shape_index }}</div>

                <!-- 像素尺寸 -->
                <div class="q-mt-sm">
                  <div class="text-caption text-weight-bold">Pixel Dimensions:</div>
                  <div>
                    Size: {{ shape.pixel_dimensions.width }}×{{ shape.pixel_dimensions.height }}px
                  </div>
                  <div>Area: {{ shape.pixel_dimensions.area }}px</div>
                  <div v-if="shape.pixel_dimensions.mean_side_length > 0">
                    Mean Side: {{ shape.pixel_dimensions.mean_side_length.toFixed(1) }}px
                  </div>
                  <div>Perimeter: {{ shape.pixel_dimensions.perimeter.toFixed(1) }}px</div>
                </div>

                <!-- 物理尺寸 -->
                <div class="q-mt-sm">
                  <div class="text-caption text-weight-bold">Physical Dimensions:</div>
                  <div>
                    Size:
                    {{ (shape.physical_dimensions.width_mm * correctionFactor).toFixed(1) }}×{{
                      (shape.physical_dimensions.height_mm * correctionFactor).toFixed(1)
                    }}mm
                  </div>
                  <div>
                    Area:
                    {{
                      (
                        shape.physical_dimensions.area_mm2 *
                        correctionFactor *
                        correctionFactor
                      ).toFixed(1)
                    }}mm²
                  </div>

                  <!-- 详细信息 - 根据过滤器显示 -->
                  <template v-if="showDetailedInfo">
                    <div v-if="shape.physical_dimensions.diameter_mm > 0">
                      Diameter:
                      {{ (shape.physical_dimensions.diameter_mm * correctionFactor).toFixed(1) }}mm
                    </div>
                    <div v-if="shape.physical_dimensions.mean_side_length_mm > 0">
                      Mean Side:
                      {{
                        (shape.physical_dimensions.mean_side_length_mm * correctionFactor).toFixed(
                          1,
                        )
                      }}mm
                    </div>
                    <div>
                      Perimeter:
                      {{ (shape.physical_dimensions.perimeter_mm * correctionFactor).toFixed(1) }}mm
                    </div>
                    <div class="text-caption">
                      Method: {{ shape.physical_dimensions.measurement_type }} ({{
                        shape.physical_dimensions.mm_per_pixel.toFixed(3)
                      }}
                      mm/px, correction: {{ correctionFactor.toFixed(4) }})
                    </div>
                  </template>
                </div>

                <!-- 边长详情 - 根据过滤器显示 -->
                <div
                  v-if="showDetailedInfo && shape.physical_dimensions.side_lengths_mm.length > 0"
                  class="q-mt-sm"
                >
                  <div class="text-caption text-weight-bold">Side Lengths:</div>
                  <div
                    v-for="(length, idx) in shape.physical_dimensions.side_lengths_mm"
                    :key="idx"
                  >
                    Side {{ idx + 1 }}: {{ (length * correctionFactor).toFixed(1) }}mm
                  </div>
                </div>

                <!-- OCR 信息 -->
                <div v-if="shape.ocr_data" class="q-mt-sm">
                  <div class="text-caption text-weight-bold">OCR Information:</div>
                  <div v-if="shape.ocr_data.detected">
                    <div>
                      Text: <strong>"{{ shape.ocr_data.text }}"</strong>
                    </div>
                    <div>Confidence: {{ (shape.ocr_data.confidence * 100).toFixed(1) }}%</div>
                    <div class="text-caption">OCR detected in this shape</div>
                  </div>
                  <div v-else class="text-caption text-grey">No OCR text detected</div>
                </div>
              </div>
            </div>

            <!-- A4 参考信息 - 根据过滤器显示 -->
            <div
              v-if="showDetailedInfo && a4Reference"
              class="q-mt-md q-pa-sm"
              style="background: #fff3cd; border-radius: 4px"
            >
              <div class="text-caption text-weight-bold">A4 Reference:</div>
              <div>
                {{ (a4Reference.physical_width_mm * correctionFactor).toFixed(1) }}×{{
                  (a4Reference.physical_height_mm * correctionFactor).toFixed(1)
                }}mm
              </div>
              <div class="text-caption">
                {{ a4Reference.note }} (with correction factor: {{ correctionFactor.toFixed(4) }})
              </div>
            </div>

            <!-- OCR 处理时间信息 - 始终显示 -->
            <div
              v-if="ocrElapsedTime > 0"
              class="q-mt-md q-pa-sm"
              style="background: #e8f5e8; border-radius: 4px"
            >
              <div class="text-caption text-weight-bold">OCR Processing Time:</div>
              <div>{{ ocrElapsedTime.toFixed(3) }} seconds</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 全局统计 -->
          <div class="text-subtitle2 q-mt-lg">Statistics</div>
          <div class="q-mt-sm">
            <div>
              Rectangles: <strong>{{ stats.count }}</strong>
            </div>
            <div>
              Total Pixels: <strong>{{ stats.total_pixels }}</strong>
            </div>
            <div>
              Frame Ratio: <strong>{{ (stats.frame_ratio * 100).toFixed(2) }}%</strong>
            </div>
            <div>
              Black Ratio: <strong>{{ (stats.black_ratio * 100).toFixed(2) }}%</strong>
            </div>
            <div>
              FPS: <strong>{{ stats.fps.toFixed(1) }}</strong>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- 检测到的矩形详情 -->
          <div class="text-subtitle2">Detected Rectangles</div>
          <div v-for="r in displayedRects" :key="r.id">
            <div>
              <strong>#{{ r.id }}</strong>
            </div>
            <div>Outer: {{ r.outer_width }}×{{ r.outer_height }}</div>
            <div>Area: {{ r.area }}px</div>
            <div>New Edge: {{ r.new_long_px.toFixed(1) }}px</div>
            <div>Dist: {{ computeDistance(r.new_long_px).toFixed(1) }} cm</div>
            <div>Shape: {{ r.shape_type }}</div>
            <div>Inner: {{ r.inner_width }}×{{ r.inner_height }} (area {{ r.inner_area }}px)</div>
            <div>Info: {{ r.inner_info }}</div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 软键盘弹窗 -->
    <q-dialog v-model="showVirtualKeyboard" position="bottom" maximized>
      <q-card class="virtual-keyboard">
        <q-card-section class="row items-center q-pa-sm bg-primary text-white">
          <div class="text-h6">Virtual Keyboard</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="closeKeyboard" />
        </q-card-section>

        <q-card-section class="q-pa-md">
          <!-- 输入显示 -->
          <q-input v-model="ocrTargetText" label="Target Text" dense outlined class="q-mb-md" />

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
                label="Space"
                class="keyboard-key keyboard-key-wide"
                @click="onKeyPress('Space')"
              />
              <q-btn label="⌫" class="keyboard-key" @click="onKeyPress('Backspace')" />
              <q-btn label="Clear" class="keyboard-key" @click="onKeyPress('Clear')" />
              <q-btn
                label="Search"
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
import { reactive, ref, onMounted, onUnmounted } from 'vue';

// 距离公式 - 默认使用标准的距离公式格式
const formula = ref('((524.38/x)**(1/1.003))*100');

// 边长修正系数
const correctionFactor = ref<number>(1.0261);

const stats = reactive({
  count: 0,
  total_pixels: 0,
  frame_ratio: 0,
  black_ratio: 0,
  fps: 0,
});

// 2. 显示用的矩形列表，带延迟清除
const displayedRects = ref<any[]>([]);
const removalTimers = new Map<number, number>();

// 物理测量相关
const measurements = ref<any[]>([]);
const measurementsLoading = ref(false);
const a4Reference = ref<any>(null);

// 最小正方形测量相关
const minSquareLoading = ref(false);

// OCR测量相关
const ocrTargetText = ref('');
const ocrLoading = ref(false);
const ocrElapsedTime = ref(0);

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
    void getOcrMeasurements();
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
        console.error('Error attempting to enable fullscreen:', err);
      });
  } else {
    // 退出全屏
    document
      .exitFullscreen()
      .then(() => {
        isFullscreen.value = false;
      })
      .catch((err) => {
        console.error('Error attempting to exit fullscreen:', err);
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
    return eval(formulaWithValue);
  } catch (error) {
    console.error('Error calculating distance:', error, 'Formula:', formula.value, 'Pixel:', px);
    return 0;
  }
}

// 获取物理测量数据
async function getMeasurements() {
  measurementsLoading.value = true;
  try {
    const response = await fetch('/api/physical_measurements');
    const data = await response.json();

    if (data.success) {
      measurements.value = data.measurements || [];
      a4Reference.value = data.a4_reference || null;
    } else {
      console.error('Failed to get measurements:', data);
      measurements.value = [];
    }
  } catch (error) {
    console.error('Error fetching measurements:', error);
    measurements.value = [];
  } finally {
    measurementsLoading.value = false;
  }
}

// 获取最小正方形测量数据
async function getMinimumSquareMeasurements() {
  minSquareLoading.value = true;
  try {
    const response = await fetch('/api/minimum_square_measurements');
    const data = await response.json();

    if (data.success) {
      // 将最小正方形数据格式转换为兼容现有显示格式
      const convertedMeasurements = data.measurements.map((crop: any) => ({
        crop_index: crop.crop_index,
        target: crop.target,
        shapes: crop.squares.map((square: any) => ({
          shape_index: square.shape_index,
          shape_type: square.found ? `Square (${square.type})` : 'Square (not found)',
          pixel_dimensions: {
            width: square.pixel_dimensions?.width || 0,
            height: square.pixel_dimensions?.height || 0,
            area: square.area || 0,
            side_lengths: square.found
              ? [square.side_length, square.side_length, square.side_length, square.side_length]
              : [],
            mean_side_length: square.side_length || 0,
            perimeter: square.pixel_dimensions?.perimeter || 0,
          },
          physical_dimensions: {
            width_mm: square.physical_dimensions?.width_mm || 0,
            height_mm: square.physical_dimensions?.height_mm || 0,
            area_mm2: square.physical_dimensions?.area_mm2 || 0,
            diameter_mm: 0,
            side_lengths_mm: square.found
              ? [
                  square.physical_dimensions?.side_length_mm || 0,
                  square.physical_dimensions?.side_length_mm || 0,
                  square.physical_dimensions?.side_length_mm || 0,
                  square.physical_dimensions?.side_length_mm || 0,
                ]
              : [],
            mean_side_length_mm: square.physical_dimensions?.side_length_mm || 0,
            perimeter_mm: square.physical_dimensions?.perimeter_mm || 0,
            measurement_type: 'minimum_square',
            mm_per_pixel: square.physical_dimensions?.mm_per_pixel || 0,
          },
        })),
      }));

      measurements.value = convertedMeasurements;
      a4Reference.value = data.a4_reference || null;
    } else {
      console.error('Failed to get minimum square measurements:', data);
      measurements.value = [];
    }
  } catch (error) {
    console.error('Error fetching minimum square measurements:', error);
    measurements.value = [];
  } finally {
    minSquareLoading.value = false;
  }
}

// 获取OCR测量数据
async function getOcrMeasurements() {
  ocrLoading.value = true;
  try {
    const response = await fetch('/api/ocr_measurement_analysis');
    const data = await response.json();

    if (data.success) {
      // 保存处理时间
      ocrElapsedTime.value = data.elapsed_seconds || 0;

      // 过滤出包含目标文字的形状
      const filteredMeasurements = data.analysis
        .map((crop: any) => ({
          crop_index: crop.crop_index,
          target: crop.target,
          shapes: crop.shapes
            .filter((shape: any) => {
              // 如果输入框为空，显示所有检测到OCR的形状
              if (!ocrTargetText.value.trim()) {
                return shape.ocr_data.detected;
              }
              // 否则只显示包含目标文字的形状
              return (
                shape.ocr_data.detected &&
                shape.ocr_data.text.toLowerCase().includes(ocrTargetText.value.toLowerCase())
              );
            })
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
        .filter((crop: any) => crop.shapes.length > 0); // 只保留有匹配形状的crop

      measurements.value = filteredMeasurements;
      a4Reference.value = data.references || null;
    } else {
      console.error('Failed to get OCR measurements:', data);
      measurements.value = [];
    }
  } catch (error) {
    console.error('Error fetching OCR measurements:', error);
    measurements.value = [];
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
        console.log('Loaded distance formula:', formula.value);
      } else {
        console.log('No saved distance formula found, using default');
      }
    }
  } catch (error) {
    console.error('Error loading formula configuration:', error);
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
          console.log('Loaded correction factor:', factor);
        }
      } else {
        console.log('No saved correction factor found, using default:', correctionFactor.value);
      }
    }
  } catch (error) {
    console.error('Error loading correction factor configuration:', error);
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
});
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
