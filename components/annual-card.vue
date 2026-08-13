<template>
  <view class="annual-card" @click="handleClick">
    <view class="card-header">
      <text class="product-name">{{ product.productName }}</text>
      <RiskTag :level="product.riskLevel" />
    </view>

    <view class="card-tags">
      <text class="tag type">{{ getTypeLabel(product.productType) }}</text>
      <text class="tag company" v-if="product.company?.name">{{ product.company.name }}</text>
      <text class="tag rank" v-if="product.peerRankPercentile !== undefined && product.peerRankPercentile !== null">
        同类前 {{ formatPercent(product.peerRankPercentile) }}
      </text>
    </view>

    <view v-if="product.score" class="card-score">
      <StarRating :rating="product.score.starRating" :score="product.score.compositeScore" show-score />
    </view>

    <view class="card-annual">
      <view class="annual-main">
        <text class="annual-label">
          近1月年化
          <text v-if="isShort" class="estimate-tag">估算</text>
        </text>
        <text class="annual-value" :class="getProfitClass(product.latestAnnual1m)">
          {{ formatPercent(product.latestAnnual1m) }}
        </text>
      </view>
      <view class="annual-sub" v-if="product.latestNav?.unitNav">
        <text class="nav-label">单位净值</text>
        <text class="nav-value">{{ product.latestNav.unitNav }}</text>
        <text class="nav-date" v-if="product.latestNav.navDate">{{ product.latestNav.navDate }}</text>
      </view>
    </view>

    <view v-if="product.recommended" class="recommend-badge">推荐</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RiskTag from './risk-tag.vue'
import StarRating from '@/components/star-rating.vue'
import { formatPercent, getTypeLabel, getProfitClass } from '../utils/format'

const props = defineProps<{
  product: any
  period?: string
}>()

const emit = defineEmits<{
  (e: 'click', product: any): void
}>()

const isShort = computed(() => {
  const p = props.period || 'm1'
  return p === 'd1' || p === 'd3'
})

function handleClick() {
  emit('click', props.product)
}
</script>

<style scoped>
.annual-card {
  background: #fff; border-radius: 12rpx; padding: 24rpx;
  position: relative;
}
.card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 12rpx;
}
.product-name {
  font-size: 28rpx; font-weight: bold; color: #333;
  flex: 1; margin-right: 12rpx; line-height: 1.4;
}
.card-tags { display: flex; gap: 8rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.tag { font-size: 20rpx; padding: 4rpx 10rpx; border-radius: 4rpx; }
.tag.type { background: #f0f4ff; color: #667eea; }
.tag.company { background: #f5f5f5; color: #999; }
.tag.rank { background: #fff7e6; color: #fa8c16; }

.card-score { margin-bottom: 12rpx; }

.card-annual {
  display: flex; justify-content: space-between; align-items: flex-end;
  padding-top: 12rpx; border-top: 1rpx dashed #f0f0f0;
}
.annual-label { font-size: 22rpx; color: #999; display: block; }
.estimate-tag {
  font-size: 16rpx; color: #fa8c16; background: #fff7e6;
  padding: 2rpx 6rpx; border-radius: 4rpx; margin-left: 6rpx;
}
.annual-value { font-size: 48rpx; font-weight: bold; display: block; }
.annual-value.up { color: #f5222d; }
.annual-value.down { color: #07c160; }
.annual-value.flat { color: #999; }
.annual-sub { text-align: right; }
.nav-label { font-size: 22rpx; color: #999; margin-right: 8rpx; }
.nav-value { font-size: 26rpx; color: #333; }
.nav-date { font-size: 20rpx; color: #999; display: block; }

.recommend-badge {
  position: absolute; top: 0; right: 0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; font-size: 18rpx; padding: 4rpx 16rpx;
  border-radius: 0 12rpx 0 12rpx;
}
</style>
