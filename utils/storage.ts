const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export function getStorage(key: string): any {
  const value = uni.getStorageSync(key)
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return value
  }
}

export function setStorage(key: string, value: any): void {
  if (typeof value === 'string') {
    uni.setStorageSync(key, value)
  } else {
    uni.setStorageSync(key, JSON.stringify(value))
  }
}

export function removeStorage(key: string): void {
  uni.removeStorageSync(key)
}

export function setToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return uni.getStorageSync(TOKEN_KEY) ?? null
}

export function removeToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

export function setUser(user: any) {
  uni.setStorageSync(USER_KEY, JSON.stringify(user))
}

export function getUser(): any | null {
  const user = uni.getStorageSync(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function removeUser() {
  uni.removeStorageSync(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getRefreshToken(): string | null {
  return uni.getStorageSync('refresh_token') ?? null
}

export function setRefreshToken(token: string): void {
  uni.setStorageSync('refresh_token', token)
}

export function getTokenExpiresAt(): number | null {
  const val = uni.getStorageSync('token_expires_at')
  return val ? Number(val) : null
}

export function setTokenExpiresAt(timestamp: number): void {
  uni.setStorageSync('token_expires_at', String(timestamp))
}

export function isTokenExpiring(): boolean {
  const expiresAt = getTokenExpiresAt()
  if (!expiresAt) return false
  return Date.now() >= expiresAt
}

export function logout() {
  removeToken()
  removeUser()
  uni.removeStorageSync('refresh_token')
  uni.removeStorageSync('token_expires_at')
}

export function getLoginState() {
  return {
    isLoggedIn: isLoggedIn(),
    token: getToken(),
    user: getUser()
  }
}

export interface LoginState {
  token: string
  user: {
    id: number | string
    uuid?: string
    username?: string
    nickname?: string
    name?: string
    avatar?: string
    avatar_url?: string
    openid?: string
    channelId?: number | string
    channel?: string
  }
}

export function setLoginState(state: LoginState) {
  setToken(state.token)
  setUser(state.user)
}

export function clearLoginState() {
  logout()
}
