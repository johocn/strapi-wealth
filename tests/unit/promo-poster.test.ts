// 商户促销活动 —— 海报取数契约（复用 share-poster，不新增海报渲染器）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../pages/activity/promo.vue'), 'utf8')

describe('促销海报取数', () => {
  it('posterConfig 计算属性存在', () => {
    expect(src).toContain('const posterConfig = computed')
  })

  it('日期拆为 activity_start / activity_end 两个变量，不再用 activity_time', () => {
    expect(src).toContain('activity_start:')
    expect(src).toContain('activity_end:')
    expect(src).not.toContain('activity_time:')
  })

  it('日期用 formatDateTime 格式化，不再有硬编码「双节同庆」', () => {
    expect(src).toContain('formatDateTime(activity.value?.startTime)')
    expect(src).toContain('formatDateTime(activity.value?.endTime)')
    expect(src).not.toContain('双节同庆')
  })

  it('商品行不再硬编码，首行取宣传重点（highlight 回落 subtitle）', () => {
    expect(src).not.toContain('进店免费领西瓜')
    expect(src).toContain('config?.highlight || cover?.config?.subtitle')
  })

  it('商品行仍每行 2 件并带促销价、最多 4 行', () => {
    expect(src).toContain('i += 2')
    expect(src).toContain('rows.length < 4')
    expect(src).toContain('promoPrice')
  })

  it('无图兜底：未配置 cover 模块时合成头部模块，页面按 renderModules 渲染', () => {
    expect(src).toContain('const renderModules = computed')
    expect(src).toContain("m?.type === 'cover'")
    expect(src).toContain('{ type: \'cover\', sort: 0, config: {} }')
    expect(src).toContain('v-for="m in renderModules"')
    expect(src).not.toContain('v-if="page?.activity && modules.length"')
  })
})