<template>
  <view class="promo-card promo-images">
    <text v-if="title" class="section-title">{{ title }}</text>
    <text v-if="desc" class="images-desc">{{ desc }}</text>
    <view v-if="images.length" class="image-grid">
      <image
        v-for="(src, index) in images"
        :key="index"
        :src="src"
        mode="aspectFill"
        class="grid-image"
        lazy-load
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveMediaUrl } from '../../utils/env'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || '')
const desc = computed(() => props.config?.desc || '')
const images = computed<string[]>(() => (props.config?.images || []).map((m: any) => resolveMediaUrl(m)))
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.images-desc {
  display: block;
  margin: -8rpx 0 20rpx;
  font-size: 26rpx;
  color: var(--c-text-dim);
  line-height: 1.6;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.grid-image {
  width: 48%;
  height: 240rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  background: var(--c-card);
}
</style>
