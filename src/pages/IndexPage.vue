<template>
  <q-page padding>
    <q-card class="q-pa-md">
      <video ref="videoRef" class="full-width" autoplay playsinline />
      <div class="q-gutter-md q-mt-md">
        <div>
          电压: <span class="text-weight-bold">{{ voltage }} V</span>
        </div>
        <div>
          电流: <span class="text-weight-bold">{{ current }} A</span>
        </div>
        <q-btn color="primary" label="开始测距" @click="handleStart" />
        <div>
          距离: <span class="text-h5 text-weight-bold">{{ distance }} cm</span>
        </div>
      </div>
      <q-card-section class="q-px-none q-pt-md">
        <q-input filled type="textarea" v-model="log" readonly rows="5" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const videoRef = ref<HTMLVideoElement | null>(null);
const voltage = ref(0);
const current = ref(0);
const distance = ref(0);
const log = ref('');
onMounted(() => {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      if (videoRef.value) videoRef.value.srcObject = stream;
    })
    .catch(console.error);
});
function handleStart() {
  // TODO: 集成硬件接口替换模拟
  voltage.value = Number((Math.random() * 5).toFixed(2));
  current.value = Number((Math.random() * 2).toFixed(2));
  distance.value = Number((Math.random() * 100).toFixed(1));
  log.value += `测量：${voltage.value}V, ${current.value}A, ${distance.value}cm\n`;
}
</script>
