// 商户促销活动 —— 海报取数契约（复用 share-poster，不新增海报渲染器）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractPosterSlogan, pickCategoryChips } from '../../utils/poster-templates'

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

  it('海报日期带「开始时间：/结束时间：」前缀，且不再有硬编码「双节同庆」', () => {
    expect(src).toContain("formatDateTimeWithLabel(activity.value?.startTime, '开始时间：')")
    expect(src).toContain("formatDateTimeWithLabel(activity.value?.endTime, '结束时间：')")
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

  it('主图兜底文案与配色随活动走，透传 image_fallback_* 变量', () => {
    expect(src).toContain('const posterImageFallback = computed')
    expect(src).toContain('extractPosterSlogan(')
    expect(src).toContain('image_fallback_slogan:')
    expect(src).toContain('image_fallback_sign:')
    expect(src).toContain('image_fallback_primary:')
    expect(src).toContain('image_fallback_accent:')
  })

  it('透传品类 chips 与主推横条变量', () => {
    expect(src).toContain('pickCategoryChips(')
    expect(src).toContain('goods_category_1:')
    expect(src).toContain('goods_category_2:')
    expect(src).toContain('goods_category_3:')
    expect(src).toContain('goods_category_4:')
    expect(src).toContain('main_push:')
  })
})

describe('兜底图广告语填充链', () => {
  it('purpose 首个短句优先（理念向）', () => {
    expect(extractPosterSlogan([
      '扎根双阳，邻里超市。做有人情味的产品，开最有人情味的超市。',
      '10.1—10.8 双节同庆｜长春双阳优美惠市集生鲜超市',
      '进店免费领西瓜',
      '免费领西瓜｜优美惠双节钜惠',
    ])).toBe('扎根双阳，邻里超市')
  })

  it('跳过数字开头与超过 20 字的句子，回落到下一个来源', () => {
    expect(extractPosterSlogan([
      '10.1—10.8 双节同庆｜长春双阳优美惠市集生鲜超市',
      '进店免费领西瓜',
    ])).toBe('进店免费领西瓜')
  })

  it('全部来源为空时返回空串（不画广告语）', () => {
    expect(extractPosterSlogan([undefined, '', '   '])).toBe('')
  })

  it('超过 20 字的句子被跳过', () => {
    expect(extractPosterSlogan(['这是一句超过二十个字的超长广告语内容需要被跳过'])).toBe('')
  })
})

describe('海报品类 chips 取数', () => {
  const formConfig = [
    { key: 'items', type: 'textarea', label: '想吃的单品' },
    { key: 'categories', type: 'multi', label: '想要的品类', options: ['蔬菜', '水果', '肉禽蛋', '水产海鲜', '粮油调味'] },
    { key: 'phone', type: 'phone', label: '手机号' },
  ]

  it('取 categories 字段选项的前 4 项', () => {
    expect(pickCategoryChips(formConfig)).toEqual(['蔬菜', '水果', '肉禽蛋', '水产海鲜'])
  })

  it('固定返回长度 4，选项不足时补空串', () => {
    expect(pickCategoryChips([{ key: 'categories', type: 'multi', options: ['蔬菜', '水果'] }]))
      .toEqual(['蔬菜', '水果', '', ''])
  })

  it('无 categories 字段 / 非数组 / 空选项时返回 4 个空串', () => {
    expect(pickCategoryChips([{ key: 'phone', type: 'phone' }])).toEqual(['', '', '', ''])
    expect(pickCategoryChips(null)).toEqual(['', '', '', ''])
    expect(pickCategoryChips([{ key: 'categories', options: [] }])).toEqual(['', '', '', ''])
  })

  it('非字符串选项按空串处理，字符串选项去空白', () => {
    expect(pickCategoryChips([{ key: 'categories', options: [{ label: 'x' }, ' 水果 '] }]))
      .toEqual(['', '水果', '', ''])
  })
})
