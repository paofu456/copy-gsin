# GSIN 官网静态复刻

`https://www.szgsin.com/` 的授权纯前端静态复刻项目。项目仅使用 HTML、CSS 和浏览器 JavaScript，不包含后端、数据库、CMS 或前端框架。

## 本地运行

```powershell
npm install
npm run dev
```

浏览器访问 `http://127.0.0.1:4321/`。

## 构建与验收

```powershell
npm run check
npm run build
npm run verify
npm run qa
```

- `npm run check`：校验冻结路由、HTML/CSS 本地引用、外部资源和禁用的统计脚本。
- `npm run build`：静态清洗、完整性检查并原子生成 `dist/`。
- `npm run verify`：同时验证 `public/` 与构建后的 `dist/`。
- `npm run qa`：用 Playwright 检查代表页面、控制台、网络、坏图和首页交互。

## 实现边界

- 路由合同共 222 条；原站返回 404 的 Cloudflare 邮件端点和返回 500 的搜索端点不生成页面，其余 220 条均保留。
- 保留原站约 `1220px` 的最小桌面画布；390px 与 768px 视口呈现原站相同的横向裁切行为。
- 首页轮播、整屏滚动、导航、搜索展开和悬浮工具栏等前端交互保持可用。
- 联系表单仅作静态展示，浏览器策略禁止提交和后台请求。
- 统计脚本、Cloudflare 邮件解码脚本和百度分享联网脚本已移除。
- 原站字体端点持续返回 HTTP 500，因此少量图标使用本地 CSS 图形替代，避免坏链和空白方框。

研究记录和原站参考截图位于 `docs/`，自动化验收报告位于 `docs/design-references/szgsin/local-qa/report.json`。
