import { computeScarcity, formatCountdown } from '../../utils/promo-scarcity'

const HOUR = 3600 * 1000

describe('promo-scarcity', () => {
  describe('formatCountdown', () => {
    it('formats days + hh:mm:ss', () => {
      expect(formatCountdown(2 * 24 * HOUR + 3 * HOUR + 4 * 60 * 1000 + 5 * 1000)).toBe('2天03:04:05')
    })
    it('formats hh:mm:ss when under a day', () => {
      expect(formatCountdown(3 * HOUR + 4 * 60 * 1000 + 5 * 1000)).toBe('03:04:05')
    })
  })

  describe('computeScarcity', () => {
    const now = new Date('2026-09-24T10:00:00+08:00').getTime()

    it('visible with countdown + progress while ongoing', () => {
      const s = computeScarcity(
        { startTime: '2026-09-24T08:00:00+08:00', endTime: '2026-09-24T14:00:00+08:00', capacity: 100, usedCapacity: 40 },
        now
      )
      expect(s.visible).toBe(true)
      expect(s.ended).toBe(false)
      expect(s.soldOut).toBe(false)
      expect(s.remaining).toBe(60)
      expect(s.progress).toBe(40)
      expect(s.countdown).toBe('04:00:00')
    })

    it('hidden when ended', () => {
      const s = computeScarcity({ endTime: '2026-09-24T09:00:00+08:00', capacity: 10, usedCapacity: 3 }, now)
      expect(s.visible).toBe(false)
      expect(s.ended).toBe(true)
    })

    it('hidden when full', () => {
      const s = computeScarcity({ endTime: '2026-09-24T14:00:00+08:00', capacity: 10, usedCapacity: 10 }, now)
      expect(s.visible).toBe(false)
      expect(s.soldOut).toBe(true)
      expect(s.remaining).toBe(0)
    })

    it('hidden when no meaningful data', () => {
      expect(computeScarcity({}, now).visible).toBe(false)
      expect(computeScarcity({ capacity: 0, usedCapacity: 0 }, now).visible).toBe(false)
    })

    it('clamps progress into 0..100 and never negative remaining', () => {
      const s = computeScarcity({ endTime: '2026-09-24T14:00:00+08:00', capacity: 10, usedCapacity: 99 }, now)
      expect(s.progress).toBe(100)
      expect(s.remaining).toBe(0)
    })
  })
})