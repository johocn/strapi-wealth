/**
 * SSO 跳转防循环保护
 * 防止 SSO 配置错误导致无限跳转
 */

const STORAGE_KEY = 'ssoRedirectAttempts'
const STORAGE_TS = 'ssoRedirectLastAt'
const MAX_SSO_ATTEMPTS = 3
const SSO_REDIRECT_TIMEOUT = 3000

function isSsoRedirectBlocked(): boolean {
  const count = Number(uni.getStorageSync(STORAGE_KEY) || 0)
  return count >= MAX_SSO_ATTEMPTS
}

function getSsoRedirectAttempts(): number {
  return Number(uni.getStorageSync(STORAGE_KEY) || 0)
}

function guardSsoRedirect(): boolean {
  const count = Number(uni.getStorageSync(STORAGE_KEY) || 0)
  if (count >= MAX_SSO_ATTEMPTS) {
    console.warn(`[sso-guard] SSO 跳转已达上限（${count}/${MAX_SSO_ATTEMPTS}），阻断强制跳转`)
    return false
  }
  const next = count + 1
  uni.setStorageSync(STORAGE_KEY, String(next))
  uni.setStorageSync(STORAGE_TS, String(Date.now()))
  console.log(`[sso-guard] SSO 跳转计数 ${next}/${MAX_SSO_ATTEMPTS}`)
  return true
}

function clearSsoRedirectAttempts(): void {
  uni.removeStorageSync(STORAGE_KEY)
  uni.removeStorageSync(STORAGE_TS)
}

export {
  MAX_SSO_ATTEMPTS,
  SSO_REDIRECT_TIMEOUT,
  clearSsoRedirectAttempts,
  getSsoRedirectAttempts,
  guardSsoRedirect,
  isSsoRedirectBlocked,
}
