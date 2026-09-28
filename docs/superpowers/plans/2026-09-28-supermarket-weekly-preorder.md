# 优美惠市集超市·每周预订反向营销 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「优美惠市集·每周市集」反向预订营销交付可复用运营物料：`promo_share` 海报新增品类 chips 与主推横条、活动页变量透传、商品行缺省图，其余靠后台配置复用现有活动体系。

**Architecture:** 不新增后端能力，只做三处最小改造——①C 端内置海报模板 `BUILTIN_TEMPLATES.promo_share` 加 5 个可选 text 元素并整体上移位移；②运营端落库脚本 `seed-poster-templates.cjs` 逐值同步同一模板；③`promo.vue` 按 `formConfig` 与推荐位 `custom` 模块算出 5 个新变量透传给现有海报链路。渲染器 `poster-renderer.ts`、活动/海报数据模型、报名链路全部不动。

**Tech Stack:** uni-app(Vue3) H5 / TypeScript / Jest / Strapi v5 插件 `zhao-studio` / Canvas 海报渲染。

**设计文档:** `e:\code\shao\docs\superpowers\specs\2026-09-28-supermarket-weekly-preorder-design.md`

---

## 硬约束（全程不得违反）

- 不改 `poster-renderer.ts`、不改活动/海报数据模型、不改报名/发分链路。
- 新元素**全部可选**：变量为空时 `drawText` 早退，连底色都不画。
- 必须继续满足现有单测 `poster-templates-promo-share.test.ts` 的几何契约：所有元素在画布内、STACK 竖向不重叠、**底部留白 ≥ 24px**。
- 模板定义两处必须逐值一致：`shao/utils/poster-templates.ts` 与 `basic/scripts/seed-poster-templates.cjs`。
- 两个仓库分开提交：`e:\code\shao`、`e:\code\basic`。

## File Structure

| 文件 | 动作 | 职责 |
|---|---|---|
| `e:\code\shao\utils\poster-templates.ts` | Modify | `promo_share` 模板定义（5 新元素 + 位移 + optionalVariables）；新增导出 `pickCategoryChips` |
| `e:\code\basic\scripts\seed-poster-templates.cjs` | Modify | `PROMO_SHARE` 逐值同步（落库到 `zhao-studio`） |
| `e:\code\shao\pages\activity\promo.vue` | Modify | `posterConfig` 计算 5 个新变量并透传 |
| `e:\code\shao\utils\promo-goods.ts` | Modify | 新增常量 `PROMO_DEFAULT_GOODS_IMAGE` |
| `e:\code\shao\components\promo\promo-goods.vue` | Modify | 商品行无缩略图时用缺省图占位 |
| `e:\code\shao\static\youmeihui-weekly-market-default.jpg` | Create | 缺省图（750×750，暖底 + 8 品类图标网格） |
| `e:\code\shao\tests\unit\poster-templates-promo-share.test.ts` | Modify | 新元素几何与变量断言 |
| `e:\code\shao\tests\unit\promo-poster.test.ts` | Modify | `pickCategoryChips` 行为 + `promo.vue` 变量透传断言 |
| `e:\code\shao\tests\unit\promo-goods.test.ts` | Modify | 缺省图常量与组件占位断言 |

---

### Task 1: `promo_share` 模板几何与新增元素（C 端内置兜底）

**Files:**
- Modify: `e:\code\shao\utils\poster-templates.ts`（`promoShareTemplate`，当前 L585-L781）
- Test: `e:\code\shao\tests\unit\poster-templates-promo-share.test.ts`

- [ ] **Step 1: 写失败测试**

把 [poster-templates-promo-share.test.ts](file:///e:/code/shao/tests/unit/poster-templates-promo-share.test.ts) 的 `STACK` 常量（L7）替换为：

```ts
const STACK = ['title', 'activity_start', 'activity_end', 'activity_venue', 'category_chip_1', 'main_push', 'goods_1', 'goods_2', 'goods_3', 'goods_4', 'qr_code', 'footer_text']

const CHIPS = ['category_chip_1', 'category_chip_2', 'category_chip_3', 'category_chip_4']
```

并在文件末尾（最后一个 `})` 之前）追加：

```ts
describe('promo_share 每周市集新增元素', () => {
  it('新增 4 枚品类 chip + 1 条主推横条，变量名一一对应', () => {
    CHIPS.forEach((k, i) => {
      expect(byKey(k)?.variableName).toBe(`goods_category_${i + 1}`)
    })
    expect(byKey('category_chip_1')?.elementType).toBe('text')
    expect(byKey('main_push')?.variableName).toBe('main_push')
  })

  it('optionalVariables 追加 5 个新变量，required 不变', () => {
    for (const v of ['goods_category_1', 'goods_category_2', 'goods_category_3', 'goods_category_4', 'main_push']) {
      expect(tpl.optionalVariables).toContain(v)
    }
    expect(tpl.requiredVariables).toEqual(['title', 'main_image', 'qr_code'])
  })

  it('4 枚 chip 同行等宽、间距 12、不超出右边距 30', () => {
    const chips = CHIPS.map(byKey)
    chips.forEach((c: any) => {
      expect(c.y).toBe(614)
      expect(c.height).toBe(32)
      expect(c.width).toBe(126)
      expect(c.fontColor).toBe('#C2410C')
      expect(c.elementBgColor).toBe('#FDECE3')
      expect(c.textAlign).toBe('center')
      expect(c.x + c.width).toBeLessThanOrEqual(tpl.canvasWidth - 30)
    })
    for (let i = 1; i < chips.length; i++) {
      expect(chips[i].x).toBeGreaterThanOrEqual(chips[i - 1].x + chips[i - 1].width + 12)
    }
  })

  it('chip 带与主推横条夹在场所行与商品行之间，主推横条满宽暖底', () => {
    const venue = byKey('activity_venue')
    const chip = byKey('category_chip_1')
    const push = byKey('main_push')
    const goods1 = byKey('goods_1')
    expect(chip.y).toBeGreaterThanOrEqual(venue.y + venue.height)
    expect(push.y).toBeGreaterThanOrEqual(chip.y + chip.height)
    expect(goods1.y).toBeGreaterThanOrEqual(push.y + push.height)
    expect(push.x).toBe(30)
    expect(push.width).toBe(540)
    expect(push.height).toBe(44)
    expect(push.elementBgColor).toBe('#FDECE3')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npx jest tests/unit/poster-templates-promo-share.test.ts
```

预期：新 describe 全部 FAIL（`variableName` 为 `undefined`、`optionalVariables` 不含新变量）。

- [ ] **Step 3: 改模板定义**

在 [poster-templates.ts](file:///e:/code/shao/utils/poster-templates.ts) 的 `promoShareTemplate` 中：

3a. `optionalVariables`（L593）替换为：

```ts
  optionalVariables: ["activity_start", "activity_end", "activity_venue", "goods_1", "goods_2", "goods_3", "goods_4", "goods_category_1", "goods_category_2", "goods_category_3", "goods_category_4", "main_push", "image_fallback_slogan", "image_fallback_sign", "image_fallback_primary", "image_fallback_accent"],
```

3b. `main_image` 元素（L607-L619）的 `height: 465` 改为 `height: 404`。

3c. `title` 的 `y: 530` → `y: 460`；`activity_start` 的 `y: 582` → `y: 512`；`activity_end` 的 `y: 614` → `y: 544`；`activity_venue` 的 `y: 654` → `y: 580`。

3d. 在 `activity_venue` 元素之后插入 5 个新元素：

```ts
    baseElement({
      elementKey: "category_chip_1",
      elementType: "text",
      isVariable: true,
      variableName: "goods_category_1",
      x: 30,
      y: 614,
      width: 126,
      height: 32,
      fontSize: 18,
      fontColor: "#C2410C",
      textAlign: "center",
      lineHeight: 1.4,
      elementBgColor: "#FDECE3",
      borderRadius: 16,
      zIndex: 10,
      sortOrder: 7
    }),
    baseElement({
      elementKey: "category_chip_2",
      elementType: "text",
      isVariable: true,
      variableName: "goods_category_2",
      x: 168,
      y: 614,
      width: 126,
      height: 32,
      fontSize: 18,
      fontColor: "#C2410C",
      textAlign: "center",
      lineHeight: 1.4,
      elementBgColor: "#FDECE3",
      borderRadius: 16,
      zIndex: 10,
      sortOrder: 8
    }),
    baseElement({
      elementKey: "category_chip_3",
      elementType: "text",
      isVariable: true,
      variableName: "goods_category_3",
      x: 306,
      y: 614,
      width: 126,
      height: 32,
      fontSize: 18,
      fontColor: "#C2410C",
      textAlign: "center",
      lineHeight: 1.4,
      elementBgColor: "#FDECE3",
      borderRadius: 16,
      zIndex: 10,
      sortOrder: 9
    }),
    baseElement({
      elementKey: "category_chip_4",
      elementType: "text",
      isVariable: true,
      variableName: "goods_category_4",
      x: 444,
      y: 614,
      width: 126,
      height: 32,
      fontSize: 18,
      fontColor: "#C2410C",
      textAlign: "center",
      lineHeight: 1.4,
      elementBgColor: "#FDECE3",
      borderRadius: 16,
      zIndex: 10,
      sortOrder: 10
    }),
    baseElement({
      elementKey: "main_push",
      elementType: "text",
      isVariable: true,
      variableName: "main_push",
      x: 30,
      y: 652,
      width: 540,
      height: 44,
      fontSize: 22,
      fontColor: "#7C2D12",
      textAlign: "center",
      lineHeight: 1.5,
      elementBgColor: "#FDECE3",
      borderRadius: 8,
      zIndex: 10,
      sortOrder: 11
    }),
```

3e. 位移下游元素与其 `sortOrder`：

| elementKey | 新 y | 新 sortOrder |
|---|---|---|
| `goods_1` | 702 | 12 |
| `goods_2` | 730 | 13 |
| `goods_3` | 758 | 14 |
| `goods_4` | 786 | 15 |
| `qr_code` | 820 | 16 |
| `footer_text` | 996 | 17 |

- [ ] **Step 4: 运行测试确认通过**

```powershell
npx jest tests/unit/poster-templates-promo-share.test.ts
```

预期：5 个用例 PASS（含原有 4 个），底部留白 1050−1026 = 24 达标。

- [ ] **Step 5: 提交**

```powershell
git add utils/poster-templates.ts tests/unit/poster-templates-promo-share.test.ts
git commit -m "feat(poster): promo_share 新增品类 chips 与主推横条并上移位移"
```

---

### Task 2: 落库脚本同步（`basic` 仓库）

**Files:**
- Modify: `e:\code\basic\scripts\seed-poster-templates.cjs`（`PROMO_SHARE`，当前 L17-L45）

- [ ] **Step 1: 改 `PROMO_SHARE.template.optionalVariables`（L28）**

```js
    optionalVariables: ["activity_start", "activity_end", "activity_venue", "goods_1", "goods_2", "goods_3", "goods_4", "goods_category_1", "goods_category_2", "goods_category_3", "goods_category_4", "main_push", "image_fallback_slogan", "image_fallback_sign", "image_fallback_primary", "image_fallback_accent"],
```

- [ ] **Step 2: 改 `PROMO_SHARE.elements` 几何与新增元素**

把 `main_image` 的 `height: 465` 改为 `404`；`title` 的 `y: 530` → `460`；`activity_start` 的 `y: 582` → `512`；`activity_end` 的 `y: 614` → `544`；`activity_venue` 的 `y: 654` → `580`；`goods_1..4` 的 `y` 依次改为 `702/730/758/786`；`qr_code` 的 `y: 812` → `820`；`footer_text` 的 `y: 994` → `996`。

同时在 `activity_venue` 之后、`goods_1` 之前插入（注意脚本用 `elementBgColor` 传底色、`defaultValue` 传变量默认值）：

```js
    { elementKey: "category_chip_1", elementName: "品类chip1", elementType: "text", isVariable: true, variableName: "goods_category_1", defaultValue: "", x: 30, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 7 },
    { elementKey: "category_chip_2", elementName: "品类chip2", elementType: "text", isVariable: true, variableName: "goods_category_2", defaultValue: "", x: 168, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 8 },
    { elementKey: "category_chip_3", elementName: "品类chip3", elementType: "text", isVariable: true, variableName: "goods_category_3", defaultValue: "", x: 306, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 9 },
    { elementKey: "category_chip_4", elementName: "品类chip4", elementType: "text", isVariable: true, variableName: "goods_category_4", defaultValue: "", x: 444, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 10 },
    { elementKey: "main_push", elementName: "主推横条", elementType: "text", isVariable: true, variableName: "main_push", defaultValue: "", x: 30, y: 652, width: 540, height: 44, fontSize: 22, fontColor: "#7C2D12", textAlign: "center", lineHeight: 1.5, elementBgColor: "#FDECE3", borderRadius: 8, zIndex: 10, sortOrder: 11 },
```

并把 `goods_1..4` / `qr_code` / `footer_text` 的 `sortOrder` 依次改为 `12/13/14/15/16/17`。

- [ ] **Step 3: 本地落库验证**

先起本地 strapi（`e:\code\basic`，端口 1337），再执行：

```powershell
node scripts/seed-poster-templates.cjs
```

预期输出：`✔ 元素已写入: 17 个（批量接口）`（`promo_share` 元素数由 12 → 17）。

- [ ] **Step 4: 校验落库结果与内置模板一致**

打开后台「海报模板 → 促销活动海报」编辑器目视核对：元素数 17；一行 4 枚暖底 chip（`品类chip1..4`）位于场所行与商品行之间；其下一条满宽主推横条；底部提示与二维码未被裁切。

再与服务端返回逐值比对（登录后台拿 token 后）：

```powershell
$env:TOKEN="<后台 admin token>"
node -e "fetch('http://127.0.0.1:1337/api/zhao-studio/v1/admin/poster-templates',{headers:{Authorization:'Bearer '+process.env.TOKEN}}).then(r=>r.json()).then(j=>{const t=(j.data||j).find(x=>x.code==='promo_share');console.log(t&&t.optionalVariables)})"
```

预期输出含 `goods_category_1`、`goods_category_4`、`main_push`。

- [ ] **Step 5: 提交（`basic` 仓库单独提交）**

```powershell
git -C e:\code\basic add scripts/seed-poster-templates.cjs
git -C e:\code\basic commit -m "feat(poster): promo_share 落库脚本同步品类 chips 与主推横条"
```

---

### Task 3: `pickCategoryChips` 纯函数

**Files:**
- Modify: `e:\code\shao\utils\poster-templates.ts`（在 `extractPosterSlogan` 附近新增，并加入底部 `export {}`）
- Test: `e:\code\shao\tests\unit\promo-poster.test.ts`

- [ ] **Step 1: 写失败测试**

在 [promo-poster.test.ts](file:///e:/code/shao/tests/unit/promo-poster.test.ts) 顶部 import 改为：

```ts
import { extractPosterSlogan, pickCategoryChips } from '../../utils/poster-templates'
```

并在文件末尾追加：

```ts
describe('海报品类 chips 取数', () => {
  const formConfig = [
    { key: 'items', type: 'textarea', label: '想吃的单品' },
    { key: 'categories', type: 'multi', label: '想要的品类', options: ['蔬菜', '水果', '肉禽蛋', '水产海鲜', '粮油调味'] },
    { key: 'phone', type: 'phone', label: '手机号' },
  ]

  it('取 categories 字段选项的前 4 项', () => {
    expect(pickCategoryChips(formConfig)).toEqual(['蔬菜', '水果', '肉禽蛋', '水产海鲜'])
  })

  it('固定返回长度 4，选项不足时补空串', () => {
    expect(pickCategoryChips([{ key: 'categories', type: 'multi', options: ['蔬菜', '水果'] }]))
      .toEqual(['蔬菜', '水果', '', ''])
  })

  it('无 categories 字段 / 非数组 / 空选项时返回 4 个空串', () => {
    expect(pickCategoryChips([{ key: 'phone', type: 'phone' }])).toEqual(['', '', '', ''])
    expect(pickCategoryChips(null)).toEqual(['', '', '', ''])
    expect(pickCategoryChips([{ key: 'categories', options: [] }])).toEqual(['', '', '', ''])
  })

  it('非字符串选项按空串处理，字符串选项去空白', () => {
    expect(pickCategoryChips([{ key: 'categories', options: [{ label: 'x' }, ' 水果 '] }]))
      .toEqual(['', '水果', '', ''])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npx jest tests/unit/promo-poster.test.ts
```

预期：FAIL，报 `pickCategoryChips is not a function`。

- [ ] **Step 3: 实现**

在 [poster-templates.ts](file:///e:/code/shao/utils/poster-templates.ts) 的 `extractPosterSlogan` 之后新增：

```ts
/** 海报品类 chips：取预订表单 categories 字段选项的前 4 项，固定返回长度 4（缺位空串） */
function pickCategoryChips(formConfig: any): string[] {
  const out = ["", "", "", ""];
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const field = fields.find((f: any) => f && f.key === "categories");
  const options = Array.isArray(field?.options) ? field.options : [];
  for (let i = 0; i < out.length && i < options.length; i++) {
    const v = options[i];
    out[i] = typeof v === "string" ? v.trim() : "";
  }
  return out;
}
```

并把文件底部导出对象（当前 `export { BUILTIN_TEMPLATES, resolveTemplateLocal, buildImageFallback, extractPosterSlogan };`）改为：

```ts
export {
  BUILTIN_TEMPLATES,
  resolveTemplateLocal,
  buildImageFallback,
  extractPosterSlogan,
  pickCategoryChips
};
```

- [ ] **Step 4: 运行测试确认通过**

```powershell
npx jest tests/unit/promo-poster.test.ts
```

预期：全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add utils/poster-templates.ts tests/unit/promo-poster.test.ts
git commit -m "feat(poster): 新增 pickCategoryChips 品类 chips 取数纯函数"
```

---

### Task 4: `promo.vue` 透传 5 个新变量

**Files:**
- Modify: `e:\code\shao\pages\activity\promo.vue`（L290 import、L826-L880 计算属性与 `posterConfig`）
- Test: `e:\code\shao\tests\unit\promo-poster.test.ts`

- [ ] **Step 1: 写失败测试**

在 [promo-poster.test.ts](file:///e:/code/shao/tests/unit/promo-poster.test.ts) 的 `describe('促销海报取数')` 内追加：

```ts
  it('透传品类 chips 与主推横条变量', () => {
    expect(src).toContain('pickCategoryChips(')
    expect(src).toContain('goods_category_1:')
    expect(src).toContain('goods_category_2:')
    expect(src).toContain('goods_category_3:')
    expect(src).toContain('goods_category_4:')
    expect(src).toContain('main_push:')
  })
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
npx jest tests/unit/promo-poster.test.ts
```

预期：新用例 FAIL（源码中不含 `pickCategoryChips(`）。

- [ ] **Step 3: 实现**

3a. `promo.vue` L290 的 import 改为：

```ts
import { extractPosterSlogan, pickCategoryChips } from '../../utils/poster-templates'
```

3b. 在 `posterImageFallback` 计算属性之后新增：

```ts
// 海报品类 chips：取预订表单 categories 选项前 4 项
const posterCategoryChips = computed(() => pickCategoryChips(activity.value?.formConfig))

// 海报主推横条：取推荐位 custom 模块的 config.mainPush，缺失回落该模块标题
const posterMainPush = computed(() => {
  const customs = modules.value.filter((m: any) => m?.type === 'custom')
  const slot = customs[customs.length - 1]
  const cfg = slot?.config || {}
  const push = typeof cfg.mainPush === 'string' ? cfg.mainPush.trim() : ''
  return push || (typeof cfg.title === 'string' ? cfg.title.trim() : '')
})
```

3c. `posterConfig` 的 `variables` 中，在 `goods_4` 之后插入：

```ts
      goods_category_1: posterCategoryChips.value[0],
      goods_category_2: posterCategoryChips.value[1],
      goods_category_3: posterCategoryChips.value[2],
      goods_category_4: posterCategoryChips.value[3],
      main_push: posterMainPush.value,
```

- [ ] **Step 4: 运行测试确认通过**

```powershell
npx jest tests/unit/promo-poster.test.ts
```

预期：全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add pages/activity/promo.vue tests/unit/promo-poster.test.ts
git commit -m "feat(promo): 海报透传品类 chips 与主推横条变量"
```

---

### Task 5: 缺省图与商品行占位

**Files:**
- Create: `e:\code\shao\static\youmeihui-weekly-market-default.jpg`
- Modify: `e:\code\shao\utils\promo-goods.ts`
- Modify: `e:\code\shao\components\promo\promo-goods.vue`（L4-L11）
- Test: `e:\code\shao\tests\unit\promo-goods.test.ts`

- [ ] **Step 1: 生成缺省图**

用 `GenerateImage` 生成，`path` 传 `e:\code\shao\static\youmeihui-weekly-market-default`，`image_size` 传 `square`，prompt：

```
生鲜超市每周预订活动的品牌缺省图：暖米色底（#FDECE3），顶部居中粗体中文标题「优美惠市集 · 每周市集」，下方 2 行 × 4 列共 8 个扁平线性图标网格，图标依次代表蔬菜、水果、肉禽蛋、水产海鲜、粮油调味、乳品烘焙、零食饮料、日用百货，图标用暖橙线条（#C2410C）配浅色圆角底块，整体扁平、干净、无渐变、无照片元素、无多余文字，正方形构图留白充足。
```

生成后确认实际落地文件名：

```powershell
Get-ChildItem e:\code\shao\static\youmeihui-weekly-market-default.*
```

**若实际扩展名不是 `.jpg`**：把本 Task 内所有出现 `.jpg` 的位置（`promo-goods.ts` 常量、`promo-goods.test.ts` 断言、`git add` 路径）一并改为实际扩展名，保持全链路一致。

- [ ] **Step 2: 写失败测试**

在 [promo-goods.test.ts](file:///e:/code/shao/tests/unit/promo-goods.test.ts) 顶部 import 改为：

```ts
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { normalizeGoodsList, goodsPriceText, PROMO_DEFAULT_GOODS_IMAGE } from '../../utils/promo-goods'

const goodsSrc = readFileSync(resolve(__dirname, '../../components/promo/promo-goods.vue'), 'utf8')
```

并在文件末尾追加：

```ts
describe('商品缩略图缺省占位', () => {
  it('缺省图指向 static 下的每周市集品牌图', () => {
    expect(PROMO_DEFAULT_GOODS_IMAGE).toBe('/static/youmeihui-weekly-market-default.jpg')
  })

  it('无图商品渲染缺省图而非留空', () => {
    expect(goodsSrc).toContain('<image v-else :src="PROMO_DEFAULT_GOODS_IMAGE"')
    expect(goodsSrc).toContain('PROMO_DEFAULT_GOODS_IMAGE')
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

```powershell
npx jest tests/unit/promo-goods.test.ts
```

预期：FAIL，`PROMO_DEFAULT_GOODS_IMAGE` 未导出。

- [ ] **Step 4: 实现**

4a. 在 [promo-goods.ts](file:///e:/code/shao/utils/promo-goods.ts) 顶部新增：

```ts
/** 商品缩略图缺省占位：优美惠市集每周市集品牌图（随 C 端发布，不走运行时接口） */
export const PROMO_DEFAULT_GOODS_IMAGE = '/static/youmeihui-weekly-market-default.jpg'
```

4b. [promo-goods.vue](file:///e:/code/shao/components/promo/promo-goods.vue) 的 `<image v-if="g.image" ... />` 之后新增：

```vue
      <image
        v-else
        :src="PROMO_DEFAULT_GOODS_IMAGE"
        mode="aspectFill"
        class="goods-image"
        lazy-load
      />
```

4c. 同文件 script 的 import 改为：

```ts
import { normalizeGoodsList, goodsPriceText, PROMO_DEFAULT_GOODS_IMAGE } from '../../utils/promo-goods'
```

- [ ] **Step 5: 运行测试确认通过**

```powershell
npx jest tests/unit/promo-goods.test.ts
```

预期：全部 PASS。

- [ ] **Step 6: 提交**

```powershell
git add static/youmeihui-weekly-market-default.jpg utils/promo-goods.ts components/promo/promo-goods.vue tests/unit/promo-goods.test.ts
git commit -m "feat(promo): 每周市集缺省图与商品行无图占位"
```

---

### Task 6: 全量回归 + H5 构建

**Files:** 无改动，仅验证

- [ ] **Step 1: 跑 shao 全量单测**

```powershell
npx jest
```

预期：全绿；尤其 `poster-templates-promo-share`、`promo-poster`、`promo-goods`、`poster-renderer-fallback`、`poster-templates-activity-share` 无回归。

- [ ] **Step 2: H5 构建**

```powershell
npm run build:h5
```

预期：构建成功，无 TS 报错；产物包含 `static/youmeihui-weekly-market-default.jpg`。

- [ ] **Step 3: 本地端到端手测**

1. 本地 strapi + `node scripts/seed-poster-templates.cjs` 落库。
2. H5 打开 `/#/pages/activity/promo?act=<本地活动id>`，点「分享海报」。
3. 活动 `formConfig` 填了 `categories`（≥4 项）→ 海报出现 4 枚暖底 chip；无 `categories` → 不出现 chip 且无空白异常。
4. 最后一枚 `custom` 模块填了 `config.mainPush` → 海报出现满宽主推横条；不填 → 不出现。
5. 商品行 `image` 留空 → 活动页商品行显示缺省图，不塌陷。
6. 主图留空且传入 `image_fallback_*` → 走现有兜底绘制，不倒退。

- [ ] **Step 4: 推送**

```powershell
git push
```

---

### Task 7: 生产落库与线上复测

- [ ] **Step 1: 生产落库**

```powershell
$env:API_BASE="https://h.joho.cn/api"; $env:ZHAO_IDENTIFIER="zhao"; $env:ZHAO_PASSWORD="a963963"
node scripts/seed-poster-templates.cjs
```

（在 `e:\code\basic` 下执行；凭据与脚本注释一致，若已变更以脚本为准。）

预期：`✔ 元素已写入: 17 个`。

- [ ] **Step 2: 线上复测**

生产 H5 打开一个已配置 `formConfig`/`custom.mainPush` 的 promo 活动页 → 生成海报 → 核对 chip 带、主推横条、底部提示与二维码未被裁切；再打开一个**未配置**新变量的旧活动页 → 确认海报与原版式一致（无 chips/横条）。

- [ ] **Step 3: 记录结果**

把复测的两个活动 id 与结论写进提交信息或运营备注，不留 TODO。

---

### Task 8: 运营物料落地（无代码，后台操作）

**Files:**
- Create: `e:\code\shao\docs\superpowers\specs\2026-09-28-supermarket-weekly-preorder-copy.md`（文案包 + SOP 存档，供运营每周复制）

- [ ] **Step 1: 建活动系列**

后台新建 `activity-series`「优美惠市集·每周市集」，第一期 activity 归属该系列。

- [ ] **Step 2: 配一期页面 8 模块**

按设计文档 §1 顺序配置 `cover / notice / images / custom / goods / custom / info / floatContact`；`cover.config.bgImage` 填 `/static/youmeihui-weekly-market-default.jpg`；`custom`（模块 6）填 `config.title`「本期主推」与 `config.mainPush`（主推话术）。

- [ ] **Step 3: 配预订表单**

`formConfig` 三字段：`categories`（multi，8 项：蔬菜/水果/肉禽蛋/水产海鲜/粮油调味/乳品烘焙/零食饮料/日用百货）、`items`（textarea，选填）、`phone`（phone，必填）。品类名一律 ≤4 字，避免 chip 溢出。

- [ ] **Step 4: 写文案包存档**

新建 `2026-09-28-supermarket-weekly-preorder-copy.md`，写入：3 条固定文案（主标题「你想吃什么，我们进什么」/副标题「周四 24:00 预订截止·周五到店取货」/红线「不预订不配货」）+ 5 个每期轮换槽位（征集说明、到货播报、推荐位话术、群分享话术、取货提醒）各附一句示例。

- [ ] **Step 5: 写 SOP 存档**

同文件写入每周 6 步（周日发海报 → 周四 20:00 提醒 → 周四 24:00 截单汇总下单 → 周五早上补已到货清单 + 到货播报 → 周五取货 → 周五晚复制上一期）。

- [ ] **Step 6: 提交**

```powershell
git add docs/superpowers/specs/2026-09-28-supermarket-weekly-preorder-copy.md
git commit -m "docs(ops): 每周市集文案包与运营 SOP 存档"
```

---

## 完成标准

1. `poster-templates.ts` 与 `seed-poster-templates.cjs` 的 `promo_share` 逐值一致（12 → 17 个元素，几何见设计文档 §3 表格）。
2. `npx jest` 全绿，`npm run build:h5` 成功。
3. 生产落库后：配了新变量的活动海报出现 4 枚品类 chip + 主推横条；未配置的旧活动海报版式按新位移渲染、无裁切。
4. 商品行无图时显示缺省图。
5. 文案包 + SOP 已存档，运营可按 6 步复制下一期。

---

## 执行记录（2026-09-28 回填）

子代理驱动执行（每 Task 一个全新子代理 + Task 间两阶段审查）。提交链：

| Task | 仓库 | commit | 说明 |
|---|---|---|---|
| 1 | shao | `af42a25` | promo_share 模板 5 新元素 + 位移 + optionalVariables |
| 3 | shao | `fb00152` | pickCategoryChips 纯函数 |
| 4 | shao | `7676962` | promo.vue 透传 5 变量 |
| 5 | shao | `69172b4` | 缺省图 + 商品行无图占位 |
| 8 | shao | `39aac37` | 文案包与运营 SOP 存档 |
| 2 | basic | `bc7fc5535e` | 落库脚本逐值同步 |
| 记录 | shao | 本提交 | 执行记录回填 |

### 与计划原文的偏离

1. **单测命令**：计划写 `npx jest <path>`，实跑会走 babel 报解析错误；实际统一用仓库既有的 `npx jest --config jest.unit.config.js`（全量 20 suites / 179 tests）。
2. **本地落库与本地端到端手测未执行**（Task 2 Step 3-4、Task 6 Step 3）：本机无 postgres、redis、docker（5432/6379 均不通，`docker` 命令不存在），无法起本地 strapi。已与用户确认接受替代方案：模板一致性改用**程序化逐值比对**（elementKey/elementType/isVariable/variableName/x/y/width/height/fontSize/fontColor/textAlign/lineHeight/elementBgColor/borderRadius/sortOrder 逐字段，结果 `PARITY OK`，两侧均 17 元素），运行时验证前移到生产（Task 7）。
3. **缺省图扩展名**：计划按 `.jpg` 写，实际生成即为 `youmeihui-weekly-market-default.jpg`，与计划一致，无需改名。
4. **Task 5 生成方式**：缺省图由主会话用 `GenerateImage` 生成（1920×1920 正方形，暖底 + 中文标题 + 8 品类图标网格），非子代理。
5. **新增用例数**：Task 1 实际追加 4 个用例（与计划给定代码一致，计划正文「5 个用例 PASS」指含原有用例的 8 个总数）；Task 3 原有用例实为 11 个（计划写 8），加上新 4 个共 15 个。

### 生产落库与发布（Task 7）

- 落库（2026-09-28）：`API_BASE=https://h.joho.cn/api` 执行 `seed-poster-templates.cjs` → `promo_share` 12 → 17 个元素；`activity_share` 幂等重写 8 → 8（执行前已比对两模板逐值一致，确认对 `activity_share` 无额外影响）。
- 线上核对（管理端接口）：`promo_share` count=17、optional=16，几何逐值符合设计 §3 表格（`main_image` y40 h404、`title` y460、`activity_venue` y580、chip y614 x30/168/306/444、`main_push` y652 540×44、`goods_1..4` y702/730/758/786、`qr_code` y820、`footer_text` y996 → 底部留白 24）。
- H5 发布：`deploy-h5.ps1` → `SYNC_OK`；`https://v.joho.cn/static/youmeihui-weekly-market-default.jpg` 返回 200（255556 字节，与本地一致）。
- 旧活动回归取样：`iuf1iy42d6h61b0ptzg37q4q`（免费领西瓜｜优美惠双节钜惠），其 `formConfig` 为空、无 `custom` 模块 `mainPush` → chip 与主推横条均不绘制，符合「不填不绘制」预期。

### 未闭环项（不留 TODO，明确前置条件）

- **「配了新变量」的线上海报目视复测未做**：需要一个已配置 `categories`（≥4 项）与 `custom.mainPush` 的活动，该内容属 Task 8 Step 1-3 的运营后台配置，尚未创建。配置完成后按 Task 7 Step 2 复核即可。