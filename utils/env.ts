// 环境配置 - 生产环境同源 /api，开发环境通过 VITE_API_BASE 注入
export const BASE_API = import.meta.env?.VITE_API_BASE ?? '/api'

// 图片/资源域名
export const BASE_URL = import.meta.env?.VITE_BASE_URL ?? ''

// 当前站点域名
function resolveSiteDomain(): string {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname
  }
  // #endif
  return import.meta.env?.VITE_SITE_DOMAIN ?? 'localhost'
}

export const SITE_DOMAIN = resolveSiteDomain()

export type EnvType = 'wechat' | 'douyin' | 'alipay' | 'h5'

export const getEnv = (): { type: EnvType } => {
  // #ifdef MP-WEIXIN
  return { type: 'wechat' }
  // #endif
  // #ifdef MP-TOUTIAO
  return { type: 'douyin' }
  // #endif
  // #ifdef MP-ALIPAY
  return { type: 'alipay' }
  // #endif
  return { type: 'h5' }
}

export function getImageUrl(path: string | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/')) return `${BASE_URL}${path}`
  return `${BASE_URL}/${path}`
}

export function isWechatBrowser(): boolean {
  // #ifdef H5
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('micromessenger')) return true
  if (ua.includes('wechatdevtools') || ua.includes('miniprogram')) return true
  return false
  // #endif
  return false
}
