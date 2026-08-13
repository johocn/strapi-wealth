<template>
  <view class="portfolio-card" @click="$emit('click', plan)">
    <view class="card-header">
      <text class="plan-name">{{ plan.planName }}</text>
      <view class="plan-type-tag" :class="plan.planType">
        {{ planTypeLabel }}
      </view>
    </view>
    <view class="card-body">
      <view class="stat-item">
        <text class="stat-label">产品数</text>
        <text class="stat-value">{{ productCount }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">配置金额</text>
        <text class="stat-value">{{ formatAmount(plan.totalAmount) }}</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">更新时间</text>
        <text class="stat-value">{{ formatDate(plan.updatedAt) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PLAN_TYPE_LABELS } from '@/utils/format'

const props = defineProps<{
  plan: any
}>()

defineEmits(['click'])

const planTypeLabel = computed(() => {
  return PLAN_TYPE_LABELS[props.plan.planType] || '自定义'
})

const productCount = computed(() => {
  const products = typeof props.plan.products === 'string'
    ? JSON.parse(props.plan.products)
    : props.plan.products || []
  return products.length
})

function formatAmount(amount: any): string {
  if (!amount) return '未配置'
  const n = Number(amount)
  if (isNaN(n)) return '未配置'
  if (n >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toFixed(2)
}

function formatDate(date: string): string {
  if (!date) return '--'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.portfolio-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.plan-type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.plan-type-tag.conservative { background: #f0f9eb; color: #67c23a; }
.plan-type-tag.balanced { background: #ecf5ff; color: #409eff; }
.plan-type-tag.aggressive { background: #fef0f0; color: #f56c6c; }
.plan-type-tag.custom { background: #f4f4f5; color: #909399; }
.card-body {
  display: flex;
  justify-content: space-around;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: #999;
}
.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
</style>
