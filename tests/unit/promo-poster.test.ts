// 商户促销活动 —— 海报取数契约（复用 share-poster，不新增海报渲染器）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../pages/activity/promo.vue'), 'utf8')

describe('促销海报取数', () => {
  it('posterConfig 计算属性存在', () => {
    expect(src).toContain('const posterConfig = computed')
  })
  it('海报变量注入促销商品摘要 goodsSummary', () => {
    expect(src).toContain('goodsSummary')
    expect(src).toMatch(/summary:\s*(goodsSummary|.*goodsSummary)/)
  })
  it('商品摘要最多取 3 件并带促销价', () => {
    expect(src).toContain('slice(0, 3)')
    expect(src).toContain('promoPrice')
  })
})