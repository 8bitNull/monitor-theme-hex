# 脚本入口

所有脚本默认从仓库根目录运行。`capture-*`、`audit-*`、`mockup-*`、`verify-*` 中包含历史验证工具，使用前检查脚本里的服务端口、浏览器与输出路径。

| 命令或文件 | 用途 |
|---|---|
| `npm run build` | 生成应用图标与地图数据，执行 TypeScript 检查并构建前端 |
| `npm run package` | 重新构建并生成主题安装包与 SHA-256 校验文件 |
| `npm run demo` | 启动使用本地样例数据的演示服务 |
| `npm test` | 执行业务单测和翻译覆盖检查 |
| `npm run test:e2e` | 执行 Playwright 浏览器测试 |
| `capture-readme.mjs` | 更新 `screenshots/readme/` 展示图 |
| `create-preview.mjs` | 生成主题预览图 |
| `benchmark-map.mjs`、`benchmark-map-delivery.mjs` | 地图与资源传输基准 |
| `check-map-delivery.mjs` | 检查站点静态资源响应头 |
| `fixtures.mjs`、`refinement-fixtures.mjs` | 演示与验证的样例数据 |

新的临时验证产物写入 `artifacts/` 或 `tests/artifacts/`。需要长期维护的脚本放在这里，一次性脚本放入本地 `scratch/`。打包文件范围由 `package.mjs` 明确列出，维护资料和验证工具不会随安装包发布。
