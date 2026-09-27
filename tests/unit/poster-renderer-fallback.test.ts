// 分享海报 —— 主图无图 / 加载失败时的「公益理念宣传图」兜底绘制契约
// 说明：poster-renderer 为松散类型的历史模块（大量隐式 any / uni 全局），ts-jest 无法整体类型检查，
// 沿用仓库对模板与 .vue 的源码契约断言方式，锁定兜底绘制的关键常量与降级分支。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../../utils/poster-renderer.ts'), 'utf8')

describe('主图兜底绘制契约', () => {
  it('drawImage 在无图、H5 加载失败、小程序加载失败、异常四处都回落兜底', () => {
    const drawImage = src.slice(src.indexOf('async drawImage('), src.indexOf('drawImageFallback(ctx, element, isH5) {'))
    expect(drawImage.match(/this\.drawImageFallback\(ctx, element, isH5\)/g)).toHaveLength(4)
  })

  it('未注入兜底数据时不绘制（非 main_image 元素）', () => {
    expect(src).toMatch(/const fb = element\.imageFallback;\s*\n\s*if \(!fb\)\s*\n\s*return;/)
  })

  it('渐变底覆盖 main_image 同一矩形，走向右上到左下', () => {
    expect(src).toContain('this.createLinearGradient(ctx, x, y, x + width, y + height, isH5)')
    expect(src).toContain('this.addColorStop(gradient, 0, primary, isH5)')
    expect(src).toContain('this.addColorStop(gradient, 1, accent, isH5)')
    expect(src).toContain('const primary = fb.primary || "#EF4444";')
    expect(src).toContain('const accent = fb.accent || "#F97316";')
  })

  it('主色偏亮时叠加深色遮罩保白字对比度', () => {
    expect(src).toContain('if (this.isLightColor(primary) || this.isLightColor(accent))')
    expect(src).toContain('this.setFillStyle(ctx, "rgba(0,0,0,0.22)", isH5)')
    expect(src).toContain('/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/')
  })

  it('恒画两层同心圆描边（白 22%）与「益」徽记', () => {
    expect(src).toContain('this.setStrokeStyle(ctx, "rgba(255,255,255,0.22)", isH5)')
    expect(src).toContain('const rings = [Math.round(width * 0.226), Math.round(width * 0.185)];')
    expect(src).toContain('const badge = Math.round(width * 0.156);')
    expect(src).toContain('this.drawFallbackText(ctx, "益", cx, cy + badgeFont * 0.35, badgeFont, primary, isH5, true)')
  })

  it('广告语与落款缺哪行不画哪行', () => {
    expect(src).toContain('if (fb.slogan) {')
    expect(src).toContain('if (fb.sign) {')
    expect(src).toContain('this.drawFallbackText(ctx, fb.slogan, cx, y + height * 0.7678, sloganFont, "#FFFFFF", isH5, true, width - 48)')
    expect(src).toContain('this.drawFallbackText(ctx, fb.sign, cx, y + height * 0.8667, signFont, "rgba(255,255,255,0.88)", isH5, false, width - 48)')
  })

  it('兜底文案超宽自动换行、水平居中', () => {
    expect(src).toContain('ctx.textAlign = "center"')
    expect(src).toContain('this.wrapTextH5(ctx, text, cx, baselineY, limit, fontSize * 1.4)')
    expect(src).toContain('this.wrapTextMP(ctx, text, cx, baselineY, limit, fontSize * 1.4, fontSize)')
  })
})

describe('兜底数据注入契约', () => {
  const templates = readFileSync(resolve(__dirname, '../../utils/poster-templates.ts'), 'utf8')
  const sharePoster = readFileSync(resolve(__dirname, '../../components/share-poster/share-poster.vue'), 'utf8')

  it('模板解析把 image_fallback_* 挂到 main_image 元素', () => {
    expect(templates).toContain('function buildImageFallback(')
    expect(templates).toContain('resolved.elementType === "image" && resolved.variableName === "main_image"')
    expect(templates).toContain('resolved.imageFallback = imageFallback;')
  })

  it('服务端模板路径同样补齐兜底数据', () => {
    expect(sharePoster).toContain("import { resolveTemplateLocal, BUILTIN_TEMPLATES, buildImageFallback }")
    expect(sharePoster).toContain("el.elementType === 'image' && el.variableName === 'main_image'")
  })
})