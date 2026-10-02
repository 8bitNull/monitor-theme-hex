## 主要更新

- **驾驶舱布局深度精化调优（Cockpit Layout Refinement v0.3.9）**：
  - **顶部概览解耦并全宽铺展（Full-Width Overview Deck）**：服务器总览标题、四格运行摘要卡片与快捷系统筛选栏独立于下层双栏网格，消除大屏顶部不对称与拥挤感。
  - **右侧中控台丰富化（NOC Aside Widgets HUD）**：新增 Top 5 实时流量排行榜（`CockpitLiveLeaderboard`）与系统健康状态卡片（`CockpitStatusCard`），填补右栏纵向留白，支持平滑定位高通量节点及展开高负载告警。
  - **驾驶舱卡片自适应密度断点（Responsive Density Breakpoints）**：1024px–1365px 中等桌面端默认采用 1 列卡片网格，保障仪表盘与指标条充裕呼吸空间；≥1366px 宽屏自动启用 2 列卡片网格。
  - **节点详情工作台纵向平衡（Detail Workbench Harmonization）**：左侧设备规格资料重构为双列紧凑 Key-Value 胶囊网格，缩短纵向高度，与右侧遥测图表时间线达成视觉平衡；长数值自动跨列并支持原生悬停提示。
  - **无障碍体验与全端 0px 溢出**：支持减弱动效偏好（`prefers-reduced-motion`），地图关闭时中控台保持可用；移动端（<1024px）保持单列平滑回退，跨设备 Playwright 自动化验证 0px 水平溢出。

## 安装与验证

在 `monitor-probe` 后台的主题管理中上传 `theme.tar.gz`，然后启用 Monitor HEX。请直接下载 Release Assets 中的 `theme.tar.gz` 安装包，不要使用 GitHub 自动打包的源码 ZIP。

安装包内 `theme.json` 版本为 `0.3.9`。生产构建、lint 及全量 18 组测试通过。下载后可用随附的 `theme.tar.gz.sha256` 校验安装包完整性。
