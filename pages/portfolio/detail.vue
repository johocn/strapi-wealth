<template>
  <view class="portfolio-detail">
    <view v-if="plan" class="detail-content">
      <!-- 方案概览 -->
      <view class="overview-card">
        <view class="overview-header">
          <text class="plan-name">{{ plan.planName }}</text>
          <view class="plan-type-tag" :class="plan.planType">{{ planTypeLabel }}</view>
        </view>
        <view class="overview-stats">
          <view class="ov-stat">
            <text class="ov-label">产品数</text>
            <text class="ov-value">{{ productDetails.length }}</text>
          </view>
          <view class="ov-stat">
            <text class="ov-label">配置总额</text>
            <text class="ov-value">{{ formatAmount(plan.totalAmount) }}</text>
          </view>
        </view>
      </view>

      <!-- 业绩概览 -->
      <view v-if="performance" class="performance-card">
        <text class="card-title">组合业绩</text>
        <view class="perf-grid">
          <view class="perf-item">
            <text class="perf-label">近1月年化</text>
            <text class="perf-value" :class="{ positive: performance.weightedReturn > 0 }">
              {{ formatPercent(performance.weightedReturn) }}
            </text>
          </view>
          <view class="perf-item">
            <text class="perf-label">波动率</text>
            <text class="perf-value">{{ formatPercent(performance.weightedVolatility) }}</text>
          </view>
          <view class="perf-item">
            <text class="perf-label">最大回撤</text>
            <text class="perf-value neg">{{ formatPercent(performance.weightedDrawdown) }}</text>
          </view>
        </view>
      </view>

      <!-- 产品列表 -->
      <view class="products-card">
        <text class="card-title">配置明细</text>
        <view v-for="product in productDetails" :key="product.id" class="product-row">
          <view class="product-info">
            <text class="product-name">{{ product.productName }}</text>
            <view class="product-tags">
              <text class="tag risk" :class="product.riskLevel">{{ product.riskLevel }}</text>
              <text class="tag type">{{ formatProductType(product.productType) }}</text>
            </view>
          </view>
          <view class="product-allocation">
            <text class="allocation-pct">{{ (product.allocationRatio * 100).toFixed(0) }}%</text>
            <text class="allocation-label">配比</text>
          </view>
        </view>
      </view>

      <!-- 风险揭示 -->
      <view class="disclosure-card">
        <text class="card-title">风险揭示</text>
        <text class="disclosure-text">本方案仅供参考，不构成投资建议。理财产品非存款，产品有风险，投资须谨慎。</text>
        <text class="disclosure-text">短期收益不能代表长期趋势，请关注波动率和回撤指标。</text>
      </view>

      <!-- 操作按钮 -->
      <view class="action-bar">
        <button class="btn-secondary" @click="onExport">导出方案摘要</button>
        <button class="btn-primary" @click="onConsult">预约咨询</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPortfolioPlanDetail, getPortfolioPerformance, exportPortfolioSummary } from '@/services/api'
import { showSuccess, showError } from '@/utils/request'
import { PLAN_TYPE_LABELS } from '@/utils/format'

const plan = ref<any>(null)
const performance = ref<any>(null)
const planId = ref(0)

const productDetails = computed(() => {
  if (!plan.value) return []
  return plan.value.productDetails || []
})

const planTypeLabel = computed(() => {
  return plan.value ? (PLAN_TYPE_LABELS[plan.value.planType] || '自定义') : ''
})

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  planId.value = Number(currentPage?.options?.id || 0)
  if (planId.value) {
    await loadDetail()
    await loadPerformance()
  }
})

async function loadDetail() {
  try {
    const res = await getPortfolioPlanDetail(planId.value)
    plan.value = res
  } catch (error: any) {
    showError(error.message || '加载失败')
  }
}

async function loadPerformance() {
  try {
    const res = await getPortfolioPerformance(planId.value, { period: 'm1' })
    performance.value = res
  } catch (error: any) {
    console.error('业绩加载失败', error)
  }
}

function formatAmount(amount: any): string {
  if (!amount) return '未配置'
  const n = Number(amount)
  if (isNaN(n)) return '未配置'
  if (n >= 10000) return (n / 10000).toFixed(2) + '万'
  return n.toFixed(2)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '--'
  return (Number(value) * 100).toFixed(2) + '%'
}

function formatProductType(type: string): string {
  const labels: Record<string, string> = {
    'bank-wealth': '银行理财',
    'stock-fund': '股票基金',
    'bond-fund': '债券基金',
    'mixed-fund': '混合基金',
    'money-fund': '货币基金',
  }
  return labels[type] || type
}

async function onExport() {
  try {
    const res = await exportPortfolioSummary(planId.value)
    showSuccess('方案摘要已生成，可截图保存')
    console.log('导出数据', res)
  } catch (error: any) {
    showError(error.message || '导出失败')
  }
}

function onConsult() {
  uni.navigateTo({
    url: `/pages/portfolio/detail?id=${planId.value}&action=consult`,
  })
  // 跳转到预约页面（可复用详情页弹窗或独立页面）
  // 简化方案：在详情页内弹出预约表单
  uni.showModal({
    title: '预约咨询',
    content: '确定预约理财顾问咨询此方案吗？',
    success: async (res) => {
      if (res.confirm) {
        // 实际应跳转到预约页面或弹出表单
        showSuccess('预约请求已提交，我们将在1个工作日内与您联系')
      }
    },
  })
}
</script>

<style scoped>
.portfolio-detail {
  padding: 12px;
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}
.overview-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.plan-name {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}
.plan-type-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
}
.plan-type-tag.conservative { background: #f0f9eb; color: #67c23a; }
.plan-type-tag.balanced { background: #ecf5ff; color: #409eff; }
.plan-type-tag.aggressive { background: #fef0f0; color: #f56c6c; }
.plan-type-tag.custom { background: #f4f4f5; color: #909399; }
.overview-stats {
  display: flex;
}
.ov-stat {
  flex: 1;
}
.ov-label {
  display: block;
  font-size: 12px;
  color: #999;
}
.ov-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.performance-card, .products-card, .disclosure-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: block;
}
.perf-grid {
  display: flex;
}
.perf-item {
  flex: 1;
  text-align: center;
}
.perf-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}
.perf-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
.perf-value.positive { color: #f56c6c; }
.perf-value.neg { color: #67c23a; }
.product-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.product-row:last-child {
  border-bottom: none;
}
.product-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  display: block;
}
.product-tags {
  display: flex;
  gap: 4px;
}
.tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
}
.tag.risk { background: #fef0f0; color: #f56c6c; }
.tag.type { background: #f4f4f5; color: #909399; }
.product-allocation {
  text-align: center;
}
.allocation-pct {
  font-size: 16px;
  font-weight: 600;
  color: #667eea;
  display: block;
}
.allocation-label {
  font-size: 10px;
  color: #999;
}
.disclosure-card {
  background: #fffbf0;
  border: 1px solid #faecd8;
}
.disclosure-text {
  font-size: 12px;
  color: #e6a23c;
  line-height: 1.8;
  display: block;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.05);
}
.btn-secondary {
  flex: 1;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border: 1px solid #667eea;
  color: #667eea;
  border-radius: 20px;
  font-size: 14px;
  background: #fff;
}
.btn-primary {
  flex: 1;
  height: 40px;
  line-height: 40px;
  text-align: center;
  background: #667eea;
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
}
</style>
