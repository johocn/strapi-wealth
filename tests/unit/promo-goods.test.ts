import { readFileSync } from 'fs'
import { resolve } from 'path'
import { normalizeGoodsList, goodsPriceText, PROMO_DEFAULT_GOODS_IMAGE } from '../../utils/promo-goods'

const goodsSrc = readFileSync(resolve(__dirname, '../../components/promo/promo-goods.vue'), 'utf8')

describe('promo-goods', () => {
  describe('normalizeGoodsList', () => {
    it('keeps single-side priced items', () => {
      const out = normalizeGoodsList([
        { name: 'A', originPrice: 100, promoPrice: 59 },
        { name: 'B', originPrice: '80' },
        { name: 'C', promoPrice: '9.9' },
      ])
      expect(out.map(g => g.name)).toEqual(['A', 'B', 'C'])
      expect(out[1].promoPrice).toBeNull()
      expect(out[2].originPrice).toBeNull()
    })

    it('drops items without any price', () => {
      expect(normalizeGoodsList([{ name: 'D' }, {}, null, 'x', 1])).toEqual([])
    })

    it('drops negative and non-numeric prices', () => {
      expect(normalizeGoodsList([{ name: 'E', promoPrice: -1, originPrice: 'abc' }])).toEqual([])
    })

    it('returns [] for non-array input', () => {
      expect(normalizeGoodsList(null)).toEqual([])
      expect(normalizeGoodsList({})).toEqual([])
    })

    it('trims name/desc/unit and keeps limitPerPerson numeric', () => {
      const out = normalizeGoodsList([{ name: ' F ', desc: ' 好物 ', unit: ' 斤 ', promoPrice: 5, limitPerPerson: '2' }])
      expect(out[0].name).toBe('F')
      expect(out[0].desc).toBe('好物')
      expect(out[0].unit).toBe('斤')
      expect(out[0].limitPerPerson).toBe(2)
    })
  })

  describe('goodsPriceText', () => {
    it('renders both prices', () => {
      expect(goodsPriceText({ originPrice: 100, promoPrice: 59 })).toEqual({ origin: '¥100', promo: '¥59' })
    })
    it('renders one side only', () => {
      expect(goodsPriceText({ originPrice: 80, promoPrice: null })).toEqual({ origin: '¥80', promo: '' })
      expect(goodsPriceText({ originPrice: null, promoPrice: 9.9 })).toEqual({ origin: '', promo: '¥9.9' })
    })
  })
})

describe('商品缩略图缺省占位', () => {
  it('缺省图指向 static 下的每周市集品牌图', () => {
    expect(PROMO_DEFAULT_GOODS_IMAGE).toBe('/static/youmeihui-weekly-market-default.jpg')
  })

  it('无图商品渲染缺省图而非留空', () => {
    expect(goodsSrc).toContain('<image v-else :src="PROMO_DEFAULT_GOODS_IMAGE"')
    expect(goodsSrc).toContain('PROMO_DEFAULT_GOODS_IMAGE')
  })
})
