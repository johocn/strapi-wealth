<template>
  <view class="page-container">
    <!-- 推荐专区 -->
    <view v-if="recommendList.length" class="recommend-section">
      <view class="recommend-header">
        <text class="recommend-title">为您推荐</text>
        <text class="recommend-sub">基于您的风险偏好</text>
      </view>
      <scroll-view scroll-x class="recommend-scroll" show-scrollbar="false">
        <view class="recommend-list">
          <view
            v-for="item in recommendList"
            :key="item.id || item.documentId"
            class="recommend-card"
            @click="goDetail(item)"
          >
            <text class="rec-name">{{ item.productName || item.product?.productName }}</text>
            <text class="rec-return" :class="getProfitClass(item.annual1m)">{{ formatPercent(item.annual1m) }}</text>
            <text class="rec-period">近1月年化</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 评分榜单 -->
    <view v-if="scoreLeaderboard.length > 0" class="leaderboard-section">
      <text class="section-title">综合评分榜单</text>
      <scroll-view scroll-x class="leaderboard-scroll" show-scrollbar="false">
        <view class="leaderboard-list">
          <view
            v-for="(item, index) in scoreLeaderboard"
            :key="item.id || item.documentId || index"
            class="leaderboard-card"
            @click="goDetail(item)"
          >
            <view class="rank-badge" :class="'rank-' + (index + 1)">{{ index + 1 }}</view>
            <text class="lb-product-name">{{ item.productName || item.product?.productName }}</text>
            <StarRating :rating="item.score?.starRating || 0" :score="item.score?.compositeScore" show-score />
            <text class="lb-annual" :class="getProfitClass(item.latestAnnual1m ?? item.annual1m)">
              {{ formatPercent(item.latestAnnual1m ?? item.annual1m) }}
            </text>
            <text class="lb-period">近1月年化</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 搜索 -->
    <view class="search-bar">
      <input class="search-input" v-model="keyword" placeholder="搜索产品名称" confirm-type="search" @confirm="onSearch" />
      <text class="search-btn" @click="onSearch">搜索</text>
    </view>

    <!-- 筛选 -->
    <view class="filter-row">
      <picker :range="typeLabels" :value="typeIndex" @change="onTypeChange">
        <view class="filter-item">{{ typeLabels[typeIndex] }}<text class="arrow">▾</text></view>
      </picker>
      <picker :range="riskLabels" :value="riskIndex" @change="onRiskChange">
        <view class="filter-item">{{ riskLabels[riskIndex] }}<text class="arrow">▾</text></view>
      </picker>
      <picker :range="sortLabels" :value="sortIndex" @change="onSortChange">
        <view class="filter-item">排序：{{ sortLabels[sortIndex] }}<text class="arrow">▾</text></view>
      </picker>
    </view>

    <!-- 运作模式筛选 -->
    <view class="mode-filter-row">
      <text class="mode-filter-label">运作模式</text>
      <view class="mode-options">
        <text :class="['mode-option', { active: !filterOperationMode }]" @click="setOperationMode('')">全部</text>
        <text :class="['mode-option', { active: filterOperationMode === 'daily-open' }]" @click="setOperationMode('daily-open')">日开</text>
        <text :class="['mode-option', { active: filterOperationMode === 'fixed-term' }]" @click="setOperationMode('fixed-term')">定开</text>
        <text :class="['mode-option', { active: filterOperationMode === 'closed' }]" @click="setOperationMode('closed')">封闭</text>
      </view>
    </view>

    <!-- 列表 -->
    <view v-if="list.length" class="list">
      <AnnualCard
        v-for="item in list"
        :key="item.id || item.documentId"
        :product="item"
        period="m1"
        @click="goDetail"
      />
    </view>
    <view v-else-if="!loading" class="empty">暂无产品</view>

    <!-- 分页 -->
    <view v-if="list.length" class="pagination">
      <text class="page-btn" :class="{ disabled: page <= 1 }" @click="prevPage">上一页</text>
      <text class="page-info">第 {{ page }} 页</text>
      <text class="page-btn" :class="{ disabled: !hasNext }" @click="nextPage">下一页</text>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AnnualCard from '../../components/annual-card.vue'
import StarRating from '@/components/star-rating.vue'
import { getProductList, getRecommendations, getScoreLeaderboard } from '@/services/api'
import { formatPercent, getProfitClass, OPERATION_MODE_LABELS } from '@/utils/format'
import { getLoginState } from '../../utils/storage'

const TYPES = ['', 'bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund']
const typeLabels = ['全部类型', '银行理财', '股票基金', '债券基金', '混合基金', '货币基金']
const RISKS = ['', 'R1', 'R2', 'R3', 'R4', 'R5']
const riskLabels = ['全部风险', 'R1', 'R2', 'R3', 'R4', 'R5']
const SORT_OPTIONS = [
  { key: 'score', label: '综合评分' },
  { key: 'annual1m', label: '近1月年化' },
  { key: 'volatility', label: '波动率' },
]
const sortLabels = SORT_OPTIONS.map(o => o.label)

const keyword = ref('')
const typeIndex = ref(0)
const riskIndex = ref(0)
const sortIndex = ref(0)
const filterOperationMode = ref('')
const page = ref(1)
const pageSize = 10
const list = ref<any[]>([])
const loading = ref(false)
const hasNext = ref(false)
const recommendList = ref<any[]>([])
const scoreLeaderboard = ref<any[]>([])

// 加载推荐产品（登录后展示）
async function loadRecommend() {
  try {
    const loginState = getLoginState()
    if (!loginState.isLoggedIn) return
    const res = await getRecommendations(6)
    recommendList.value = res.list || res || []
  } catch {
    // 推荐加载失败静默处理，不影响主列表
  }
}

async function load() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (keyword.value) params.productName = keyword.value
    const t = TYPES[typeIndex.value]
    if (t) params.productType = t
    const r = RISKS[riskIndex.value]
    if (r) params.riskLevel = r
    if (filterOperationMode.value) params.operationMode = filterOperationMode.value
    params.sortBy = SORT_OPTIONS[sortIndex.value].key
    const res = await getProductList(params)
    list.value = res.list || []
    const total = res.pagination?.total ?? list.value.length
    hasNext.value = page.value * pageSize < total
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 加载评分榜单（Top 5）
async function loadLeaderboard() {
  try {
    const res = await getScoreLeaderboard({
      period: 'm1',
      productType: TYPES[typeIndex.value] || undefined,
      operationMode: filterOperationMode.value || undefined,
      riskLevel: RISKS[riskIndex.value] || undefined,
      page: 1,
      pageSize: 5,
    })
    scoreLeaderboard.value = res.records || res.list || res || []
  } catch (error) {
    console.error('榜单加载失败', error)
    scoreLeaderboard.value = []
  }
}

function onSearch() {
  page.value = 1
  load()
}
function onTypeChange(e: any) {
  typeIndex.value = +e.detail.value
  page.value = 1
  load()
  loadLeaderboard()
}
function onRiskChange(e: any) {
  riskIndex.value = +e.detail.value
  page.value = 1
  load()
  loadLeaderboard()
}
function onSortChange(e: any) {
  sortIndex.value = +e.detail.value
  page.value = 1
  load()
}
function setOperationMode(mode: string) {
  filterOperationMode.value = mode
  page.value = 1
  load()
  loadLeaderboard()
}
function prevPage() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function nextPage() {
  if (hasNext.value) {
    page.value++
    load()
  }
}

function goDetail(item: any) {
  const id = item.id || item.documentId
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

onMounted(() => {
  loadRecommend()
  loadLeaderboard()
  load()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

/* 推荐专区 */
.recommend-section {
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
}
.recommend-header {
  display: flex; align-items: baseline; gap: 12rpx; margin-bottom: 16rpx;
}
.recommend-title { font-size: 30rpx; font-weight: bold; color: #333; }
.recommend-sub { font-size: 22rpx; color: #999; }
.recommend-scroll { width: 100%; }
.recommend-list {
  display: flex; gap: 16rpx; padding-bottom: 8rpx;
}
.recommend-card {
  flex-shrink: 0; width: 200rpx; background: linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 100%);
  border-radius: 10rpx; padding: 20rpx 16rpx; display: flex; flex-direction: column; align-items: center;
}
.rec-name {
  font-size: 24rpx; color: #333; font-weight: bold; text-align: center;
  line-height: 1.3; height: 64rpx; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.rec-return { font-size: 36rpx; font-weight: bold; margin: 8rpx 0 4rpx; color: #333; }
.rec-return.up { color: #f5222d; }
.rec-return.down { color: #07c160; }
.rec-return.flat { color: #999; }
.rec-period { font-size: 20rpx; color: #999; }

/* 搜索 */
.search-bar {
  display: flex; align-items: center;
  background: #fff; border-radius: 12rpx;
  padding: 16rpx 20rpx; margin-bottom: 20rpx;
}
.search-input { flex: 1; font-size: 26rpx; height: 56rpx; color: #333; }
.search-btn { color: #667eea; font-size: 28rpx; padding-left: 20rpx; }

.filter-row { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.filter-item {
  flex: 1; background: #fff; border-radius: 12rpx;
  padding: 16rpx 20rpx; font-size: 26rpx; color: #333;
  display: flex; align-items: center; justify-content: center;
}
.filter-item .arrow { margin-left: 8rpx; color: #999; font-size: 22rpx; }

.list { display: flex; flex-direction: column; gap: 20rpx; }
.empty { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }

.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 30rpx; padding: 20rpx 0;
}
.page-btn {
  font-size: 26rpx; color: #667eea;
  padding: 10rpx 24rpx; border: 1rpx solid #667eea; border-radius: 8rpx;
}
.page-btn.disabled { color: #ccc; border-color: #ddd; }
.page-info { font-size: 26rpx; color: #666; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }

/* 评分榜单 */
.leaderboard-section {
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 20rpx;
}
.leaderboard-section .section-title {
  font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; display: block;
}
.leaderboard-scroll { width: 100%; }
.leaderboard-list {
  display: flex; gap: 16rpx; padding-bottom: 8rpx;
}
.leaderboard-card {
  flex-shrink: 0; width: 220rpx; background: linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%);
  border-radius: 10rpx; padding: 20rpx 16rpx; display: flex; flex-direction: column; align-items: center;
  position: relative;
}
.rank-badge {
  position: absolute; top: 8rpx; left: 8rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: #ccc; color: #fff; font-size: 22rpx; font-weight: bold;
  display: flex; align-items: center; justify-content: center;
}
.rank-badge.rank-1 { background: #f5222d; }
.rank-badge.rank-2 { background: #fa8c16; }
.rank-badge.rank-3 { background: #fadb14; }
.lb-product-name {
  font-size: 24rpx; color: #333; font-weight: bold; text-align: center;
  line-height: 1.3; height: 64rpx; margin-top: 20rpx; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.lb-annual { font-size: 32rpx; font-weight: bold; margin: 8rpx 0 2rpx; color: #333; }
.lb-annual.up { color: #f5222d; }
.lb-annual.down { color: #07c160; }
.lb-annual.flat { color: #999; }
.lb-period { font-size: 20rpx; color: #999; }

/* 运作模式筛选 */
.mode-filter-row {
  display: flex; align-items: center; gap: 16rpx;
  background: #fff; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx;
}
.mode-filter-label { font-size: 24rpx; color: #666; flex-shrink: 0; }
.mode-options { display: flex; gap: 12rpx; flex: 1; flex-wrap: wrap; }
.mode-option {
  font-size: 24rpx; color: #666; background: #f5f5f5;
  padding: 8rpx 20rpx; border-radius: 20rpx;
}
.mode-option.active { background: #667eea; color: #fff; }
</style>
