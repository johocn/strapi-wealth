/**
 * 通用请求工具 - 带 SSO 认证、token 自动刷新和错误处理
 */
import { getToken, removeToken, removeUser, getRefreshToken, setToken, setRefreshToken, setTokenExpiresAt, isTokenExpiring } from './storage'
import { BASE_API } from './env'

// 无需 token 的公开路由（auth-config 获取 + 合规披露）
const PUBLIC_ROUTES = [
  '/zhao-common/v1/public/config',
  '/zhao-wealth/v1/wealth/disclosure',
  '/zhao-sso/v1/auth/refresh',
]

function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some(route => url.includes(route))
}

let isHandlingUnauthorized = false
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Token 自动刷新（使用 refresh_token）
 * 直接调用 uni.request 避免 circular dependency
 */
async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise

  const refreshTokenStr = getRefreshToken()
  if (!refreshTokenStr) return null

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res: any = await new Promise((resolve, reject) => {
        uni.request({
          url: `${BASE_API}/zhao-sso/v1/auth/refresh`,
          method: 'POST',
          data: { refresh_token: refreshTokenStr },
          header: { 'Content-Type': 'application/json' },
          success: resolve,
          fail: reject,
        })
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = res.data?.data ?? res.data
        const newToken = data?.access_token || data?.jwt || data?.token
        if (newToken) {
          setToken(newToken)
          const newRefreshToken = data?.refresh_token
          if (newRefreshToken) setRefreshToken(newRefreshToken)
          const expiresIn = data?.expires_in || 900
          setTokenExpiresAt(Date.now() + (expiresIn - 60) * 1000)
          return newToken
        }
      }
      return null
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * 清除登录态并跳转 SSO 登录
 */
function handleUnauthorized() {
  if (isHandlingUnauthorized) return
  isHandlingUnauthorized = true
  removeToken()
  removeUser()
  uni.removeStorageSync('refresh_token')
  uni.removeStorageSync('token_expires_at')

  setTimeout(() => {
    isHandlingUnauthorized = false
    // #ifdef H5
    if (typeof window !== 'undefined') {
      // 从 storage 读取 SSO 配置，避免 circular dependency
      try {
        const configStr = uni.getStorageSync('authConfig')
        const config = configStr ? (typeof configStr === 'string' ? JSON.parse(configStr) : configStr) : null
        if (config?.ssoLoginUrl) {
          const cEndCallback = window.location.origin + '/#/pages/auth-callback/auth-callback'
          const params = new URLSearchParams({
            app_code: config.ssoAppCode || 'wealth',
            return_url: cEndCallback,
            c_end_url: cEndCallback,
          })
          const sep = config.ssoLoginUrl.includes('?') ? '&' : '?'
          window.location.href = `${config.ssoLoginUrl}${sep}${params.toString()}`
          return
        }
      } catch {}
      // 兜底：刷新当前子路径页面让 App.vue 重新走 SSO 流程
      window.location.href = window.location.origin + window.location.pathname
    }
    // #endif
    // #ifndef H5
    uni.reLaunch({ url: '/pages/hall/index' })
    // #endif
  }, 1500)
}

/**
 * 执行请求的核心函数
 */
function doRequest(url: string, options: any, token: string | null): Promise<any> {
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_API}${url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header: headers,
      success: (res: any) => {
        const statusCode = res.statusCode
        const data = res.data

        if (statusCode === 401) {
          reject({ status: 401, data })
          return
        }

        if (statusCode === 403) {
          // SSO 策略返回 403 PolicyError 表示 token 无效或缺失，需要重新登录
          if (data?.error?.name === 'PolicyError') {
            reject({ status: 403, data, policyError: true })
            return
          }
          const errMsg = data?.error?.message || '无权限访问'
          reject(new Error(errMsg))
          return
        }

        if (statusCode >= 400) {
          const errMsg = data?.error?.message || data?.message || `请求失败 (${statusCode})`
          reject(new Error(errMsg))
          return
        }

        resolve(data)
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

export async function request(url: string, options: any = {}): Promise<any> {
  let token = getToken()

  // 非公开路由必须有 token
  if (!token && !isPublicRoute(url)) {
    handleUnauthorized()
    throw new Error('未登录')
  }

  // Token 即将过期时主动刷新（非公开路由）
  if (token && !isPublicRoute(url) && isTokenExpiring() && !url.includes('/auth/refresh')) {
    const newToken = await refreshToken()
    if (newToken) token = newToken
  }

  try {
    return await doRequest(url, options, token)
  } catch (err: any) {
    // 401 或 403 PolicyError 表示 SSO token 无效/过期，尝试刷新后重试
    const isAuthError = err?.status === 401 || (err?.status === 403 && err?.policyError)
    if (isAuthError && !isPublicRoute(url) && !url.includes('/auth/refresh')) {
      const newToken = await refreshToken()
      if (newToken) {
        try {
          return await doRequest(url, options, newToken)
        } catch {
          // 刷新后仍失败，跳转登录
        }
      }
      handleUnauthorized()
      throw new Error('未登录')
    }
    // 非认证错误直接抛出
    if (err instanceof Error) throw err
    throw new Error('请求失败')
  }
}

// 便捷方法
export function get(url: string, params?: any): Promise<any> {
  const query = params ? '?' + Object.entries(params)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&') : ''
  return request(url + query, { method: 'GET' })
}

export function post(url: string, data?: any): Promise<any> {
  return request(url, { method: 'POST', data })
}

export function put(url: string, data?: any): Promise<any> {
  return request(url, { method: 'PUT', data })
}

export function del(url: string, data?: any): Promise<any> {
  return request(url, { method: 'DELETE', data })
}

// UI 辅助
export function showError(message: string) {
  uni.showToast({ title: message, icon: 'none', duration: 2000 })
}

export function showSuccess(message: string) {
  uni.showToast({ title: message, icon: 'success', duration: 1500 })
}

export function showLoading(message: string = '加载中...') {
  uni.showLoading({ title: message, mask: true })
}

export function hideLoading() {
  uni.hideLoading()
}
