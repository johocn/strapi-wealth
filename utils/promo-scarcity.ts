// 商户促销活动 —— 稀缺转化计算（纯函数，供 promo-scarcity.vue 使用）

export interface ScarcityInput {
  startTime?: string
  endTime?: string
  capacity?: number | null
  usedCapacity?: number | null
}

export interface ScarcityState {
  visible: boolean
  ended: boolean
  soldOut: boolean
  remaining: number
  progress: number
  used: number
  capacity: number
  countdown: string
}

/** 毫秒 → 「2天03:04:05」/「03:04:05」；<=0 返回 00:00:00 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`
  return days > 0 ? `${days}天${hms}` : hms
}

/** 名额已满或活动已结束 → visible=false（不输出空壳） */
export function computeScarcity(input: ScarcityInput, now: number = Date.now()): ScarcityState {
  const capacity = Number(input.capacity) > 0 ? Number(input.capacity) : 0
  const used = Number(input.usedCapacity) > 0 ? Number(input.usedCapacity) : 0
  const remaining = capacity > 0 ? Math.max(0, capacity - used) : 0
  const progress = capacity > 0 ? Math.min(100, Math.max(0, Math.round((used / capacity) * 100))) : 0

  const endMs = input.endTime ? new Date(input.endTime).getTime() : NaN
  const hasEnd = Number.isFinite(endMs)
  const ended = hasEnd ? endMs <= now : false
  const soldOut = capacity > 0 && used >= capacity

  const started = input.startTime ? new Date(input.startTime).getTime() : NaN
  const notStarted = Number.isFinite(started) && started > now

  const hasCountdown = hasEnd && !ended
  const visible = !ended && !soldOut && (hasCountdown || capacity > 0 || notStarted)

  return {
    visible,
    ended,
    soldOut,
    remaining,
    progress,
    used,
    capacity,
    countdown: hasCountdown ? formatCountdown(endMs - now) : '',
  }
}