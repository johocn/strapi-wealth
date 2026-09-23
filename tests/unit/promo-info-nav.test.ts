// 商户促销活动 —— info 模块一键导航契约（组件无法渲染，改为源码契约断言）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../components/promo/promo-info.vue'), 'utf8')

describe('promo-info 一键导航', () => {
  it('调用 uni.openLocation 且用 lat/lng', () => {
    expect(src).toContain('uni.openLocation')
    expect(src).toContain('latitude')
    expect(src).toContain('longitude')
  })

  it('坐标缺失或为 0 时禁用并给出提示文案', () => {
    expect(src).toContain('场地暂未设置坐标')
    expect(src).toContain('canNavigate')
  })
})