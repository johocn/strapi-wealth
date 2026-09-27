// activity_share 海报模板 —— 日期拆两行后的几何契约（不重叠 / 不越界 / 底部留白）
import { BUILTIN_TEMPLATES } from '../../utils/poster-templates'

const tpl: any = (BUILTIN_TEMPLATES as any).activity_share
const byKey = (k: string) => tpl.elements.find((e: any) => e.elementKey === k)

const STACK = ['title', 'activity_start', 'activity_end', 'activity_venue', 'main_info_badge', 'qr_code', 'footer_text']

describe('activity_share 模板', () => {
  it('删除 activity_time，改为 activity_start / activity_end 两个变量元素', () => {
    expect(tpl.elements.some((e: any) => e.elementKey === 'activity_time')).toBe(false)
    expect(byKey('activity_start')?.variableName).toBe('activity_start')
    expect(byKey('activity_end')?.variableName).toBe('activity_end')
  })

  it('变量清单同步：optional 换两行，required 不变', () => {
    expect(tpl.requiredVariables).toEqual(['title', 'qr_code'])
    expect(tpl.optionalVariables).toContain('activity_start')
    expect(tpl.optionalVariables).toContain('activity_end')
    expect(tpl.optionalVariables).not.toContain('activity_time')
  })

  it('结束行在开始行下方且为次级色（层级区分）', () => {
    const s = byKey('activity_start')
    const e = byKey('activity_end')
    expect(e.y).toBeGreaterThan(s.y)
    expect(s.fontColor).toBe('#1F2937')
    expect(e.fontColor).toBe('#6B7280')
  })

  it('所有元素在画布内，文本竖向不重叠，底部留白 ≥ 24', () => {
    const W = tpl.canvasWidth
    const H = tpl.canvasHeight
    for (const e of tpl.elements) {
      expect(e.x).toBeGreaterThanOrEqual(0)
      expect(e.y).toBeGreaterThanOrEqual(0)
      expect(e.x + e.width).toBeLessThanOrEqual(W)
      expect(e.y + e.height).toBeLessThanOrEqual(H)
    }

    const rows = STACK.map(byKey).sort((a: any, b: any) => a.y - b.y)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].y).toBeGreaterThanOrEqual(rows[i - 1].y + rows[i - 1].height)
    }

    const maxBottom = Math.max(...tpl.elements.map((e: any) => e.y + e.height))
    expect(H - maxBottom).toBeGreaterThanOrEqual(24)
  })
})