// 活动页微信分享参数契约：小程序转发/朋友圈必须同时携带活动 id 与邀请码
// 渲染器/工具模块含 uni 全局与 import.meta，ts-jest 无法整体类型检查，故沿用仓库对 .vue 的源码契约断言写法
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const detailSrc = readFileSync(resolve(__dirname, '../../pages/activity/detail.vue'), 'utf8')
const promoSrc = readFileSync(resolve(__dirname, '../../pages/activity/promo.vue'), 'utf8')
const inviteSrc = readFileSync(resolve(__dirname, '../../utils/invite.ts'), 'utf8')

describe('活动详情页小程序分享', () => {
  it('注册页面级转发与朋友圈钩子（此前缺失，会退回 App.vue 全局兜底丢活动 id）', () => {
    expect(detailSrc).toContain('onShareAppMessage, onShareTimeline')
    expect(detailSrc).toContain('onShareAppMessage(() => ({')
    expect(detailSrc).toContain('onShareTimeline(() => ({')
  })

  it('转发路径与朋友圈 query 均同时带活动 id 和邀请码', () => {
    expect(detailSrc).toContain('getSharePath(`/pages/activity/detail?id=${id}`)')
    expect(detailSrc).toContain('getInviteQuery({ id })')
  })
})

describe('活动促销页小程序分享', () => {
  it('转发路径与朋友圈 query 均在 act 基础上补邀请码', () => {
    expect(promoSrc).toContain('getSharePath(`/pages/activity/promo?act=${act.value}`)')
    expect(promoSrc).toContain('getInviteQuery({ act: act.value })')
  })
})

describe('getInviteQuery', () => {
  it('已导出', () => {
    expect(inviteSrc).toContain('function getInviteQuery(')
    expect(inviteSrc).toContain('  getInviteQuery,')
  })

  it('与 getSharePath 共用同一邀请码来源，避免同页两套取值', () => {
    expect(inviteSrc).toMatch(
      /function getInviteQuery[\s\S]*?getInviteCode\(\)[\s\S]*?getUser\(\)\?\.id/,
    )
  })
})