/**
 * 理财数据格式化工具
 */

// 年化收益率格式化（小数 → 百分比字符串）
export function formatPercent(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined) return '--'
  return (val * 100).toFixed(decimals) + '%'
}

// 金额格式化
export function formatAmount(val: number | null | undefined, decimals: number = 2): string {
  if (val === null || val === undefined) return '--'
  return Number(val).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// 盈亏格式化（带正负号）
export function formatProfit(val: number | null | undefined): string {
  if (val === null || val === undefined) return '--'
  const prefix = val >= 0 ? '+' : ''
  return prefix + formatAmount(val)
}

// 盈亏颜色类
export function getProfitClass(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'flat'
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return 'flat'
}

// 日期格式化
export function formatDate(dateStr: string | null | undefined, format: string = 'YYYY-MM-DD'): string {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const map: Record<string, string | number> = {
    'YYYY': date.getFullYear(),
    'MM': pad(date.getMonth() + 1),
    'DD': pad(date.getDate()),
    'HH': pad(date.getHours()),
    'mm': pad(date.getMinutes()),
    'ss': pad(date.getSeconds())
  }
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => String(map[match]))
}

// 日期缩短（仅 MM-DD）
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.slice(5)
}

// 产品类型标签
const PRODUCT_TYPE_MAP: Record<string, string> = {
  'bank-wealth': '银行理财',
  'stock-fund': '股票基金',
  'bond-fund': '债券基金',
  'mixed-fund': '混合基金',
  'money-fund': '货币基金'
}

export function getTypeLabel(type: string | undefined): string {
  if (!type) return '--'
  return PRODUCT_TYPE_MAP[type] || type
}

// 风险等级颜色
export function getRiskClass(riskLevel: string | undefined): string {
  if (!riskLevel) return 'risk-r2'
  return 'risk-' + riskLevel.toLowerCase()
}

// 风险等级文案
const RISK_LABELS: Record<string, string> = {
  'R1': '低风险',
  'R2': '中低风险',
  'R3': '中风险',
  'R4': '中高风险',
  'R5': '高风险'
}

export function getRiskLabel(riskLevel: string | undefined): string {
  if (!riskLevel) return '中低风险'
  return RISK_LABELS[riskLevel] || riskLevel
}

// 周期标签
const PERIOD_LABELS: Record<string, string> = {
  'd1': '1日',
  'd3': '3日',
  'w1': '1周',
  'w2': '2周',
  'm1': '1月',
  'm3': '3月',
  'm6': '6月',
  'y1': '1年'
}

export function getPeriodLabel(period: string): string {
  return PERIOD_LABELS[period] || period
}

// 周期列表（8 周期）
export const PERIODS = [
  { key: 'd1', label: '1日', short: true },
  { key: 'd3', label: '3日', short: true },
  { key: 'w1', label: '1周' },
  { key: 'w2', label: '2周' },
  { key: 'm1', label: '1月' },
  { key: 'm3', label: '3月' },
  { key: 'm6', label: '6月' },
  { key: 'y1', label: '1年' }
]

// 同类排名百分位颜色
export function getRankClass(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'flat'
  if (val < 0.25) return 'up'
  if (val > 0.5) return 'down'
  return 'flat'
}

// 提醒规则类型标签
const RULE_TYPE_LABELS: Record<string, string> = {
  nav_drop_percent: '净值跌幅提醒',
  annual_negative: '年化转负提醒',
  nav_anomaly: '净值异常提醒',
  custom: '自定义提醒'
}

export function getRuleTypeLabel(type: string): string {
  return RULE_TYPE_LABELS[type] || type
}

// 扁平化 Strapi v5 返回数据
export function flattenAttributes(data: any): any {
  if (!data) return null
  if (Array.isArray(data)) return data.map(item => flattenAttributes(item))
  if (typeof data !== 'object') return data

  let result: any
  if (data.attributes) {
    result = { id: data.id, documentId: data.documentId, ...data.attributes }
  } else if (data.documentId) {
    result = { documentId: data.documentId, ...data }
  } else {
    result = { ...data }
  }

  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = flattenAttributes(result[key])
    }
  }
  return result
}

// 从响应中提取列表
export function extractList(response: any): { list: any[]; pagination: any } {
  if (!response) return { list: [], pagination: {} }
  if (response.records && response.total !== undefined) {
    return { list: flattenAttributes(response.records), pagination: { total: response.total } }
  }
  if (response.list && Array.isArray(response.list)) {
    return { list: flattenAttributes(response.list), pagination: response.pagination || {} }
  }
  if (response.data) {
    return { list: flattenAttributes(response.data), pagination: response.meta?.pagination ?? {} }
  }
  if (Array.isArray(response)) {
    return { list: flattenAttributes(response), pagination: {} }
  }
  return { list: [], pagination: {} }
}

// 从响应中提取单项
export function extractItem(response: any): any {
  if (!response) return null
  if (response.data !== undefined && response.data !== null) {
    return flattenAttributes(response.data)
  }
  if ('documentId' in response || 'id' in response) {
    return flattenAttributes(response)
  }
  return response
}

/**
 * 星级评分转显示文本
 */
export function formatStarRating(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

/**
 * 综合评分格式化
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(Number(score))) return '--'
  return Number(score).toFixed(0)
}

/**
 * 评分维度中文标签
 */
export const SCORE_DIMENSION_LABELS: Record<string, string> = {
  returnScore: '收益能力',
  volatilityScore: '波动控制',
  drawdownScore: '回撤控制',
  peerRankScore: '同类排名',
  compositeScore: '综合评分',
}

/**
 * 组合方案类型标签
 */
export const PLAN_TYPE_LABELS: Record<string, string> = {
  conservative: '稳健型',
  balanced: '平衡型',
  aggressive: '进取型',
  custom: '自定义',
}

/**
 * 运作模式标签
 */
export const OPERATION_MODE_LABELS: Record<string, string> = {
  'daily-open': '日开',
  'fixed-term': '定开',
  'closed': '封闭',
}

/**
 * 预约渠道标签
 */
export const CHANNEL_LABELS: Record<string, string> = {
  online: '线上咨询',
  branch: '银行网点',
  phone: '电话咨询',
}
