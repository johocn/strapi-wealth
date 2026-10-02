<template>
  <view class="promo-card promo-survey">
    <text v-if="title" class="section-title">{{ title }}</text>
    <text v-if="desc" class="survey-desc">{{ desc }}</text>
    <text v-if="countdownText" class="survey-countdown">{{ countdownText }}</text>

    <!-- 品类 tab（配 1 个 Collection 时不渲染；按商品挑选时无品类） -->
    <scroll-view v-if="!byIdsMode && collections.length > 1" scroll-x class="survey-tabs">
      <text
        v-for="(c, i) in collections"
        :key="c.slug"
        class="survey-tab"
        :class="{ on: i === activeTab }"
        @click="activeTab = i"
      >{{ c.label || c.slug }}</text>
    </scroll-view>

    <!-- 卡片区：加载 / 失败重试 / 空态 / 列表（失败仅影响本模块） -->
    <view v-if="loading" class="survey-state"><text>加载中...</text></view>
    <view v-else-if="loadErrMsg" class="survey-state survey-state--retry" @click="load">
      <text>{{ loadErrMsg }}</text>
    </view>
    <view v-else-if="!currentProducts.length" class="survey-state"><text>本期暂无候选</text></view>
    <view v-else>
      <view
        v-for="p in currentProducts"
        :key="p.id"
        class="survey-item"
        :class="{ on: isSelected(p) }"
        @click="toggleProduct(p)"
      >
        <image
          :src="productImage(p)"
          mode="aspectFill"
          class="survey-image"
          lazy-load
        />
        <view class="survey-body">
          <view class="survey-name-row">
            <text class="survey-name">{{ p.name }}</text>
            <text v-if="p.enabled === false" class="survey-badge">待上架</text>
          </view>
          <text class="survey-price">{{ productPrice(p) }}</text>
          <view v-if="p.variants?.length" class="survey-variants">
            <text
              v-for="v in p.variants"
              :key="v.id"
              class="survey-variant"
              :class="{ on: isVariantSelected(p, v) }"
              @click.stop="toggleVariant(p, v)"
            >{{ v.name }}</text>
          </view>
          <text v-if="p.linkAvailable" class="survey-link" @click.stop="openLink(p)">查看详情 ›</text>
        </view>
        <view class="survey-check" :class="{ on: isSelected(p) }">
          <text v-if="isSelected(p)">✓</text>
        </view>
      </view>
    </view>

    <!-- 自由输入（隐藏需求） -->
    <text class="survey-free-label">{{ freeInputLabel }}</text>
    <textarea
      v-model="freeInput"
      class="survey-free"
      :placeholder="freeInputPlaceholder"
      maxlength="200"
    />

    <!-- 提交栏 -->
    <view class="survey-footer">
      <view class="survey-submit" :class="{ disabled: isExpired || submitting }" @click="onSubmit">
        <text>{{ submitText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchVendureCandidates, getMySurveyVote, submitSurveyVote } from '../../services/api'
import { VENDURE_ASSET_URL, toShopUrl } from '../../utils/env'
import { PROMO_DEFAULT_GOODS_IMAGE } from '../../utils/promo-goods'
import { getToken } from '../../utils/storage'

const props = defineProps<{
  activity?: any
  config?: any
}>()

const emit = defineEmits<{ (e: 'need-login', retry: () => void): void }>()

const title = computed(() => props.config?.title || '帮我们选品')
const desc = computed(() => props.config?.desc || '')
const collections = computed(() => {
  const list = Array.isArray(props.config?.collections) ? props.config.collections : []
  return list.filter((c: any) => c && c.slug)
})
/** 运营按商品挑选的候选池（优先于 collections，非空时隐藏品类 tab） */
const productIds = computed<string[]>(() => {
  const ids = Array.isArray(props.config?.productIds) ? props.config.productIds : []
  return ids.map((i: any) => String(i)).filter(Boolean)
})
const byIdsMode = computed(() => productIds.value.length > 0)

// 文字补充项：标题与提示语均可由后台配置
const freeInputLabel = computed(() => props.config?.freeInputLabel || '文字补充')
const freeInputPlaceholder = computed(() => props.config?.freeInputPlaceholder || '还想买什么？直接告诉我们')

/** 候选商品：按商品挑选时为单列，否则按 Collection 分 tab */
const PICKED_KEY = '__picked__'

/** 各 tab（Collection）的候选商品 */
const productsByTab = ref<Record<string, any[]>>({})
const activeTab = ref(0)
const loading = ref(true)
// 失败文案：400 = 渠道/参数配置有误（服务端已明确回传原因），对用户统一为「暂不可用」；
// 其余（网络/5xx）提示可重试。原始原因打 console 便于运营排查。
const loadErrMsg = ref('')

/** 已勾选：productId -> 投票项 */
const selected = ref<Record<string, { productId: string; productName: string; variantIds: string[]; collectionLabel: string }>>({})
const freeInput = ref('')
const submitting = ref(false)

const currentProducts = computed(() => {
  if (byIdsMode.value) return productsByTab.value[PICKED_KEY] || []
  const c = collections.value[activeTab.value]
  return c ? (productsByTab.value[c.slug] || []) : []
})

const selectedVotes = computed(() => Object.values(selected.value))
const selectedCount = computed(() => selectedVotes.value.length)

// ===== 截止时间 / 倒计时 =====
const now = ref(Date.now())
let timer: any = null
const deadlineMs = computed(() => {
  const t = Date.parse(props.config?.deadline || '')
  return Number.isFinite(t) ? t : 0
})
const isExpired = computed(() => deadlineMs.value > 0 && now.value >= deadlineMs.value)
const countdownText = computed(() => {
  if (!deadlineMs.value || isExpired.value) return ''
  const diff = deadlineMs.value - now.value
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return d > 0 ? `距截止 ${d} 天 ${h} 小时` : `距截止 ${h} 小时 ${m} 分`
})
const submitText = computed(() => (isExpired.value ? '本期已截止' : `已勾选 ${selectedCount.value} 件 · 提交`))

// ===== 数据加载 =====
async function load() {
  if (!byIdsMode.value && !collections.value.length) {
    loading.value = false
    return
  }
  loading.value = true
  loadErrMsg.value = ''
  try {
    if (byIdsMode.value) {
      // 运营已选定商品：只按 productIds 顺序展示（服务端已定序，此处兜底重排）
      const res = await fetchVendureCandidates({
        token: props.config?.channelToken,
        productIds: productIds.value.join(','),
        take: 100,
      })
      const list = Array.isArray(res?.products) ? res.products : []
      productsByTab.value = { [PICKED_KEY]: reorderByIds(list, productIds.value) }
      activeTab.value = 0
    } else {
      const res = await Promise.all(
        collections.value.map((c: any) =>
          fetchVendureCandidates({ token: props.config?.channelToken, collection: c.slug, take: 50 })
        )
      )
      const map: Record<string, any[]> = {}
      collections.value.forEach((c: any, i: number) => {
        map[c.slug] = Array.isArray(res[i]?.products) ? res[i].products : []
      })
      productsByTab.value = map
    }
  } catch (e: any) {
    // 400：渠道 token / 候选配置有误（服务端回传确切原因），不向用户暴露技术细节
    const badConfig = e?.statusCode === 400
    if (badConfig) console.warn('[promo-survey] Vendure 候选商品配置有误：', e?.message)
    loadErrMsg.value = badConfig ? '选品暂时无法展示，请联系客服' : '加载失败，点击重试'
  } finally {
    loading.value = false
  }
}

/** 兜底重排：服务端已按 productIds 定序返回，此处防旧版服务端/缓存导致顺序错乱 */
function reorderByIds(list: any[], ids: string[]) {
  const map = new Map(list.map((p: any) => [String(p.id), p]))
  const ordered = ids.map(id => map.get(id)).filter(Boolean)
  if (!ordered.length) return list
  const picked = new Set(ids)
  return [...ordered, ...list.filter((p: any) => !picked.has(String(p.id)))]
}

/** 回显「我 · 本渠道 · 本周期」已勾选（未登录静默忽略） */
async function loadMyVote() {
  if (!getToken() || !props.config?.roundKey) return
  try {
    applyVote(await getMySurveyVote({ roundKey: props.config.roundKey, source: props.activity?.documentId }))
  } catch (e) {
    /* 静默：视为无历史勾选 */
  }
}

function applyVote(res: any) {
  if (!res) return
  const map: Record<string, any> = {}
  for (const v of Array.isArray(res.votes) ? res.votes : []) {
    if (v?.productId == null) continue
    map[String(v.productId)] = {
      productId: String(v.productId),
      productName: v.productName || '',
      variantIds: Array.isArray(v.variantIds) ? v.variantIds.map(String) : [],
      collectionLabel: v.collectionLabel || '',
    }
  }
  selected.value = map
  if (typeof res.freeInput === 'string') freeInput.value = res.freeInput
}

// ===== 商品卡片 =====
const productImage = (p: any) => (p?.image ? `${VENDURE_ASSET_URL}/${p.image}` : PROMO_DEFAULT_GOODS_IMAGE)
const productPrice = (p: any) => (p?.priceConfigured === false ? '到店询价' : (p?.priceFromText || '到店询价'))

const isSelected = (p: any) => !!selected.value[String(p?.id)]
const isVariantSelected = (p: any, v: any) => {
  const s = selected.value[String(p?.id)]
  return !!s && s.variantIds.includes(String(v?.id))
}

function collectionLabelOf(p: any): string {
  const c = collections.value.find((x: any) => (productsByTab.value[x.slug] || []).some((it: any) => String(it.id) === String(p.id)))
  return c?.label || c?.slug || ''
}

function toggleProduct(p: any) {
  const key = String(p.id)
  if (selected.value[key]) {
    const next = { ...selected.value }
    delete next[key]
    selected.value = next
    return
  }
  selected.value = {
    ...selected.value,
    [key]: { productId: key, productName: p.name || '', variantIds: [], collectionLabel: collectionLabelOf(p) },
  }
}

function toggleVariant(p: any, v: any) {
  const key = String(p.id)
  const cur = selected.value[key]
  if (!cur) {
    selected.value = {
      ...selected.value,
      [key]: { productId: key, productName: p.name || '', variantIds: [String(v.id)], collectionLabel: collectionLabelOf(p) },
    }
    return
  }
  const ids = [...cur.variantIds]
  const i = ids.indexOf(String(v.id))
  if (i >= 0) ids.splice(i, 1)
  else ids.push(String(v.id))
  selected.value = { ...selected.value, [key]: { ...cur, variantIds: ids } }
}

function openLink(p: any) {
  if (!p?.linkAvailable || !p?.link) return
  const url = toShopUrl(p.link)
  // #ifdef H5
  window.location.href = url
  return
  // #endif
  // #ifndef H5
  uni.navigateTo({ url })
  // #endif
}

// ===== 提交 =====
async function doSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    const res = await submitSurveyVote({
      roundKey: props.config?.roundKey,
      source: props.activity?.documentId,
      votes: selectedVotes.value,
      freeInput: freeInput.value.trim(),
    })
    applyVote(res)
    uni.showToast({ title: '已提交', icon: 'success' })
  } catch (e: any) {
    const msg = e?.error || e?.message
    uni.showToast({ title: msg === '本期已截止' ? '本期已截止' : (msg || '提交失败'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function retryAfterLogin() {
  if (getToken()) doSubmit()
}

function onSubmit() {
  if (isExpired.value || submitting.value) return
  if (!selectedCount.value && !freeInput.value.trim()) {
    uni.showToast({ title: '请至少勾选一件商品', icon: 'none' })
    return
  }
  if (!getToken()) {
    emit('need-login', retryAfterLogin)
    return
  }
  doSubmit()
}

onMounted(() => {
  load()
  loadMyVote()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: var(--c-text);
  margin-bottom: 12rpx;
}

.survey-desc {
  display: block;
  font-size: 24rpx;
  color: var(--c-text-dim);
  line-height: 1.6;
}

.survey-countdown {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--c-accent);
}

.survey-tabs {
  display: flex;
  white-space: nowrap;
  margin: 20rpx 0 8rpx;
}

.survey-tab {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: var(--c-text-dim);
  border-radius: 28rpx;
  background: var(--c-bg);
}

.survey-tab.on {
  color: #fff;
  background: var(--c-primary);
}

.survey-state {
  padding: 60rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--c-text-dim);
}

.survey-state--retry {
  text-decoration: underline;
}

.survey-item {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 0;
  border-bottom: 2rpx solid var(--c-text-dim);
}

.survey-image {
  flex-shrink: 0;
  width: 150rpx;
  height: 150rpx;
  margin-right: 20rpx;
  border-radius: 12rpx;
  background: var(--c-bg);
}

.survey-body {
  flex: 1;
  min-width: 0;
}

.survey-name-row {
  display: flex;
  align-items: center;
}

.survey-name {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--c-text);
  line-height: 1.4;
}

.survey-badge {
  flex-shrink: 0;
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: var(--c-accent);
  border: 2rpx solid var(--c-accent);
  border-radius: 8rpx;
}

.survey-price {
  display: block;
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: var(--c-primary);
}

.survey-variants {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.survey-variant {
  padding: 6rpx 20rpx;
  font-size: 22rpx;
  color: var(--c-text-dim);
  border: 2rpx solid var(--c-text-dim);
  border-radius: 24rpx;
}

.survey-variant.on {
  color: #fff;
  border-color: var(--c-primary);
  background: var(--c-primary);
}

.survey-link {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--c-primary);
}

.survey-check {
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  margin-left: 16rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-text-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #fff;
}

.survey-check.on {
  border-color: var(--c-primary);
  background: var(--c-primary);
}

.survey-free-label {
  display: block;
  margin-top: 24rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: var(--c-text);
}

.survey-free {
  box-sizing: border-box;
  width: 100%;
  min-height: 140rpx;
  margin-top: 12rpx;
  padding: 18rpx 20rpx;
  font-size: 26rpx;
  color: var(--c-text);
  border: 2rpx solid var(--c-text-dim);
  border-radius: 12rpx;
  background: var(--c-bg);
}

.survey-footer {
  margin-top: 24rpx;
}

.survey-submit {
  padding: 24rpx 0;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  text-align: center;
  color: #fff;
  background: var(--c-primary);
}

.survey-submit.disabled {
  opacity: 0.5;
}
</style>