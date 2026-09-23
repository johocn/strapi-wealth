// 商户促销活动 —— 到店核销入口契约
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const goodsSrc = readFileSync(resolve(__dirname, '../../components/promo/promo-goods.vue'), 'utf8')

describe('促销到店核销入口', () => {
  it('展示到店核销说明', () => {
    expect(goodsSrc).toContain('到店核销')
  })
  it('提示出示报名签到码，不涉及线上抵扣', () => {
    expect(goodsSrc).toContain('报名签到码')
    expect(goodsSrc).not.toContain('线上抵扣')
  })
})