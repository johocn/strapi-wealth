// 活动详情页海报取数契约：activity_share 模板日期拆为起止两行
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../pages/activity/detail.vue'), 'utf8')

describe('活动详情页海报取数', () => {
  it('传入 activity_start / activity_end，不再用一行 activity_time', () => {
    expect(src).toContain('activity_start:')
    expect(src).toContain('activity_end:')
    expect(src).not.toContain('activity_time:')
  })

  it('起止时间各自独立格式化并带前缀（缺值整体为空，模板按行降级隐藏）', () => {
    expect(src).toContain("activity_start: formatTimeLabel(activity?.startTime, '开始时间：')")
    expect(src).toContain("activity_end: formatTimeLabel(activity?.endTime, '结束时间：')")
    expect(src).toContain('function formatTimeLabel')
    expect(src).toContain('return time ? `${label}${time}` : \'\'')
  })
})