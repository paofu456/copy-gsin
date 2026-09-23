# 金鑫绿建官网交互模式

> 范围：`https://www.szgsin.com/` 当前公开首页、`style.css`、`main.js`、fullPage.js、FlexSlider、vidbacking 和 Counter-Up。精确样式值来自 CSSOM；切屏位移、类名和脚本异常经浏览器运行态验证。

## 1. 交互总表

| 组件 | 驱动方式 | 状态类/结果 | 时序 |
| --- | --- | --- | --- |
| 主导航 | hover | 当前/悬停项绿底白字；下拉菜单显现 | `0.3s` / `0.36s` |
| 搜索 | hover；CSS 也支持 `.open-search` | 搜索图标变绿，面板高度 `0→40px` | `height .36s` |
| 首页分屏 | 滚轮、触控、方向键、Hash、左侧圆点 | `body.fp-viewing-pageN`、section `.active/.fp-completely`、容器 translate3d | `700ms` |
| 首页轮播 | 时间、左右按钮、底部圆点 | `.flex-active-slide/.flex-active` | 自动 7s；滑动 600ms |
| 公司介绍入场 | fullPage 激活第二屏 | 文案和数据从位移+透明进入 | 每项 1s，延迟 0.2–0.8s |
| 业务三栏入场 | fullPage 激活第三屏 | 三栏自下进入 | 每栏 1s，延迟 0.5/1/1.5s |
| 业务三栏详情 | hover | 遮罩变浅，图标上移消失，标题/描述/按钮归位 | `0.6s` |
| 新闻入场 | 激活新闻屏或进入页脚屏 | 左侧从左、右侧从右进入 | 每项 1s，延迟 0.5–1.5s |
| 客服工具栏 | click / hover | 折叠、电话展开、二维码淡入 | 160ms / 0.3s / fade |
| 内页卡片 | hover | 图片放大、遮罩/文字进入、颜色切换 | 0.3–0.8s |
| 二级导航/分页 | hover / 当前项 | 绿底白字和三角/边框 | `0.3s` |

## 2. 页头与全局导航

### 2.1 主导航

**交互模型：纯 CSS hover。**

- `.nav-item.active .category` 和 `.nav-item:hover .category` 都变为 `#32b372` 背景、白字。
- 链接状态以 `transition: all .3s` 过渡。
- 有子菜单的项目在 hover 时把 `.dropdown-menu` 从 `opacity:0; visibility:hidden; z-index:10` 切到 `opacity:1; visibility:visible; z-index:20`，过渡 `all .36s ease`。
- 下拉菜单始终占据 `416px` 宽；显示时不改变布局，因为它绝对定位在页头下方。
- 下拉图片 hover 时 `scale(1.1)`，过渡 `0.5s`；文字链接 hover 变主绿，过渡 `0.3s`。
- 没有 click-to-open、焦点展开、Escape 关闭或移动菜单逻辑。

### 2.2 语言与搜索

- 语言链接 active/hover 从 `#999` 变为 `#32b271`，过渡 `0.3s`。
- 搜索图标 hover 变主绿。
- `.search-box` 默认宽 `320px`、高 `0`、`overflow:hidden`；`.search-nav:hover` 或 `.open-search` 时高变 `40px`，过渡 `height .36s ease`。
- 当前 `main.js` 没有切换 `.open-search` 的 click 处理，因此实际主要依赖 hover。复刻不要只做点击弹层。
- 搜索按钮读取 `#kword`，trim 后拼成 `/search/{关键字}.html`。空值或“快速检索”会 alert；但线上默认值是“搜索内容”，因此默认值不会被拦截。
- 页面声明了 `EnterPress(e)`，但输入框没有绑定键盘事件；当前只有按钮点击可靠触发。

## 3. 首页 fullPage 状态机

### 3.1 页面与锚点映射

| 锚点 | section | 交互含义 |
| --- | --- | --- |
| `#page1` | `.sec-banner` | 5 张背景图轮播 |
| `#page2` | `.sec-habout` | 公司介绍 |
| `#page3` | `.sec-hbusiness` | 三类业务 |
| `#page4` | `.sec-hnews` | 新闻中心 |
| `#page5` | `.fp-auto-height` | 页脚收束 |

注意：第五个圆点指向页脚，不是另一块新闻 section。新闻 section 是第四屏；进入第五屏时通过额外 `.on` 类让新闻内容继续保持完成态。

### 3.2 切屏行为

**交互模型：滚动/键盘/Hash/click 共同驱动。**

- fullPage 初始化 `anchors` 为 `page1..page5`，`menu:'#page-control'`。
- 点击左侧圆点会改变 Hash，并同步对应 `<li class="active">`。
- 运行时 `body` 类为 `fp-viewing-pageN`，当前 section 为 `.active.fp-completely`。
- 容器使用 `translate3d`，实测切换时 `transition:700ms`。
- 前四屏等于视口高；末屏使用 `fp-auto-height`。
- 在 `1440×900`：`#page2` 位移 `-900px`；`#page5` 位移 `-2965px`，265px 页脚贴齐视口底部。
- fullPage 默认会拦截普通页面滚动。不要用 `window.scrollTo` 代替首页切屏，否则末屏、Hash、菜单 active 和入场触发都会不一致。

### 3.3 左侧圆点

- `.page-control` 固定在 `left:10px; top:50%`，左右内边距各 `20px`，`z-index:100`。
- 每个项目宽 `24px`，上下间距 `5px`；中心点 `4×4px`，主绿色。
- SVG 圆环为 `24×24px`，内部圆 `r=10`，整体旋转 `-90deg`。
- 普通圆环 `stroke-dasharray:500; stroke-dashoffset:500; opacity:0`。
- active 圆环切为 `stroke-dasharray:585; opacity:1`，stroke 动画 `0.6s`。

### 3.4 `afterLoad` 逻辑

首页回调把 fullPage 2.x 的第一个参数当锚点字符串使用：

1. 进入 `page5`：给 `.sec-hnews` 添加 `.on`。
2. 离开 `page5`：移除 `.on`。
3. 离开 `page2` 且介绍图处于 `.on`：移除 `.on`、恢复播放图标并暂停视频。

第三条在当前线上通常不会执行，因为视频初始化先报错，介绍区不会进入 `.on`。

## 4. 首屏轮播

**交互模型：时间驱动 + click；不是 fullPage 的横向 slide。**

- 当前有 5 张真实背景图，FlexSlider 通过前后克隆形成 7 个运行时 `<li>`。
- 显式选项：`animation:'slide'`、控制圆点开启、左右箭头开启、键盘关闭。
- 未覆盖默认值：7 秒自动播放、600ms 动画、无限循环、用户操作后暂停、hover 不暂停、触控关闭。
- 每个 slide 的高度在加载和 resize 时强制等于 `window.innerHeight`。
- 图片使用 `background-position:center; background-size:cover`，没有 `<img>` 的 `object-fit`。
- 左右按钮为直径 `60px` 的透明圆，左右各 `100px`；hover 时背景和边框变主绿，过渡 `0.5s`。
- 底部圆点普通为 `8×8px`、`rgba(50,179,114,.5)`；active 宽增为 `20px` 且变实色，过渡 `0.5s`。
- 当前线上首屏没有项目标题、参数板或竖排文字。规格应按当前 5 张纯背景轮播编写。

## 5. 公司介绍屏

### 5.1 进入动画

第二屏未激活时：

- 标题、主张、描述、按钮均为 `translateY(50px)` 和 `opacity:0`。
- `.sec-habout.active` 时统一变为 `translateY(0)`、`opacity:1`。
- 每项动画都是 `1s cubic-bezier(.35,.75,.55,1)`，依次延迟 `0.2/0.4/0.6/0.8s`。
- 四个数据项初始为 `translateX(100px)`、`opacity:0`，激活后恢复；延迟同样为 `0.2/0.4/0.6/0.8s`。
- “查看更多”按钮 hover 只增加 `0 6px 15px rgba(50,179,114,.4)` 阴影，过渡 `0.4s`。

### 5.2 视频现状

CSS 定义的原意是：

- 点击 `.vide-play` 切换 `.h-about-fig.on`。
- `.on` 时图标由播放换成暂停并调用 video.play()；再次点击暂停。
- `.on` 时播放按钮透明度变 0，hover 介绍图时再显现。
- 离开第二屏自动暂停并复位。

但当前线上 `.habout-video` 没有 video 元素，ready 回调在 `video.pause()` 处抛错。浏览器实测只有一个由 vidbacking 插入的遮罩，播放事件未绑定；用户点击内层 `<a target="_blank">` 会打开腾讯云视频。复刻规格必须明确选择：

- **忠实当前线上：** 保留封面和外链播放，不做行内 video 状态；或
- **恢复设计意图：** 使用授权的本地 MP4，实现上面的 `.on` 状态机。

不要混合两者，例如既新开窗口又在背景播放。

### 5.3 数字滚动现状

Counter-Up 默认意图是 `time:2000ms; delay:10ms`，借助 Waypoint 在元素到达视口底部时触发一次。但调用位于视频报错之后，所以当前数字 `26/56/500/3.2` 是静态文本，没有滚动动画。

## 6. 业务三栏

### 6.1 整屏入场

- 每栏初始 `translateY(200px); opacity:0`。
- 第 1/2/3 栏分别使用 1 秒动画，延迟 `0.5/1/1.5s`。
- 第三屏成为 `.active` 后恢复为 `translateY(0); opacity:1`。

### 6.2 单栏 hover

- 普通遮罩为 `rgba(0,0,0,.67)`；hover 后变 `.35`。
- 顶部图标普通 `translateY(55px)`；hover 后到 `-30px` 且透明。
- 标题普通 `translateY(72px)`；hover 后归零。
- 描述和圆形链接普通 `translateY(55px); opacity:0`；hover 后归零并显示。
- 所有上述变化均为 `0.6s ease`。
- 圆形链接为 `56×56px`、`#4fd3a0`；它自身 hover 时只把背景色变透明，保留边框和背景箭头图。

这是 hover 揭示式卡片；不要把描述和按钮默认常驻。

## 7. 新闻屏与页脚衔接

- 新闻屏背景 `#f8f8f8`，内容上方保留固定页头高度对应的 `padding-top:100px`。
- 左侧重点图和文案初始各从 `translateX(-200px)` 进入，延迟 `1s/1.5s`。
- 右侧三条新闻初始 `translateX(100px); opacity:0`，延迟 `0.5/1/1.5s`。
- `.sec-hnews.active` 或 `.sec-hnews.on` 都把它们恢复到零位并显示。
- 重点图 hover 放大到 `1.1`，过渡 `0.8s`；标题 hover 变主绿，过渡 `0.3s`。
- “查看详情/查看更多”按钮 hover 变主绿、白字并增加品牌阴影，过渡 `0.3s`。
- `max-width:1430px` 时重点新闻正文绝对定位叠在图片底部，白色 `.9` 背景；右侧列表的单项按钮隐藏。
- 进入 `page5` 后新闻 section 不再 active，但 `afterLoad` 添加 `.on`，避免新闻内容在页脚露出时突然回到隐藏初态。

## 8. 右侧悬浮客服工具栏

### 8.1 布局和普通状态

- `.gr_kefu` 固定在 `right:0; top:50%`，宽 `50px`、高 `154px`，`margin-top:-77px`，`z-index:100`。
- 每个按钮 `50×50px`，间距 `1px`；背景 `#0a8c4a`，透明度 `.6`，hover 到 1。
- 顶部折叠按钮为 `30×30px` 圆形，默认图标旋转 `45deg`；容器带 `.show` 时旋转回 0，过渡 `0.3s`。

### 8.2 行为

- 点击顶部 `.kf-shqi` 切换 `.gr_kefu.show`，并对整个 `<ul>` 执行 `fadeIn/fadeOut`。
- 电话项 `.kf3` hover 时，脚本先把 `.sidebox` 动画到 `130px`，又对同一个 `.sidebox3` 排队动画到 `200px`；每段 `160ms`。离开时回到 `50px`。
- 二维码项 `.kf2` hover 时淡入 `.kf_wx`，离开淡出。弹层位于按钮左侧 `140px`，宽 `140px`，内边距 `14px`，二维码 `110×110px`。
- QQ 项保留 `tencent://message` 链接。
- 留言项进入联系页。
- 内页回顶使用 `$('html,body').animate({scrollTop:0},600)`，在普通文档流页面有效。

首页的回顶有独立缺陷：预期应把 href 改为 `#page1` 交给 fullPage，但该语句被前面的 video 异常阻断；仅做 scrollTop 不会改变 fullPage transform。

## 9. 内页公共交互

### 9.1 二级导航、面包屑和分页

- 面包屑链接 hover 变主绿，`0.3s`。
- 二级导航 active/hover 为绿底白字，底部 `14×8px` 小三角从透明变显示，`0.3s`。
- `main.js` 按 `1200 / 链接数` 写入每项宽度。
- 分页普通按钮 `40×40px`，前后页 `102×40px`；`.on` 或 hover 时绿底白字、绿边，`0.3s`。

### 9.2 公司介绍指标卡

- 卡片 `580×280px`，白底、轻阴影，整卡过渡 `0.5s`。
- hover 后卡片变主绿，数字变白，描述变 `#addbc1`。
- 图标来自 `about_02.png` sprite；四个图标在 hover 时分别把 Y 背景位从 `0` 切到 `-45px`。

### 9.3 发展历程和荣誉/证书

- 历程画布高 `460px`，内部超长轨道 `30000%`，`cursor:move`，说明交互模型是横向拖动/轨道切换，不是普通纵向时间线。
- 节点 active 时年份变主绿；节点图标有 `0.3s ease-in-out`。
- 具体拖动算法不在本次检查的 `main.js` 中，应从该页面额外脚本取证后再实现。
- 荣誉和证书卡片 hover 只把标题变主绿；没有 CSS 放大或弹层规则可据此推断。

### 9.4 业务项目列表和详情

- 列表卡片 `386×250px`。图片 hover `scale(1.1)`，过渡 `0.8s`。
- 覆盖层普通为 `rgba(0,0,0,.6); opacity:0`；hover 后显示，过渡 `0.6s`。
- 标题从 `translateY(-30px)`、描述/箭头从 `translateY(30px)` 归零，均 `0.6s`。
- 详情主图 `720×466px`，hover 放大 1.1，`0.8s`。
- 大图轮播圆形箭头 `70×70px`，位于左右各 `220px`；hover 主绿背景/边框，`0.3s`。
- 推荐案例箭头是 `24×30px` 文字图标，hover 变主绿；推荐卡片 `386×250px`。

### 9.5 技术专利/下载

- 单行高 `60px`、灰色边框。
- hover 时 PDF 图标从 `icon-pdf.png` 切到 `icon-pdf02.png`，下载图标同样切换到 `icon-download02.png`，过渡 `0.3s`。
- CSS 只证明视觉 hover，真实文件下载目标需从页面内容和授权素材表核对。

### 9.6 科技创新案例切换

- 年份导航宽 `1040px`，当前年份类为 `.in` 并变主绿。
- 内容面板默认隐藏，当前项类为 `.on` 才显示。
- 前后圆形按钮 `70×70px`，hover 时文字和边框变绿，`0.3s`。
- 文本行 hover 变绿底白字，`0.5s`。
- 状态切换脚本不在本次 `main.js` 中，不能仅凭 CSS 断言是 click、自动播放还是拖动；实现前应对对应内页再做运行态检查。

### 9.7 新闻列表和详情导航

- 顶部新闻图 hover `scale(1.1)`，`0.8s`；卡片标题 hover 主绿，`0.3s`。
- 普通新闻行标题 hover 主绿，`0.3s`。
- 详情页上一篇/返回/下一篇为 `310/580/310px` 的三段导航，链接 hover 主绿，`0.3s`。

### 9.8 联系页

- 提交按钮普通为主绿白字，hover 时背景透明、文字 `#333`，`0.3s`。
- 联系方式链接和地址链接 hover 变主绿，`0.3s`。
- 本次静态复刻只能保留视觉和前端校验；不得向源站 action 或未批准服务提交。

## 10. 响应式交互结论

- 768px 和 390px 下仍使用相同 hover、fullPage、轮播和悬浮栏模型。
- 页面没有移动菜单，也没有为触摸设备提供替代的业务卡片展开状态。
- FlexSlider 源配置关闭 touch；fullPage 自身仍可能处理触摸竖向切屏。
- 固定客服栏按视口右边缘定位，因此窄屏可见；页头中部和右侧内容因 1200px 内部画布而被裁掉。
- 如果交付要求严格 1:1，应保留这种桌面画布裁切。若后续用户要求真正移动适配，应单列为新范围，不能混入首轮像素复刻。

## 11. 复刻验收清单

- [ ] 进入 `#page1..#page5` 时 Hash、active 圆点和 section 状态同步。
- [ ] 切屏持续时间约 700ms，末屏按 265px 内容高度贴底，而不是强制整屏。
- [ ] 轮播有 5 个控制点，7s 自动播放、600ms 横向切换，手动操作后暂停。
- [ ] 第二、三、四屏的 stagger 延迟与位移方向准确。
- [ ] 第五屏显示时新闻保持完成态，不回闪。
- [ ] 导航下拉、搜索 hover、项目卡片和按钮 hover 均按源时序执行。
- [ ] 电话项最终展开到 200px，二维码弹层位于工具栏左侧。
- [ ] 内页回顶 600ms；首页回顶必须明确选择忠实缺陷或修复到 `#page1`。
- [ ] 视频与数字滚动按“当前线上”或“恢复意图”选择其一并记录，不产生混合行为。
- [ ] 390/768 视口不自动出现源站不存在的折叠菜单或单列布局。
- [ ] 所有交互在静态构建中不访问百度分享、统计、原站接口或未批准的第三方服务。
