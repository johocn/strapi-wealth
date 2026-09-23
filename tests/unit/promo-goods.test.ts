import { normalizeGoodsList, goodsPriceText } from '../../utils/promo-goods'

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