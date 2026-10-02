<template>
  <!-- Vendure 分支：预售 / 开卖区读渠道在售或候选商品 -->
  <view v-if="isVendure" class="promo-card promo-goods">
    <text v-if="title" class="section-title">{{ title }}</text>
    <view v-if="vLoading" class="goods-state"><text>加载中...</text></view>
    <view v-else-if="vErrMsg" class="goods-state goods-state--retry" @click="loadVendure">
      <text>{{ vErrMsg }}</text>
    </view>
    <view v-else-if="!vendureGoods.length" class="goods-state"><text>暂无商品</text></view>
    <view v-else>
      <view v-for="g in vendureGoods" :key="g.id" class="goods-item">
        <image :src="vImage(g)" mode="aspectFill" class="goods-image" lazy-load />
        <view class="goods-body">
          <text class="goods-name">{{ g.name }}</text>
          <text class="goods-price-promo">{{ vPrice(g) }}</text>
          <view v-if="g.variants?.length" class="goods-variants">
            <text v-for="v in g.variants" :key="v.id" class="goods-variant">{{ v.name }}</text>
          </view>
          <text v-if="g.linkAvailable" class="goods-link" @click="openLink(g)">查看详情 ›</text>
        </view>
      </view>
    </view>
    <view class="goods-verify">
      <text class="goods-verify-title">到店核销</text>
      <text class="goods-verify-desc">报名成功后到店出示报名签到码，由店员扫码核销并享受促销价。</text>
    </view>
    <text class="goods-notice">{{ notice }}</text>
  </view>

  <!-- 手填分支（无 source 字段时维持既有行为，已上线活动不空白） -->
  <view v-else-if="goods.length" class="promo-card promo-goods">
    <text v-if="title" class="section-title">{{ title }}</text>
    <view v-for="(g, index) in goods" :key="index" class="goods-item">
      <image
        v-if="g.image"
        :src="resolveMediaUrl(g.image)"
        mode="aspectFill"
        class="goods-image"
        lazy-load
      />
      <image v-else :src="PROMO_DEFAULT_GOODS_IMAGE" mode="aspectFill" class="goods-image" lazy-load />
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
    <view class="goods-verify">
      <text class="goods-verify-title">到店核销</text>
      <text class="goods-verify-desc">报名成功后到店出示报名签到码，由店员扫码核销并享受促销价。</text>
    </view>
    <text class="goods-notice">{{ notice }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { normalizeGoodsList, goodsPriceText, PROMO_DEFAULT_GOODS_IMAGE } from '../../utils/promo-goods'
import { resolveMediaUrl, VENDURE_ASSET_URL, toShopUrl } from '../../utils/env'
import { fetchVendureCandidates } from '../../services/api'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const title = computed(() => props.config?.title || '')
const notice = computed(() => props.config?.notice || '价格以到店为准')
const goods = computed(() => normalizeGoodsList(props.activity?.goodsList))
const price = (g: any) => goodsPriceText(g)

// ===== Vendure 分支 =====
const isVendure = computed(() => props.config?.source === 'vendure')
const vendureGoods = ref<any[]>([])
const vLoading = ref(false)
// 失败文案：400 = 渠道/参数配置有误（服务端已明确回传原因），对用户统一为「暂不可用」，
// 原始原因打 console 便于运营排查；其余（网络/5xx）提示可重试
const vErrMsg = ref('')

const vImage = (g: any) => (g?.image ? `${VENDURE_ASSET_URL}/${g.image}` : PROMO_DEFAULT_GOODS_IMAGE)
const vPrice = (g: any) => (g?.priceConfigured === false ? '到店询价' : (g?.priceFromText || '到店询价'))

function openLink(g: any) {
  if (!g?.linkAvailable || !g?.link) return
  const url = toShopUrl(g.link)
  // #ifdef H5
  window.location.href = url
  return
  // #endif
  // #ifndef H5
  uni.navigateTo({ url })
  // #endif
}

async function loadVendure() {
  const cfg = props.config || {}
  // 运营端已选定商品：只按 config.productIds 顺序展示（优先级高于 collection/onsale）
  const ids: string[] = Array.isArray(cfg.productIds) ? cfg.productIds.map((i: any) => String(i)).filter(Boolean) : []
  vLoading.value = true
  vErrMsg.value = ''
  try {
    const res = await fetchVendureCandidates({
      token: cfg.channelToken,
      productIds: ids.length ? ids : undefined,
      collection: ids.length ? undefined : cfg.collectionSlug || undefined,
      onsale: ids.length || cfg.collectionSlug ? undefined : true,
      take: Number(cfg.limit) || 8,
    })
    const list = Array.isArray(res?.products) ? res.products : []
    vendureGoods.value = ids.length ? reorderByIds(list, ids) : list
  } catch (e: any) {
    // 400：渠道 token / 参数配置有误（服务端回传确切原因），不向用户暴露技术细节
    const badConfig = e?.statusCode === 400
    if (badConfig) console.warn('[promo-goods] Vendure 候选商品配置有误：', e?.message)
    vErrMsg.value = badConfig ? '商品暂时无法展示，请联系客服' : '加载失败，点击重试'
    vendureGoods.value = []
  } finally {
    vLoading.value = false
  }
}

/** 兜底重排：服务端已按 productIds 定序返回，此处防旧版服务端/缓存导致顺序错乱 */
function reorderByIds(list: any[], ids: string[]) {
  const map = new Map(list.map((g: any) => [String(g.id), g]))
  const ordered = ids.map(id => map.get(id)).filter(Boolean)
  if (!ordered.length) return list
  const picked = new Set(ids)
  return [...ordered, ...list.filter((g: any) => !picked.has(String(g.id)))]
}

onMounted(() => {
  if (isVendure.value) loadVendure()
})
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

.goods-state {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--c-text-dim);
}

.goods-state--retry {
  text-decoration: underline;
}

.goods-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 10rpx;
}

.goods-variant {
  padding: 6rpx 20rpx;
  font-size: 22rpx;
  color: var(--c-text-dim);
  border: 2rpx solid var(--c-text-dim);
  border-radius: 24rpx;
}

.goods-link {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--c-primary);
}

.goods-verify {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: var(--c-bg);
}

.goods-verify-title {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: var(--c-primary);
  margin-bottom: 6rpx;
}

.goods-verify-desc {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-dim);
  line-height: 1.6;
}

.goods-notice {
  display: block;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: var(--c-text-dim);
  text-align: center;
}
</style>