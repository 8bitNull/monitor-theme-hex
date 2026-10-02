# HEX

> 当前为 `dev` 开发分支，包含尚未完成验收的改动。稳定版请使用 `main` 或 [v0.3.6 发布页](https://github.com/8bitNull/monitor-theme-hex/releases/tag/v0.3.6)。

开发状态与验收标准见 [下一次发布清单](maintenance/NEXT-RELEASE.md)。

为 **monitor-probe** 制作的监控主题，支持桌面卡片与表格、手机端布局、深浅色和中英文。首页汇总节点状态与网络情况，详情页提供资源历史、线路延迟、流量和设备资料。

[下载稳定版](https://github.com/8bitNull/monitor-theme-hex/releases/latest) · [使用指南](maintenance/USER-GUIDE.md) · [开发说明](maintenance/DEVELOPMENT.md) · [更新记录](CHANGELOG.md)

![HEX 主题预览](preview.png)

## 安装与升级

1. 准备好正在运行的 monitor-probe，从 [GitHub Releases](https://github.com/8bitNull/monitor-theme-hex/releases/latest) 下载 `theme.tar.gz`。
2. 在后台的主题管理中上传安装包。
3. 选择 **HEX** 启用；升级时上传新版安装包覆盖即可。

主题短名为 `hex`。GitHub 自动生成的源码 ZIP 不能用于后台安装。发布页提供 `theme.tar.gz.sha256`，可用于核对下载文件。

当前稳定版为 **v0.3.6**。`main` 维护稳定版，`dev` 保存尚未完成验收的开发；开发分支中的版本字段不代表正式发布。

## 主要功能

- **节点浏览**：搜索、状态与地区筛选、分组和排序；桌面支持卡片与表格视图。
- **资源与网络**：CPU、内存、硬盘、实时网速，以及资源历史、线路延迟和丢包记录。
- **手机端**：节点、概览和设置入口，详情使用总览、资源、网络、资料四个分区。
- **配置与偏好**：后台统一配置站点外观，访客可在浏览器保存明暗、语言和显示偏好。
- **状态提醒**：高负载、离线、临近到期和流量额度提示；管理员可查看 Hub 与 Agent 版本信息。

数据含义、配置作用域、手机桌面快捷方式和具体操作见 [使用指南](maintenance/USER-GUIDE.md)。

## 页面预览

截图使用本地演示数据。

![桌面首页](screenshots/readme/home-desktop.png)

<details>
<summary>桌面表格与服务器详情</summary>

![桌面表格](screenshots/readme/table-desktop.png)

![服务器详情](screenshots/readme/detail-desktop.png)

</details>

<img src="screenshots/readme/home-mobile.png" width="300" alt="手机节点页" /> <img src="screenshots/readme/detail-mobile.png" width="300" alt="手机详情资料" />

<details>
<summary>手机概览与设置</summary>

<img src="screenshots/readme/overview-mobile.png" width="300" alt="手机概览页" /> <img src="screenshots/readme/settings-mobile.png" width="300" alt="手机设置" />

</details>

## 本地开发

使用 Node.js 24 与 npm：

```sh
npm ci
npm run dev
```

开发服务器默认把 `/api` 代理到 `http://127.0.0.1:9911`。演示服务、测试、打包和多浏览器验证见 [开发说明](maintenance/DEVELOPMENT.md)，提交与合并规则见 [CONTRIBUTING](CONTRIBUTING.md)。

## 文档与归档

| 入口 | 内容 |
|---|---|
| [使用指南](maintenance/USER-GUIDE.md) | 首页、详情、设置和数据说明 |
| [维护资料](maintenance/README.md) | 验收记录、地图性能与历史发布说明 |
| [脚本说明](scripts/README.md) | 构建、打包、截图和验证工具 |
| [历史归档](archive/README.md) | 设计稿、验证截图和性能基准 |

## 来源与许可

HEX 采用 MIT 许可。基础接口与部分组件源自 monitor-theme-default，部分视觉和地图资源参考 Komari Next。来源与第三方声明见 [NOTICE](NOTICE.md)、[LICENSE](LICENSE) 和 [LICENSE.komari-next](LICENSE.komari-next)。
