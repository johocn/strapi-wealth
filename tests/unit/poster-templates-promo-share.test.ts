// promo_share 海报模板 —— 日期拆两行后的几何契约（不重叠 / 不越界 / 底部留白）
import { BUILTIN_TEMPLATES } from '../../utils/poster-templates'

const tpl: any = (BUILTIN_TEMPLATES as any).promo_share
const byKey = (k: string) => tpl.elements.find((e: any) => e.elementKey === k)

const STACK = ['title', 'activity_start', 'activity_end', 'activity_venue', 'category_chip_1', 'main_push', 'goods_1', 'goods_2', 'goods_3', 'goods_4', 'qr_code', 'footer_text']

const CHIPS = ['category_chip_1', 'category_chip_2', 'category_chip_3', 'category_chip_4']

describe('promo_share 模板', () => {
  it('删除 activity_time，改为 activity_start / activity_end 两个变量元素', () => {
    expect(tpl.elements.some((e: any) => e.elementKey === 'activity_time')).toBe(false)
    expect(byKey('activity_start')?.variableName).toBe('activity_start')
    expect(byKey('activity_end')?.variableName).toBe('activity_end')
  })

  it('变量清单同步：optional 换两行，required 不变', () => {
    expect(tpl.requiredVariables).toEqual(['title', 'main_image', 'qr_code'])
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

describe('promo_share 每周市集新增元素', () => {
  it('新增 4 枚品类 chip + 1 条主推横条，变量名一一对应', () => {
    CHIPS.forEach((k, i) => {
      expect(byKey(k)?.variableName).toBe(`goods_category_${i + 1}`)
    })
    expect(byKey('category_chip_1')?.elementType).toBe('text')
    expect(byKey('main_push')?.variableName).toBe('main_push')
  })

  it('optionalVariables 追加 5 个新变量，required 不变', () => {
    for (const v of ['goods_category_1', 'goods_category_2', 'goods_category_3', 'goods_category_4', 'main_push']) {
      expect(tpl.optionalVariables).toContain(v)
    }
    expect(tpl.requiredVariables).toEqual(['title', 'main_image', 'qr_code'])
  })

  it('4 枚 chip 同行等宽、间距 12、不超出右边距 30', () => {
    const chips = CHIPS.map(byKey)
    chips.forEach((c: any) => {
      expect(c.y).toBe(614)
      expect(c.height).toBe(32)
      expect(c.width).toBe(126)
      expect(c.fontColor).toBe('#C2410C')
      expect(c.elementBgColor).toBe('#FDECE3')
      expect(c.textAlign).toBe('center')
      expect(c.x + c.width).toBeLessThanOrEqual(tpl.canvasWidth - 30)
    })
    for (let i = 1; i < chips.length; i++) {
      expect(chips[i].x).toBeGreaterThanOrEqual(chips[i - 1].x + chips[i - 1].width + 12)
    }
  })

  it('chip 带与主推横条夹在场所行与商品行之间，主推横条满宽暖底', () => {
    const venue = byKey('activity_venue')
    const chip = byKey('category_chip_1')
    const push = byKey('main_push')
    const goods1 = byKey('goods_1')
    expect(chip.y).toBeGreaterThanOrEqual(venue.y + venue.height)
    expect(push.y).toBeGreaterThanOrEqual(chip.y + chip.height)
    expect(goods1.y).toBeGreaterThanOrEqual(push.y + push.height)
    expect(push.x).toBe(30)
    expect(push.width).toBe(540)
    expect(push.height).toBe(44)
    expect(push.elementBgColor).toBe('#FDECE3')
  })
})