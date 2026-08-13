<template>
  <view class="star-rating">
    <text class="stars" :style="{ color: starColor }">{{ starText }}</text>
    <text v-if="showScore && score !== null" class="score-text">{{ score }}分</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  rating: number
  score?: number | null
  showScore?: boolean
}>()

const starText = computed(() => {
  const r = Math.max(0, Math.min(5, props.rating || 0))
  return '★'.repeat(r) + '☆'.repeat(5 - r)
})

const starColor = computed(() => {
  const r = props.rating || 0
  if (r >= 5) return '#f7ba2a'
  if (r >= 4) return '#67c23a'
  if (r >= 3) return '#e6a23c'
  if (r >= 2) return '#f56c6c'
  return '#909399'
})
</script>

<style scoped>
.star-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}
.stars {
  font-size: 14px;
  letter-spacing: 1px;
}
.score-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}
</style>
