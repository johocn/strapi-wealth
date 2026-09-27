<template>
  <view
    class="promo-card promo-cover"
    :class="bgImage ? 'promo-cover--image' : 'promo-cover--gradient'"
  >
    <image v-if="bgImage" :src="bgImage" mode="aspectFill" class="cover-bg" />
    <view v-if="bgImage" class="cover-mask" />
    <view class="cover-content">
      <text v-if="statusText" class="cover-badge">{{ statusText }}</text>
      <text v-if="title" class="cover-title">{{ title }}</text>
      <text v-if="highlightText" class="cover-highlight">{{ highlightText }}</text>
      <view v-if="dateStart || dateEnd" class="cover-dates">
        <text v-if="dateStart" class="cover-date">{{ dateStart }}</text>
        <text v-if="dateEnd" class="cover-date cover-date--end">{{ dateEnd }}</text>
      </view>
      <text v-if="metaText" class="cover-meta">{{ metaText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveMediaUrl } from '../../utils/env'
import { formatDateTime } from '../../utils/promo-datetime'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || props.activity?.title || '')
// 宣传重点：模块 highlight 优先，回落副标题（同一要素，不重复渲染）
const highlightText = computed(() => props.config?.highlight || props.config?.subtitle || '')
// 封面优先级：模块 bgImage → 宣传组图 promoAssets[0] → 旧 assets[0]
const bgImage = computed(() => {
  if (props.config?.bgImage) return resolveMediaUrl(props.config.bgImage)
  const promoAssets = Array.isArray(props.activity?.promoAssets) ? props.activity.promoAssets : []
  if (promoAssets.length && promoAssets[0]?.url) return resolveMediaUrl(promoAssets[0].url)
  const legacy = Array.isArray(props.activity?.assets) ? props.activity.assets : []
  if (legacy.length && legacy[0]?.url) return resolveMediaUrl(legacy[0].url)
  return ''
})

// 日期时间：开始 / 结束各一行，空值或非法自动降级隐藏该行
const dateStart = computed(() => formatDateTime(props.activity?.startTime))
const dateEnd = computed(() => formatDateTime(props.activity?.endTime))

// 场地 / 费用：与 promo-info 同源取值规则，任一为空隐藏该项，两者皆空整行隐藏
const venueName = computed(() => props.activity?.venue?.name || props.activity?.venueName || '')
const feeText = computed(() => {
  const a = props.activity
  if (!a || a.pricingMode === 'free') return ''
  const cost = Number(a.cost ?? a.cashPrice ?? 0)
  if (cost <= 0) return '免费'
  return `${cost}元`
})
const metaText = computed(() => [venueName.value, feeText.value].filter(Boolean).join(' · '))

// 状态徽章：draft 不渲染
const statusText = computed(() => {
  const s = props.activity?.status
  if (s === 'signup_open') return '报名中'
  if (s === 'ongoing') return '进行中'
  if (s === 'ended' || s === 'archived') return '已结束'
  return ''
})
</script>

<style lang="scss" scoped>
.promo-card.promo-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 240rpx;
  padding: 0;
  margin: 0 0 24rpx;
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}

/* 有图保持更高，无图 240rpx 起、内容多时同步长高 */
.promo-cover--image {
  min-height: 340rpx;
}

.promo-cover--gradient {
  background: linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%);
}

.cover-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 底部向上渐深，保证压图后文字可读 */
.cover-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0.55) 100%);
}

.cover-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 32rpx 40rpx 40rpx;
}

.cover-badge {
  align-self: flex-start;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(255, 255, 255, 0.24);
  border: 1rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 999rpx;
}

.cover-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1.3;
}

/* 宣传重点：白底深色粗体，视觉权重最高 */
.cover-highlight {
  align-self: flex-start;
  max-width: 100%;
  padding: 8rpx 20rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: #1f2937;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.12);
}

.cover-dates {
  align-self: flex-start;
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 12rpx;
}

.cover-date {
  display: block;
  font-size: 26rpx;
  color: #fff;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  letter-spacing: 1rpx;
  line-height: 1.4;
}

.cover-date--end {
  color: rgba(255, 255, 255, 0.82);
}

.cover-meta {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}
</style>