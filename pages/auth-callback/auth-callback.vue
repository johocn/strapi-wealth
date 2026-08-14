<!--
  理财应用 SSO 回调页

  SSO 模式下：
  1. SSO 后端认证成功后 302 回本页：auth-callback?token=xxx&user=base64(json)&refresh_token=xxx&expires_in=900
  2. 本页从 URL 提取 token、user、refresh_token，存入 storage
  3. 跳转首页 /pages/hall/index

  与 strapi-course 的区别：不处理 zhao-third 回调（无 code 分支），不绑定邀请码
-->
<template>
  <view class="auth-callback">
    <view class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">{{ statusText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { setToken, setUser } from '../../utils/storage'
import { clearSsoRedirectAttempts } from '../../utils/sso-guard'

const statusText = ref('登录中...')

onMounted(async () => {
  // #ifdef H5
  await handleSsoCallback()
  // #endif
  // #ifndef H5
  uni.reLaunch({ url: '/pages/hall/index' })
  // #endif
})

// #ifdef H5
async function handleSsoCallback() {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const hashQuery = window.location.hash.split('?')[1] || ''
    const hashParams = new URLSearchParams(hashQuery)

    // 兼容 search 和 hash 两种参数位置
    const token = urlParams.get('token') || hashParams.get('token')
    const userId = urlParams.get('userId') || hashParams.get('userId')
    const userEncoded = urlParams.get('user') || hashParams.get('user')
    const isNew = urlParams.get('isNew') || hashParams.get('isNew')
    const error = urlParams.get('error') || hashParams.get('error')

    if (error) {
      statusText.value = `登录失败: ${decodeURIComponent(error)}`
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/hall/index' })
      }, 2000)
      return
    }

    if (!token) {
      statusText.value = '授权失败，正在跳转...'
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/hall/index' })
      }, 1500)
      return
    }

    // 1. 保存 token
    setToken(token)

    // 2. 保存 refresh_token 和过期时间（关键：否则 token 过期后无法刷新）
    const refreshTokenVal = urlParams.get('refresh_token') || hashParams.get('refresh_token') || ''
    const expiresInVal = urlParams.get('expires_in') || hashParams.get('expires_in') || '900'
    if (refreshTokenVal) {
      uni.setStorageSync('refresh_token', refreshTokenVal)
      // 提前 60 秒标记过期，触发主动刷新
      uni.setStorageSync('token_expires_at', String(Date.now() + (Number(expiresInVal) - 60) * 1000))
    }

    // 3. 解析并保存用户信息（base64 编码的 JSON）
    if (userEncoded) {
      try {
        const user = JSON.parse(decodeURIComponent(atob(userEncoded)))
        setUser(user)
      } catch {
        if (userId) setUser({ id: Number(userId) })
      }
    } else if (userId) {
      setUser({ id: Number(userId) })
    }

    // 4. 首登标识
    if (isNew === '1' || isNew === 'true') {
      uni.setStorageSync('isNewUser', '1')
    }

    // 5. 清理 SSO 防循环计数
    clearSsoRedirectAttempts()

    // 6. 清理 URL 参数（安全）
    window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0])

    statusText.value = '登录成功，正在跳转...'

    // 7. 跳转首页
    setTimeout(() => {
      uni.switchTab({ url: '/pages/hall/index' })
    }, 500)
  } catch (err: any) {
    console.error('[auth-callback] SSO 登录失败:', err)
    statusText.value = '登录失败，正在跳转...'
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/hall/index' })
    }, 1500)
  }
}
// #endif
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 30rpx;
  color: #666;
}
</style>
