import UQRCode from "uqrcodejs";
import { BASE_URL } from "./env";
class PosterRenderer {
  canvasWidth;
  canvasHeight;
  contentEndY = 0;
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }
  /**
   * 主渲染入口
   * @param ctx H5: CanvasRenderingContext2D, 小程序: uni.createCanvasContext 返回值
   * @param template 模板配置
   * @param elements 已解析的元素数组
   * @param isH5 是否 H5 环境
   */
  async render(ctx, template, elements, isH5) {
    const width = template.canvasWidth || this.canvasWidth;
    const height = template.canvasHeight || this.canvasHeight;
    this.setFillStyle(ctx, template.backgroundColor || "#FFFFFF", isH5);
    this.fillRect(ctx, 0, 0, width, height, isH5);
    let maxY = 0;
    for (const element of elements) {
      try {
        await this.drawElement(ctx, element, isH5);
        const elementBottom = element.y + element.height;
        if (elementBottom > maxY)
          maxY = elementBottom;
      } catch (e) {
        console.warn(`[poster-renderer] \u7ED8\u5236\u5143\u7D20 ${element.elementKey} \u5931\u8D25:`, e);
      }
    }
    this.contentEndY = Math.ceil(maxY + 20);
  }
  // ==================== 元素分派 ====================
  async drawElement(ctx, element, isH5) {
    if (element.opacity !== void 0 && element.opacity < 1) {
      if (isH5) {
        ctx.globalAlpha = element.opacity;
      }
    }
    switch (element.elementType) {
      case "shape":
        this.drawShape(ctx, element, isH5);
        break;
      case "text":
        await this.drawText(ctx, element, isH5);
        break;
      case "image":
        await this.drawImage(ctx, element, isH5);
        break;
      case "qrcode":
        await this.drawQRCode(ctx, element, isH5);
        break;
    }
    if (isH5 && element.opacity !== void 0 && element.opacity < 1) {
      ctx.globalAlpha = 1;
    }
  }
  // ==================== Shape 绘制 ====================
  drawShape(ctx, element, isH5) {
    const { x, y, width, height, shapeType, shapeGradient, elementBgColor } = element;
    if (shapeType === "rect") {
      if (shapeGradient) {
        const gradient = this.createLinearGradient(ctx, x, y, x + width, y, isH5);
        this.addColorStop(gradient, 0, shapeGradient.from, isH5);
        this.addColorStop(gradient, 1, shapeGradient.to, isH5);
        this.setFillStyle(ctx, gradient, isH5);
        this.fillRect(ctx, x, y, width, height, isH5);
      } else if (elementBgColor) {
        const gradientColors = this.parseGradientColor(elementBgColor);
        if (gradientColors) {
          const gradient = this.createLinearGradient(ctx, x, y, x + width, y, isH5);
          this.addColorStop(gradient, 0, gradientColors[0], isH5);
          this.addColorStop(gradient, 1, gradientColors[1], isH5);
          this.setFillStyle(ctx, gradient, isH5);
        } else {
          this.setFillStyle(ctx, elementBgColor, isH5);
        }
        this.fillRect(ctx, x, y, width, height, isH5);
      }
    } else if (shapeType === "line") {
      this.setStrokeStyle(ctx, element.borderColor || "#cccccc", isH5);
      this.setLineWidth(ctx, element.borderWidth || 1, isH5);
      this.moveTo(ctx, x, y, isH5);
      this.lineTo(ctx, x + width, y, isH5);
      this.stroke(ctx, isH5);
    }
  }
  // ==================== Text 绘制 ====================
  async drawText(ctx, element, isH5) {
    const { x, y, width, height, fontSize, fontColor, fontWeight, fontFamily, textAlign, lineHeight } = element;
    const content = element.resolvedContent || element.defaultValue || "";
    if (!content)
      return;
    if (isH5) {
      ctx.font = `${fontWeight === "bold" ? "bold " : ""}${fontSize}px ${fontFamily || "sans-serif"}`;
      ctx.fillStyle = fontColor;
      ctx.textAlign = textAlign;
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.setFontSize(fontSize);
      ctx.setFillStyle(fontColor);
      ctx.setTextAlign(textAlign);
      ctx.setTextBaseline("alphabetic");
    }
    let textX = x;
    if (textAlign === "center") {
      textX = x + width / 2;
    } else if (textAlign === "right") {
      textX = x + width;
    }
    if (element.elementBgColor) {
      const bgColors = this.parseGradientColor(element.elementBgColor);
      if (bgColors) {
        const gradient = this.createLinearGradient(ctx, x, y, x + width, y, isH5);
        this.addColorStop(gradient, 0, bgColors[0], isH5);
        this.addColorStop(gradient, 1, bgColors[1], isH5);
        this.setFillStyle(ctx, gradient, isH5);
      } else {
        this.setFillStyle(ctx, element.elementBgColor, isH5);
      }
      if (element.borderRadius > 0) {
        this.drawRoundedRectPath(ctx, x, y, width, height, element.borderRadius, isH5);
        this.fill(ctx, isH5);
      } else {
        this.fillRect(ctx, x, y, width, height, isH5);
      }
      if (isH5) {
        ctx.fillStyle = fontColor;
      } else {
        ctx.setFillStyle(fontColor);
      }
    }
    if (element.borderWidth > 0) {
      this.setStrokeStyle(ctx, element.borderColor, isH5);
      this.setLineWidth(ctx, element.borderWidth, isH5);
      if (element.borderRadius > 0) {
        this.drawRoundedRectPath(ctx, x, y, width, height, element.borderRadius, isH5);
        this.stroke(ctx, isH5);
      } else {
        this.strokeRect(ctx, x, y, width, height, isH5);
      }
    }
    const fontPx = fontSize;
    const lineH = fontPx * (lineHeight || 1.5);
    const startY = y + fontPx;
    if (isH5) {
      this.wrapTextH5(ctx, content, textX, startY, width, lineH);
    } else {
      this.wrapTextMP(ctx, content, textX, startY, width, lineH, fontSize);
    }
  }
  // ==================== Image 绘制 ====================
  async drawImage(ctx, element, isH5) {
    const { x, y, width, height, borderRadius, imageFit } = element;
    const src = element.resolvedContent || element.defaultValue || "";
    if (!src) {
      this.drawImageFallback(ctx, element, isH5);
      return;
    }
    try {
      if (isH5) {
        const img = await this.loadImageH5(src);
        if (!img) {
          this.drawImageFallback(ctx, element, isH5);
          return;
        }
        if (borderRadius > 0 && borderRadius >= width / 2 - 1) {
          this.drawCircularImageH5(ctx, img, x, y, width);
        } else if (borderRadius > 0) {
          ctx.save();
          this.drawRoundedRectPath(ctx, x, y, width, height, borderRadius, true);
          ctx.clip();
          ctx.drawImage(img, x, y, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(img, x, y, width, height);
        }
      } else {
        const tempPath = await this.downloadImageMP(src);
        if (!tempPath) {
          this.drawImageFallback(ctx, element, isH5);
          return;
        }
        if (borderRadius > 0 && borderRadius >= width / 2 - 1) {
          this.drawCircularImageMP(ctx, tempPath, x, y, width);
        } else {
          ctx.drawImage(tempPath, x, y, width, height);
        }
      }
    } catch (e) {
      console.warn(`[poster-renderer] \u7ED8\u5236\u56FE\u7247 ${element.elementKey} \u5931\u8D25:`, e);
      this.drawImageFallback(ctx, element, isH5);
    }
  }
  // ==================== 主图兜底：公益理念宣传图 ====================
  /**
   * 主图缺省或加载失败时，在 main_image 同一矩形内绘制「公益理念宣传图」。
   * 底线：渐变色底 + 「益」徽记恒画，绝不出现白块；广告语 / 落款缺哪行不画哪行。
   * 文案与配色由 element.imageFallback 注入（模板解析阶段从页面变量带入，见 poster-templates）。
   */
  drawImageFallback(ctx, element, isH5) {
    const fb = element.imageFallback;
    if (!fb)
      return;
    const { x, y, width, height } = element;
    const radius = element.borderRadius || 0;
    const primary = fb.primary || "#EF4444";
    const accent = fb.accent || "#F97316";
    this.drawRoundedRectPath(ctx, x, y, width, height, radius, isH5);
    const gradient = this.createLinearGradient(ctx, x, y, x + width, y + height, isH5);
    this.addColorStop(gradient, 0, primary, isH5);
    this.addColorStop(gradient, 1, accent, isH5);
    this.setFillStyle(ctx, gradient, isH5);
    this.fill(ctx, isH5);
    if (this.isLightColor(primary) || this.isLightColor(accent)) {
      this.drawRoundedRectPath(ctx, x, y, width, height, radius, isH5);
      this.setFillStyle(ctx, "rgba(0,0,0,0.22)", isH5);
      this.fill(ctx, isH5);
    }
    const cx = x + width / 2;
    const cy = y + height * 0.3935;
    this.setStrokeStyle(ctx, "rgba(255,255,255,0.22)", isH5);
    this.setLineWidth(ctx, 2, isH5);
    const rings = [Math.round(width * 0.226), Math.round(width * 0.185)];
    for (const r of rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.stroke(ctx, isH5);
    }
    const badge = Math.round(width * 0.156);
    this.drawRoundedRectPath(ctx, cx - badge / 2, cy - badge / 2, badge, badge, Math.round(badge * 0.26), isH5);
    this.setFillStyle(ctx, "#FFFFFF", isH5);
    this.fill(ctx, isH5);
    const badgeFont = Math.round(badge * 0.55);
    this.drawFallbackText(ctx, "益", cx, cy + badgeFont * 0.35, badgeFont, primary, isH5, true);
    if (fb.slogan) {
      const sloganFont = Math.round(width * 0.0667);
      this.drawFallbackText(ctx, fb.slogan, cx, y + height * 0.7678, sloganFont, "#FFFFFF", isH5, true, width - 48);
    }
    if (fb.sign) {
      const signFont = Math.round(width * 0.0407);
      this.drawFallbackText(ctx, fb.sign, cx, y + height * 0.8667, signFont, "rgba(255,255,255,0.88)", isH5, false, width - 48);
    }
  }
  /** 兜底图文本：水平居中、基线对齐，超宽自动换行 */
  drawFallbackText(ctx, text, cx, baselineY, fontSize, fontColor, isH5, bold, maxWidth) {
    if (isH5) {
      ctx.font = `${bold ? "bold " : ""}${fontSize}px sans-serif`;
      ctx.fillStyle = fontColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.setFontSize(fontSize);
      ctx.setFillStyle(fontColor);
      ctx.setTextAlign("center");
      ctx.setTextBaseline("alphabetic");
    }
    const limit = maxWidth || Number.MAX_SAFE_INTEGER;
    if (isH5) {
      this.wrapTextH5(ctx, text, cx, baselineY, limit, fontSize * 1.4);
    } else {
      this.wrapTextMP(ctx, text, cx, baselineY, limit, fontSize * 1.4, fontSize);
    }
  }
  /** 颜色是否偏亮（决定是否叠加深色遮罩保白字对比度） */
  isLightColor(color) {
    const matched = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(String(color || "").trim());
    if (!matched)
      return false;
    let hex = matched[1];
    if (hex.length === 3)
      hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
  }
  // ==================== QRCode 绘制 ====================
  async drawQRCode(ctx, element, isH5) {
    const { x, y, qrSize, qrColor, qrBgColor } = element;
    const size = qrSize || element.width || 120;
    const content = element.resolvedContent || "";
    if (!content)
      return;
    try {
      const qr = new UQRCode();
      qr.data = content;
      qr.make();
      const modules = qr.modules;
      if (!modules || modules.length === 0)
        throw new Error("QR modules \u4E3A\u7A7A");
      const moduleCount = modules.length;
      const moduleSize = size / moduleCount;
      this.setFillStyle(ctx, qrBgColor || "#FFFFFF", isH5);
      this.fillRect(ctx, x, y, size, size, isH5);
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < modules[row].length; col++) {
          const cell = modules[row][col];
          const isDark = typeof cell === "object" ? cell?.isBlack : !!cell;
          if (isDark) {
            const mx = Math.floor(x + col * moduleSize);
            const my = Math.floor(y + row * moduleSize);
            const mw = Math.ceil(x + (col + 1) * moduleSize) - mx;
            const mh = Math.ceil(y + (row + 1) * moduleSize) - my;
            this.setFillStyle(ctx, qrColor || "#000000", isH5);
            this.fillRect(ctx, mx, my, mw, mh, isH5);
          }
        }
      }
    } catch (e) {
      console.error("[poster-renderer] \u751F\u6210\u4E8C\u7EF4\u7801\u5931\u8D25:", e);
    }
  }
  // ==================== 工具方法 ====================
  // --- 颜色/样式设置（H5/小程序兼容） ---
  setFillStyle(ctx, style, isH5) {
    if (isH5)
      ctx.fillStyle = style;
    else
      ctx.setFillStyle(style);
  }
  setStrokeStyle(ctx, style, isH5) {
    if (isH5)
      ctx.strokeStyle = style;
    else
      ctx.setStrokeStyle(style);
  }
  setLineWidth(ctx, width, isH5) {
    if (isH5)
      ctx.lineWidth = width;
    else
      ctx.setLineWidth(width);
  }
  fillRect(ctx, x, y, w, h, isH5) {
    ctx.fillRect(x, y, w, h);
  }
  strokeRect(ctx, x, y, w, h, isH5) {
    ctx.strokeRect(x, y, w, h);
  }
  fill(ctx, isH5) {
    ctx.fill();
  }
  stroke(ctx, isH5) {
    ctx.stroke();
  }
  moveTo(ctx, x, y, isH5) {
    ctx.moveTo(x, y);
  }
  lineTo(ctx, x, y, isH5) {
    ctx.lineTo(x, y);
  }
  createLinearGradient(ctx, x0, y0, x1, y1, isH5) {
    return ctx.createLinearGradient(x0, y0, x1, y1);
  }
  addColorStop(gradient, offset, color, isH5) {
    gradient.addColorStop(offset, color);
  }
  // --- 圆角矩形路径 ---
  drawRoundedRectPath(ctx, x, y, w, h, r, isH5) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  // --- 文字换行 ---
  wrapTextH5(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split("");
    let line = "";
    let currentY = y;
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, currentY);
        line = chars[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
  wrapTextMP(ctx, text, x, y, maxWidth, lineHeight, fontSize) {
    const charWidth = fontSize;
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);
    let line = "";
    let currentY = y;
    for (let i = 0; i < text.length; i++) {
      line += text[i];
      if (line.length >= maxCharsPerLine) {
        ctx.fillText(line, x, currentY);
        line = "";
        currentY += lineHeight;
      }
    }
    if (line)
      ctx.fillText(line, x, currentY);
  }
  // --- 图片加载 ---
  loadImageH5(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => {
          console.warn("[poster-renderer] \u56FE\u7247\u52A0\u8F7D\u5931\u8D25:", src);
          resolve(null);
        };
        img2.src = src;
      };
      img.src = src;
    });
  }
  downloadImageMP(url) {
    return new Promise((resolve) => {
      const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
      uni.downloadFile({
        url: fullUrl,
        success: (res) => {
          if (res.statusCode === 200)
            resolve(res.tempFilePath);
          else
            resolve(null);
        },
        fail: () => resolve(null)
      });
    });
  }
  // --- 圆形头像 ---
  drawCircularImageH5(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  }
  drawCircularImageMP(ctx, imgPath, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgPath, x, y, size, size);
    ctx.restore();
  }
  // --- 渐变色解析 ---
  /**
   * 解析 #gradient:from,to 格式的颜色字符串
   * 返回 [from, to] 或 null（非渐变色）
   */
  parseGradientColor(color) {
    if (!color)
      return null;
    if (color.startsWith("#gradient:")) {
      const parts = color.substring(10).split(",");
      if (parts.length >= 2)
        return parts.map((p) => p.startsWith("#") ? p : `#${p}`);
    }
    return null;
  }
}
export {
  PosterRenderer
};
