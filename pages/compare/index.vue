<template>
  <view class="page-container">
    <!-- 选品区 -->
    <view class="card">
      <view class="section-title">选择产品（2-3 个）</view>
      <view class="selected-row">
        <view v-if="!selected.length" class="selected-empty">点击下方按钮添加产品</view>
        <view v-else class="chips">
          <view v-for="p in selected" :key="p.id || p.documentId" class="chip">
            <text class="chip-name">{{ p.productName }}</text>
            <text class="chip-x" @click="removeSelected(p)">×</text>
          </view>
        </view>
        <text class="add-btn" @click="openPicker">+ 添加</text>
      </view>
    </view>

    <!-- 周期 -->
    <view class="card">
      <view class="section-title">对比周期</view>
      <view class="period-tabs">
        <view
          v-for="p in COMPARE_PERIODS"
          :key="p.key"
          class="tab"
          :class="{ active: period === p.key }"
          @click="period = p.key"
        >{{ p.label }}</view>
      </view>
      <view class="compare-btn" :class="{ disabled: selected.length < 2 }" @click="doCompare">
        开始对比
      </view>
    </view>

    <!-- 对比结果 -->
    <view v-if="compared.length" class="card">
      <view class="section-title">对比结果</view>
      <view class="cmp-table">
        <!-- 表头 -->
        <view class="cmp-row head">
          <view class="cmp-cell label">指标</view>
          <view v-for="p in compared" :key="p.id || p.documentId" class="cmp-cell product">
            {{ p.productName }}
          </view>
        </view>
        <!-- 数据行 -->
        <view v-for="row in rows" :key="row.key" class="cmp-row">
          <view class="cmp-cell label">{{ row.label }}</view>
          <view
            v-for="(p, idx) in compared"
            :key="idx"
            class="cmp-cell value"
            :class="cellClass(row, idx)"
          >
            <text v-if="marker(row, idx)" class="marker">{{ marker(row, idx) }}</text>
            {{ cellText(row, p) }}
          </view>
        </view>
      </view>
      <view class="legend">
        <text class="legend-item"><text class="dot best"></text>最优</text>
        <text class="legend-item"><text class="dot worst"></text>最差</text>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">选择产品后点击「开始对比」</view>

    <!-- 选品弹窗 -->
    <view v-if="pickerOpen" class="modal-mask" @click="pickerOpen = false">
      <view class="modal" @click.stop>
        <view class="modal-title">选择产品（已选 {{ pickedIds.length }}）</view>
        <scroll-view scroll-y class="modal-list">
          <view
            v-for="p in pickerList"
            :key="p.id || p.documentId"
            class="pick-item"
            :class="{ checked: isPicked(p), disabled: !isPicked(p) && pickedIds.length >= 3 }"
            @click="togglePick(p)"
          >
            <view class="pick-checkbox" :class="{ checked: isPicked(p) }"></view>
            <view class="pick-info">
              <text class="pick-name">{{ p.productName }}</text>
              <text class="pick-meta">{{ getTypeLabel(p.productType) }} · {{ p.riskLevel || '--' }}</text>
            </view>
          </view>
          <view v-if="!pickerList.length" class="empty">暂无可选产品</view>
        </scroll-view>
        <view class="modal-actions">
          <text class="modal-btn cancel" @click="pickerOpen = false">取消</text>
          <text class="modal-btn confirm" @click="confirmPick">确认</text>
        </view>
      </view>
    </view>

    <view class="footer-disclaimer">理财非存款，产品有风险，投资需谨慎</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getProductList, compareProducts } from '../../services/api'
import { formatPercent, getTypeLabel } from '../../utils/format'

const COMPARE_PERIODS = [
  { key: 'm1', label: '近1月' },
  { key: 'm3', label: '近3月' },
  { key: 'm6', label: '近6月' },
  { key: 'y1', label: '近1年' }
]

const period = ref('m1')
const selected = ref<any[]>([])
const compared = ref<any[]>([])
const loading = ref(false)

// 选品弹窗
const pickerOpen = ref(false)
const pickerList = ref<any[]>([])
const pickedIds = ref<string[]>([])

async function loadPicker() {
  try {
    const res = await getProductList({ page: 1, pageSize: 100 })
    pickerList.value = res.list || []
  } catch (e) {
    pickerList.value = []
  }
}

function openPicker() {
  pickedIds.value = selected.value.map((p: any) => String(p.id || p.documentId))
  if (!pickerList.value.length) loadPicker()
  pickerOpen.value = true
}
function isPicked(p: any): boolean {
  return pickedIds.value.includes(String(p.id || p.documentId))
}
function togglePick(p: any) {
  const id = String(p.id || p.documentId)
  if (isPicked(p)) {
    pickedIds.value = pickedIds.value.filter(x => x !== id)
  } else {
    if (pickedIds.value.length >= 3) return
    pickedIds.value.push(id)
  }
}
function confirmPick() {
  selected.value = pickerList.value.filter((p: any) =>
    pickedIds.value.includes(String(p.id || p.documentId))
  )
  pickerOpen.value = false
  compared.value = []
}
function removeSelected(p: any) {
  selected.value = selected.value.filter((x: any) =>
    String(x.id || x.documentId) !== String(p.id || p.documentId)
  )
  compared.value = []
}

// 对比
async function doCompare() {
  if (selected.value.length < 2) return
  loading.value = true
  try {
    const ids = selected.value.map((p: any) => p.id || p.documentId)
    const res = await compareProducts(ids, period.value)
    const list = res?.products || res?.list || res?.items || []
    compared.value = list
    if (!list.length) {
      uni.showToast({ title: '暂无对比数据', icon: 'none' })
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '对比失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 行定义：direction 高优/低优
type Row = { key: string; label: string; direction?: 'high' | 'low' }
const rows: Row[] = [
  { key: 'productType', label: '产品类型' },
  { key: 'annual1m', label: '近1月年化', direction: 'high' },
  { key: 'annual1y', label: '近1年年化', direction: 'high' },
  { key: 'maxDrawdown', label: '最大回撤', direction: 'low' },
  { key: 'volatility', label: '波动率', direction: 'low' },
  { key: 'calmar', label: 'Calmar', direction: 'high' },
  { key: 'peerRankPercentile', label: '同类排名', direction: 'low' },
  { key: 'latestNav', label: '最新净值' }
]

function fieldValue(row: Row, p: any): number | string | null {
  if (!p) return null
  switch (row.key) {
    case 'productType':
      return getTypeLabel(p.productType)
    case 'annual1m':
      return p.latestAnnual1m ?? p.annual1m ?? p.annualized1m ?? null
    case 'annual1y':
      return p.latestAnnual1y ?? p.annual1y ?? p.annualized1y ?? null
    case 'maxDrawdown':
      return p.maxDrawdown ?? p.max_drawdown ?? null
    case 'volatility':
      return p.volatility ?? null
    case 'calmar':
      return p.calmar ?? null
    case 'peerRankPercentile':
      return p.peerRankPercentile ?? null
    case 'latestNav':
      return p.latestNav?.unitNav ?? p.unitNav ?? null
    default:
      return null
  }
}

function cellText(row: Row, p: any): string {
  const v = fieldValue(row, p)
  if (v === null || v === undefined || v === '') return '--'
  if (typeof v === 'number') {
    if (row.key === 'calmar') return v.toFixed(2)
    if (row.key === 'latestNav') return v.toFixed(4)
    if (row.key === 'peerRankPercentile') return '前 ' + formatPercent(v)
    return formatPercent(v)
  }
  return String(v)
}

function numericValues(row: Row): number[] {
  return compared.value.map((p: any) => {
    const v = fieldValue(row, p)
    return typeof v === 'number' ? v : NaN
  })
}

function bestIdx(row: Row): number {
  if (!row.direction) return -1
  const vals = numericValues(row)
  const valid = vals.map((v, i) => ({ v, i })).filter(o => !isNaN(o.v))
  if (valid.length < 2) return -1
  const target = row.direction === 'high' ? Math.max(...valid.map(o => o.v)) : Math.min(...valid.map(o => o.v))
  return valid.find(o => o.v === target)?.i ?? -1
}
function worstIdx(row: Row): number {
  if (!row.direction) return -1
  const vals = numericValues(row)
  const valid = vals.map((v, i) => ({ v, i })).filter(o => !isNaN(o.v))
  if (valid.length < 2) return -1
  const target = row.direction === 'high' ? Math.min(...valid.map(o => o.v)) : Math.max(...valid.map(o => o.v))
  return valid.find(o => o.v === target)?.i ?? -1
}
function marker(row: Row, idx: number): string {
  if (idx === bestIdx(row)) return '▲'
  if (idx === worstIdx(row)) return '▼'
  return ''
}
function cellClass(row: Row, idx: number): string {
  if (idx === bestIdx(row)) return 'best'
  if (idx === worstIdx(row)) return 'worst'
  return ''
}

onMounted(loadPicker)
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }

.card {
  background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx;
}

/* 选品 */
.selected-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 12rpx;
}
.selected-empty { font-size: 24rpx; color: #999; flex: 1; }
.chips { display: flex; flex-wrap: wrap; gap: 10rpx; flex: 1; }
.chip {
  display: flex; align-items: center; gap: 8rpx;
  background: #f0f4ff; border-radius: 20rpx; padding: 6rpx 16rpx;
}
.chip-name { font-size: 24rpx; color: #667eea; max-width: 200rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.chip-x { font-size: 30rpx; color: #667eea; }
.add-btn {
  font-size: 26rpx; color: #fff; background: #667eea;
  padding: 10rpx 24rpx; border-radius: 24rpx;
}

/* 周期 tabs */
.period-tabs {
  display: flex; gap: 12rpx; margin-bottom: 24rpx;
}
.tab {
  flex: 1; text-align: center;
  background: #f5f5f5; color: #666; font-size: 24rpx;
  padding: 14rpx 0; border-radius: 8rpx;
}
.tab.active { background: #667eea; color: #fff; }
.compare-btn {
  text-align: center; background: #667eea; color: #fff;
  font-size: 28rpx; padding: 20rpx 0; border-radius: 8rpx;
}
.compare-btn.disabled { background: #ccc; }

/* 对比表 */
.cmp-table { display: flex; flex-direction: column; }
.cmp-row {
  display: flex; border-bottom: 1rpx solid #f0f0f0;
}
.cmp-row.head { background: #f9f9fb; }
.cmp-cell {
  flex: 1; font-size: 22rpx; padding: 18rpx 8rpx;
  text-align: center; color: #333; word-break: break-all;
}
.cmp-cell.label {
  flex: 0 0 130rpx; text-align: left; color: #999; font-size: 24rpx;
}
.cmp-cell.product { font-weight: bold; color: #333; font-size: 22rpx; }
.cmp-cell.value { position: relative; }
.cmp-cell.value.best { color: #07c160; font-weight: bold; }
.cmp-cell.value.worst { color: #f5222d; font-weight: bold; }
.marker { font-size: 18rpx; margin-right: 2rpx; }

.legend {
  display: flex; gap: 30rpx; justify-content: center;
  padding-top: 16rpx; font-size: 20rpx; color: #999;
}
.legend-item { display: flex; align-items: center; gap: 6rpx; }
.dot { width: 14rpx; height: 14rpx; border-radius: 50%; display: inline-block; }
.dot.best { background: #07c160; }
.dot.worst { background: #f5222d; }

.empty { text-align: center; color: #999; font-size: 24rpx; padding: 60rpx 0; }

/* 弹窗 */
.modal-mask {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: flex-end; justify-content: center;
}
.modal {
  width: 100%; max-height: 80vh; background: #fff;
  border-radius: 24rpx 24rpx 0 0; padding: 24rpx;
  display: flex; flex-direction: column;
}
.modal-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; text-align: center; }
.modal-list { max-height: 60vh; }
.pick-item {
  display: flex; align-items: center; padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.pick-item.disabled { opacity: 0.4; }
.pick-checkbox {
  width: 36rpx; height: 36rpx; border: 2rpx solid #ccc; border-radius: 50%;
  margin-right: 20rpx; position: relative;
}
.pick-checkbox.checked { background: #667eea; border-color: #667eea; }
.pick-checkbox.checked::after {
  content: ''; position: absolute; left: 11rpx; top: 6rpx;
  width: 8rpx; height: 14rpx; border: 2rpx solid #fff;
  border-top: 0; border-left: 0; transform: rotate(45deg);
}
.pick-info { flex: 1; }
.pick-name { font-size: 26rpx; color: #333; display: block; margin-bottom: 4rpx; }
.pick-meta { font-size: 20rpx; color: #999; }
.modal-actions { display: flex; gap: 20rpx; padding-top: 20rpx; }
.modal-btn {
  flex: 1; text-align: center; padding: 20rpx 0; border-radius: 8rpx; font-size: 28rpx;
}
.modal-btn.cancel { background: #f5f5f5; color: #666; }
.modal-btn.confirm { background: #667eea; color: #fff; }

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }
</style>
