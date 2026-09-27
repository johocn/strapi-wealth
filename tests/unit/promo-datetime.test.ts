import { formatDateTime, formatDateTimeWithLabel } from '../../utils/promo-datetime'

describe('promo-datetime', () => {
  it('固定 YYYY-MM-DD HH:mm，各段补零', () => {
    expect(formatDateTime('2026-01-01T08:30:00')).toBe('2026-01-01 08:30')
    expect(formatDateTime('2026-01-01T09:05:00')).toBe('2026-01-01 09:05')
  })

  it('24 小时制（18 点不转 12 小时）', () => {
    expect(formatDateTime('2026-01-01T18:00:00')).toBe('2026-01-01 18:00')
  })

  it('空值与非法时间返回空串（用于自动降级）', () => {
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })

  it('海报日期带前缀（开始时间：/ 结束时间：）', () => {
    expect(formatDateTimeWithLabel('2026-10-01T00:00:00', '开始时间：')).toBe('开始时间：2026-10-01 00:00')
    expect(formatDateTimeWithLabel('2026-10-08T23:59:00', '结束时间：')).toBe('结束时间：2026-10-08 23:59')
  })

  it('时间缺失时整体留空，不残留前缀（模板跳过该行）', () => {
    expect(formatDateTimeWithLabel(undefined, '开始时间：')).toBe('')
    expect(formatDateTimeWithLabel('', '结束时间：')).toBe('')
    expect(formatDateTimeWithLabel('not-a-date', '开始时间：')).toBe('')
  })
})