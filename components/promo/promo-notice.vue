<template>
  <view v-if="description || html" class="promo-card promo-notice">
    <text v-if="title" class="section-title">{{ title }}</text>
    <text v-if="description" class="notice-text">{{ description }}</text>
    <view v-if="html" class="notice-extra">
      <text class="notice-extra-label">补充规则</text>
      <rich-text class="notice-html" :nodes="html" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || '活动说明')
const description = computed(() => props.activity?.description || '')
const html = computed(() => props.config?.html || '')
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.notice-text {
  display: block;
  font-size: 28rpx;
  color: var(--c-text);
  line-height: 1.7;
}

.notice-extra {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid var(--c-text-dim);
}

.notice-extra-label {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-dim);
  margin-bottom: 12rpx;
}

.notice-html {
  font-size: 28rpx;
  color: var(--c-text);
  line-height: 1.7;
}
</style>