<template>
  <text class="risk-tag" :class="riskClass">{{ level || 'R2' }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level?: string
}>()

const riskClass = computed(() => {
  const l = (props.level || 'R2').toLowerCase()
  return 'risk-' + l
})
</script>

<style scoped>
.risk-tag {
  font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 4rpx;
  flex-shrink: 0; font-weight: bold;
}
.risk-tag.risk-r1 { background: #f6ffed; color: #52c41a; }
.risk-tag.risk-r2 { background: #e6f7ff; color: #1890ff; }
.risk-tag.risk-r3 { background: #fff7e6; color: #fa8c16; }
.risk-tag.risk-r4 { background: #fff2e8; color: #fa541c; }
.risk-tag.risk-r5 { background: #ffebee; color: #f5222d; }
</style>
