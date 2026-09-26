// C 端活动详情 —— 场地一键导航契约（页面无法渲染，改为源码契约断言）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../pages/activity/detail.vue'), 'utf8')

describe('活动详情 场地导航', () => {
  it('场地行绑定点击并仅在坐标可用时展示导航提示', () => {
    expect(src).toContain('@click="openVenueLocation"')
    expect(src).toContain(`:class="{ 'info-value--nav': canNavigateVenue }"`)
    expect(src).toContain('v-if="canNavigateVenue"')
    expect(src).toContain('nav-hint')
  })

  it('调用 uni.openLocation 并传 venueCoord 解析出的经纬度', () => {
    expect(src).toContain('uni.openLocation')
    expect(src).toContain('latitude: c.lat')
    expect(src).toContain('longitude: c.lng')
  })

  it('坐标优先取场地主档，回落活动自身经纬度', () => {
    expect(src).toContain('venueCoord')
    expect(src).toContain('a?.venue?.lat ?? a?.lat')
    expect(src).toContain('a?.venue?.lng ?? a?.lng')
  })

  it('坐标缺失或为 0 时不导航，给出提示文案', () => {
    expect(src).toContain('场地暂未设置坐标')
    expect(src).toContain('lat !== 0 && lng !== 0')
    expect(src).toContain('if (!c.valid)')
  })

  it('导航卡片名称按 场地名 → 活动场地名 → 兜底文案 取值', () => {
    expect(src).toContain(`activity.value?.venue?.name || activity.value?.venueName || '活动场地'`)
  })
})