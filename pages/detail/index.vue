<template>
  <view class="page-container">
    <view v-if="loading" class="loading">加载中...</view>

    <template v-else-if="product">
      <!-- 1. 产品信息 -->
      <view class="card">
        <view class="product-head">
          <text class="product-name">{{ product.productName }}</text>
          <view v-if="isCashManagement" class="money-fund-badge">现金管理类</view>
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
          :composite-score="scoreData.compositeScore"
        />
        <view class="score-footer">
          <text class="score-disclaimer">评分基于近{{ periodLabel }}数据加权计算，仅供参考</text>
          <text class="score-help" @click="showScoreExplain = true">评分说明 ›</text>
        </view>
      </view>
      <!-- 评分数据积累中（净值样本不足，无法评分） -->
      <view v-else class="card score-section">
        <view class="score-header">
          <text class="section-title">综合评分</text>
        </view>
        <view class="score-accum-tip">数据积累中，达到 30 天净值历史后自动展示评分</view>
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
        <view class="section-title annual-section-title">
          <text>年化趋势</text>
          <text class="annual-help" @click="showAnnualExplain = true">年化计算说明 ›</text>
        </view>
        <view class="period-tabs">
          <view
            v-for="p in PERIODS"
            :key="p.key"
            class="tab"
            :class="{ active: period === p.key }"
            @click="period = p.key"
          >
            <text class="tab-label">{{ p.label }}</text>
            <text class="tab-value" :class="getProfitClass(periodValue(p.key))">{{ periodTabText(p.key) }}</text>
          </view>
        </view>

        <view class="annual-big">
          <text class="annual-label">{{ getPeriodLabel(period) }}年化收益</text>
          <text class="annual-num" :class="getProfitClass(currentAnnual)">{{ formatPercent(currentAnnual) }}</text>
          <text v-if="isLongPeriod(period) && currentAnnual === null" class="annual-accum-tip">数据积累中，达到 {{ LONG_PERIOD_DAYS[period] }} 天历史后自动展示</text>
        </view>

        <!-- 折线图：有≥2个数据点即展示，X轴标注起止完整日期 -->
        <template v-if="annualTrend.points.length >= 2">
          <view class="line-chart">
            <view class="line-chart-body">
              <view class="line-chart-yaxis">
                <text class="y-label">{{ formatPercent(annualTrend.adjustedMax, 4) }}</text>
                <text class="y-label">{{ formatPercent(annualTrend.adjustedMin, 4) }}</text>
              </view>
              <view class="line-chart-plot">
                <view class="line-chart-svg" v-html="lineChartSvg"></view>
                <!-- 点位点击热区 + tooltip -->
                <view
                  v-for="(pt, i) in annualTrend.points"
                  :key="'hit' + i"
                  class="chart-hit"
                  :style="{ left: pt.x + '%', top: pt.y + '%' }"
                  @click="onPointTap(pt)"
                ></view>
                <view
                  v-if="activePoint"
                  class="chart-tip"
                  :style="tooltipStyle"
                  @click="onPointTap(activePoint)"
                >
                  <text class="tip-date">{{ activePoint.fullDate }}</text>
                  <text class="tip-value" :class="getProfitClass(activePoint.value)">{{ formatPercent(activePoint.value, 4) }}</text>
                </view>
              </view>
            </view>
            <view class="line-chart-xaxis">
              <text class="x-label">{{ annualTrend.startLabel }}</text>
              <text class="x-label">{{ annualTrend.endLabel }}</text>
            </view>
            <view class="chart-note">每个点代表以该日期为截止日的{{ getPeriodLabel(period) }}区间年化收益，点击点位查看详情</view>
          </view>
          <view class="chart-note chart-note-orange">历史业绩不预示未来收益</view>
        </template>
        <template v-else>
          <view class="chart-note">近{{ getPeriodLabel(period) }}可用数据点不足，暂不展示趋势</view>
          <view class="chart-note chart-note-orange">历史业绩不预示未来收益</view>
        </template>
      </view>

      <!-- 3. 风险指标 -->
      <view class="card">
        <view class="section-title">风险指标</view>
        <!-- 货币理财：收益型指标（净值恒1，净值波动/回撤不适用） -->
        <view v-if="isCashManagement" class="metric-grid">
          <view class="metric-cell">
            <text class="metric-label">收益波动率</text>
            <text class="metric-value">{{ formatPercent(riskMetricData?.volatility) }}</text>
            <text class="metric-desc">万份收益年化波动幅度，越低越稳健</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">收益稳定度</text>
            <text class="metric-value">{{ formatPercent(riskMetricData?.incomeStability) }}</text>
            <text class="metric-desc">万份收益离散程度，越低越稳定</text>
          </view>
        </view>
        <view v-else class="metric-grid">
          <view class="metric-cell">
            <text class="metric-label">波动率</text>
            <text class="metric-value">{{ formatPercent(riskMetricData?.volatility) }}</text>
            <text class="metric-desc">年化波动幅度，越低越稳健</text>
          </view>
          <view class="metric-cell">
            <text class="metric-label">最大回撤</text>
            <text class="metric-value down">{{ formatPercent(riskMetricData?.maxDrawdown) }}</text>
            <text class="metric-desc">区间内最大下跌幅度</text>
          </view>
        </view>
        <view v-if="isCashManagement" class="metric-note">收益波动率、收益稳定度基于近{{ getPeriodLabel(riskMetricPeriod) }}万份收益数据计算</view>
        <view v-else class="metric-note">波动率、最大回撤基于近{{ getPeriodLabel(riskMetricPeriod) }}净值数据计算</view>
      </view>

      <!-- 4a. 7日年化走势（货币理财） -->
      <view class="card" v-if="isCashManagement && incomeTrend.points.length >= 2">
        <view class="section-title">7日年化走势</view>
        <view class="nav-flat-tip">数据来源：产品官方披露的七日年化，可点击下方"净值来源"校验。</view>
        <view class="nav-trend-chart">
          <view class="line-chart-body">
            <view class="line-chart-yaxis">
              <text class="y-label">{{ formatPercent(incomeTrend.max, 3) }}</text>
              <text class="y-label">{{ formatPercent(incomeTrend.min, 3) }}</text>
            </view>
            <view class="line-chart-svg" v-html="incomeLineSvg"></view>
          </view>
          <view class="line-chart-xaxis">
            <text class="x-label">{{ incomeTrend.points[0].date }}</text>
            <text class="x-label">{{ incomeTrend.points[Math.floor(incomeTrend.points.length / 2)].date }}</text>
            <text class="x-label">{{ incomeTrend.points[incomeTrend.points.length - 1].date }}</text>
          </view>
          <view class="trend-info">
            <text class="trend-min">最低: {{ formatPercent(incomeTrend.min, 3) }}</text>
            <text class="trend-max">最高: {{ formatPercent(incomeTrend.max, 3) }}</text>
          </view>
        </view>
      </view>

      <!-- 4b. 净值走势图（非货币理财） -->
      <view class="card" v-if="!isCashManagement && navTrend.points.length >= 2">
        <view class="section-title">净值走势</view>
        <view class="nav-trend-chart">
          <view class="line-chart-body">
            <view class="line-chart-yaxis">
              <text class="y-label">{{ navTrend.max.toFixed(6) }}</text>
              <text class="y-label">{{ navTrend.min.toFixed(6) }}</text>
            </view>
            <view class="line-chart-svg" v-html="navLineSvg"></view>
          </view>
          <view class="line-chart-xaxis">
            <text class="x-label">{{ navTrend.points[0].date }}</text>
            <text class="x-label">{{ navTrend.points[Math.floor(navTrend.points.length / 2)].date }}</text>
            <text class="x-label">{{ navTrend.points[navTrend.points.length - 1].date }}</text>
          </view>
          <view class="trend-info">
            <text class="trend-min">最低: {{ navTrend.min.toFixed(6) }}</text>
            <text class="trend-max">最高: {{ navTrend.max.toFixed(6) }}</text>
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

      <!-- 6. 净值表 / 收益明细 -->
      <view class="card">
        <view class="section-title toggle" @click="navOpen = !navOpen">
          <text>{{ isCashManagement ? '收益明细（最近10条）' : '净值表（最近10条）' }}</text>
          <text class="toggle-arrow">{{ navOpen ? '收起 ▴' : '展开 ▾' }}</text>
        </view>
        <view v-if="isCashManagement" class="nav-flat-tip">本产品为现金管理类，净值恒为 1，收益体现于万份收益/七日年化。</view>
        <view v-if="navOpen" class="nav-table">
          <view v-if="!tableRows.length" class="empty-inline">{{ isCashManagement ? '暂无收益数据' : '暂无净值数据' }}</view>
          <view v-else>
            <view class="nav-row nav-head">
              <text class="nav-date">日期</text>
              <text class="nav-unit">{{ isCashManagement ? '万份收益' : '单位净值' }}</text>
              <text class="nav-acc">{{ isCashManagement ? '七日年化' : '累计净值' }}</text>
            </view>
            <view v-for="(n, i) in tableRows" :key="i" class="nav-row">
              <text class="nav-date">{{ n.date || n.navDate || '--' }}</text>
              <text class="nav-unit">{{ n.unit ?? n.unitNav ?? '--' }}</text>
              <text class="nav-acc">{{ n.acc ?? n.accNav ?? n.accumulatedNav ?? n.accumNav ?? '--' }}</text>
            </view>
          </view>
        </view>
        <view v-if="product.navSourceUrl" class="nav-source">
          <text class="nav-source-label">净值来源：</text>
          <text class="nav-source-link" @click="openNavSource">{{ navSourceName }}</text>
          <text class="nav-source-tip">点击查看，可自行查阅校验</text>
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

    <!-- 预约咨询弹窗 -->
    <view v-if="showConsultPopup" class="popup-mask" @click="showConsultPopup = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">预约咨询</view>
        <view class="popup-product-name">{{ product?.productName }}</view>
        <view class="popup-tabs">
          <view
            v-for="t in CONSULT_TABS"
            :key="t.value"
            class="popup-tab"
            :class="{ active: consultForm.tab === t.value }"
            @click="consultForm.tab = t.value"
          >{{ t.label }}</view>
        </view>

        <!-- 联系 Tab：服务人信息 + 拨打 + 微信 -->
        <template v-if="consultForm.tab === 'contact'">
          <view class="wechat-servicer" v-if="consultConfig.nickname || consultConfig.branchName">
            <view class="servicer-line">
              <text class="servicer-name" v-if="consultConfig.nickname">{{ consultConfig.nickname }}</text>
              <text class="servicer-branch" v-if="consultConfig.branchName">{{ consultConfig.branchName }}</text>
            </view>
          </view>
          <view class="servicer-call" v-if="consultConfig.branchPhones && consultConfig.branchPhones.length">
            <view class="servicer-call-info">
              <text class="servicer-call-label">网点电话</text>
              <text class="servicer-call-note">号码不展示，点击直接拨打</text>
            </view>
            <view class="servicer-call-btn" @click="callPhone(consultConfig.branchPhones[0])">拨打电话</view>
          </view>
          <view class="wechat-qr-row" v-if="consultConfig.enterpriseWechatQr || consultConfig.personalWechatQr">
            <view class="wechat-qr-item" v-if="consultConfig.enterpriseWechatQr">
              <image class="wechat-qr-img" :src="consultConfig.enterpriseWechatQr" mode="aspectFit" />
              <text class="wechat-qr-label">企业微信</text>
              <view class="wechat-id-row" v-if="consultConfig.enterpriseWechatId">
                <text class="wechat-id">{{ consultConfig.enterpriseWechatId }}</text>
                <view class="wechat-copy" @click="copyWechatId(consultConfig.enterpriseWechatId)">复制</view>
              </view>
            </view>
            <view class="wechat-qr-item" v-if="consultConfig.personalWechatQr">
              <image class="wechat-qr-img" :src="consultConfig.personalWechatQr" mode="aspectFit" />
              <text class="wechat-qr-label">个人微信</text>
              <view class="wechat-id-row" v-if="consultConfig.personalWechatId">
                <text class="wechat-id">{{ consultConfig.personalWechatId }}</text>
                <view class="wechat-copy" @click="copyWechatId(consultConfig.personalWechatId)">复制</view>
              </view>
            </view>
          </view>
          <view class="wechat-empty" v-if="!hasContactInfo">联系方式配置中，请使用留言咨询</view>
        </template>

        <!-- 留言 Tab -->
        <template v-else>
          <view class="popup-field">
            <text class="popup-label">称呼 <text class="popup-optional">选填</text></text>
            <input class="popup-input" v-model="consultForm.name" placeholder="请输入您的称呼" maxlength="20" />
          </view>
          <view class="popup-field">
            <text class="popup-label">留言内容 <text class="required">*</text></text>
            <textarea class="popup-textarea" v-model="consultForm.message" placeholder="请输入想咨询的内容" maxlength="500" />
          </view>
          <view class="popup-field">
            <text class="popup-label">预留联系方式 <text class="popup-optional">选填</text></text>
            <view class="channel-tabs">
              <view
                v-for="ct in CONTACT_TYPES"
                :key="ct.value"
                class="channel-tab"
                :class="{ active: consultForm.contactType === ct.value }"
                @click="consultForm.contactType = ct.value"
              >{{ ct.label }}</view>
            </view>
            <input
              class="popup-input"
              v-model="consultForm.contactValue"
              :placeholder="consultForm.contactType === 'phone' ? '请输入手机号' : consultForm.contactType === 'email' ? '请输入邮箱' : '请输入微信号'"
              :type="consultForm.contactType === 'phone' ? 'number' : 'text'"
              :maxlength="consultForm.contactType === 'phone' ? 11 : 60"
            />
          </view>
        </template>
        <view class="popup-actions">
          <view class="popup-btn-cancel" @click="showConsultPopup = false">取消</view>
          <view class="popup-btn-submit" v-if="consultForm.tab === 'leave'" @click="submitConsultation">提交留言</view>
        </view>
      </view>
    </view>

    <!-- 加入组合方案弹窗 -->
    <view v-if="showPortfolioPopup" class="popup-mask" @click="showPortfolioPopup = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">加入组合方案</view>
        <view class="popup-product-name">{{ product?.productName }}</view>

        <template v-if="myPlans.length > 0">
          <view class="popup-field">
            <text class="popup-label">加入已有组合</text>
            <view
              v-for="p in myPlans"
              :key="p.id"
              class="plan-option"
              :class="{ active: portfolioForm.mode === 'existing' && portfolioForm.planId === p.id }"
              @click="selectPlan(p)"
            >
              <view class="plan-option-radio"></view>
              <view class="plan-option-info">
                <text class="plan-option-name">{{ p.planName }}</text>
                <text class="plan-option-meta">{{ planProductCount(p) }} 只产品{{ p.totalAmount ? ' · ' + formatPlanAmount(p.totalAmount) : '' }}</text>
              </view>
            </view>
          </view>
          <view class="popup-divider"></view>
        </template>

        <view class="popup-field">
          <text class="popup-label">新建方案</text>
          <view class="preset-names">
            <view
              v-for="n in PRESET_PLAN_NAMES"
              :key="n"
              class="preset-name"
              :class="{ active: portfolioForm.planName === n }"
              @click="portfolioForm.planName = n; onPlanNameInput()"
            >{{ n }}</view>
          </view>
          <input class="popup-input" v-model="portfolioForm.planName" placeholder="请输入方案名称" maxlength="30" @input="onPlanNameInput" />
        </view>
        <view class="popup-field">
          <text class="popup-label">假设金额（可选）</text>
          <input class="popup-input" v-model="portfolioForm.totalAmount" placeholder="请输入假设金额（元）" type="digit" />
        </view>
        <view class="popup-actions">
          <view class="popup-btn-cancel" @click="showPortfolioPopup = false">取消</view>
          <view class="popup-btn-submit" @click="submitCreatePortfolio">{{ portfolioForm.mode === 'existing' && portfolioForm.planId ? '加入该组合' : '创建' }}</view>
        </view>
      </view>
    </view>

    <!-- 年化计算说明弹窗 -->
    <view v-if="showAnnualExplain" class="popup-mask" @click="showAnnualExplain = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">年化收益计算说明</view>
        <view class="explain-body">
          <view class="explain-formula">
            <text class="explain-line">年化收益率 = (期末净值 / 期初净值) ^ (365 / 区间自然日天数) - 1</text>
          </view>
          <view class="explain-note">按复利公式计算，区间为所选周期的起止日：</view>
          <view class="explain-item">
            <text class="explain-label">期末净值</text>
            <text class="explain-desc">截止日当天的单位净值</text>
          </view>
          <view class="explain-item">
            <text class="explain-label">期初净值</text>
            <text class="explain-desc">周期起点前一交易日的单位净值</text>
          </view>
          <view class="explain-item">
            <text class="explain-label">区间自然日天数</text>
            <text class="explain-desc">按自然日计算，含周末节假日</text>
          </view>
          <view class="explain-note">示例：1个月年化 = (最新净值 / 1个月前净值) ^ (365 / 30) - 1</view>
          <view class="explain-warn">货币基金按万份收益单利折算年化，与净值复利口径不同。</view>
          <view v-if="isCashManagement" class="explain-warn">本产品为现金管理类，净值恒为 1，收益体现于万份收益/七日年化。</view>
        </view>
        <view class="popup-actions">
          <view class="popup-btn-submit" @click="showAnnualExplain = false">我知道了</view>
        </view>
      </view>
    </view>

    <!-- 评分说明弹窗 -->
    <view v-if="showScoreExplain" class="popup-mask" @click="showScoreExplain = false">
      <view class="popup-card" @click.stop="">
        <view class="popup-title">综合评分说明</view>
        <view class="explain-body">
          <view class="explain-formula">
            <text class="explain-line">综合评分 = 收益得分 × {{ formatWeight(scoreData?.weights?.returns) }}</text>
            <text class="explain-line">　　+ {{ isCashManagement ? '收益波动率得分' : '波动率得分' }} × {{ formatWeight(scoreData?.weights?.volatility) }}</text>
            <text v-if="!isCashManagement" class="explain-line">　　+ 回撤得分 × {{ formatWeight(scoreData?.weights?.drawdown) }}</text>
          </view>
          <view class="explain-note">各维度按绝对标尺归一化到 0-100 分，不依赖同类产品数量：</view>
          <view class="explain-item">
            <text class="explain-label">收益得分</text>
            <text class="explain-desc">年化收益达到 {{ formatPercent(scoreData?.scales?.returnScale, 0) }} 即为满分</text>
          </view>
          <view class="explain-item">
            <text class="explain-label">{{ isCashManagement ? '收益波动率得分' : '波动率得分' }}</text>
            <text class="explain-desc">波动率越低越好，达到 {{ formatPercent(scoreData?.scales?.volatilityScale, 0) }} 即 0 分</text>
          </view>
          <view v-if="!isCashManagement" class="explain-item">
            <text class="explain-label">回撤得分</text>
            <text class="explain-desc">回撤越小越好，达到 -{{ formatPercent(scoreData?.scales?.drawdownScale, 0) }} 即 0 分</text>
          </view>
          <view class="explain-warn">评分仅基于历史数据加权计算，不构成投资建议。</view>
        </view>
        <view class="popup-actions">
          <view class="popup-btn-submit" @click="showScoreExplain = false">我知道了</view>
        </view>
      </view>
    </view>
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
  getProductNavSeries, getProductYearlyReturn, getProductMoneyIncomes,
  getProductScore, getRiskDisclosure, createConsultation, createPortfolioPlan,
  getConsultConfig, getPortfolioPlans, updatePortfolioPlan
} from '@/services/api'
import {
  formatPercent, getProfitClass, getTypeLabel,
  getPeriodLabel, PERIODS, formatDate, formatDateShort
} from '../../utils/format'
import { getLoginState } from '../../utils/storage'
import { redirectToLogin } from '../../utils/auth'

const product = ref<any>(null)
const isCashManagement = computed(() => {
  const t = product.value?.productType
  return t === 'money-wealth' || t === 'money-fund'
})
const snapshot = ref<any>(null)
const riskMetric = ref<any>(null)
const navSeries = ref<any[]>([])
const moneyIncomes = ref<any[]>([])
const yearlyReturns = ref<any[]>([])
const loading = ref(true)
const productId = ref<string | number>('')

const period = ref('m1')
const navOpen = ref(false)
const showScoreExplain = ref(false)
const showAnnualExplain = ref(false)

// 评分数据
const scoreData = ref<any>(null)
const riskDisclosures = ref<string[]>([])
const selectedPeriod = ref('m1')

// 预约咨询弹窗
const showConsultPopup = ref(false)
const CONSULT_TABS = [
  { label: '联系', value: 'contact' },
  { label: '留言', value: 'leave' },
]
const CONTACT_TYPES = [
  { label: '电话', value: 'phone' },
  { label: '邮箱', value: 'email' },
  { label: '微信', value: 'wechat' },
]
const consultConfig = ref({ enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '', nickname: '', branchName: '', branchPhones: [] })
const hasContactInfo = computed(() =>
  !!consultConfig.value.nickname ||
  !!consultConfig.value.branchName ||
  (consultConfig.value.branchPhones && consultConfig.value.branchPhones.length > 0) ||
  !!consultConfig.value.enterpriseWechatQr ||
  !!consultConfig.value.personalWechatQr ||
  !!consultConfig.value.enterpriseWechatId ||
  !!consultConfig.value.personalWechatId
)
const consultForm = ref({
  tab: 'contact' as 'contact' | 'leave',
  name: '',
  message: '',
  contactType: 'phone' as 'phone' | 'email' | 'wechat',
  contactValue: '',
})

// 创建组合方案弹窗
const showPortfolioPopup = ref(false)
const portfolioForm = ref({
  mode: 'new' as 'existing' | 'new',
  planId: null as number | null,
  planName: '',
  totalAmount: '',
})
const myPlans = ref<any[]>([])
const PRESET_PLAN_NAMES = ['稳健增值', '进取配置', '教育金储备']
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
function planSeqName(n: number): string {
  return n <= 10 ? '方案' + CN_NUM[n - 1] : '方案' + n
}

const navs = computed<any[]>(() => {
  const list = navSeries.value || []
  return Array.isArray(list) ? list.slice(0, 10) : []
})

// 净值表行数据：货币理财显示万份收益/七日年化，其余沿用净值字段
const tableRows = computed<any[]>(() => {
  if (!isCashManagement.value) return navs.value
  return (moneyIncomes.value || []).slice(0, 10).map((r: any) => ({
    date: formatDate(r.date),
    unit: r.tenThousandIncome != null ? Number(r.tenThousandIncome).toFixed(6) : '--',
    acc: r.sevenDayAnnual != null ? formatPercent(r.sevenDayAnnual) : '--',
  }))
})

// 净值来源名称：按 URL 域名识别官方渠道
const navSourceName = computed(() => {
  const url = product.value?.navSourceUrl || ''
  if (!url) return ''
  if (url.includes('qdccb.com')) return '青岛银行官网'
  if (url.includes('chinawealth.com')) return '中国理财网'
  return '外部网址'
})

function openNavSource() {
  const url = product.value?.navSourceUrl
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
  // #endif
}

// 周期 key → 后端 API 字段名映射
const PERIOD_FIELD_MAP: Record<string, string> = {
  'd1': 'annual1d',
  'd3': 'annual3d',
  'w1': 'annual7d',
  'w2': 'annual2w',
  'm1': 'annual1m',
  'm3': 'annual3m',
  'm6': 'annual6m',
  'y1': 'annual1y',
}

function periodValue(key: string): number | null {
  const s = snapshot.value
  if (!s) return null
  const field = PERIOD_FIELD_MAP[key]
  if (!field) return null

  // 优先从 records 中取最新一条（后端统一的 paginatedResponse 格式）
  if (s.records && Array.isArray(s.records) && s.records.length > 0) {
    const latest = s.records[0]
    const v = latest[field]
    if (typeof v === 'number') return v
  }

  // 直接字段查找
  const direct = s[field]
  if (typeof direct === 'number') return direct

  // 兼容旧格式（series/annuals/list/points）
  const series = s.series || s.annuals || s.list || s.points
  if (Array.isArray(series)) {
    const item = series.find((it: any) => it.period === key)
    if (item) return item.value ?? item.annualized ?? item.annualizedReturn ?? null
  }
  return null
}

const currentAnnual = computed(() => periodValue(period.value))

const LONG_PERIOD_DAYS: Record<string, number> = { m1: 30, m3: 90, m6: 180, y1: 365 }
function isLongPeriod(key: string): boolean {
  return key in LONG_PERIOD_DAYS
}
function periodTabText(key: string): string {
  const v = periodValue(key)
  if (v === null && isLongPeriod(key)) return '积累中'
  return formatPercent(v)
}

// 点位点击详情
const activePoint = ref<{ date: string; value: number; x: number; y: number } | null>(null)
function onPointTap(p: any) {
  activePoint.value = activePoint.value?.date === p.date ? null : p
}
const tooltipStyle = computed(() => {
  const p = activePoint.value
  if (!p) return {}
  return {
    left: p.x + '%',
    top: p.y + '%',
  }
})

// 风险指标：按选中周期取值（后端返回 {m1:{volatility,...}, m3:{...}}）
const riskMetricPeriod = computed(() => {
  // 取最近的可用周期，优先 m1 → m3 → m6 → y1
  const rm = riskMetric.value
  if (!rm) return 'm1'
  return ['m1', 'm3', 'm6', 'y1'].find(p => rm[p]) || 'm1'
})
const riskMetricData = computed(() => {
  const rm = riskMetric.value
  if (!rm) return null
  return rm[riskMetricPeriod.value] || null
})

// 折线图数据（选中周期的年化趋势）
const annualTrend = computed(() => {
  const s = snapshot.value
  if (!s || !s.records || !Array.isArray(s.records) || s.records.length < 2) {
    return { points: [], min: 0, max: 0, range: 0, startLabel: '', endLabel: '' }
  }
  const field = PERIOD_FIELD_MAP[period.value]
  if (!field) return { points: [], min: 0, max: 0, range: 0, startLabel: '', endLabel: '' }

  // 按日期升序排列
  const data = [...s.records].reverse()
  const values = data
    .map((d: any) => d[field])
    .filter((v: any) => v !== null && v !== undefined) as number[]
  if (values.length < 2) return { points: [], min: 0, max: 0, range: 0, startLabel: '', endLabel: '' }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.0001
  const padding = range * 0.15
  const adjustedMin = min - padding
  const adjustedRange = max - adjustedMin || 0.0001

  // 各周期折线图数据窗口（每日一条快照）：最低1个月(30点)，数据不足该窗口时显示全部
  const PERIOD_POINTS: Record<string, number> = {
    d1: 30, d3: 30, w1: 30, w2: 30, m1: 30, m3: 90, m6: 180, y1: 365,
  }

  const filtered = data
    .filter((d: any) => d[field] !== null && d[field] !== undefined)
    .slice(-(PERIOD_POINTS[period.value] || 30)) // 数据不足时 slice 自动取全部
  const points = filtered.map((d: any, i: number, arr: any[]) => ({
    date: formatDateShort(d.date),
    fullDate: d.date || '--',
    value: d[field],
    x: arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50,
    y: ((max - d[field]) / adjustedRange) * 100,
  }))

  return {
    points,
    min,
    max,
    range,
    adjustedMin,
    adjustedMax: max,
    startLabel: filtered[0]?.date || '--',
    endLabel: filtered[filtered.length - 1]?.date || '--',
  }
})

// 生成折线图 SVG
const lineChartSvg = computed(() => {
  const pts = annualTrend.value.points
  if (pts.length < 2) return ''
  const w = 300, h = 160
  const lastVal = pts[pts.length - 1]?.value
  const color = lastVal != null && lastVal > 0 ? '#f5222d' : '#07c160'
  const fillColor = lastVal != null && lastVal > 0 ? 'rgba(245,34,45,0.08)' : 'rgba(7,193,96,0.08)'

  const polylinePts = pts.map(p => `${(p.x / 100 * w).toFixed(1)},${(p.y / 100 * h).toFixed(1)}`).join(' ')
  const areaPts = `${(pts[0].x / 100 * w).toFixed(1)},${h} ${polylinePts} ${(pts[pts.length - 1].x / 100 * w).toFixed(1)},${h}`
  const circles = pts.map(p =>
    `<circle cx="${(p.x / 100 * w).toFixed(1)}" cy="${(p.y / 100 * h).toFixed(1)}" r="2.5" fill="${color}"/>`
  ).join('')

  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="${h}">
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#f0f0f0" stroke-width="1"/>
    <polygon points="${areaPts}" fill="${fillColor}"/>
    <polyline points="${polylinePts}" stroke="${color}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circles}
  </svg>`
})

function formatWeight(w: number | undefined | null): string {
  if (w === null || w === undefined) return '--'
  return (Number(w) * 100).toFixed(0) + '%'
}

// 净值走势折线图数据（取最近20条，倒序变正序）
const navTrend = computed(() => {
  const data = [...navSeries.value].slice(0, 20).reverse()
  if (data.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const values = data.map((d: any) => Number(d.unitNav || 0)).filter(v => v > 0)
  if (values.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.0001
  const padding = range * 0.1
  const adjustedMin = min - padding
  const adjustedRange = max - adjustedMin || 0.0001

  const points = data
    .filter((d: any) => Number(d.unitNav || 0) > 0)
    .map((d: any, i: number, arr: any[]) => ({
      date: formatDate(d.navDate || d.date),
      value: Number(d.unitNav),
      x: arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50,
      y: ((max - Number(d.unitNav)) / adjustedRange) * 100,
    }))

  return { points, min, max, range }
})

// 净值走势折线图 SVG
const navLineSvg = computed(() => {
  const pts = navTrend.value.points
  if (pts.length < 2) return ''
  const w = 300, h = 160
  const lastVal = pts[pts.length - 1]?.value
  const firstVal = pts[0]?.value
  const color = lastVal != null && firstVal != null && lastVal >= firstVal ? '#f5222d' : '#07c160'
  const fillColor = lastVal != null && firstVal != null && lastVal >= firstVal ? 'rgba(245,34,45,0.08)' : 'rgba(7,193,96,0.08)'

  const polylinePts = pts.map(p => `${(p.x / 100 * w).toFixed(1)},${(p.y / 100 * h).toFixed(1)}`).join(' ')
  const areaPts = `${(pts[0].x / 100 * w).toFixed(1)},${h} ${polylinePts} ${(pts[pts.length - 1].x / 100 * w).toFixed(1)},${h}`
  const circles = pts.map(p =>
    `<circle cx="${(p.x / 100 * w).toFixed(1)}" cy="${(p.y / 100 * h).toFixed(1)}" r="2" fill="${color}"/>`
  ).join('')

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#f0f0f0" stroke-width="1"/>
    <polygon points="${areaPts}" fill="${fillColor}"/>
    <polyline points="${polylinePts}" stroke="${color}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circles}
  </svg>`
})

// 7日年化走势折线图数据（取最近30条，倒序变正序）
const incomeTrend = computed(() => {
  const data = [...moneyIncomes.value].slice(0, 30).reverse()
  if (data.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const values = data.map((d: any) => Number(d.sevenDayAnnual || 0)).filter(v => v > 0)
  if (values.length < 2) return { points: [], min: 0, max: 0, range: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.0001
  const padding = range * 0.1
  const adjustedMin = min - padding
  const adjustedRange = max - adjustedMin || 0.0001

  const points = data
    .filter((d: any) => Number(d.sevenDayAnnual || 0) > 0)
    .map((d: any, i: number, arr: any[]) => ({
      date: formatDate(d.date),
      value: Number(d.sevenDayAnnual),
      x: arr.length > 1 ? (i / (arr.length - 1)) * 100 : 50,
      y: ((max - Number(d.sevenDayAnnual)) / adjustedRange) * 100,
    }))

  return { points, min, max, range }
})

// 7日年化走势折线图 SVG
const incomeLineSvg = computed(() => {
  const pts = incomeTrend.value.points
  if (pts.length < 2) return ''
  const w = 300, h = 160
  const lastVal = pts[pts.length - 1]?.value
  const firstVal = pts[0]?.value
  const color = lastVal != null && firstVal != null && lastVal >= firstVal ? '#f5222d' : '#07c160'
  const fillColor = lastVal != null && firstVal != null && lastVal >= firstVal ? 'rgba(245,34,45,0.08)' : 'rgba(7,193,96,0.08)'

  const polylinePts = pts.map(p => `${(p.x / 100 * w).toFixed(1)},${(p.y / 100 * h).toFixed(1)}`).join(' ')
  const areaPts = `${(pts[0].x / 100 * w).toFixed(1)},${h} ${polylinePts} ${(pts[pts.length - 1].x / 100 * w).toFixed(1)},${h}`
  const circles = pts.map(p =>
    `<circle cx="${(p.x / 100 * w).toFixed(1)}" cy="${(p.y / 100 * h).toFixed(1)}" r="2" fill="${color}"/>`
  ).join('')

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <line x1="0" y1="0" x2="${w}" y2="0" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#f0f0f0" stroke-width="1"/>
    <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="#f0f0f0" stroke-width="1"/>
    <polygon points="${areaPts}" fill="${fillColor}"/>
    <polyline points="${polylinePts}" stroke="${color}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circles}
  </svg>`
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
async function onAddToPortfolio() {
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const res = await getPortfolioPlans({ page: 1, pageSize: 100 })
    myPlans.value = res?.records || []
  } catch {
    myPlans.value = []
  }
  portfolioForm.value = {
    mode: 'new',
    planId: null,
    planName: planSeqName(myPlans.value.length + 1),
    totalAmount: '',
  }
  showPortfolioPopup.value = true
}

function planProductList(p: any): any[] {
  return typeof p.products === 'string' ? JSON.parse(p.products) : (p.products || [])
}
function planProductCount(p: any): number {
  return planProductList(p).length
}
function formatPlanAmount(amount: any): string {
  if (!amount) return ''
  const n = Number(amount)
  if (isNaN(n)) return ''
  return n >= 10000 ? (n / 10000).toFixed(2) + '万' : n.toFixed(0) + '元'
}
function selectPlan(p: any) {
  portfolioForm.value.mode = 'existing'
  portfolioForm.value.planId = p.id
}
function onPlanNameInput() {
  portfolioForm.value.mode = 'new'
  portfolioForm.value.planId = null
}

// 提交创建组合方案
async function submitCreatePortfolio() {
  const pid = product.value?.id || product.value?.documentId
  if (!pid) {
    uni.showToast({ title: '产品信息缺失', icon: 'none' })
    return
  }
  const newProduct = {
    productId: product.value?.id,
    productName: product.value?.productName,
    allocationRatio: 1,
    addedDate: new Date().toISOString().split('T')[0],
  }
  uni.showLoading({ title: '保存中...' })
  try {
    // 加入已有组合
    if (portfolioForm.value.mode === 'existing' && portfolioForm.value.planId) {
      const plan = myPlans.value.find((p) => p.id === portfolioForm.value.planId)
      const cur = plan ? planProductList(plan) : []
      if (cur.some((p) => Number(p.productId) === Number(newProduct.productId))) {
        uni.hideLoading()
        uni.showToast({ title: '该产品已在组合中', icon: 'none' })
        return
      }
      await updatePortfolioPlan(portfolioForm.value.planId, {
        products: [...cur, newProduct],
        totalAmount: plan?.totalAmount ?? null,
      })
      uni.hideLoading()
      showPortfolioPopup.value = false
      uni.showToast({ title: '加入成功', icon: 'success' })
      const targetId = portfolioForm.value.planId
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/portfolio/detail?id=${targetId}` })
      }, 1000)
      return
    }
    // 新建方案
    if (!portfolioForm.value.planName.trim()) {
      uni.hideLoading()
      uni.showToast({ title: '请输入方案名称', icon: 'none' })
      return
    }
    const res = await createPortfolioPlan({
      planName: portfolioForm.value.planName.trim(),
      planType: 'custom',
      products: [newProduct],
      totalAmount: portfolioForm.value.totalAmount ? Number(portfolioForm.value.totalAmount) : null,
    })
    uni.hideLoading()
    showPortfolioPopup.value = false
    uni.showToast({ title: '创建成功', icon: 'success' })
    const newId = res?.id || res?.documentId
    if (newId) {
      setTimeout(() => {
        uni.navigateTo({ url: `/pages/portfolio/detail?id=${newId}` })
      }, 1000)
    }
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
}

// 预约咨询（免登录查看联系信息）
function onConsult() {
  consultForm.value = {
    tab: 'contact',
    name: '',
    message: '',
    contactType: 'phone',
    contactValue: '',
  }
  loadConsultConfig()
  showConsultPopup.value = true
}

function copyWechatId(id: string) {
  uni.setClipboardData({
    data: id,
    success: () => uni.showToast({ title: '微信号已复制', icon: 'none' }),
  })
}

function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}

// H5 定位：成功返回经纬度与城市，失败/拒权返回 null（自然落全局兜底）
function locateCity(): Promise<{ latitude: number; longitude: number; city: string } | null> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => resolve({
        latitude: res.latitude,
        longitude: res.longitude,
        city: (res as any).city || '',
      }),
      fail: () => resolve(null),
    })
  })
}

async function loadConsultConfig() {
  const loc = await locateCity()
  try {
    consultConfig.value = await getConsultConfig(loc ? {
      city: loc.city,
      latitude: loc.latitude,
      longitude: loc.longitude,
    } : {})
  } catch (e) {
    consultConfig.value = { enterpriseWechatQr: '', personalWechatQr: '', enterpriseWechatId: '', personalWechatId: '', nickname: '', branchName: '', branchPhones: [] }
  }
}

// 提交预约咨询（留言渠道）
async function submitConsultation() {
  const f = consultForm.value
  const loginState = getLoginState()
  if (!loginState.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => redirectToLogin(), 800)
    return
  }
  if (!f.message.trim()) {
    uni.showToast({ title: '请输入留言内容', icon: 'none' })
    return
  }
  if (f.contactValue.trim() && f.contactType === 'phone' && !/^1\d{10}$/.test(f.contactValue.trim())) {
    uni.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    await createConsultation({
      submitType: 'message',
      name: f.name.trim() || undefined,
      message: f.message.trim(),
      contactType: f.contactValue.trim() ? f.contactType : undefined,
      contactValue: f.contactValue.trim() || undefined,
      productId: product.value?.id || product.value?.documentId,
    })
    uni.hideLoading()
    showConsultPopup.value = false
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (e: any) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  }
}

async function loadAll(id: string) {
  loading.value = true
  productId.value = id
  try {
    const [p, snap, rm, navList, yrList, incomeList] = await Promise.all([
      getProductDetail(id),
      getProductAnnualSnapshot(id).catch(() => null),
      getProductRiskMetric(id).catch(() => null),
      getProductNavSeries(id, { pageSize: 30 }).catch(() => []),
      getProductYearlyReturn(id).catch(() => []),
      getProductMoneyIncomes(id, { pageSize: 30 }).catch(() => [])
    ])
    product.value = p
    snapshot.value = snap
    riskMetric.value = rm
    navSeries.value = navList?.list || navList || []
    moneyIncomes.value = incomeList?.list || incomeList || []
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

.annual-section-title {
  display: flex; justify-content: space-between; align-items: center;
}
.annual-help { font-size: 24rpx; color: #667eea; font-weight: normal; }

.product-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16rpx;
}
.product-name { font-size: 32rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; line-height: 1.4; }

.info-grid { display: flex; gap: 20rpx; }
.info-cell { flex: 1; }
.info-label { font-size: 22rpx; color: #999; display: block; margin-bottom: 6rpx; }
.info-value { font-size: 26rpx; color: #333; }

/* 周期 tabs（期限+年化值合并按钮） */
.period-tabs {
  display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx;
}
.tab {
  background: #f5f5f5; border-radius: 16rpx;
  padding: 8rpx 18rpx 10rpx;
  display: flex; flex-direction: column; align-items: center;
  min-width: 88rpx;
}
.tab-label { font-size: 22rpx; color: #666; line-height: 1.3; }
.tab-value { font-size: 24rpx; font-weight: bold; color: #999; line-height: 1.3; }
.tab-value.up { color: #f5222d; }
.tab-value.down { color: #07c160; }
.tab.active { background: #667eea; }
.tab.active .tab-label { color: #fff; }
.tab.active .tab-value { color: #fff; }
.tab.active .tab-value.up { color: #ffe9e9; }
.tab.active .tab-value.down { color: #e6fff4; }

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

/* 折线图 */
.line-chart { padding: 10rpx 0; }
.line-chart-body {
  display: flex; align-items: stretch; gap: 8rpx; height: 180rpx;
}
.line-chart-yaxis {
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 4rpx 0; width: 80rpx; flex-shrink: 0;
}
.y-label { font-size: 18rpx; color: #999; text-align: right; }
.line-chart-plot { position: relative; flex: 1; height: 100%; }
.line-chart-svg { width: 100%; height: 100%; }
.line-chart-svg :deep(svg) { display: block; width: 100%; height: 100%; }
.chart-hit {
  position: absolute; width: 28rpx; height: 28rpx;
  margin: -14rpx 0 0 -14rpx; border-radius: 50%;
  z-index: 5;
}
.chart-hit:active { background: rgba(102, 126, 234, 0.25); }
.chart-tip {
  position: absolute; z-index: 6;
  transform: translate(-50%, -130%);
  background: rgba(23, 23, 23, 0.88); border-radius: 8rpx;
  padding: 10rpx 16rpx;
  display: flex; flex-direction: column; align-items: center;
  pointer-events: auto;
}
.tip-date { font-size: 20rpx; color: #ccc; line-height: 1.4; }
.tip-value { font-size: 26rpx; font-weight: bold; color: #fff; line-height: 1.4; }
.tip-value.up { color: #ff8a8a; }
.tip-value.down { color: #7ee8b0; }
.line-chart-xaxis {
  display: flex; justify-content: space-between;
  padding: 6rpx 8rpx 0 88rpx;
}
.x-label { font-size: 18rpx; color: #999; }

.chart-note { text-align: center; font-size: 20rpx; color: #999; margin-top: 12rpx; }
.chart-note-orange { color: #fa8c16; }

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
.metric-desc { font-size: 20rpx; color: #bbb; display: block; margin-top: 8rpx; }
.metric-note {
  font-size: 20rpx; color: #999; margin-top: 16rpx; text-align: center;
}

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

/* 净值来源 */
.nav-source {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8rpx;
  margin-top: 20rpx; padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
  font-size: 24rpx;
}
.nav-source-label { color: #999; }
.nav-source-link { color: #667eea; font-weight: bold; text-decoration: underline; }
.nav-source-tip { color: #bbb; font-size: 22rpx; }

/* 货币型提示 */
.money-fund-badge {
  align-self: center;
  margin-left: 12rpx;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #ffffff;
  background: linear-gradient(90deg, #7c4dff, #9d5cff);
  border-radius: 20rpx;
}
.nav-flat-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a7ab5;
  line-height: 1.5;
}
.annual-accum-tip {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999;
}

.footer-disclaimer { text-align: center; padding: 30rpx 0; color: #999; font-size: 22rpx; }

/* 净值走势图 */
.nav-trend-chart { padding: 10rpx 0; }
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
.score-accum-tip {
  padding: 40rpx 0 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.score-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12rpx;
}
.score-header .section-title { margin-bottom: 0; }
.score-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12rpx;
}
.score-disclaimer {
  font-size: 20rpx; color: #999;
}
.score-help {
  font-size: 22rpx; color: #667eea; flex-shrink: 0;
  padding: 4rpx 0 4rpx 12rpx;
}
.score-help:active { opacity: 0.7; }

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

/* 弹窗样式 */
.popup-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex; align-items: flex-end; justify-content: center;
}
.popup-card {
  width: 100%; background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 30rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  max-height: 85vh; overflow-y: auto;
  animation: popup-slide-up 0.25s ease-out;
}
@keyframes popup-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.popup-title {
  font-size: 34rpx; font-weight: bold; color: #333;
  text-align: center; margin-bottom: 16rpx;
}
.popup-product-name {
  font-size: 26rpx; color: #667eea; text-align: center;
  margin-bottom: 24rpx; padding: 12rpx 0;
  background: #f0f4ff; border-radius: 8rpx;
}
.popup-field {
  margin-bottom: 28rpx;
}
.popup-label {
  font-size: 26rpx; color: #666; display: block; line-height: 1.4; margin-bottom: 14rpx;
}
.required { color: #f5222d; }
.popup-input {
  width: 100%; box-sizing: border-box;
  background: #f5f5f5; border-radius: 8rpx;
  padding: 0 24rpx; font-size: 28rpx; color: #333;
  height: 80rpx; line-height: 80rpx;
  border: 1rpx solid transparent;
}
.popup-input:focus { border-color: #667eea; background: #fff; }
.popup-textarea {
  width: 100%; box-sizing: border-box;
  height: 160rpx;
  background: #f5f5f5; border-radius: 8rpx;
  padding: 16rpx 24rpx; font-size: 28rpx; color: #333;
  line-height: 1.5;
  border: 1rpx solid transparent;
}
.popup-textarea:focus { border-color: #667eea; background: #fff; }
/* 咨询方式选择 */
.channel-tabs {
  display: flex; gap: 16rpx;
}
.channel-tab {
  flex: 1; text-align: center; font-size: 26rpx;
  padding: 16rpx 0; border-radius: 8rpx;
  background: #f5f5f5; color: #666;
  border: 1rpx solid transparent;
}
.channel-tab.active {
  background: #f0f4ff; color: #667eea; font-weight: bold;
  border-color: #667eea;
}
/* 咨询渠道 Tab 切换 */
.popup-tabs {
  display: flex; gap: 16rpx; margin-bottom: 24rpx;
}
.popup-tab {
  flex: 1; text-align: center; font-size: 26rpx;
  padding: 14rpx 0; border-radius: 8rpx;
  background: #f5f5f5; color: #666;
  border: 1rpx solid transparent;
}
.popup-tab.active {
  background: #f0f4ff; color: #667eea; font-weight: bold;
  border-color: #667eea;
}
/* 微信渠道二维码展示 */
.wechat-tip {
  font-size: 24rpx; color: #999; margin-bottom: 20rpx;
}
.wechat-servicer { margin-bottom: 24rpx; }
.servicer-line { display: flex; align-items: center; margin-bottom: 8rpx; }
.servicer-name { font-size: 30rpx; font-weight: 600; color: #333; margin-right: 16rpx; }
.servicer-branch { font-size: 26rpx; color: #888; }
.servicer-phones { display: flex; flex-wrap: wrap; gap: 16rpx; }
.servicer-phone { font-size: 26rpx; color: #2b6de8; text-decoration: underline; }
.wechat-qr-row {
  display: flex; gap: 20rpx;
}
.wechat-qr-item {
  flex: 1; text-align: center;
  background: #fafafa; border-radius: 12rpx; padding: 20rpx 12rpx;
}
.wechat-qr-img {
  width: 220rpx; height: 220rpx;
}
.wechat-qr-label {
  display: block; font-size: 24rpx; color: #666; margin-top: 12rpx;
}
.wechat-id-row {
  display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 10rpx;
}
.wechat-id {
  font-size: 22rpx; color: #333;
}
.wechat-copy {
  font-size: 22rpx; color: #667eea; border: 1rpx solid #667eea;
  padding: 2rpx 14rpx; border-radius: 16rpx;
}
.wechat-empty {
  font-size: 26rpx; color: #999; text-align: center; padding: 40rpx 0;
}
.servicer-call {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.servicer-call-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.servicer-call-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.servicer-call-note {
  font-size: 12px;
  color: #999;
}
.servicer-call-btn {
  background: #667eea;
  color: #fff;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
}
.popup-optional {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}
.plan-option {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
.plan-option.active {
  border-color: #667eea;
  background: #f5f7ff;
}
.plan-option-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid #ccc;
  flex-shrink: 0;
}
.plan-option.active .plan-option-radio {
  border-color: #667eea;
  background: #667eea;
  box-shadow: inset 0 0 0 3px #fff;
}
.plan-option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.plan-option-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.plan-option-meta {
  font-size: 12px;
  color: #999;
}
.preset-names {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.preset-name {
  border: 1px solid #eee;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  color: #666;
}
.preset-name.active {
  border-color: #667eea;
  color: #667eea;
  background: #f5f7ff;
}
.popup-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0 12px;
}
/* 弹窗操作按钮 */
.popup-actions {
  display: flex; gap: 20rpx; margin-top: 12rpx;
}
.popup-btn-cancel {
  flex: 1; text-align: center; font-size: 28rpx; font-weight: bold;
  padding: 24rpx 0; border-radius: 44rpx;
  background: #f5f5f5; color: #666;
}
.popup-btn-submit {
  flex: 1.5; text-align: center; font-size: 30rpx; font-weight: bold;
  padding: 24rpx 0; border-radius: 44rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
.popup-btn-cancel:active, .popup-btn-submit:active { opacity: 0.85; }

/* 评分说明弹窗 */
.explain-body { padding: 8rpx 4rpx; }
.explain-formula {
  background: #f7f8fc; border-radius: 12rpx;
  padding: 20rpx 24rpx; margin-bottom: 20rpx;
}
.explain-line {
  display: block; font-size: 26rpx; color: #333; line-height: 1.8;
  font-weight: bold;
}
.explain-note { font-size: 24rpx; color: #666; margin-bottom: 16rpx; }
.explain-item {
  display: flex; flex-direction: column;
  padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5;
}
.explain-item:last-of-type { border-bottom: none; }
.explain-label { font-size: 24rpx; color: #333; font-weight: bold; margin-bottom: 6rpx; }
.explain-desc { font-size: 22rpx; color: #999; }
.explain-warn {
  font-size: 22rpx; color: #fa8c16;
  background: #fff7e6; border-radius: 8rpx;
  padding: 14rpx 16rpx; margin-top: 16rpx;
}
</style>
