# 下一轮前台整体优化 · 设计稿

[打开预览目录](index.html)（下载仓库后用浏览器打开 HTML）。本目录为演示数据设计稿，不代表正式主题已经实现这些界面改动。

## 重点稿件

- [首页](home-compact-1440.png)
- [详细卡片](home-detailed-1440.png)
- [宽屏四列](home-detailed-1920.png)
- [窄桌面](home-detailed-768.png)
- [详情页](detail-1440.png)
- [地图侧栏](map-region-1440.png)
- [手机筛选](mobile-filters-390.png)
- [横屏筛选](mobile-filters-landscape.png)
- [地图放大前后对比](map-scale-comparison.png)

默认地图主体已放大：在相同 699×235 CSS px 面板内，陆地宽度约从 401px 增至 601px，占比从 57% 提升至 86%。取景保留节点、地区标签以及工具栏/图例的空间。

设计稿已完成 Chromium、Firefox、WebKit 各 20 组布局检查，覆盖窄屏、横屏、可选字段、数值一致性及地图标签边界。此结果仅针对设计稿，业务实现需另行验收。

HTML 使用本地字体和国旗资源；字体许可位于 `assets/`。固定演示日期为 2026-10-29。根目录 `preview.png` 继续作为原 HEX 宣传封面。
