<template>
  <view class="score-radar">
    <view class="radar-container">
      <!-- SVG 雷达图 -->
      <view class="radar-svg-wrap">
        <canvas
          canvas-id="scoreRadar"
          id="scoreRadar"
          class="radar-canvas"
          @touchstart="stopTouch"
        />
      </view>
    </view>
    <view class="score-detail">
      <view class="score-row" v-for="dim in dimensions" :key="dim.key">
        <text class="dim-label">{{ dim.label }}</text>
        <view class="dim-bar-wrap">
          <view class="dim-bar" :style="{ width: dim.value + '%', background: dim.color }" />
        </view>
        <text class="dim-value">{{ dim.value }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
  returnScore: number
  volatilityScore: number
  drawdownScore: number
  compositeScore: number
}>()

const dimensions = computed(() => [
  { key: 'returnScore', label: '收益能力', value: props.returnScore || 0, color: '#409eff' },
  { key: 'volatilityScore', label: '波动控制', value: props.volatilityScore || 0, color: '#67c23a' },
  { key: 'drawdownScore', label: '回撤控制', value: props.drawdownScore || 0, color: '#e6a23c' },
  { key: 'compositeScore', label: '综合评分', value: props.compositeScore || 0, color: '#9c27b0' },
])

function drawRadar() {
  const ctx = uni.createCanvasContext('scoreRadar')
  const size = 200
  const center = size / 2
  const radius = 70
  const sides = 4

  // 背景多边形
  for (let level = 1; level <= 4; level++) {
    const r = (radius * level) / 4
    ctx.beginPath()
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.setStrokeStyle('#e0e0e0')
    ctx.setLineWidth(0.5)
    ctx.stroke()
  }

  // 轴线
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(center, center)
    ctx.lineTo(center + radius * Math.cos(angle), center + radius * Math.sin(angle))
    ctx.setStrokeStyle('#e0e0e0')
    ctx.setLineWidth(0.5)
    ctx.stroke()
  }

  // 数据多边形
  const values = [props.returnScore, props.volatilityScore, props.drawdownScore, props.compositeScore]
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    const r = (radius * (values[i] || 0)) / 100
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.setFillStyle('rgba(64, 158, 255, 0.2)')
  ctx.fill()
  ctx.setStrokeStyle('#409eff')
  ctx.setLineWidth(1.5)
  ctx.stroke()

  // 数据点
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    const r = (radius * (values[i] || 0)) / 100
    const x = center + r * Math.cos(angle)
    const y = center + r * Math.sin(angle)
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.setFillStyle('#409eff')
    ctx.fill()
  }

  // 标签
  const labels = ['收益', '波动', '回撤', '综合']
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    const labelR = radius + 18
    const x = center + labelR * Math.cos(angle)
    const y = center + labelR * Math.sin(angle)
    ctx.setFontSize(10)
    ctx.setFillStyle('#666')
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(labels[i], x, y)
  }

  ctx.draw()
}

onMounted(() => {
  nextTick(() => {
    setTimeout(() => drawRadar(), 100)
  })
})

watch(() => [props.returnScore, props.volatilityScore, props.drawdownScore, props.compositeScore], () => {
  nextTick(() => drawRadar())
}, { deep: true })

function stopTouch() {}
</script>

<style scoped>
.score-radar {
  padding: 10px 0;
}
.radar-container {
  display: flex;
  justify-content: center;
}
.radar-canvas {
  width: 200px;
  height: 200px;
}
.score-detail {
  margin-top: 10px;
}
.score-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
  gap: 8px;
}
.dim-label {
  font-size: 12px;
  color: #666;
  width: 60px;
  flex-shrink: 0;
}
.dim-bar-wrap {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}
.dim-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.dim-value {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  width: 30px;
  text-align: right;
}
</style>
