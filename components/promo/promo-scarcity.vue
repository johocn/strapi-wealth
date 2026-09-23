<template>
  <view v-if="state.visible" class="promo-scarcity">
    <view class="scarcity-head">
      <text v-if="state.countdown" class="scarcity-countdown">距结束 {{ state.countdown }}</text>
      <text v-else-if="state.capacity" class="scarcity-countdown">名额有限，先到先得</text>
    </view>
    <view v-if="state.capacity" class="scarcity-body">
      <view class="scarcity-bar">
        <view class="scarcity-bar-fill" :style="{ width: state.progress + '%' }" />
      </view>
      <text class="scarcity-text">已抢 {{ state.used }} / {{ state.capacity }} 件</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { computeScarcity } from '../../utils/promo-scarcity'

const props = defineProps<{
  activity?: any
}>()

const state = computed(() =>
  computeScarcity({
    startTime: props.activity?.startTime,
    endTime: props.activity?.endTime,
    capacity: props.activity?.capacity,
    usedCapacity: props.activity?.usedCapacity,
  })
)
</script>

<style lang="scss" scoped>
.promo-scarcity {
  margin: 0 24rpx 24rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-primary);
  color: #fff;
}

.scarcity-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scarcity-countdown {
  font-size: 28rpx;
  font-weight: bold;
}

.scarcity-body {
  margin-top: 14rpx;
}

.scarcity-bar {
  height: 12rpx;
  border-radius: 6rpx;
  background: rgba(255, 255, 255, 0.35);
  overflow: hidden;
}

.scarcity-bar-fill {
  height: 100%;
  border-radius: 6rpx;
  background: #fff;
  transition: width 0.3s;
}

.scarcity-text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.95;
}
</style>