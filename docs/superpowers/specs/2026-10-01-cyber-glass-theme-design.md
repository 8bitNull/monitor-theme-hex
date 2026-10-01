# 赛博微光毛玻璃主题重塑设计规范 (Cyber-Glass Theme Design Spec)

## 1. 背景与目标 (Background & Goals)

本项目是基于 `monitor-theme-hex`（已在 [https://ipw.cc](https://ipw.cc) 实际部署体验）的全面视觉与体验升级。
现有主题虽然功能完备、数据结构扎实，但在视觉质感上偏向传统的平面管理后台，缺少当代前沿科技控制台的层次光影与技术生命力。

本次升级的目标是：以“**赛博微光毛玻璃 (Cyber-Glass Dashboard)**”为核心风格，打造兼具现代感、通透美感与精密科技感的服务器遥测监控大屏，在桌面端与移动端、深色与浅色模式下均获得卓越的用户体验。

---

## 2. 视觉与设计系统规范 (Visual & Design System)

### 2.1 材质与环境光效 (Atmospheric Materials)
* **深空悬浮光效 (Deep Space Ambient)**：
  * **深色模式 (Dark Mode)**：
    * 基底色采用深空曜石黑（`#0a0d14`）。
    * 在视口对角引入两处极低不透明度的径向柔光光晕（左上角幽蓝、右下角微青紫），为毛玻璃折射提供深邃的光学背景，消除单调平面感。
  * **浅色模式 (Light Mode)**：
    * 采用晶莹通透的雾面高光质感（基底 `#f4f6fa`），搭配通透白（`rgba(255, 255, 255, 0.75)`）与柔和漫反射环境光。
* **微光毛玻璃卡片 (Cyber-Glass Surface)**：
  * 卡片背景：采用 `rgba(15, 23, 42, 0.65)`（深色）与 `rgba(255, 255, 255, 0.75)`（浅色），结合 `backdrop-filter: blur(16px)`。
  * 晶体切面边框：摒弃生硬的单色实线边框，采用带顶部微光的渐变细描边，赋予卡片立体倒角质感。
  * 悬浮微光：鼠标 Hover 卡片时，平滑上浮 2px，并溢出基于当前主题色的柔和边框光晕。

### 2.2 科技调色盘矩阵 (Cyber Palette Collection)
升级并扩展主题调色盘系统，在主题设置中支持一键切换 6 种高质感科技色，并以**电光青 (Cyber Cyan)** 作为推荐默认：

1. **电光青 (Cyber Cyan - 推荐默认)**：
   * 主色调：`#06b6d4` / 发光色：`#00f2fe`
   * 寓意：光纤信号与未来算力核心，通透高冷，暗黑大屏最佳伴侣。
2. **极光紫 (Cyber Violet)**：
   * 主色调：`#8b5cf6` / 发光色：`#a78bfa`
   * 寓意：Web3 与高级 AI 控制台特有的深邃神秘霓虹。
3. **矩阵绿 (Matrix Emerald)**：
   * 主色调：`#10b981` / 发光色：`#34d399`
   * 寓意：经典黑客帝国与终端矩阵代码流，活力充沛。
4. **炽阳金 (Solar Amber)**：
   * 主色调：`#f59e0b` / 发光色：`#fbbf24`
   * 寓意：精密航天仪表盘与能量核心。
5. **深空蓝 (Deep Space Blue)**：
   * 主色调：`#3b82f6` / 发光色：`#60a5fa`
   * 寓意：经典可靠，纯度和发光质感全面升级。
6. **赛博粉 (Neon Pink)**：
   * 主色调：`#ec4899` / 发光色：`#f472b6`
   * 寓意：未来主义赛博朋克风。

### 2.3 技术排印与数字质感 (Typography)
* 引入优先回落的现代技术等宽字体栈：
  `ui-monospace, 'Geist Mono', 'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Consolas, monospace`
* 关键遥测指标（CPU、内存百分比、实时网速、丢包率、延迟数字、IP地址）采用等宽数字对齐，呈现精密仪表盘质感。

---

## 3. 核心组件与交互规范 (Component Specifications)

### 3.1 节点“生命力”与状态指示器 (Status Indicator)
* **在线节点 (Online Pulse)**：
  * 在线指示灯引入纯 CSS 实现的 3 秒呼吸脉冲光晕（`cyber-pulse`），GPU 硬件加速，灵动且不晃眼。
* **高负载与告警 (Alert Pulse)**：
  * 告警状态触发金橙色或赤红色的紧凑呼吸光晕，迅速吸引注意力。
* **离线节点 (Offline State)**：
  * 自动降级为岩石灰并轻微降低卡片透明度，形成清晰的主次对比。

### 3.2 节点卡片与资源能量槽 (Node Cards & Energy Bars)
* **渐变能量槽 (Progress Bars)**：
  * CPU、内存、硬盘进度条由扁平单色升级为双色平滑渐变能量槽（如电光青渐变至深湖蓝）；
  * 当使用率超过 80% 时，能量槽末端自动泛起微弱警示光辉。
* **网络与延迟标签 (Network & Latency)**：
  * 延迟数值统一采用高对比技术胶囊标签展示；
  * 网速箭头增加微动效流动感。

### 3.3 历史监控图表与详情页 (Charts & Detail View)
* **渐变折线图 (Smooth Spline with Area Glow)**：
  * 详情页历史曲线升级为平滑曲线与主色调半透明渐变面积阴影填充；
  * 工具栏时间范围按钮（1h、6h、24h、7d）升级为高透玻璃切面胶囊样式。

### 3.4 全球节点地图 (World Map)
* 地图底板采用暗色科技投影色板，陆地轮廓边缘微发光；
* 节点标记点增加雷达扫描式外圈微光扩散效果。

---

## 4. 技术实施方案与文件清单 (Implementation Scope)

| 模块 | 涉及文件 | 修改核心职责 |
| :--- | :--- | :--- |
| **设计令牌** | `src/styles/tokens.css` | 注入深空光效、毛玻璃变量及 6 大赛博色板令牌 |
| **配置与类型** | `src/lib/appearance.ts` | 注册 6 种新调色盘，设置 `cyber-cyan` 为默认，完善默认质感参数 |
| **国际化字典** | `src/lib/en.ts` | 补充新调色盘英文翻译，保障 CI 检查通过 |
| **卡片与材质** | `src/styles/components.css`<br>`src/styles/card-layouts.css` | 落实微光毛玻璃、晶体渐变边框、渐变能量槽与悬浮上浮 |
| **外观设置面板** | `src/components/Preferences.tsx` | 更新调色盘 Swatches 色块拾取器 |
| **历史图表升级** | `src/components/NodeDetail.tsx`<br>`src/styles/detail.css` | 历史折线图平滑过渡与面积阴影发光 |
| **动效与状态** | `src/styles/home.css` | 呼吸脉冲动画（`cyber-pulse`）与网速微动感 |

---

## 5. 质量保证与验收标准 (Quality Assurance & Acceptance Criteria)

1. **自动化测试 100% 通过**：
   * 运行 `npm run test`，保证 `appearance.test.ts`、`check-i18n.mjs` 等全部测试无破坏性故障。
2. **代码风格与类型安全**：
   * 运行 `oxlint` 0 警告，运行 `tsc -b` 类型检查 100% 通过。
3. **视觉多端验证**：
   * 使用 Playwright 自动化截取桌面宽屏、手机端在浅色与深色模式下的效果图，核实毛玻璃、边框发光与呼吸指示灯的渲染一致性。
4. **性能与兼容性**：
   * 所有动效仅使用 CSS `transform`、`opacity` 与 `box-shadow`；
   * 支持 `prefers-reduced-motion` 与 `prefers-reduced-transparency` 优雅降级。
