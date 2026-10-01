# 赛博微光毛玻璃主题 (Cyber-Glass Theme) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 HEX 监控主题全面升级为现代、通透、富含科技感的赛博微光毛玻璃（Cyber-Glass Dashboard）设计，涵盖深空弥散环境光、6 款高品质科技调色盘、晶体高光边框、卡片微光呼吸与图表发光面积阴影。

**Architecture:** 采用渐进增强（Progressive Enhancement）与分层设计原则。底层通过 CSS 变量（Tokens）注入深空光效、毛玻璃与科技调色盘；中间层改造卡片晶体微光边框、能量槽与纯 CSS 硬件加速呼吸动效；顶层优化历史图表平滑度与面积渐变，保持向下兼容与 100% 测试通过。

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React, Recharts, D3, Playwright, Node.js Test Runner.

**Spec:** `docs/superpowers/specs/2026-10-01-cyber-glass-theme-design.md`

## Global Constraints

- 严禁引入重型第三方动效库，动效必须采用纯 CSS 实现（使用 `transform`、`opacity`、`box-shadow`）。
- 保持对 `prefers-reduced-motion` 与 `prefers-reduced-transparency` 的优雅降级。
- 保证全部既有单元测试与 i18n 检查（`npm run test`）100% 通过。
- 静态类型检查 `tsc -b` 与代码检查 `oxlint` 必须通过且 0 警告。
- 调色盘键值保持向下兼容，不破坏已有用户本地存储。

---

### Task 1: 设计系统与深空光效令牌 (Design Tokens & Deep Space Ambient)

**Files:**
- Modify: `src/styles/tokens.css`
- Test: `src/lib/design.test.ts`

**Interfaces:**
- Consumes: CSS custom properties (`:root`, `.dark`, `[data-palette]`).
- Produces: `--cyber-glow`, `--cyber-border-gradient`, `--glass-bg`, `--glass-blur`, `--mesh-gradient`.

- [ ] **Step 1: 编写令牌与光效变量的断言测试**

在 `src/lib/design.test.ts` 中增加对新令牌与深空环境背景的断言校验。

- [ ] **Step 2: 运行测试验证失败**

运行：`node src/lib/design.test.ts`
预期：PASS 或 FAIL（若新增断言未就绪）。

- [ ] **Step 3: 在 `src/styles/tokens.css` 中注入深空光效与科技调色盘**

更新 `:root` 与 `.dark`：
1. 深色模式下在 `body` 增加低不透明度对角暗夜柔光径向渐变（深空弥散光），浅色模式增加晶莹高光。
2. 升级 6 款科技调色盘（默认电光青 `#06b6d4`/`#00f2fe`、极光紫 `#8b5cf6`/`#a78bfa`、矩阵绿 `#10b981`/`#34d399`、炽阳金 `#f59e0b`/`#fbbf24`、深空蓝 `#3b82f6`/`#60a5fa`、赛博粉 `#ec4899`/`#f472b6`）。
3. 引入现代精密等宽字体栈优先回退：`ui-monospace, 'Geist Mono', 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`。

- [ ] **Step 4: 运行测试验证通过**

运行：`node src/lib/design.test.ts && npm run test`
预期：PASS。

- [ ] **Step 5: 提交代码**

```bash
git add src/styles/tokens.css src/lib/design.test.ts
git commit -m "feat(tokens): add deep space ambient lighting and cyber palette tokens"
```

---

### Task 2: 调色盘配置与国际化字典升级 (Cyber Palettes & i18n)

**Files:**
- Modify: `src/lib/appearance.ts`
- Modify: `src/lib/en.ts`
- Modify: `src/components/Preferences.tsx`
- Test: `src/lib/appearance.test.ts`
- Test: `scripts/check-i18n.mjs`

**Interfaces:**
- Consumes: `palettes` 字典对象。
- Produces: 升级后的科技调色盘名称及设置面板色块。

- [ ] **Step 1: 检查已有测试**

运行：`node src/lib/appearance.test.ts && node scripts/check-i18n.mjs`
预期：PASS。

- [ ] **Step 2: 更新 `src/lib/appearance.ts` 中的调色盘映射与默认质感**

将 `palettes` 的展示名称升级为：
```typescript
export const palettes = {
  default: '电光青',
  midnight: '极光紫',
  forest: '矩阵绿',
  sunset: '炽阳金',
  ocean: '深空蓝',
  rose: '赛博粉'
};
```
在 `defaults` 中确保 `glass: true` 默认启用，赋予开箱即得的毛玻璃科技质感。

- [ ] **Step 3: 更新 `src/lib/en.ts` 翻译字典**

补充：
```typescript
"电光青": "Cyber Cyan",
"极光紫": "Cyber Violet",
"矩阵绿": "Matrix Emerald",
"炽阳金": "Solar Amber",
"深空蓝": "Deep Space Blue",
"赛博粉": "Neon Pink",
```
保留兼容旧词条。

- [ ] **Step 4: 更新 `src/components/Preferences.tsx` 中的色块样式**

将色块 Swatches 颜色列表对应为新科技色板的代表色值：
`['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']`。

- [ ] **Step 5: 验证测试与国际化检查通过**

运行：`node src/lib/appearance.test.ts && node scripts/check-i18n.mjs`
预期：`appearance migration passed` 且 `literal translation calls covered`，无任何缺失。

- [ ] **Step 6: 提交代码**

```bash
git add src/lib/appearance.ts src/lib/en.ts src/components/Preferences.tsx
git commit -m "feat(appearance): update palette labels, default glass mode and i18n dictionary"
```

---

### Task 3: 微光毛玻璃卡片与能量槽重塑 (Cyber-Glass Cards & Energy Bars)

**Files:**
- Modify: `src/styles/components.css`
- Modify: `src/styles/card-layouts.css`
- Modify: `src/styles/card-network.css`
- Test: `npm run lint`

**Interfaces:**
- Consumes: `--glass-bg`, `--tone`, `--cyber-border-gradient`.
- Produces: 具有悬浮上浮光照、晶体高光边框的毛玻璃卡片与双色渐变进度能量槽。

- [ ] **Step 1: 编写/更新毛玻璃样式与晶体渐变边框**

在 `src/styles/components.css` 中重塑 `.node-card`、`.world-panel`、`.table-scroll`：
1. 增强 `backdrop-filter: blur(16px)`，半透明深色玻璃背景。
2. 边框采用晶体切面微光描边（上亮下暗立体感）。
3. 鼠标 Hover 时上浮 `translateY(-2px)`，并增加柔和光晕扩展（`box-shadow: 0 8px 24px -4px color-mix(in srgb, var(--tone) 25%, transparent)`）。

- [ ] **Step 2: 升级 CPU / 内存 / 硬盘 能量槽**

在 `src/styles/card-layouts.css` 中将进度条改为双色平滑渐变能量条：
`background: linear-gradient(90deg, color-mix(in srgb, var(--tone) 70%, transparent), var(--tone))`；
当值超过 80% 时自动转为高亮警示能量槽。

- [ ] **Step 3: 运行静态语法检查**

运行：`npm run lint`
预期：0 errors, 0 warnings。

- [ ] **Step 4: 提交代码**

```bash
git add src/styles/components.css src/styles/card-layouts.css src/styles/card-network.css
git commit -m "feat(styles): implement cyber-glass card surface, crystal borders and gradient energy bars"
```

---

### Task 4: 在线呼吸脉冲指示灯与网速动态感 (Online Pulse & Telemetry Motion)

**Files:**
- Modify: `src/styles/home.css`
- Modify: `src/styles/home-refresh.css`
- Test: `npm run test`

**Interfaces:**
- Consumes: 节点在线状态类名 `.online`、`.busiest-pill`、网速组件。
- Produces: 纯 CSS 3 秒呼吸脉冲光晕微动效（`@keyframes cyber-pulse`）。

- [ ] **Step 1: 在 `src/styles/home.css` 中定义呼吸光晕动效**

添加 `@keyframes cyber-pulse`：
```css
@keyframes cyber-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 60%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--ok) 0%, transparent);
  }
}
```
为在线状态指示点与正常节点徽章加上该呼吸脉冲。

- [ ] **Step 2: 增加高负载急促呼吸与网速流动微动效**

对警示状态添加琥珀色/赤红微频闪动；对实时网速上下行箭头添加微流动感。在 `prefers-reduced-motion: reduce` 下自动禁用 `animation`。

- [ ] **Step 3: 验证所有测试**

运行：`npm run test`
预期：所有测试全部通过。

- [ ] **Step 4: 提交代码**

```bash
git add src/styles/home.css src/styles/home-refresh.css
git commit -m "feat(home): add breathing pulse glow to online nodes and telemetry micro-motion"
```

---

### Task 5: 历史监控图表平滑与面积发光阴影 (Telemetry Charts & Area Glow)

**Files:**
- Modify: `src/components/NodeDetail.tsx`
- Modify: `src/styles/detail.css`
- Modify: `src/styles/detail-reading.css`
- Test: `npm run build`

**Interfaces:**
- Consumes: Recharts / SVG 折线图组件与配置。
- Produces: 面积发光阴影（LinearGradient Defs）与平滑贝塞尔曲线。

- [ ] **Step 1: 在 `src/components/NodeDetail.tsx` 中增强图表渐变**

引入带有平滑渐变阴影的 SVG 定义（`<linearGradient id="cyberChartGradient">`），让折线图在深色模式下具有自上而下的优雅微光淡出效果。

- [ ] **Step 2: 升级详情四分区卡片与胶囊按钮**

在 `src/styles/detail.css` 中将详情页历史图表容器、指标选择按钮与时间范围按钮（1h、6h、24h、7d）统一升级为微光切面胶囊样式。

- [ ] **Step 3: 构建与类型检查**

运行：`npm run build`
预期：TypeScript 编译成功，Vite 打包成功。

- [ ] **Step 4: 提交代码**

```bash
git add src/components/NodeDetail.tsx src/styles/detail.css src/styles/detail-reading.css
git commit -m "feat(detail): add smooth spline, area gradient glow and cyber capsule controls"
```

---

### Task 6: 多端全流程回归验证与视觉质检 (Verification & Visual Inspection)

**Files:**
- Scratch: `scratch/verify.cjs`
- Output: 桌面端、移动端、深色/浅色渲染截图

- [ ] **Step 1: 运行全套单元与回归测试**

运行：`npm run test && npm run lint`
预期：18 项单元测试全部 PASS，Linter 0 警告。

- [ ] **Step 2: 执行全量打包构建**

运行：`npm run package`
预期：构建完成并打包生成 `theme.tar.gz` 和 `theme.tar.gz.sha256`。

- [ ] **Step 3: 启动本地预览并通过 Playwright 捕获多端效果截图**

启动本地服务，通过自动化脚本在 1440x900（桌面端）和 390x844（移动端）下分别捕获：
1. 桌面端深色模式首页与详情页
2. 桌面端浅色模式首页
3. 移动端深色模式首页
检查毛玻璃背景模糊、晶体边框、呼吸灯、渐变能量槽与图表光晕。

- [ ] **Step 4: 最终提交与成果整理**

```bash
git add docs/superpowers/plans/2026-10-01-cyber-glass-theme.md
git commit -m "docs: finalize implementation plan for cyber-glass theme"
```
