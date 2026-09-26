<template>
  <view class="promo-card promo-info">
    <view v-if="statusBadge" class="status-badge">{{ statusBadge }}</view>
    <view v-if="timeText" class="info-item">
      <text class="info-icon">🕐</text>
      <view class="info-body">
        <text class="info-label">活动时间</text>
        <text class="info-value">{{ timeText }}</text>
      </view>
    </view>
    <view v-if="venueName" class="info-item">
      <text class="info-icon">📍</text>
      <view class="info-body">
        <text class="info-label">活动地点</text>
        <text class="info-value">{{ venueName }}</text>
        <view class="nav-btn" :class="{ 'nav-btn--off': !canNavigate }" @click="openLocation">
          <text>📍 一键导航</text>
        </view>
      </view>
    </view>
    <view v-if="quotaText" class="info-item">
      <text class="info-icon">👥</text>
      <view class="info-body">
        <text class="info-label">活动名额</text>
        <text class="info-value">{{ quotaText }}</text>
      </view>
    </view>
    <view v-if="feeText" class="info-item">
      <text class="info-icon">🎟️</text>
      <view class="info-body">
        <text class="info-label">活动费用</text>
        <text class="info-value">{{ feeText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activity?: any
  config?: any
}>()

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN')
}

const timeText = computed(() => {
  const a = props.activity
  const start = formatTime(a?.startTime)
  const end = formatTime(a?.endTime)
  if (start && end) return `${start} ~ ${end}`
  return start || end
})

const venueName = computed(() => props.activity?.venue?.name || props.activity?.venueName || '')

const quotaText = computed(() => {
  const a = props.activity
  if (a?.capacity == null) return ''
  return `${a.usedCapacity ?? 0} / ${a.capacity}`
})

const feeText = computed(() => {
  const a = props.activity
  if (!a || a.pricingMode === 'free') return ''
  const cost = Number(a.cost ?? a.cashPrice ?? 0)
  if (cost <= 0) return '免费'
  return `${cost}元`
})

const statusBadge = computed(() => {
  const s = props.activity?.status
  if (s === 'ended' || s === 'archived') return '已结束'
  if (s === 'draft') return '未发布'
  return ''
})

// 一键导航：坐标优先取场地主档，回落活动自身经纬度（地理围栏配置）；非空且非 0 才可用
const venueCoord = computed(() => {
  const a = props.activity
  const lat = Number(a?.venue?.lat ?? a?.lat)
  const lng = Number(a?.venue?.lng ?? a?.lng)
  return {
    lat,
    lng,
    valid: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0,
  }
})

const canNavigate = computed(() => venueCoord.value.valid)

function openLocation() {
  const a = props.activity
  const c = venueCoord.value
  if (!c.valid) {
    uni.showToast({ title: '场地暂未设置坐标', icon: 'none' })
    return
  }
  const name = a.venue?.name || a.venueName || '活动场地'
  const address = a.venue?.address || a.venueName || ''
  // #ifdef H5
  // H5 端 uni.openLocation 依赖 map 组件，而本项目未配置 H5 地图 key（manifest.h5.map），
  // 弹层里地图恒为空白；改为直接跳高德地图网页版（无需 key），微信内会引导唤起高德 App
  window.location.href =
    `https://uri.amap.com/marker?position=${c.lng},${c.lat}` +
    `&name=${encodeURIComponent(name)}&coordinate=gaode&callnative=1`
  return
  // #endif
  uni.openLocation({
    latitude: c.lat,
    longitude: c.lng,
    name,
    address,
    scale: 16,
  })
}
</script>

<style lang="scss" scoped>
.promo-info {
  position: relative;
}

.status-badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border-radius: 8rpx;
  background: var(--c-primary);
  color: #fff;
}

.nav-btn {
  display: inline-block;
  margin-top: 12rpx;
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  border-radius: 30rpx;
  background: var(--c-primary);
  color: #fff;
}

.nav-btn--off {
  opacity: 0.5;
}

.info-item {
  display: flex;
  align-items: flex-start;
  padding: 12rpx 0;
}

.info-icon {
  font-size: 30rpx;
  line-height: 1.4;
  margin-right: 16rpx;
}

.info-body {
  flex: 1;
}

.info-label {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-dim);
  margin-bottom: 4rpx;
}

.info-value {
  display: block;
  font-size: 28rpx;
  color: var(--c-text);
  line-height: 1.5;
}
</style>
