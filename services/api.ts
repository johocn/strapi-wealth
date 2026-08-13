/**
 * 理财中心 API 服务层
 * C 端路径前缀：/v1/wealth（zhao-wealth 插件 content-api 路由）
 */
import { get, post, put, del } from '../utils/request'
import { extractList, extractItem } from '../utils/format'

const V1 = '/zhao-wealth/v1/wealth'

// ==================== 产品 ====================
export function getProductList(params = {}) {
  return get(`${V1}/products`, params).then(extractList)
}

export function getProductDetail(id: string | number) {
  return get(`${V1}/products/${id}`).then(extractItem)
}

// 产品净值时序（修复：后端路由为 /nav 而非 /nav-series）
export function getProductNavSeries(productId: string | number, params = {}) {
  return get(`${V1}/products/${productId}/nav`, params).then(extractList)
}

// 产品年化快照（8 周期）
export function getProductAnnualSnapshot(productId: string | number, params = {}) {
  return get(`${V1}/products/${productId}/annual-snapshot`, params).then(extractItem)
}

// 产品年度收益
export function getProductYearlyReturn(productId: string | number, params = {}) {
  return get(`${V1}/products/${productId}/yearly-return`, params).then(extractList)
}

// 产品风险指标
export function getProductRiskMetric(productId: string | number, params = {}) {
  return get(`${V1}/products/${productId}/risk-metrics`, params).then(extractItem)
}

// ==================== 产品对比 ====================
export function compareProducts(productIds: (string | number)[], period: string = 'm1') {
  return get(`${V1}/compare`, { productIds: productIds.join(','), period }).then(extractItem)
}

// ==================== 推荐 ====================
export function getRecommendations(limit: number = 10) {
  return get(`${V1}/recommend`, { limit }).then(extractList)
}

// ==================== 自选/收藏 ====================
export function getCustomerProducts(params = {}) {
  return get(`${V1}/customer-products`, params).then(extractList)
}

export function addCustomerProduct(productId: string | number) {
  return post(`${V1}/customer-products`, { productId }).then(extractItem)
}

export function removeCustomerProduct(id: string | number) {
  return del(`${V1}/customer-products/${id}`).then(extractItem)
}

// ==================== 合规披露 ====================
export function getDisclosure(productType: string) {
  return get(`${V1}/disclosure`, { productType }).then(extractItem)
}

// ==================== 以下 API 已废弃，由组合方案替代 ====================
// export function getMyHoldings(params = {}) {
//   return get(`${V1}/holdings`, params).then(extractList)
// }
//
// export function getHoldingDetail(id: string | number) {
//   return get(`${V1}/holdings/${id}`).then(extractItem)
// }
//
// export function createHolding(data: any) {
//   return post(`${V1}/holdings`, data).then(extractItem)
// }
//
// export function updateHolding(id: string | number, data: any) {
//   return put(`${V1}/holdings/${id}`, data).then(extractItem)
// }
//
// export function deleteHolding(id: string | number) {
//   return del(`${V1}/holdings/${id}`).then(extractItem)
// }
//
// // 持仓盈亏时序（市值曲线）
// export function getHoldingProfitTrend(id: string | number, params = {}) {
//   return get(`${V1}/holdings/${id}/profit-trend`, params).then(extractItem)
// }

// ==================== 提醒规则 ====================
export function getAlertRules(params = {}) {
  return get(`${V1}/alert-rules`, params).then(extractList)
}

export function createAlertRule(data: any) {
  return post(`${V1}/alert-rules`, data).then(extractItem)
}

export function updateAlertRule(id: string | number, data: any) {
  return put(`${V1}/alert-rules/${id}`, data).then(extractItem)
}

export function deleteAlertRule(id: string | number) {
  return del(`${V1}/alert-rules/${id}`).then(extractItem)
}

// 提醒日志
export function getAlertLogs(params = {}) {
  return get(`${V1}/alert-logs`, params).then(extractList)
}

// ==================== 评分相关 ====================
export const getScoreLeaderboard = (params?: any) =>
  get(`${V1}/scores/leaderboard`, params).then(extractList)

export const getProductScore = (productId: number, params?: any) =>
  get(`${V1}/products/${productId}/scores`, params).then(extractItem)

export const recalculateScores = (data: { period?: string }) =>
  post(`${V1}/scores/recalculate`, data).then(extractItem)

// ==================== 组合方案 ====================
export const getPortfolioPlans = (params?: any) =>
  get(`${V1}/portfolio-plans`, params).then(extractList)

export const getPortfolioPlanDetail = (id: number) =>
  get(`${V1}/portfolio-plans/${id}`).then(extractItem)

export const createPortfolioPlan = (data: any) =>
  post(`${V1}/portfolio-plans`, data).then(extractItem)

export const updatePortfolioPlan = (id: number, data: any) =>
  put(`${V1}/portfolio-plans/${id}`, data).then(extractItem)

export const deletePortfolioPlan = (id: number) =>
  del(`${V1}/portfolio-plans/${id}`).then(extractItem)

export const getPortfolioPerformance = (id: number, params?: any) =>
  get(`${V1}/portfolio-plans/${id}/performance`, params).then(extractItem)

export const exportPortfolioSummary = (id: number) =>
  post(`${V1}/portfolio-plans/${id}/export`).then(extractItem)

// ==================== 预约咨询 ====================
export const createConsultation = (data: any) =>
  post(`${V1}/consultations`, data).then(extractItem)

export const getConsultations = () =>
  get(`${V1}/consultations`).then(extractList)

export const cancelConsultation = (id: number) =>
  post(`${V1}/consultations/${id}/cancel`).then(extractItem)

// ==================== 动态风险揭示 ====================
export const getRiskDisclosure = (productId: number, params?: any) =>
  get(`${V1}/products/${productId}/risk-disclosure`, params).then(extractItem)
