# 金鑫绿建官网技术栈与样式基线分析

> 来源：2026-09-23 对 `https://www.szgsin.com/` 首页、公开 CSS/JS 资源和浏览器运行态的只读检查。本文记录的是当前线上源站事实；若旧截图或既有研究文档与本文冲突，应以重新采集的线上 DOM、CSSOM 和运行态为准。

## 1. 已检查资源

| 资源 | 已确认信息 | 主要职责 |
| --- | --- | --- |
| `/skin/jx/css/reset.css` | 全局 reset、固定桌面宽度、公共容器、字体声明 | 站点基础样式 |
| `/skin/jx/css/fullpage.min.css` | fullPage.js 2.9.7 的官方样式头 | 首页整屏容器与导航基础 |
| `/skin/jx/css/style.css` | 427 条 CSSOM 规则 | 所有页面视觉、状态和少量断点覆盖 |
| `/skin/jx/js/jquery.min.js` | jQuery 1.7.2 | 插件和全站事件基础 |
| `/skin/jx/js/fullpage.min.js` | 与 2.9.7 样式及运行态结构配套 | 首页垂直整屏切换 |
| `/skin/jx/js/jquery.flexslider.js` | FlexSlider 2.1 | 首页首屏轮播 |
| `/skin/jx/js/jquery.vidbacking.min.js` | vidbacking 插件 | 原设计中的介绍视频背景 |
| `/skin/jx/js/jquery.counterup.js` | Counter-Up 1.0，内含 Waypoints 4.0.0 | 原设计中的数字滚动 |
| `/skin/jx/js/main.js` | 站点自定义 jQuery 脚本 | 二级导航宽度、客服栏、分享、回顶 |
| 首页内联脚本 | fullPage、FlexSlider、视频、计数器、搜索初始化 | 首页页面级配置 |

页面是传统服务端模板输出的 HTML，不是 React/Vue/SPA，也不存在前端路由或客户端内容渲染。复刻可以继续使用 Astro 在构建期输出静态 HTML，浏览器端用小型原生 JavaScript 模块重做必要交互；没有技术理由保留 jQuery 1.7.2 或直接复制旧插件。

## 2. 全局布局模型

### 2.1 固定桌面画布

`reset.css` 明确设置：

```css
body {
  font-family: "Microsoft Yahei", Open Sans, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background: #fff;
  min-width: 1220px;
}
```

这不是移动优先或自适应重排站。容器规则为：

- `.container-middle`：默认 `1200px`；视口 `>=1430px` 时变为 `1400px`。
- `.container`：始终 `1200px`。
- `body` 最小宽度 `1220px`。
- fullPage 启用时 `html`/`body` 为 `overflow: hidden`，窄屏只显示 1220px 桌面画布的一部分，不能横向滚动。

浏览器实测在 `390×844` 下：文档布局宽 `1220px`、视口宽 `390px`；页头自身仍为视口宽，但内部 `.container-middle` 和 `.navbar` 都是 `1200px`。业务三栏每栏约 `406.66px`，没有堆叠，页头也没有汉堡菜单。1:1 复刻不应自行增加移动端重排。

### 2.2 断点

源 CSS 只做局部压缩，没有完整的手机断点：

| 条件 | 变化 |
| --- | --- |
| `min-width: 1230px` | `.container-middle` 为 `1200px`（与默认相同） |
| `min-width: 1430px` | `.container-middle` 扩为 `1400px` |
| `max-width: 1690px` | 首页公司介绍右栏内边距、文案间距、数据区间距收紧 |
| `max-width: 1460px` | 首页公司介绍右栏改为左右各 `40px` |
| `max-width: 1431px` | 页脚信息列从 `500/450px` 缩为 `430/390px` |
| `max-width: 1430px` | 首页新闻列表间距缩小、列表按钮隐藏、重点新闻文案浮在图片底部 |
| `max-width: 1420px` | 案例轮播箭头从容器外 `±80px` 收到容器内 `20px` |

## 3. 字体与图标

| 用途 | 字体 |
| --- | --- |
| 正文和绝大多数标题 | `"Microsoft Yahei", "Open Sans", Arial, sans-serif` |
| 大号数字、年份、日期 | 自托管 `SamsungSS_B`，文件为 `SamsungSharpSans_bold.woff/.ttf` |
| 首页经营数字 | `Roboto, "Open Sans", Arial`；源站未声明加载 Roboto，实际会按本机字体回退 |
| 图标 | 自托管 `iconfont.woff/.ttf`，通过 `::before` 私有区字符渲染 |

图标映射包括搜索、QQ、左右箭头、二维码、电话、留言、播放、暂停、回顶和客服折叠。复刻可以使用本地原字体保持像素一致，也可以逐个转为本地 SVG；不能依赖远程图标服务。

## 4. 色值基线

CSSOM 中最常用的色值如下：

| 语义 | 色值 | 说明 |
| --- | --- | --- |
| 品牌主绿 | `#32b372` / `rgb(50,179,114)` | 74 处声明，按钮、选中态、描边、分页等 |
| 语言链接绿 | `#32b271` / `rgb(50,178,113)` | 仅语言切换使用，和主绿差 1 个蓝通道值 |
| 客服深绿 | `#0a8c4a` | 右侧悬浮工具栏 |
| 业务按钮浅绿 | `#4fd3a0` | 首页业务圆形按钮 |
| 辅助亮绿 | `#78be21` | 未在当前首页 DOM 展开的 QQ 面板样式 |
| 主文字 | `#333`；导航标题另用 `#383735` | 正文和标题 |
| 次文字 | `#666`、`#888`、`#999`、`#828282` | 描述、辅助信息、下拉菜单 |
| 分割线 | `#dbdbdb`，次级为 `#dcdcdc/#dedede/#ededed` | 卡片和页脚 |
| 浅底色 | `#f8f8f8` | 首页介绍右栏和新闻屏 |
| 深遮罩 | `rgba(0,0,0,.67)`、悬停后 `.35` | 首页业务三栏 |
| 卡片遮罩 | `rgba(0,0,0,.6)` | 内页项目卡片 |
| 品牌阴影 | `0 6px 15px rgba(50,179,114,.4)` | 按钮悬停 |
| 页头阴影 | `0 2px 19px rgba(0,0,0,.09)` | 固定页头/二级导航 |

## 5. 共享壳尺寸

### 5.1 页头

- 固定定位，`100px` 高，`z-index: 500`，白底和 `0 2px 19px rgba(0,0,0,.09)` 阴影。
- Logo `136×40px`，顶部间距 `30px`。
- 主导航绝对铺满容器并居中；每个 `.nav-item` 左右 `20px`，链接左右 `17px`，`16px/100px`。
- 当前项和悬停项为白字主绿整块背景。
- 语言切换 `16px/100px`，右侧间距 `40px`。
- 搜索入口 `40×100px`；搜索层位于页头下方，宽 `320px`，输入框 `260×40px`、按钮 `60×40px`。
- 下拉菜单宽 `416px`，白底，`0 13px 42px 11px rgba(0,0,0,.05)`；图片 `166×117px`，中线 `1×117px`，内容内边距 `20px 22px`。

### 5.2 内页公共上半部

- `.sec-subbanner`：页头下 `margin-top:100px`，高 `400px`，背景居中覆盖。
- 面包屑：贴横幅底部，高 `40px`，`rgba(0,0,0,.22)`。
- 二级导航：高 `60px`，`16px/60px`；当前项/悬停项绿色，底部出现 `14×8px` 三角。
- `main.js` 会把二级导航每项宽度设为 `1200 / 项数`，即使 `container-middle` 在宽屏已扩为 1400px，仍只分配总计 1200px。

### 5.3 页脚

- 上层上下内边距 `37px`，顶部 `2px` 主绿线、底部 `1px #ededed`。
- 主导航链接 `16px`，相邻右间距 `75px`。
- 下层上下内边距 `24px 0 40px`；Logo 仍为 `136×40px`。
- 二维码宽 `100px`；热线字号 `20px`。
- 首页最后的 `fp-auto-height` 页脚实测整体高 `265px`。

## 6. 首页整屏结构

首页运行态由 fullPage.js 2.9.7 生成：

- `html` 添加 `.fp-enabled`；`body` 添加 `.fp-viewing-pageN`。
- 前四个 `.section` 被包装为 `.fp-section.fp-table > .fp-tableCell`，每屏高度等于当前视口。
- 第五屏是 `fp-auto-height` 页脚，按内容高度显示。
- `#fullpage` 使用 `translate3d(0, -offset, 0)`，切屏过渡实测为 `700ms`。
- 首页配置的锚点是 `page1` 至 `page5`，`menu` 指向 `#page-control`。
- 在 `1440×900` 下，前四屏均为 `900px`；第五屏为 `265px`。进入 `#page5` 时容器位移为 `-2965px`，页脚出现在视口 `y=635..900`。
- 当前线上首屏是 **5 张纯背景图轮播**，没有项目参数文字面板。FlexSlider 为 5 个真实 slide 加首尾 clone，运行时容器宽 `1400%`。旧截图中若出现参数面板，不应据此覆盖当前线上结构。

## 7. 首页插件配置

### 7.1 fullPage

页面显式配置：

```js
anchors: ['page1', 'page2', 'page3', 'page4', 'page5']
menu: '#page-control'
```

其余使用 fullPage 2.9.7 默认值。浏览器已确认的关键效果是自动垂直居中、Hash 更新、菜单 active 同步、CSS3 位移和 `700ms` 切屏。

### 7.2 FlexSlider

页面显式配置：

```js
animation: 'slide'
controlNav: true
directionNav: true
keyboard: false
```

未覆盖的 2.1 默认值包括：自动播放、`slideshowSpeed:7000`、`animationSpeed:600`、循环、手动操作后暂停、`pauseOnHover:false`。插件文件的默认 `touch:false` 也未被覆盖。

页面脚本把每个 slide 高度设为 `window.innerHeight`，并在 resize 时重算。左右箭头各 `60×60px`，距视口左右 `100px`；底部圆点距底 `20px`，普通 `8px`，active 宽 `20px`。

## 8. 外部运行时依赖及复刻取舍

源站运行时还会触碰以下外部资源：

- `main.js` 动态注入百度分享脚本，且 URL 是 `http://bdimg.share.baidu.com/...`。
- 页面存在 Cloudflare Insights beacon。
- 公司介绍播放链接指向腾讯云 VOD MP4。
- 页脚存在工信部和公安备案外链。

静态复刻应保留正常导航外链，但不要复制百度分享、统计 beacon 或其它遥测脚本。视频若已获授权，应本地化；未本地化前可保留明确的普通外链，不能静默热链。

## 9. 当前源站运行缺陷

这些问题会影响“照当前线上行为复刻”还是“恢复设计意图”的选择：

1. 当前首页 `.habout-video` 中没有 `<video>`，vidbacking 只插入了一个遮罩节点。随后内联脚本执行 `find('video')[0].pause()` 并抛出 `TypeError`。
2. 该异常中断同一个 ready 回调中后续代码，因此内联视频播放/暂停绑定、Counter-Up 调用和把回顶链接改成 `#page1` 的逻辑都没有执行。
3. 当前播放按钮内仍有指向腾讯云 MP4 的 `<a target="_blank">`，所以实际可用行为是打开视频外链，不是原地播放。
4. 首页回顶按钮仍为 `javascript:void(0)`；`main.js` 只尝试对 `html,body` 做 `scrollTop` 动画，不能改变 fullPage 的 transform，因此在整屏首页上实际失效。
5. 搜索框默认值是“搜索内容”，但校验只排除空值和“快速检索”。用户不改文字直接点搜索时会跳到 `/search/搜索内容.html`。
6. 输入框没有绑定 `EnterPress`，页面虽然声明了函数，按 Enter 不会自动搜索。

建议在组件规格中为这些点明确标记 `observed-live` 与 `intended-source`。默认 1:1 应优先复现当前可见状态；若决定修复，应作为有意识的兼容改良，而不是误以为源站正常运行。

## 10. 静态复刻实现等价物

| 源站实现 | 静态复刻建议 |
| --- | --- |
| jQuery 1.7.2 | 不引入；原生事件、classList、Web Animations/CSS transition |
| fullPage 2.9.7 | 小型本地整屏控制器，保留 Hash、700ms 位移、键盘/滚轮与末屏 auto-height |
| FlexSlider 2.1 | 小型本地循环轮播，保留 7s 自动播放、600ms 滑动、克隆循环和手动暂停 |
| vidbacking | 普通本地 `<video>` 或忠实保留当前外链行为，二选一并记录 |
| Counter-Up/Waypoints | 当前线上未成功执行；若修复设计意图可用 IntersectionObserver 实现 |
| iconfont | 优先本地字体或按图标拆 SVG |
| 百度分享/统计 | 删除；可使用本地静态分享图标，不向第三方发请求 |

无论采用何种现代等价实现，DOM 状态类应尽量保持 `.active`、`.on`、`.show`、`.flex-active` 等原语义，便于与原 CSS 和截图逐项核对。
