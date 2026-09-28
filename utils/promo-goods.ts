// 商户促销活动 —— 商品清单归一化与价格文案（纯函数，供 promo-goods.vue 使用）

/** 商品缩略图缺省占位：优美惠市集每周市集品牌图（随 C 端发布，不走运行时接口） */
export const PROMO_DEFAULT_GOODS_IMAGE = '/static/youmeihui-weekly-market-default.jpg'

export interface PromoGood {
  name: string
  image: string
  originPrice: number | null
  promoPrice: number | null
  unit: string
  limitPerPerson: number | null
  desc: string
}

/** 价格归一：空/非数字/负数 → null（表示该侧不展示） */
function toPrice(v: any): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** 归一化商品清单：丢弃非对象项与「原价/促销价皆缺」的项 */
export function normalizeGoodsList(raw: any): PromoGood[] {
  if (!Array.isArray(raw)) return []
  const out: PromoGood[] = []
  for (const it of raw) {
    if (!it || typeof it !== 'object' || Array.isArray(it)) continue
    const originPrice = toPrice(it.originPrice)
    const promoPrice = toPrice(it.promoPrice)
    if (originPrice === null && promoPrice === null) continue
    out.push({
      name: typeof it.name === 'string' ? it.name.trim() : '',
      image: typeof it.image === 'string' ? it.image : '',
      originPrice,
      promoPrice,
      unit: typeof it.unit === 'string' ? it.unit.trim() : '',
      limitPerPerson: toPrice(it.limitPerPerson),
      desc: typeof it.desc === 'string' ? it.desc.trim() : '',
    })
  }
  return out
}

/** 价格文案：origin 为划线原价，promo 为促销价；缺值为空串 */
export function goodsPriceText(g: Pick<PromoGood, 'originPrice' | 'promoPrice'>): { origin: string; promo: string } {
  return {
    origin: g.originPrice == null ? '' : `¥${g.originPrice}`,
    promo: g.promoPrice == null ? '' : `¥${g.promoPrice}`,
  }
}