import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:1337',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/uni.scss";'
      }
    }
  }
})
