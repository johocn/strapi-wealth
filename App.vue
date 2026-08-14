<script>
import { routeGuard } from './utils/auth'
import { fetchAuthConfig } from './services/auth-config'
import { isLoggedIn } from './utils/storage'
import { guardSsoRedirect, isSsoRedirectBlocked } from './utils/sso-guard'

export default {
  onLaunch: function() {
    console.log('App Launch')
    // 注册路由守卫拦截器
    uni.addInterceptor('navigateTo', routeGuard)
    uni.addInterceptor('switchTab', routeGuard)

    // #ifdef H5
    // SSO 模式下，未登录时自动跳转 SSO
    if (typeof window !== 'undefined') {
      // 在 auth-callback 页面时不跳转（SSO 回调处理）
      const hash = window.location.hash || ''
      if (hash.includes('pages/auth-callback')) {
        return
      }

      // 异步获取认证配置，判断是否需要 SSO 跳转
      fetchAuthConfig().then(config => {
        if (config.mode === 'sso' && config.ssoLoginUrl && !isLoggedIn()) {
          if (isSsoRedirectBlocked()) {
            console.error('[App] SSO 跳转已达上限，阻断')
            uni.showModal({
              title: '登录异常',
              content: 'SSO 登录跳转次数过多，请检查 SSO 配置后清除缓存重试',
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
        }
      }).catch(err => {
        console.warn('[App] 获取认证配置失败:', err)
      })
    }
    // #endif
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
:root {
  --brand-primary: #667eea;
  --brand-secondary: #f5f5f5;
  --brand-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
page {
  background-color: var(--brand-secondary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
