import { formatDateTime } from '../../utils/promo-datetime'

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
})