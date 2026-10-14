# 仓库工作规则

## HEX 宣传封面保护

- 根目录 `preview.png` 是专门制作的 HEX 宣传封面，也是 README 和后台主题管理使用的封面。
- 除非用户明确要求优化或更换 HEX 宣传封面，否则任何功能优化、界面修改、截图更新、构建、打包及发布都必须保留现有封面，不得修改、重新生成或用首页截图覆盖。
- 更新界面展示图时，写入 `screenshots/readme/`；验证截图写入 `artifacts/` 或 `tests/artifacts/`，不得写入 `preview.png`。
- 运行截图脚本前检查输出路径：`scripts/capture-hex.mjs` 和 `scripts/create-preview.mjs` 当前会写入 `preview.png`，没有用户明确要求时不得执行覆盖封面的操作。
- 打包时使用现有 `preview.png`，验收时核对包内封面与源文件一致。封面变更必须能追溯到用户明确提出的封面优化或更换要求。

其他开发、分支和发布约定见 `CONTRIBUTING.md`。
