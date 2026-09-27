// 促销活动 —— 日期时间统一格式化（宣传页头部与分享海报共用）
// 固定 YYYY-MM-DD HH:mm（24 小时制、各段补零）；空值或非法时间返回空串，供调用方自动降级

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function formatDateTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 分享海报专用的带前缀文案（开始时间：/ 结束时间：）；时间缺失或非法时整体留空，交给模板跳过该行
export function formatDateTimeWithLabel(iso: string | undefined, label: string): string {
  const time = formatDateTime(iso)
  return time ? `${label}${time}` : ''
}