<template>
  <view class="portfolio-list">
    <!-- 顶部统计 -->
    <view class="stats-bar">
      <view class="stat">
        <text class="stat-num">{{ plans.length }}</text>
        <text class="stat-label">组合数</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ totalAmount }}</text>
        <text class="stat-label">配置总额</text>
      </view>
    </view>

    <!-- 创建按钮 -->
    <view class="create-card" @click="goCreate">
      <text class="create-icon">+</text>
      <text class="create-text">创建新的组合方案</text>
    </view>

    <!-- 组合列表 -->
    <view v-if="plans.length > 0" class="plan-list">
      <PortfolioCard
        v-for="plan in plans"
        :key="plan.id"
        :plan="plan"
        @click="goDetail"
        @rename="openRename"
      />
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-text">创建你的第一个组合方案</text>
      <text class="empty-sub">智能筛选优质产品，配置个性化方案</text>
    </view>

    <!-- 改名弹窗 -->
    <view v-if="showRename" class="rename-mask" @click="showRename = false">
      <view class="rename-card" @click.stop="">
        <view class="rename-title">修改方案名称</view>
        <input class="rename-input" v-model="renameName" maxlength="30" placeholder="请输入方案名称" />
        <view class="rename-actions">
          <view class="rename-btn cancel" @click="showRename = false">取消</view>
          <view class="rename-btn ok" @click="confirmRename">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPortfolioPlans, updatePortfolioPlan } from '@/services/api'
import { showError } from '@/utils/request'
import PortfolioCard from '@/components/portfolio-card.vue'

const plans = ref<any[]>([])
const totalAmount = ref('0')

onMounted(async () => {
  await loadPlans()
})

async function loadPlans() {
  try {
    const res = await getPortfolioPlans({ page: 1, pageSize: 100 })
    plans.value = res.records || []
    // 计算总金额
    const total = plans.value.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0)
    totalAmount.value = total >= 10000 ? (total / 10000).toFixed(2) + '万' : total.toFixed(0)
  } catch (error: any) {
    showError(error.message || '加载失败')
  }
}

function goDetail(plan: any) {
  uni.navigateTo({ url: `/pages/portfolio/detail?id=${plan.id}` })
}

const showRename = ref(false)
const renamePlan = ref<any>(null)
const renameName = ref('')

function openRename(plan: any) {
  renamePlan.value = plan
  renameName.value = plan.planName
  showRename.value = true
}

async function confirmRename() {
  const name = renameName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入方案名称', icon: 'none' })
    return
  }
  if (!renamePlan.value) return
  uni.showLoading({ title: '保存中...' })
  try {
    await updatePortfolioPlan(renamePlan.value.id, { planName: name })
    uni.hideLoading()
    showRename.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
    await loadPlans()
  } catch (error: any) {
    uni.hideLoading()
    showError(error.message || '保存失败')
  }
}

function goCreate() {
  // 跳转到大厅页选择产品
  uni.switchTab({ url: '/pages/hall/index' })
}
</script>

<style scoped>
.portfolio-list {
  padding: 12px;
  min-height: 100vh;
  background: #f5f5f5;
}
.stats-bar {
  display: flex;
  background: #667eea;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.stat {
  flex: 1;
  text-align: center;
}
.stat-num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}
.stat-label {
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}
.create-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #fff;
  border: 2px dashed #667eea;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
}
.create-icon {
  font-size: 20px;
  color: #667eea;
}
.create-text {
  font-size: 14px;
  color: #667eea;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-text {
  display: block;
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}
.empty-sub {
  font-size: 13px;
  color: #999;
}
.rename-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.rename-card {
  width: 80%;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}
.rename-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
  text-align: center;
}
.rename-input {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
}
.rename-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.rename-btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 999px;
  font-size: 14px;
}
.rename-btn.cancel {
  border: 1px solid #e5e5e5;
  color: #666;
}
.rename-btn.ok {
  background: #667eea;
  color: #fff;
}
</style>
