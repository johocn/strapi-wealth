/**
 * 认证配置模块
 * 从后端获取认证配置，决定前端使用哪种登录方式
 * 适配自 strapi-course，精简了理财不需要的功能（积分/课程/主题等）
 */
import { request } from '../utils/request'
import { SITE_DOMAIN } from '../utils/env'

export interface AuthConfig {
  mode: 'local' | 'third' | 'sso'
  ssoLoginUrl: string | null
  ssoAppCode: string
  ssoEnabled: boolean
}

const DEFAULT_CONFIG: AuthConfig = {
  mode: 'local',
  ssoLoginUrl: null,
  ssoAppCode: 'wealth',
  ssoEnabled: false,
}

let cachedConfig: AuthConfig | null = null

/**
 * 获取认证配置（带内存缓存，应用生命周期内只请求一次）
 * 从 /zhao-common/v1/public/config 获取认证配置
 */
export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig) return cachedConfig

  try {
    const res = await request(`/zhao-common/v1/public/config?domain=${encodeURIComponent(SITE_DOMAIN)}`) as any
    const data = res?.data ?? res

    const config: AuthConfig = {
      mode: data?.auth?.mode ?? DEFAULT_CONFIG.mode,
      ssoLoginUrl: data?.auth?.ssoLoginUrl ?? DEFAULT_CONFIG.ssoLoginUrl,
      // 理财应用固定使用 wealth 作为 SSO app_code，不使用后端返回的 course
      ssoAppCode: 'wealth',
      ssoEnabled: data?.auth?.ssoEnabled ?? DEFAULT_CONFIG.ssoEnabled,
    }

    cachedConfig = config
    // 缓存到 storage 供同步读取
    uni.setStorageSync('authConfig', JSON.stringify(config))
    return config
  } catch (e) {
    console.warn('[auth-config] 获取认证配置失败，使用默认配置:', e)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 清除缓存（用于强制刷新）
 */
export function clearAuthConfigCache(): void {
  cachedConfig = null
  uni.removeStorageSync('authConfig')
}

/**
 * 从 storage 读取缓存的认证配置（同步）
 * App onLaunch 时已将配置存入 storage
 */
export function getStoredAuthConfig(): AuthConfig | null {
  try {
    const stored = uni.getStorageSync('authConfig')
    if (stored) {
      return typeof stored === 'string' ? JSON.parse(stored) as AuthConfig : stored as AuthConfig
    }
  } catch {
    // ignore
  }
  return null
}
