# 开发与仓库约定

## 分支与发布

- `main` 保存稳定代码，当前对应 v0.3.6。
- `dev` 保存正在开发和验证的改动。版本字段与历史提交中的版本号不表示正式发布。
- 日常修改提交到 `dev`。完成验收后，通过 Pull Request 合并到 `main`；合并前不要在 `main` 引入未完成的开发。
- 正式发布从验收后的 `main` 创建版本标签，并在 GitHub Releases 上传安装包及校验文件。安装包不提交到源码仓库。
- 临时功能分支按需创建，合并后删除；无需为每次发布长期保留 release 分支。

## 目录

| 路径 | 用途 |
|---|---|
| `src/` | React、TypeScript 源码；业务单测与模块放在一起 |
| `public/` | 随主题分发的静态资源和默认配置 |
| `tests/` | Playwright 浏览器测试 |
| `scripts/` | 构建、打包、演示、截图和维护脚本 |
| `maintenance/` | 公开维护文档、验收记录与历史发布说明 |
| `screenshots/readme/` | README 展示图 |
| `screenshots/`、`design/`、`benchmarks/` | 受控的历史截图、设计参考与性能基准 |
| `docs/` | 本地私有计划和工作记录，不提交 |
| `scratch/` | 本地临时验证脚本与截图，不提交 |
| `artifacts/` | 本地验证产物、发布正文草稿，不提交 |
| `dist/`、`test-results/`、`tests/artifacts/` | 自动生成目录，不提交 |

历史截图和设计资料仍可能被脚本或报告引用。清理时先核对引用；新生成的验证截图放入忽略目录，只有需要展示或长期留存的资料才纳入版本管理。

## 本地开发

使用 Node.js 24 与 npm：

```sh
git switch dev
npm ci
npm run dev
```

后端代理、演示服务与浏览器测试配置见 [README](README.md#本地开发)。构建和维护工具入口见 [脚本说明](scripts/README.md)。

## 提交与验收

提交前检查 `git status` 和差异，避免纳入私人记录、真实站点截图、凭据或自动生成的安装包。移动资料时同步修改相对链接和脚本引用。

代码修改按影响范围运行检查；合并和发布前运行：

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

多浏览器检查见 README。测试结果与限制记录在 [验收记录](maintenance/ACCEPTANCE.md)；历史记录描述当时版本，不作为当前开发分支的通过证明。

```sh
npm run package
```

此命令生成本地 `theme.tar.gz` 和 `theme.tar.gz.sha256`。发布草稿放入 `artifacts/releases/`，正式发布说明以 GitHub Releases 为准。
