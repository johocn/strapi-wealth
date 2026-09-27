// 宣传页头部 —— 带图/无图共用要素与降级契约（沿用仓库 .vue 源码断言模式）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../components/promo/promo-cover.vue'), 'utf8')

describe('宣传页头部', () => {
  it('含状态徽章/标题/宣传重点/日期块/场地费用五要素', () => {
    for (const cls of ['cover-badge', 'cover-title', 'cover-highlight', 'cover-dates', 'cover-meta']) {
      expect(src).toContain(cls)
    }
  })

  it('宣传重点优先取 highlight，缺省回落副标题（同一要素不重复渲染）', () => {
    expect(src).toContain('props.config?.highlight || props.config?.subtitle')
  })

  it('日期开始/结束各自独立 v-if，缺一行只画一行', () => {
    expect(src).toMatch(/v-if="dateStart"/)
    expect(src).toMatch(/v-if="dateEnd"/)
  })

  it('日期使用统一 formatDateTime，不硬编码', () => {
    expect(src).toContain("from '../../utils/promo-datetime'")
    expect(src).toContain('formatDateTime(props.activity?.startTime)')
    expect(src).toContain('formatDateTime(props.activity?.endTime)')
  })

  it('draft 不渲染状态徽章，其余状态映射中文', () => {
    expect(src).toContain("s === 'signup_open'")
    expect(src).toContain("s === 'ongoing'")
    expect(src).toContain("s === 'ended' || s === 'archived'")
  })
})