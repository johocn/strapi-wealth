// 商户促销活动 —— C 端一致性契约测试
// 锁死：页面白名单 ↔ 组件文件 ↔ 分发分支，杜绝「加了类型忘了分发」的静默不渲染
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

/** C 端白名单期望清单（16 类 = 管理端 15 类 + floatContact） */
const EXPECTED = [
  'cover', 'info', 'rich', 'highlights', 'speakers', 'agenda', 'images',
  'rewards', 'contact', 'message', 'faq', 'custom', 'floatContact',
  'goods', 'purpose', 'notice',
]

/** type → 组件文件（floatContact 复用通用悬浮组件，文件名不遵循 promo- 前缀） */
const COMPONENT_FILE: Record<string, string> = {
  floatContact: 'components/promo/float-contact.vue',
}

const extractSet = (src: string): string[] => {
  const m = src.match(/const PROMO_TYPE_SET = new Set\(\[([\s\S]*?)\]\)/)
  if (!m) throw new Error('未找到 PROMO_TYPE_SET')
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])
}

describe('promo-module-contract', () => {
  // 两个页面的既有白名单书写顺序不同（detail.vue 把 faq/custom 前置），只锁集合不锁顺序
  it('promo.vue 白名单与期望清单一致', () => {
    expect(extractSet(read('pages/activity/promo.vue')).sort()).toEqual([...EXPECTED].sort())
  })

  it('detail.vue 白名单与期望清单一致', () => {
    expect(extractSet(read('pages/activity/detail.vue')).sort()).toEqual([...EXPECTED].sort())
  })

  it('每个类型都有组件文件', () => {
    for (const type of EXPECTED) {
      const file = COMPONENT_FILE[type] || `components/promo/promo-${type}.vue`
      expect(existsSync(resolve(root, file))).toBe(true)
    }
  })

  it('每个类型在两个页面都有分发分支', () => {
    const promo = read('pages/activity/promo.vue')
    const detail = read('pages/activity/detail.vue')
    for (const type of EXPECTED) {
      expect(promo.includes(`m.type === '${type}'`)).toBe(true)
      expect(detail.includes(`m.type === '${type}'`)).toBe(true)
    }
  })
})