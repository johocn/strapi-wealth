<template>
  <view v-if="disclosure" class="disclosure-block">
    <view class="disclosure-header">
      <text class="disclosure-title">{{ disclosure.title || '风险提示' }}</text>
      <text class="disclosure-type">{{ getTypeLabel(productType) }}</text>
    </view>
    <text class="disclosure-content">{{ disclosure.content }}</text>
    <text class="disclosure-date" v-if="disclosure.effectiveDate">生效日期：{{ disclosure.effectiveDate }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getDisclosure } from '../services/api'
import { getTypeLabel } from '../utils/format'

const props = defineProps<{
  productType: string
}>()

const disclosure = ref<any>(null)

async function loadDisclosure() {
  if (!props.productType) return
  try {
    disclosure.value = await getDisclosure(props.productType)
  } catch (e) {
    console.warn('[disclosure-block] 加载披露文案失败', e)
  }
}

watch(() => props.productType, loadDisclosure, { immediate: true })
</script>

<style scoped>
.disclosure-block {
  background: #fffbe6; border: 1rpx solid #ffe58f;
  border-radius: 8rpx; padding: 20rpx; margin: 20rpx 0;
}
.disclosure-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12rpx;
}
.disclosure-title { font-size: 26rpx; font-weight: bold; color: #d48806; }
.disclosure-type { font-size: 20rpx; color: #d48806; background: #fff7e6; padding: 2rpx 10rpx; border-radius: 4rpx; }
.disclosure-content { font-size: 24rpx; color: #666; line-height: 1.6; display: block; }
.disclosure-date { font-size: 20rpx; color: #999; margin-top: 8rpx; display: block; }
</style>
