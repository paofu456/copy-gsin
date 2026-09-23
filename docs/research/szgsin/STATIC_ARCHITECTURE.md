# 金鑫绿建官网静态复刻架构

## 1. 目标与硬约束

本项目交付物是可以由普通静态文件服务器托管的站点，不依赖 Node 运行时、数据库、CMS、服务端接口或 SPA fallback。

- 技术栈：Astro 静态输出 + `.astro` 模板 + 原生 CSS + 浏览器原生 JavaScript。
- 部署根路径固定为 `/`，以保持原站根相对 URL 和历史链接不变。
- 所有页面在构建期生成，浏览器端不负责拼装页面正文。
- 所有可交付媒体、字体和图标都从本地 `/media/` 加载；运行时不得请求 `www.szgsin.com`。
- 原公开路径必须可访问，包括 `.html`、分页路径、无扩展别名和双 `.html` 历史路径。
- 表单不得向原站或任何未明确批准的服务提交数据。
- 1440、768、390 三个视口均纳入视觉验收。

## 2. 当前项目事实

当前仓库已经具备正确的最小基础：

- Astro `5.13.10`，`output: "static"`。
- `build.format: "file"`，普通 Astro 路径 `/article/gjg` 会输出 `dist/article/gjg.html`。
- 没有 React、Vue 或服务端适配器。
- Playwright 已作为开发依赖，可用于路由、交互和截图 QA。
- 当前页面只有占位首页，尚未形成客户实现。

当前 `docs/research/szgsin/routes.json` 快照包含 **217 条唯一路径**，不是目标口径中的 221 条：

| 类型 | 数量 |
| --- | ---: |
| 首页 | 1 |
| 文章/项目详情 | 156 |
| 文章列表 | 14 |
| 分页 | 35 |
| 独立页面 | 7 |
| 下载列表 | 2 |
| 其他 | 2 |

其中 211 条状态为 200；4 条抓取超时（状态 0），1 条为 404，1 条为 500。当前素材候选清单有 772 个 URL，但它还没有递归解析外链 CSS、`srcset`、CSS `@import` 和动态媒体，所以不能直接视为完整素材清单。

**开工门禁：**正式页面生成前必须把“221 条”变成一份冻结的、去重的路由合同，并重新核实当前缺少的 4 条路径。验证脚本必须以冻结合同为准；不能把 217 当作 221，也不能因为源站超时就生成空白页。

## 3. 架构总览

```text
冻结的 route-manifest + 内容数据 + asset-map
                     │
                     ▼
      Astro 构建期捕获路由与页面族组件
                     │
                     ▼
            dist/*.html + 本地媒体
                     │
                     ▼
       遗留路径物化（无扩展/尾斜杠别名）
                     │
                     ▼
  文件映射验证 → 本地静态预览 → Playwright 视觉/交互 QA
```

核心原则是“数据驱动的页面族”，而不是手写 221 个页面文件。每条路由独立存在，但共享页头、内页横幅、栏目导航、列表、详情、分页和页脚组件。

## 4. 路由合同

### 4.1 单一事实来源

后续应建立冻结的 `route-manifest`，每条记录至少包含：

```ts
type StaticRoute = {
  publicPath: string;       // 用户可见的原始路径
  buildPath: string;        // Astro 构建路径，去掉一个末尾 .html
  outputFile: string;       // dist 中必须存在的文件
  pageKind: string;         // home/list/detail/page/download/search
  contentKey: string;       // 内容数据键
  sourceUrl: string;
  sourceStatus: number;
  aliasOf?: string;
  qaTier: "representative" | "smoke";
};
```

`publicPath`、`buildPath` 和 `outputFile` 必须由一个工具函数生成，禁止在组件中重复手写转换规则。所有内部链接只从该合同读取，避免页面能生成但链接拼错。

### 4.2 Astro 生成方式

使用：

- `src/pages/index.astro` 生成 `/`。
- `src/pages/[...legacyPath].astro` 使用 `getStaticPaths()` 生成其余所有构建路径。
- 捕获页按 `pageKind` 分发到页面族布局组件；组件只在构建期运行，最终仍是普通 HTML。

由于 `build.format: "file"` 会自动给页面路径追加 `.html`，传给 Astro 的参数必须先去掉 **一个且仅一个** 末尾 `.html`。这既能生成普通历史路径，也能保留双扩展异常路径。

| 原公开 URL | Astro `buildPath` | 主要输出文件 |
| --- | --- | --- |
| `/` | `/` | `dist/index.html` |
| `/article/gjg.html` | `/article/gjg` | `dist/article/gjg.html` |
| `/article/gjg/p1.html` | `/article/gjg/p1` | `dist/article/gjg/p1.html` |
| `/article/detail/77.html` | `/article/detail/77` | `dist/article/detail/77.html` |
| `/article/zpsjz.html.html` | `/article/zpsjz.html` | `dist/article/zpsjz.html.html` |
| `/page/gsjs` | `/page/gsjs` | `dist/page/gsjs.html`，另建别名文件 |
| `/search/` | `/search` | `dist/search.html`，另建别名文件 |

如果多个 `publicPath` 映射到同一个 `buildPath`，只允许它们共享同一 `contentKey`；否则构建直接失败，避免一个输出文件被两份不同内容覆盖。

### 4.3 无扩展和尾斜杠路径

当前发现下列同内容别名：

- `/article/zzzs` 与 `/article/zzzs.html`
- `/download/jszl` 与 `/download/jszl.html`
- `/page/gsjs` 与 `/page/gsjs.html`
- `/page/lxwm` 与 `/page/lxwm.html`

此外 `/search/` 是尾斜杠路径。只靠 Astro 的 `file` 输出或部署平台隐式重写不够稳妥，因此构建后运行 `materialize-legacy-routes`：

- `.html` 路径保留原文件。
- 无扩展路径额外复制为 `dist/<path>/index.html`。
- 尾斜杠路径复制为对应目录的 `index.html`。
- 复制前比较内容哈希；别名目标已存在但内容不同则失败。
- 脚本只能写 `dist/`，不能回写源码或研究资料。

生产 Nginx 的查找顺序应为 `$uri.html` → `$uri` → `$uri/index.html`，这样请求 `/page/gsjs` 时优先内部读取 `page/gsjs.html`，不会为了访问目录而把浏览器 URL 重定向成 `/page/gsjs/`。对象存储/CDN 则需要等价的无扩展重写规则。

### 4.4 非正常源路由政策

- 状态 0：先重试并从栏目入口核验；未取得正文前不得生成伪内容。
- `/cdn-cgi/l/email-protection`：这是 Cloudflare 技术端点，不应复制成业务页面。原邮件链接应还原为授权的 `mailto:` 地址，并在路由合同中明确标记为排除项。
- `/search/`：源快照为 500。若导航存在搜索入口，应交付本地静态搜索页或明确的静态不可用状态，不连接原站搜索接口。
- 源站真实 404 若需要保持兼容，应由静态 `404.html` 或部署规则处理，不伪装成正常详情页。

路由总数应同时报告“发现路径数”“交付的业务路径数”“技术端点排除数”和“可访问别名数”，避免不同口径都被称为 221。

## 5. 页面和内容组织

建议的页面族如下：

1. 首页：全屏分区、轮播、锚点和浮动工具。
2. 通用独立页：公司介绍、发展历程、联系我们等。
3. 项目/业务列表：栏目切换、卡片网格、分页。
4. 新闻列表：日期、摘要、分页。
5. 项目详情：图片、参数、正文、推荐内容。
6. 新闻详情：标题、日期、正文、前后篇。
7. 下载列表：本地文件链接；没有授权文件时不可造假链接。
8. 静态搜索：浏览器读取构建期生成的轻量索引，不发送网络请求。

共享壳组件只负责结构和视觉，页面正文来自类型化数据。富文本正文应在采集阶段转换为受控 HTML 数据，禁止把整页源 HTML直接塞进组件，也禁止携带源站 `<script>`、内联事件处理器、表单 action 或统计代码。

## 6. 素材本地化

### 6.1 完整发现

素材发现至少覆盖：

- `img[src]`、`img[srcset]`、`source[srcset]`。
- `video[src]`、`video poster`、`source[src]`。
- favicon、预加载字体、CSS `<link>`。
- 内联 style 和样式表中的 `url()`、`image-set()`、`@font-face`、`@import`。
- 页面脚本动态写入的轮播图片和背景图，仅提取媒体，不复用需要后端的源脚本。
- CSS 必须递归解析，直到不再出现新的 `@import` 或字体/背景依赖。

当前 772 条候选中有 654 个 JPG、104 个 PNG、6 个 GIF、7 个 JS、1 个 PHP URL，以及一个外部统计域名资源。它们需要分类，不可整包盲目下载。`pw.cnzz.com` 统计资源必须排除；PHP 媒体端点要根据响应 MIME 和文件签名决定真实扩展名。

### 6.2 映射与存储

建立可审计的 `asset-map`：

```ts
type LocalAsset = {
  sourceUrl: string;
  localPath: string;        // /media/source/<hash>-<safe-name>.<ext>
  sha256: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
  sourcePages: string[];
};
```

- 下载时保留源文件字节，第一轮视觉验收前不重新压缩、不转 WebP。
- 文件名含 URL/内容哈希，不能只用 basename，防止同名覆盖。
- HTTP 200 但返回 HTML、空文件、尺寸为 0 或 MIME 不符时立即失败。
- 内容相同可以复用同一 `localPath`，但必须保留全部来源记录。
- 缺图使用明确的 QA 报错占位，不能静默换成相似图片。
- 交付 HTML、CSS 和 JS 中不得出现 `https://www.szgsin.com`、`//www.szgsin.com` 或统计域名。

### 6.3 URL 重写

重写发生在内容导入/渲染阶段，不做可能误伤正文和 JSON 的全局字符串替换：

- 同源页面链接 → 路由合同中的原始 `publicPath`。
- 同源媒体 → `asset-map.localPath`。
- `srcset` → 逐个候选重写并保留密度/宽度描述符。
- CSS `url()` → 按样式表自身 URL 解析后改成本地绝对路径。
- 片段和有效查询参数保留；跟踪参数删除。
- 英文子站等明确的跨域导航保持外链，普通媒体不得跨域热链。
- iframe、地图、统计、聊天插件等外部运行时依赖必须替换为本地静态表现，或列为经用户批准的例外。

## 7. 浏览器 JavaScript 边界

浏览器脚本仅用于原站已有的前端行为：

- 首页分屏滚动、Hash 状态和键盘导航。
- 轮播、标签切换、图片画廊。
- 导航展开、浮动工具、二维码、返回顶部。
- 懒加载、滚动进入动画。
- 可选的本地静态搜索。

每个脚本都应是小型 ES module，并以 `data-*` 选择器挂载。页面无对应组件时不执行；重复初始化无副作用。禁止引入源站统计脚本、在线聊天、Cloudflare 邮箱解码脚本或任何后端 SDK。

## 8. 表单与动态功能隔离

视觉上保留原输入框、按钮、校验提示和交互状态，但默认行为必须静态安全：

- 联系/留言表单删除原 `action`、接口 URL、验证码和上传地址。
- 提交按钮使用 `type="button"`；表单 submit 事件仍统一 `preventDefault()`，防止按 Enter 触发网络提交。
- 点击后只展示已在规格中定义的“静态演示/未发送”反馈，不伪造“提交成功”。
- 不把用户输入写入 localStorage、Cookie、URL 或第三方服务。
- 电话和邮件可使用 `tel:`、`mailto:`；必须来自已授权内容。
- 静态搜索若实现，只读取构建产物中的本地索引，并在浏览器内过滤。
- Playwright 必须断言操作这些功能时没有 POST/PUT/PATCH/DELETE，也没有访问原域名。

若后续要启用真实提交，必须作为独立需求指定接收方、隐私提示、防垃圾策略和接口；不能在本次静态复刻中预留隐藏的原站接口。

## 9. 本地构建与预览

建议脚本职责如下，具体实现时再更新 `package.json`：

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 页面开发；不作为历史路径交付验收依据 |
| `npm run check` | Astro/TypeScript 静态检查 |
| `npm run build` | Astro 构建并物化遗留路径 |
| `npm run preview:static` | 用极简文件服务器直接服务 `dist/` |
| `npm run verify:routes` | 按冻结合同验证每个 URL、输出文件和页面标识 |
| `npm run verify:assets` | 校验本地素材、哈希、尺寸及外链泄漏 |
| `npm run verify:visual` | 代表页面三视口截图和差异图 |
| `npm run verify` | check + build + routes + assets + interaction smoke |

发布验收必须使用 `npm run build` 后的 `dist/`。权威本地预览服务器只做文件服务和 MIME 设置，不做 SPA fallback，并按 `.html` 优先规则解析无扩展请求。这样本地通过的路径行为才能代表 Nginx/对象存储部署，而不是 Astro 开发服务器的便利行为。

## 10. 自动验证门禁

### 10.1 构建和路径

每次完整验证应检查：

1. 路由合同达到确认后的目标数量（目标口径为 221）。
2. `publicPath` 唯一，别名关系无环。
3. `buildPath` 冲突只发生在显式同内容别名之间。
4. 每条交付路径请求成功，最终 HTML 含对应 `data-route-key`。
5. 页面内所有同源链接都在合同中，或是明确的静态文件。
6. 不存在空 `href`、`javascript:`、失效 `#` 占位或源站后台 URL。
7. 每个本地资源返回 200、MIME 正确且非零字节。
8. 构建输出中没有源域名、统计域名和原表单 action。
9. 控制台无 error，页面无未处理异常和资源 404。

### 10.2 视觉 QA

不需要对 221 条同模板详情逐页做人眼像素比对，但必须分层验收：

**代表页精检**

- 首页、公司介绍、业务列表、项目详情、科技创新、新闻列表、新闻详情、联系我们各选至少一页。
- 视口固定为 1440×900、768×1024、390×844，DPR=1、`zh-CN`、Asia/Shanghai。
- 原站和本地站使用相同滚动位置、轮播页、悬停/展开状态。
- 等待 `document.fonts.ready`、所有可见图片 `decode()` 和两帧渲染后截图。
- 动画状态用显式测试钩子或固定 Hash 冻结，不能依赖“刚好截到同一帧”。
- 保存原图、本地图、50% 透明叠加图和像素差异图；临时差异产物放 `.tmp/qa/`。
- 核心布局锚点误差目标不超过 2px；字体抗锯齿和视频帧等动态区域单独设遮罩并人工复核。

**全路由烟测**

- 逐条打开全部交付 URL，检查状态、标题、页面族标识、主图和正文非空。
- 对详情页增加内容键一致性检查，防止 156 个详情 URL 全部误渲染成同一篇。
- 随机抽取每种分页的首、中、末页，核对条目数、上一页/下一页和链接。

**交互回归**

- 首页滚轮、键盘、Hash、轮播自动/手动切换。
- 导航、移动菜单、栏目切换、画廊、二维码、返回顶部。
- 所有表单和搜索的无后端行为。
- 记录网络请求，断言没有向源站、统计域或未知第三方发出请求。

视觉门禁应先比较共享壳，再比较页面族，再抽查内容页。共享页头或页脚存在偏差时先修一次，不要在 221 个页面上逐页补丁。

## 11. 推荐实施顺序

1. 核准 221 路由合同，补抓 4 条差额和所有超时页面。
2. 完成素材递归发现、下载、哈希和 `asset-map`，做到离线可用。
3. 固定设计 token、共享壳和行为规格。
4. 实现首页及其全部状态，完成三视口精检。
5. 实现独立页、列表、详情、下载、搜索等页面族。
6. 接入捕获路由和构建后遗留路径物化。
7. 执行全路由、全资源和无外部请求验证。
8. 对代表页完成截图叠加/差异修正。
9. 用生产等价静态服务器做最终 `npm run verify`，交付 `dist/` 和部署规则。

## 12. 完成定义

只有同时满足以下条件才算“静态 1:1 复刻完成”：

- 经确认的全部业务路由和别名可通过原路径访问。
- 页面和媒体在断网条件下仍可展示（明确外链导航除外）。
- 没有原站运行时接口、统计脚本、热链和数据提交。
- 代表页面在三视口通过视觉对照，交互状态与规格一致。
- 全路由烟测、资源校验、Astro check 和生产构建全部通过。
- 已知源站异常、排除技术端点和剩余视觉差异均有明确记录，不以空页或静默降级掩盖。
