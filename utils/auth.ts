/**
 * 认证工具 - 处理登录验证和路由守卫
 * SSO 模式下，首页也要求登录
 */
import { getToken, getUser, isLoggedIn } from './storage'
import { getStoredAuthConfig, type AuthConfig } from '../services/auth-config'
import { guardSsoRedirect, isSsoRedirectBlocked } from './sso-guard'

const authPages = [
  '/pages/hall/index',
  '/pages/holding/list',
  '/pages/holding/detail',
]

function isAuthPage(path: string): boolean {
  return authPages.some(page => path.includes(page))
}

function checkLogin(): { isLoggedIn: boolean; token: string | null; user: any } {
  return {
    isLoggedIn: isLoggedIn(),
    token: getToken(),
    user: getUser()
  }
}

function validateLogin(): boolean {
  const { isLoggedIn: loggedIn, token } = checkLogin()
  if (!loggedIn || !token) return false
  return true
}

/**
 * 构建 SSO 登录 URL 并跳转
 * 与 strapi-course 一致的 SSO 跳转逻辑
 */
function redirectToSso(): void {
  // #ifdef H5
  const config = getStoredAuthConfig()
  if (!config?.ssoLoginUrl) {
    console.error('[auth] SSO 登录地址未配置')
    uni.showModal({
      title: '配置错误',
      content: 'SSO 登录地址未配置，请在后台设置 SSO 登录 URL',
      showCancel: false,
    })
    return
  }

  // SSO 防循环保护
  if (isSsoRedirectBlocked()) {
    console.error('[auth] SSO 跳转已达上限，阻断')
    uni.showModal({
      title: '登录异常',
      content: 'SSO 登录跳转次数过多，请检查配置后清除缓存重试',
      showCancel: false,
    })
    return
  }

  if (!guardSsoRedirect()) return

  const cEndCallback = window.location.origin + '/#/pages/auth-callback/auth-callback'
  const params = new URLSearchParams({
    app_code: config.ssoAppCode || 'wealth',
    return_url: cEndCallback,
    c_end_url: cEndCallback,
  })
  const sep = config.ssoLoginUrl.includes('?') ? '&' : '?'
  window.location.href = `${config.ssoLoginUrl}${sep}${params.toString()}`
  // #endif
  // #ifndef H5
  uni.reLaunch({ url: '/pages/hall/index' })
  // #endif
}

function redirectToLogin(): void {
  redirectToSso()
}

function getCurrentPagePath(): string {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    return '/' + ((pages[pages.length - 1] as any).route ?? '')
  }
  return ''
}

/**
 * uni-app 路由拦截器对象
 * 用于 uni.addInterceptor('navigateTo' | 'switchTab', routeGuard) 注册
 * invoke 在页面跳转前触发，args.url 为目标页面路径
 * 返回 false 可阻止本次跳转
 */
const routeGuard = {
  invoke(args: any) {
    const url: string = args?.url || ''
    if (isAuthPage(url) && !validateLogin()) {
      redirectToLogin()
      return false
    }
  }
}

function onLoginSuccess(token: string, user: any): void {
  uni.setStorageSync('token', token)
  uni.setStorageSync('user', JSON.stringify(user))
}

function onLogout(): void {
  uni.removeStorageSync('token')
  uni.removeStorageSync('user')
  uni.showToast({ title: '已退出登录', icon: 'success' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/hall/index' })
  }, 1000)
}

function getAuthUser(): any | null {
  if (!validateLogin()) return null
  return getUser()
}

function getAuthToken(): string | null {
  if (!validateLogin()) return null
  return getToken()
}

export {
  authPages,
  isAuthPage,
  checkLogin,
  validateLogin,
  redirectToLogin,
  redirectToSso,
  getCurrentPagePath,
  routeGuard,
  onLoginSuccess,
  onLogout,
  getAuthUser,
  getAuthToken
}
