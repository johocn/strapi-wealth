<template>
  <view v-if="goods.length" class="promo-card promo-goods">
    <text v-if="title" class="section-title">{{ title }}</text>
    <view v-for="(g, index) in goods" :key="index" class="goods-item">
      <image
        v-if="g.image"
        :src="resolveMediaUrl(g.image)"
        mode="aspectFill"
        class="goods-image"
        lazy-load
      />
      <view class="goods-body">
        <text class="goods-name">{{ g.name }}</text>
        <text v-if="g.desc" class="goods-desc">{{ g.desc }}</text>
        <view class="goods-price">
          <text v-if="price(g).promo" class="goods-price-promo">{{ price(g).promo }}</text>
          <text v-if="price(g).origin" class="goods-price-origin">{{ price(g).origin }}</text>
          <text v-if="g.unit" class="goods-unit">/{{ g.unit }}</text>
        </view>
        <text v-if="g.limitPerPerson" class="goods-limit">每人限购 {{ g.limitPerPerson }} 件</text>
      </view>
    </view>
    <text class="goods-notice">{{ notice }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeGoodsList, goodsPriceText } from '../../utils/promo-goods'
import { resolveMediaUrl } from '../../utils/env'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || '')
const notice = computed(() => props.config?.notice || '价格以到店为准')
const goods = computed(() => normalizeGoodsList(props.activity?.goodsList))
const price = (g: any) => goodsPriceText(g)
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 20rpx;
}

.goods-item {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
  border-bottom: 2rpx solid var(--c-text-dim);

  &:last-of-type {
    border-bottom: none;
  }
}

.goods-image {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  margin-right: 20rpx;
  border-radius: 12rpx;
  background: var(--c-bg);
}

.goods-body {
  flex: 1;
}

.goods-name {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: var(--c-text);
  line-height: 1.4;
}

.goods-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--c-text-dim);
  line-height: 1.5;
}

.goods-price {
  display: flex;
  align-items: baseline;
  margin-top: 12rpx;
}

.goods-price-promo {
  font-size: 34rpx;
  font-weight: bold;
  color: var(--c-primary);
}

.goods-price-origin {
  margin-left: 14rpx;
  font-size: 24rpx;
  color: var(--c-text-dim);
  text-decoration: line-through;
}

.goods-unit {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: var(--c-text-dim);
}

.goods-limit {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--c-accent);
}

.goods-notice {
  display: block;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: var(--c-text-dim);
  text-align: center;
}
</style>