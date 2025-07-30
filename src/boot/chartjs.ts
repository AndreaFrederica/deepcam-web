// src/boot/chartjs.ts
import { boot } from 'quasar/wrappers'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// 全局注册
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
)

export default boot(() => {
  // nothing to do here
})
