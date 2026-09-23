<template>
  <view v-if="text" class="promo-card promo-purpose">
    <text v-if="title" class="section-title">{{ title }}</text>
    <text class="purpose-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || '活动目的')
const text = computed(() => props.activity?.purpose || '')
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.purpose-text {
  display: block;
  font-size: 28rpx;
  color: var(--c-text);
  line-height: 1.7;
}
</style>