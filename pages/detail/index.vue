<template>
  <view class="page-container">
    <view v-if="loading" class="loading">加载中...</view>

    <template v-else-if="product">
      <!-- 1. 产品信息 -->
      <view class="card">
        <view class="product-head">
          <text class="product-name">{{ product.productName }}</text>
          <RiskTag :level="product.riskLevel" />
        </view>
        <view class="info-grid">
          <view class="info-cell">
            <text class="info-label">产品类型</text>
            <text class="info-value">{{ getTypeLabel(product.productType) }}</text>
          </view>
          <view class="info-cell">
            <text class="info-label">发行机构</text>
            <text class="info-value">{{ product.company?.name || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 评分区域 -->
      <view v-if="scoreData" class="card score-section">
        <view class="score-header">
          <text class="section-title">综合评分</text>
          <StarRating :rating="scoreData.starRating" :score="scoreData.compositeScore" show-score />
        </view>
        <ScoreRadar
          :return-score="scoreData.returnScore"
          :volatility-score="scoreData.volatilityScore"
          :drawdown-score="scoreData.drawdownScore"
          :peer-rank-score="scoreData.peerRankScore"
          :composite-score="scoreData.compositeScore"
        />
        <text class="score-disclaimer">评分基于近{{ periodLabel }}数据加权计算，仅供参考</text>
      </view>

      <!-- 动态风险揭示 -->
      <view v-if="riskDisclosures.length > 0" class="card risk-disclosure-section">
        <view class="section-title">风险提示</view>
        <view v-for="(warning, idx) in riskDisclosures" :key="idx" class="warning-item">
          <text class="warning-icon">⚠</text>
          <text class="warning-text">{{ warning }}</text>
        </view>
      </view>

      <!-- 2. 年化趋势 -->
      <view class="card">
        <view class="section-title">年化趋势</view>
        <view class="period-tabs">
          <view
            v-for="p in PERIODS"
            :key="p.key"
            class="tab"
            :class="{ active: period === p.key }"
            @click="period = p.key"
          >{{ p.label }}</view>
        </view>

        <view class="annual-big">
          <text class="annual-label">{{ getPeriodLabel(period) }}年化收益</text>
          <text class="annual-num" :class="getProfitClass(currentAnnual)">{{ formatPercent(currentAnnual) }}</text>
        </view>

        <view class="chart">
          <view
            v-for="p in PERIODS"
            :key="p.key"
            class="bar-wrap"
            @click="period = p.key"
          >
            <view class="bar-track">
              <view
                class="bar"
                :class="[getProfitClass(periodValue(p.key)), { active: period === p.key }]"
                :style="{ height: barHeight(p.key) }"
              ></view>
            </view>
            <text class="bar-label" :class="{ active: period === p.key }">{{ p.label }}</text>
          </view>
        </view>
        <view class="chart-note">历史业绩不预示未来收益</view>
      </view>

      <!-- 3. 风险指标 -->
      <view class="card">
        <view class="section-title">风险指标</view>
        <view class="metric-grid">
          <view class="metric-cell">
            <text class="metric-label">波动率</text>
            <text class="metric-value">{{ formatPercent(riskMetric?.volatility) }}</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">最大回撤</text>
            <text class="metric-value down">{{ formatPercent(riskMetric?.maxDrawdown) }}</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">Calmar</text>
            <text class="metric-value">{{ formatCalmar(riskMetric?.calmar) }}</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">同类排名</text>
            <text class="metric-value" :class="getRankClass(riskMetric?.peerRankPercentile)">
              前 {{ formatPercent(riskMetric?.peerRankPercentile) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 4. 净值走势图 -->
      <view class="card" v-if="navTrend.bars.length >= 2">
        <view class="section-title">净值走势</view>
        <view class="nav-trend-chart">
          <view class="trend-bars">
            <view
              v-for="(bar, i) in navTrend.bars"
              :key="i"
              class="trend-bar-wrap"
            >
              <view class="trend-bar" :style="{ height: bar.height + '%' }"></view>
            </view>
          </view>
          <view class="trend-info">
            <text class="trend-min">最低: {{ navTrend.min.toFixed(4) }}</text>
            <text class="trend-max">最高: {{ navTrend.max.toFixed(4) }}</text>
          </view>
        </view>
      </view>

      <!-- 5. 年度收益 -->
      <view class="card" v-if="yearlyReturns.length > 0">
        <view class="section-title">年度收益</view>
        <view class="yearly-table">
          <view class="yearly-row yearly-head">
            <text class="year-year">年份</text>
            <text class="year-return">年化收益</text>
            <text class="year-days">基准天数</text>
          </view>
          <view v-for="(yr, i) in yearlyReturns" :key="i" class="yearly-row">
            <text class="year-year">{{ yr.year }}</text>
            <text class="year-return" :class="getProfitClass(yr.annualReturn)">{{ formatPercent(yr.annualReturn) }}</text>
            <text class="year-days">{{ yr.baseDays || '--' }}天</text>
          </view>
        </view>
      </view>

      <!-- 6. 净值表 -->
      <view class="card">
        <view class="section-title toggle" @click="navOpen = !navOpen">
          <text>净值表（最近10条）</text>
          <text class="toggle-arrow">{{ navOpen ? '收起 ▴' : '展开 ▾' }}</text>
        </view>
        <view v-if="navOpen" class="nav-table">
          <view v-if="!navs.length" class="empty-inline">暂无净值数据</view>
          <view v-else>
            <view class="nav-row nav-head">
              <text class="nav-date">日期</text>
              <text class="nav-unit">单位净值</text>
              <text class="nav-acc">累计净值</text>
            </view>
            <view v-for="(n, i) in navs" :key="i" class="nav-row">
              <text class="nav-date">{{ n.navDate || n.date || '--' }}</text>
              <text class="nav-unit">{{ n.unitNav ?? '--' }}</text>
              <text class="nav-acc">{{ n.accumulatedNav ?? n.accumNav ?? '--' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 7. 合规披露 -->
      <DisclosureBlock :productType="product.productType" />
    </template>

    <view v-else class="empty">产品不存在</view>

    <!-- 底部操作栏 -->
    <view v-if="product" class="action-bar">
      <view class="btn-secondary" @click="onConsult">预约咨询</view>
      <view class="btn-primary" @click="onAddToPortfolio">加入组合方案</view>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import RiskTag from '../../components/risk-tag.vue'
import DisclosureBlock from '../../components/disclosure-block.vue'
import ScoreRadar from '@/components/score-radar.vue'
import StarRating from '@/components/star-rating.vue'
import {
  getProductDetail, getProductAnnualSnapshot, getProductRiskMetric,
  getProductNavSeries, getProductYearlyReturn,
  getProductScore, getRiskDisclosure, createConsultation
} from '@/services/api'
import {
  formatPercent, getProfitClass, getRankClass, getTypeLabel,
  getPeriodLabel, PERIODS, formatDate
} from '../../utils/format'
import { getLoginState } from '../../utils/storage'

const product = ref<any>(null)
const snapshot = ref<any>(null)
const riskMetric = ref<any>(null)
const navSeries = ref<any[]>([])
const yearlyReturns = ref<any[]>([])
const loading = ref(true)
const productId = ref<string | number>('')

const period = ref('m1')
const navOpen = ref(false)

// 评分数据
const scoreData = ref<any>(null)
const riskDisclosures = ref<string[]>([])
const selectedPeriod = ref('m1')

const navs = computed<any[]>(() => {
  const p = product.value
  if (!p) return []
  const list = p.navs || p.navRecords || p.navList || p.navSeries || []
  return Array.isArray(list) ? list.slice(0, 10) : []
})

function periodValue(key: string): number | null {
  const s = snapshot.value
  if (!s) return null
  const direct = s[key]
  if (typeof direct === 'number') return direct
  const series = s.series || s.annuals || s.list || s.points
  if (Array.isArray(series)) {
    const item = series.find((it: any) => it.period === key)
    if (item) return item.value ?? item.annualized ?? item.annualizedReturn ?? null
  }
  return null
}

const currentAnnual = computed(() => periodValue(period.value))

const maxAnnualAbs = computed(() => {
  let max = 0
  for (const p of PERIODS) {
    const v = periodValue(p.key)
    if (v !== null && Math.abs(v) > max) max = Math.abs(v)
  }
  return max || 1
})

function barHeight(key: string): string {
  const v = periodValue(key)
  if (v === null) return '0rpx'
  const ratio = Math.min(Math.abs(v) / maxAnnualAbs.value, 1)
  return Math.max(ratio * 160, 6) + 'rpx'
}

function formatCalmar(val: number | null | undefined): string {
  if (val === null || val === undefined) return '--'
  return Number(val).toFixed(2)
}

// 净值走势图数据（取最近20条，倒序变正序）
const navTrend = computed(() => {
  const data = navSeries.value.slice(0, 20).reverse()
  if (data.length < 2) return { bars: [], min: 0, max: 0, range: 0 }
  const values = data.map((d: any) => Number(d.unitNav || 0)).filter(v => v > 0)
  if (values.length < 2) return { bars: [], min: 0, max: 0, range: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.0001
  const bars = data.map((d: any) => {
    const v = Number(d.unitNav || 0)
    const height = v > 0 ? Math.max(((v - min) / range) * 100, 4) : 0
    return { date: formatDate(d.navDate || d.date), value: v, height }
  })
  return { bars, min, max, range }
})

// 评分周期标签
const periodLabel = computed(() => getPeriodLabel(selectedPeriod.value))

// 加载评分数据
async function loadScore() {
  try {
    const res = await getProductScore(productId.value as number, { period: selectedPeriod.value })
    scoreData.value = res
  } catch (error) {
    console.error('评分加载失败', error)
    scoreData.value = null
  }
}

// 加载动态风险揭示
async function loadRiskDisclosure() {
  try {
    const res = await getRiskDisclosure(productId.value as number, { period: selectedPeriod.value })
    riskDisclosures.value = res?.warnings || []
  } catch (error) {
    console.error('风险揭示加载失败', error)
    riskDisclosures.value = []
  }
}

// 加入组合方案
function onAddToPortfolio() {
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  // 跳转到组合方案列表页，带上当前产品ID
  uni.switchTab({ url: '/pages/portfolio/list' })
}

// 预约咨询
function onConsult() {
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showModal({
    title: '预约咨询',
    content: `确定预约咨询 ${product.value?.productName} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await createConsultation({
            productId: product.value?.id || product.value?.documentId,
            channel: 'online',
          })
          uni.showToast({ title: '预约请求已提交', icon: 'success' })
        } catch (e: any) {
          uni.showToast({ title: e.message || '预约失败', icon: 'none' })
        }
      }
    },
  })
}

async function loadAll(id: string) {
  loading.value = true
  productId.value = id
  try {
    const [p, snap, rm, navList, yrList] = await Promise.all([
      getProductDetail(id),
      getProductAnnualSnapshot(id).catch(() => null),
      getProductRiskMetric(id).catch(() => null),
      getProductNavSeries(id, { pageSize: 30 }).catch(() => []),
      getProductYearlyReturn(id).catch(() => [])
    ])
    product.value = p
    snapshot.value = snap
    riskMetric.value = rm
    navSeries.value = navList?.list || navList || []
    yearlyReturns.value = yrList?.list || yrList || []
    // 并行加载评分和风险揭示
    loadScore()
    loadRiskDisclosure()
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages() as any[]
  const page = pages[pages.length - 1]
  const id = page?.$page?.options?.id || page?.options?.id
  if (id) {
    loadAll(String(id))
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.loading { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }
.empty { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }

.card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx;
}
.section-title.toggle {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0;
}
.toggle-arrow { font-size: 24rpx; color: #667eea; font-weight: normal; }

.product-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16rpx;
}
.product-name { font-size: 32rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; line-height: 1.4; }

.info-grid { display: flex; gap: 20rpx; }
.info-cell { flex: 1; }
.info-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 6rpx; }
.info-value { font-size: 26rpx; color: #333; }

/* 周期 tabs */
.period-tabs {
  display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx;
}
.tab {
  background: #f5f5f5; color: #666; font-size: 24rpx;
  padding: 10rpx 22rpx; border-radius: 24rpx;
}
.tab.active { background: #667eea; color: #fff; }

/* 年化大数 */
.annual-big {
  display: flex; flex-direction: column; align-items: center;
  padding: 20rpx 0;
}
.annual-label { font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
.annual-num { font-size: 64rpx; font-weight: bold; color: #999; }
.annual-num.up { color: #f5222d; }
.annual-num.down { color: #07c160; }
.annual-num.flat { color: #999; }

/* 柱状图 */
.chart {
  display: flex; align-items: flex-end; gap: 6rpx;
  height: 220rpx; padding: 20rpx 0 10rpx;
}
.bar-wrap {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: flex-end; height: 100%;
}
.bar-track {
  flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center;
}
.bar {
  width: 60%; min-height: 6rpx; border-radius: 6rpx 6rpx 0 0;
  background: #ccc; opacity: 0.5;
}
.bar.up { background: #f5222d; }
.bar.down { background: #07c160; }
.bar.flat { background: #ccc; }
.bar.active { opacity: 1; width: 80%; }
.bar-label { font-size: 18rpx; color: #999; margin-top: 8rpx; }
.bar-label.active { color: #667eea; font-weight: bold; }

.chart-note { text-align: center; font-size: 20rpx; color: #fa8c16; margin-top: 12rpx; }

/* 风险指标 2x2 */
.metric-grid {
  display: flex; flex-wrap: wrap; gap: 20rpx;
}
.metric-cell {
  width: calc(50% - 10rpx); background: #f9f9fb; border-radius: 8rpx; padding: 20rpx;
  box-sizing: border-box;
}
.metric-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 8rpx; }
.metric-value { font-size: 32rpx; font-weight: bold; color: #333; }
.metric-value.up { color: #f5222d; }
.metric-value.down { color: #07c160; }
.metric-value.flat { color: #999; }

/* 净值表 */
.nav-table { margin-top: 16rpx; }
.empty-inline { text-align: center; color: #999; font-size: 24rpx; padding: 30rpx 0; }
.nav-row {
  display: flex; justify-content: space-between;
  padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; font-size: 24rpx;
}
.nav-row.nav-head { color: #999; font-weight: bold; }
.nav-date { flex: 1; color: #666; }
.nav-unit { flex: 1; text-align: center; color: #333; }
.nav-acc { flex: 1; text-align: right; color: #333; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }

/* 净值走势图 */
.nav-trend-chart { padding: 10rpx 0; }
.trend-bars {
  display: flex; align-items: flex-end; gap: 4rpx;
  height: 180rpx; padding: 0 4rpx;
}
.trend-bar-wrap {
  flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center;
}
.trend-bar {
  width: 70%; min-height: 4rpx; border-radius: 4rpx 4rpx 0 0;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  opacity: 0.7; transition: opacity 0.2s;
}
.trend-bar-wrap:last-child .trend-bar { opacity: 1; }
.trend-info {
  display: flex; justify-content: space-between;
  padding: 16rpx 8rpx 0; font-size: 22rpx; color: #999;
}
.trend-min { color: #07c160; }
.trend-max { color: #f5222d; }

/* 年度收益表 */
.yearly-table { margin-top: 8rpx; }
.yearly-row {
  display: flex; justify-content: space-between;
  padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; font-size: 26rpx;
}
.yearly-row.yearly-head { color: #999; font-weight: bold; }
.year-year { flex: 1; color: #666; }
.year-return { flex: 1; text-align: center; color: #333; font-weight: bold; }
.year-return.up { color: #f5222d; }
.year-return.down { color: #07c160; }
.year-return.flat { color: #999; }
.year-days { flex: 1; text-align: right; color: #999; font-size: 24rpx; }

/* 评分区域 */
.score-section { padding: 24rpx; }
.score-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12rpx;
}
.score-header .section-title { margin-bottom: 0; }
.score-disclaimer {
  display: block; text-align: center; font-size: 20rpx; color: #999;
  margin-top: 12rpx;
}

/* 动态风险揭示 */
.risk-disclosure-section { border-left: 6rpx solid #fa8c16; }
.warning-item {
  display: flex; align-items: flex-start; gap: 10rpx;
  padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5;
}
.warning-item:last-child { border-bottom: none; }
.warning-icon { font-size: 26rpx; color: #fa8c16; flex-shrink: 0; }
.warning-text { font-size: 24rpx; color: #666; line-height: 1.5; flex: 1; }

/* 底部操作栏 */
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 20rpx;
  padding: 16rpx 30rpx; background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
  z-index: 100;
}
.btn-secondary {
  flex: 1; text-align: center; font-size: 28rpx; font-weight: bold;
  padding: 24rpx 0; border-radius: 44rpx;
  background: #f0f4ff; color: #667eea;
}
.btn-primary {
  flex: 1.5; text-align: center; font-size: 30rpx; font-weight: bold;
  padding: 24rpx 0; border-radius: 44rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
.btn-secondary:active, .btn-primary:active { opacity: 0.85; }

/* 给底部操作栏留空间 */
.page-container { padding-bottom: 120rpx; }
</style>
