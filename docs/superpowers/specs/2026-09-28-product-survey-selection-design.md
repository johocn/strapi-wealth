# 每周市集 · 选品调研 + 预售区 Vendure 接入（设计）

- 日期：2026-09-28
- 宿主仓库：`e:\code\shao`（本次改动跨 4 个仓库，见 §12）
- 关联文档：[2026-09-28-supermarket-weekly-preorder-copy.md](./2026-09-28-supermarket-weekly-preorder-copy.md)（每周市集文案与预订网址 SOP）

## 1. 背景与目标

现状：每周市集活动页（`shao/pages/activity/promo.vue`）的模块与文案由 Strapi `zhao-point` 的 `activity.promoModules` 驱动。第 5 个模块 `goods` 的商品是运营**手填** `goodsList`（图 / 名 / 价 / 原价）；选品需求靠第 4 个 `custom` 模块写 HTML 文案喊话，**无法统计**。

目标：

1. **选品调研**：运营在 Vendure 用 Collection 圈定候选池（含未上架商品），C 端顾客浏览勾选（图 / 名 / 价 / 变体），后台按渠道统计「选品需求榜」，供运营决定本周组织上架。
2. **预售区接入 Vendure**：`goods` 模块改读 Vendure **上架在售商品**，图片 / 价格 / 链接由后台提供，替代手填。
3. **租户级粒度**：商品与分类按渠道（租户）隔离，选票与榜单不跨渠道混合。

## 2. 关键既有事实（设计依据，均已核实）

| 事实 | 依据 |
|---|---|
| 预订网址 = 活动页本身，预订 = 活动内报名 | `specs/2026-09-28-supermarket-weekly-preorder-copy.md` §一「预订网址」 |
| vshop 商品详情页**只接受 `slug`**，无 id 入口 | `vshop/src/pkg-product/pages/detail.vue:62-69` |
| Vendure `ProductVariant` **无划线价字段**（仅 `price`/`prices`/`currencyCode`/`priceWithTax`） | Admin API introspection |
| Vendure Shop/Context 默认**不过滤 `enabled`**（仅显式传 `filter.enabled.eq=true` 才过滤） | `vendure/packages/core/src/service/services/product-variant.service.ts:209-236` |
| Strapi 侧已有渠道作用域范式 | `basic/plugins/zhao-point/server/src/routes/content-api.ts:33-46`（`channelScopeRoute` + `has-channel-scope` + `has-tenant-access`） |
| Strapi 后台统计范式（纯查询、不落库、返回 `{summary, rows}`） | `basic/plugins/zhao-point/server/src/services/activity-stats.ts` |
| C 端表单渲染范式（`multi` → chips） | `shao/pages/activity/promo.vue:86-90`；`basic/plugins/zhao-point/server/src/services/form.ts:7` |
| 生产候选池现状（2026-09-28 核实） | 商品 80/81/82（小龙虾 / 杨梅 / 黑猪肉，`enabled=false`，英文 slug）**仅属默认渠道 id1，未挂任何 Collection**；生产亦无 `*-unlisted-pool` 集合 → 候选池待运营按 §11.1 建立 |
| 生产在售商品 11 件，slug 形态混乱（英文 / 中文 / 空） | Admin API 只读查询 |

## 3. 总体架构与数据流

```
Vendure 运营端
  └ 候选池 = 手工维护的 Collection（含未上架商品），命名 {channelCode}-unlisted-pool
        │  新增只读接口 GET /product-survey/candidates?collection=<slug>
        │  渠道由请求头 vendure-token 决定（不写死）
        ▼
shao C 端（活动页 promo，模块 type=survey）
  └ 品类 tab（= 配置里的多个 Collection）→ 商品卡片（图/价/名/变体/未上架标/勾选）
      + 自由输入「还想要什么」→ POST /v1/my/product-survey/vote（登录身份）
        ▼
Strapi zhao-point
  └ 落库 product-survey-vote（channel + roundKey + userId + productId 去重 → 一人一商品一票）
      + product-survey-demand（自由输入，一人一渠道一周期一条）
        │  纯查询聚合
        ▼
web 运营端「选品需求榜」→ 导出上架清单 → 运营在 Vendure 组织上架 → 周四预订 / 周五取货

另一条（本次同时改造）：
shao C 端 promo 模块 type=goods
  └ 改读 GET /product-survey/candidates?source=onsale（Vendure 上架在售商品），替代手填 goodsList
     预订动作仍走活动内报名（预订网址 = promo 页自身）
```

两条链路独立：调研不产生订单；预售区不接入 vshop 下单流。

## 4. Vendure 侧

### 4.1 新增插件 `vendure/packages/product-survey-plugin`

NestJS `@Controller` REST，范式对齐 `eco-plugin` / `wechatpay-plugin`。**不**做 GraphQL Shop 扩展（shao 请求层是 REST 封装）。

### 4.2 `GET /product-survey/candidates`

免登录、只读。入参：

| 参数 | 必填 | 说明 |
|---|---|---|
| `collection` | 否 | Collection slug；选品调研必填 |
| `onsale` | 否 | `1` 时改为返回该渠道全部上架在售商品（预售区用）；与 `collection` 互斥，同时传以 `collection` 优先 |
| `take` | 否 | 默认 50，上限 100 |

渠道解析：`channelService.getChannelFromToken(header vendure-token)`，无 token 用默认渠道。实现链：`new RequestContext({ apiType:'shop', channel })` → `collectionService.findOneBySlug` → `productVariantService.getVariantsByCollectionId`（由 `variant.product` 归组成商品卡片）。

出参：

```json
{
  "channel": { "id": "2", "code": "t1" },
  "collection": { "slug": "t1-unlisted-pool", "name": "候选池" },
  "products": [{
    "id": "80", "name": "鲜活小龙虾", "slug": null,
    "image": "https://.../preview.jpg",
    "enabled": false,
    "link": null,
    "linkAvailable": false,
    "priceConfigured": true,
    "priceFromText": "¥38.00 起",
    "variants": [{ "id": "201", "name": "1斤", "priceText": "¥38.00" }]
  }]
}
```

规则（服务端负责，C 端不拼不算）：

1. **链接**：`link` 仅当 `slug` 匹配 `^[a-z0-9][a-z0-9-]*$` 时返回 `/pkg-product/pages/detail?slug=<slug>`，否则 `null` 且 `linkAvailable=false`。C 端在 `linkAvailable=false` 时不渲染「查看详情」。**不改 vshop 支持 id 参数**。
2. **价格**：一律 `variant.priceWithTax`（分）→ 元字符串。`priceWithTax <= 0` 视为未配价 → `priceConfigured=false`，不输出 `priceText`，C 端显示「到店询价」。多规格输出 `variants[].priceText` + 商品级 `priceFromText`（最小变体价，「¥38.00 起」）。
3. **划线价**：Vendure 无该字段，**不提供、不展示**。
4. **图片**：`variant.featuredAsset ?? product.featuredAsset` 的 `preview` 尺寸；两者皆无 → `image: null`，C 端用缺省图。
5. **未上架**：不过滤 `enabled`，出参带 `enabled` 供 C 端打「未上架」标（选品调研场景）；预售区（`onsale=1`）只返回 `enabled=true`。
6. Collection 不存在或为空 → `products: []`（HTTP 200），C 端走空态。
7. 不加缓存（池子随时可变）。

错误：无 `collection` 且无 `onsale` → 400；Vendure 内部异常 → 500 + 简短 message（不泄漏堆栈）。

## 5. Strapi 侧（`zhao-point` 插件）

### 5.1 内容类型 1：`product-survey-vote`（用户 × 商品 × 渠道）

| 字段 | 类型 | 说明 |
|---|---|---|
| channel | string，required | 渠道隔离标识，取 **Strapi 站点渠道 id**（`site.getAvailableChannels()` 的首个 id），由服务端解析，**前端不传** |
| roundKey | string，required | ISO 周，如 `2026-W40` |
| user | relation manyToOne → `plugin::users-permissions.user` | 登录身份 |
| userId | integer，private | 冗余镜像（关系落 lnk 表，DB 跨表建不了唯一索引；沿用 `activity-signup` 做法） |
| productId | string，required | Vendure 商品 id |
| productName | string | 冗余，榜单展示不依赖 Vendure 可用性 |
| variantIds | json（string[]） | 勾选的变体明细，仅用于「规格分布」 |
| source | string | 活动 documentId，用于归因 |

去重口径：`(channel, roundKey, userId, productId)` —— 一人一渠道一商品一票；同客户在 A 店与 B 店对同一商品各算一票。

### 5.2 内容类型 2：`product-survey-demand`（自由输入隐藏需求）

`channel` / `roundKey` / `user` / `userId` / `text` / `source`。一人一渠道一周期一条，可反复修改（upsert）。

### 5.3 C 端接口

- `GET /zhao-point/v1/my/product-survey/vote?roundKey=&source=`（`userRoute`，登录）→ 回显该用户本渠道本周期已勾选 + 自由输入，用于进页面预勾选。
- `POST /zhao-point/v1/my/product-survey/vote`（`userRoute`）：

```json
{ "roundKey": "2026-W40", "source": "act-xxx",
  "votes": [{ "productId": "80", "productName": "鲜活小龙虾", "variantIds": ["201"], "collectionLabel": "零食" }],
  "freeInput": "想买无糖的" }
```

服务端行为：**`channel` 由服务端解析** —— 取请求站点 `site.getAvailableChannels()` 首个渠道 id（见 `controllers/point.ts:139-143`），**完全忽略前端传值**，解析不到返回 400；校验 `roundKey` 匹配 `^\d{4}-W\d{2}$`；身份一律取登录态 `ctx.state.user.id`（**不接受前端传 userId**）；**快照式覆盖** —— 事务内 upsert 列表内商品、删除本渠道本周期该用户不在列表中的旧票；`freeInput` 为空则删除该条，非空则 upsert；超过截止时间（见 §6.1 `deadline`，按 `source` 查活动模块 `type==='survey'` 的 `config.deadline`）→ 403。

### 5.4 后台榜接口

`GET /zhao-point/v1/admin/product-survey/board?channel=&roundKey=&source=`，走 `channelScopeRoute`（而非 `adminRoute`），获得渠道作用域 + `has-tenant-access`；新增权限 `product-survey.read`，在 `permissions.ts` 授予 admin / channel-admin / plugin-manager。

返回 `{ summary, rows, demands }`，纯查询聚合、不落库，对齐 `activity-stats.ts`：

- `summary`：参与人数（去重 userId）/ 总票数 / 候选商品数
- `rows`：[{ rank, productId, productName, collectionLabel, voterCount, ratio, variantBreakdown[] }]，按 `voterCount` 降序
- `demands`：[{ userLabel, text, createdAt }]

## 6. C 端（`shao`）

### 6.1 调研模块：`components/promo/promo-survey.vue`

在 `pages/activity/promo.vue` 模块分发加 `m.type === 'survey'`。运营在活动里投放，**不加首页 / tabBar 入口**。config：

```json
{ "title": "帮我们选品", "desc": "勾选你想要的，我们下周备货",
  "channelToken": "t1", "roundKey": "2026-W40", "deadline": "2026-10-01T23:59:59+08:00",
  "collections": [{ "slug": "t1-unlisted-snack", "label": "零食" },
                  { "slug": "t1-unlisted-drink", "label": "饮品" }] }
```

`channelToken` 即 Vendure `channel.token`，C 端直连 Vendure 时作为请求头 `vendure-token`（经 `https://e.joho.cn` 反代，CORS 由 Vendure 自身处理）；提交投票时不传 channel（服务端按站点解析，§5.3）。

- **品类 tab 来源 = 配置里的多个 Collection**（一个 Collection 一个 tab；配 1 个则不显示 tab）。不引入 Facet（未上架商品的 facetValues 未必维护，会产生空 tab）。
- 交互：标题 / 说明 / 周期倒计时 → 品类 tab → 商品卡片（图 / 名 / 价 / 变体 chips / 未上架标 / 圆形勾选）→ 底部自由输入 → 吸底「已勾选 N 件 · 提交」。
- 进页面按 `roundKey` 拉已勾选做预勾选；未登录点提交复用 promo.vue 现有登录引导（静默 / 微信授权），登录后继续提交。
- 空态：Collection 空 → 「本期暂无候选」；Vendure 不可达 → 仅卡片区错误重试，页面其它模块不受影响。

### 6.2 预售 / 开卖区：`goods` 模块改读 Vendure

- config 增加 `source: "vendure"` + `channelToken` + `collectionSlug?`（空 = 该渠道全部在售，接口按 `onsale=1` 调用）+ `limit`（默认 8）。
- 渲染：商品卡（图 / 名 / 价 / 规格）+ `linkAvailable` 为真时显示「查看详情 ›」（跳 `/pkg-product/pages/detail?slug=`）。
- `priceConfigured=false` → 显示「到店询价」，不显示 ¥0。
- `image=null` → 缺省图（复用市集缺省图）。出参 `image` 是 Vendure 相对路径，C 端需拼 `https://e.joho.cn/assets/{image}`。
- **预订动作不变**：仍走活动内报名（预订网址 = promo 页自身），不接 vshop 下单流。
- 过渡策略：config 无 `source` 时仍渲染既有 `goodsList`，避免已上线活动立刻空白；SOP 要求新一期活动必须配 `source: "vendure"`。**不新增开关字段，只是同一 config 的两个分支**。

### 6.3 请求层

`services/api.ts` 新增 `vendureRequest()`（走 Vendure base，带 `vendure-token`），仅用于候选 / 在售商品查询；Strapi 侧接口继续用现有 `request()`。

## 7. Web 运营端（`e:\code\web`）

### 7.1 新增 `survey` 模块类型需同步 5 处

1. `basic/plugins/zhao-point/server/src/services/activity.ts:17-20` `PROMO_MODULE_TYPES` 加 `"survey"`（服务端白名单，沿用现有清洗逻辑，不额外加 config 校验）
2. `web/src/pages/activity/promo-import.js:6` `PROMO_MODULE_TYPES` 同步
3. `web/src/pages/activity/promo-presets.js` `PROMO_MODULE_META` 加 `survey: { name: '选品调研', needConfig: true }`
4. `web/src/pages/activity/form.vue:634` 增 `survey` 配置编辑器：`title` / `desc` / `channel` / `roundKey` / `deadline` / `collections[]`（slug + 显示名，行式增删，同 `goodsList` 模式）
5. `web/src/pages/activity/promo.vue:419` 预览分发加 `PromoSurvey`（后台可直接预览）

### 7.2 `goods` 模块配置编辑器

新增 `source`（下拉：手填 / Vendure）、`channelToken`、`collectionSlug`、`limit` 四项；`source = Vendure` 时可折叠 `goodsList` 编辑区。

### 7.3 选品需求榜页面

新页 `web/src/pages/activity/survey-board.vue`（`pages.json` 注册 + dashboard 入口按 `hasPermission('product-survey.read')` 显示），API 层 `src/api/activity.js` 加 `fetchSurveyBoard({ channel, roundKey, source })`：

- 顶部：渠道 + 周期 + 投放来源筛选，summary（参与人数 / 总票数 / 候选商品数）
- 主体：榜表 —— 排名 / 商品（图 + 名）/ 品类（Collection 文案）/ 得票人数 / 占比条 / 规格分布 chips
- 侧栏：自由输入「隐藏需求」列表（客户标识 + 文本 + 时间）
- 行操作「加入本周上架」：**只做导出** —— 勾选行后复制 `slug / name / 商品id` 文本清单，运营拿去 Vendure 建商品上架。**不反向写 Vendure**（自动上架不可逆，超出本次范围）

## 8. 错误处理与降级

| 场景 | 行为 |
|---|---|
| Vendure 不可达 | 卡片区单独错误重试；活动页其它模块正常 |
| Collection 空 / 不存在 | 200 + 空数组 → 「本期暂无候选」 |
| Strapi 提交失败 | 提示重试；不做本地暂存队列 |
| 超过 `deadline` | 服务端 403，C 端禁用提交并提示「本期已截止」 |
| 商品无图 / 未配价 | 缺省图 / 「到店询价」 |
| slug 非法 | 不渲染「查看详情」，其余信息照常展示 |

## 9. 验收要点

1. 未上架商品能从候选 Collection 正常返回，含图 / 价 / 变体。**（生产候选池待运营建；机制已用 collection 17 验证：返回 `enabled:false` 商品，证明未过滤 `enabled`）**
2. 同一账号取消勾选后再提交，该商品在本渠道的得票人数 -1。
3. 换账号对同商品投票，得票人数 +1；同账号在另一渠道投票，两渠道票数互不影响。
4. `slug` 为空或中文的商品，出参 `link=null`、`linkAvailable=false`。
5. `priceWithTax=0` 的商品出参 `priceConfigured=false`。
6. `deadline` 过后提交返回 403。
7. 榜单占比与规格分布与库中记录一致（人工抽查 1 条）。
8. 预售区在有 `source: "vendure"` 时展示真实在售商品；无 `source` 时仍渲染 `goodsList`。

## 10. 不做的事（YAGNI）

支付 / 下单 / 库存；C 端实时搜索与个性化推荐；匿名投票；商品快照表；Facet 品类；跨周期历史对比榜（仅看单周期）；票数缓存；Vendure 写操作（自动上架）；提交失败的本地暂存队列；防刷频控（登录 + 一人一商品一票已足够）；划线价；改 vshop 支持 id 参数；批量修复历史脏 slug。

## 11. 运营约定

1. **候选池命名**：`{channelToken}-unlisted-pool`（选品调研），品类池可再细分 `{channelToken}-unlisted-{category}`；每个渠道各建一套。
2. **上架商品 slug 必须英文小写短横线**（`^[a-z0-9][a-z0-9-]*$`），历史中文 / 空 slug 由运营在 Vendure 后台手工修正。
3. 每期活动投放 `survey` 模块时必填 `channelToken` / `roundKey` / `deadline` / 至少 1 个 `collections`。
4. 新一期活动（复制上一期后）必须把 `goods` 模块 `source` 设为 `vendure`。
5. 服务端**不校验** config 字段完整性（`activity.ts` 只做类型白名单 + 现有清洗），上述必填项由后台编辑器与本节约定保证；`deadline` 缺失时服务端视为不截止，由运营避免。

## 12. 实施顺序与仓库

| 序 | 仓库 | 内容 |
|---|---|---|
| 1 | `e:\code\vendure` | 新插件 `product-survey-plugin` + `GET /product-survey/candidates` |
| 2 | `e:\code\vendure-prod` | 部署产物同步（插件 lib + 配置） |
| 3 | `e:\code\basic` | `zhao-point`：2 个内容类型 + 3 个接口 + 权限 + 模块白名单 |
| 4 | `e:\code\shao` | `vendureRequest()` + `PromoSurvey` 组件 + `goods` 模块改造 |
| 5 | `e:\code\web` | 模块配置编辑器（`survey` / `goods`）+ 选品需求榜页面 |