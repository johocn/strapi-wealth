# 每周市集活动页：两区结构 + 调研选品可配 + 商品链接修复

日期：2026-10-02
关联：`2026-09-28-supermarket-weekly-preorder-design.md`、`2026-09-28-product-survey-selection-design.md`
线上活动：`v.joho.cn/#/pages/activity/detail?id=wi86utfu1p12hcjqqbjqjqon`（活动 id=14）

## 1. 目标（业务语义）

页面明确两个区块，构成「上周征集 → 本周开卖」的每周闭环：

- **上区 = 征集区**：调研性质。顾客勾选「想要买」的商品，用于决定**下一个周四**预定/进货什么。
- **下区 = 开卖区**：**本周可预定**的商品，点击直达购买（商城商品详情）。

## 2. 问题与根因

| # | 现象 | 根因 |
|---|---|---|
| 1 | 两区顺序混乱 | `goods`（本周开卖）sort=5 夹在征集区中间，真正调研勾选的 `survey` sort=6 在其后 |
| 2 | 上区候选商品不可配 | `survey` 候选池靠 `config.collections[]`（Vendure Collection）→ 固定 3 个 tab，运营无法按商品挑选 |
| 3 | 下区商品链接点不动 | 候选接口返回 `link=/pkg-product/pages/detail?slug=…`，该路由属**商城 H5（e.joho.cn）**子包；`v.joho.cn`（shao）`pages.json` 无此路由 → `uni.navigateTo` 静默失败 |
| 4 | 本期征集说明表达不出内容 | `images` 模块仅渲染图片、无文字能力；后台只配 1 张缺省图 |
| 5 | 征集文字补充项不显式/不可配 | `survey` 已有自由输入框但无标题、提示语硬编码 |

## 3. 方案

### 3.1 两区结构/顺序（纯配置，不改代码）
调整活动 id=14 的 `promoModules` 顺序：

```
cover → notice → images(本期征集说明) → custom(征集说明文案) → survey(调研勾选)
      → goods(本周可预定) → custom(本周推荐) → info → floatContact
```

两区各由既有模块标题/说明承载区头文案；不新增视觉分隔组件（YAGNI）。

### 3.2 调研区候选商品后台可配（代码）
`survey` 模块新增可选 `config.productIds`：

- 有 `productIds` → C 端按 `fetchVendureCandidates({ token, productIds, take })` 拉取，渲染为**单列勾选列表**（隐藏品类 tab）。
- 无 `productIds` → 回退现有 `collections[]` tab 行为（老活动不失效）。
- 后台复用既有「从 Vendure 选择商品」弹层（与 `goods` 一致，只存有序 id），候选池沿用弹层逻辑（无 collection 时取渠道在售）。

### 3.3 商品链接修复（代码）
- `utils/env.ts` 新增 `SHOP_H5_URL`（默认 `https://e.joho.cn`，`VITE_SHOP_H5_URL` 可覆盖）与 `toShopUrl(link)`：相对路由拼成 `${SHOP_H5_URL}/#${link}`，绝对 URL 原样返回。
- `promo-goods.vue` / `promo-survey.vue` 的 `openLink`：H5 用 `window.location.href` 跨应用打开，非 H5 走 `uni.navigateTo` 兜底；`linkAvailable` 判断不变。

### 3.4 `images` 模块文字说明（代码）
新增可选 `config.desc`（纯文本），渲染在标题下、图组上；空则不渲染。

### 3.5 `survey` 模块文字补充项（代码）
新增可选 `config.freeInputLabel`（默认「文字补充」）、`config.freeInputPlaceholder`（默认沿用现文案）；提交字段仍为 `freeInput`，接口与落库不变。

## 4. 影响文件

**shao（v.joho.cn）**
- `utils/env.ts`（SHOP_H5_URL / toShopUrl）
- `components/promo/promo-images.vue`（desc）
- `components/promo/promo-survey.vue`（productIds + 文字补充项 + 链接）
- `components/promo/promo-goods.vue`（链接）

**web（h.joho.cn）**
- `src/pages/activity/form.vue`（images desc 输入；survey 选品弹层 + 文字补充项输入）
- `src/components/promo/promo-images.vue`（desc 预览）
- `src/components/promo/promo-survey.vue`（productIds / 文字补充项预览）
- `src/pages/activity/promo-import.js`（survey 白名单 + `OPS_MANAGED_KEYS`）

## 5. 约束与风险
- 新增配置全部**可选、空则不渲染**；服务端（zhao-point `activity.ts`）只做类型白名单、不校验 config 键 → **不改后端、不部署 basic**。
- AI 导入白名单需同步 `productIds` / `freeInputLabel` / `freeInputPlaceholder`，否则 AI 重写文案会丢配置。
- 商城链接依赖 `e.joho.cn` hash 路由与 slug 有效性；slug 非法仍不显示入口（行为不变）。
- 后台选品弹层候选池为「渠道在售」，未上架商品需先经既有 `collections` 路径或加入 Collection 才可见。