# 本地开发与验证

分支、目录和提交约定见 [CONTRIBUTING](../CONTRIBUTING.md)。下列命令从仓库根目录执行。

项目使用 React、TypeScript 和 Vite，开发环境使用 Node.js 24 与 npm。

```sh
npm ci
npm run dev
```

开发服务器会把 `/api` 请求代理到 `http://127.0.0.1:9911`。需要连接其他后端时，修改 [vite.config.ts](../vite.config.ts) 中的代理地址。

不连接真实后端也可以预览页面。先构建，再启动演示服务：

```sh
npm run build
npm run demo
```

演示页面位于 `http://127.0.0.1:4173`，使用本地样例数据，演示服务不会打进安装包。

提交前可以运行以下检查：

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

浏览器测试默认使用已安装的 Chrome，也可以通过环境变量 `TEST_BROWSER=msedge` 使用 Edge。测试会启动自己的演示服务，如果 4173 端口已被占用，请先关闭手动启动的演示服务，或通过 `THEME_DEMO_PORT` 指定其他端口。

运行 `npm run package` 会重新构建，并生成 `theme.tar.gz` 和对应的 SHA-256 校验文件。安装包包含主题清单、前端文件、预览图和许可证；依赖、演示服务和本地测试产物不会随包发布。

发布说明放在 [GitHub Releases](https://github.com/8bitNull/monitor-theme-hex/releases)，检查记录见 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 多浏览器兼容性回归

先运行 `npm run build`，安装 Playwright 的 Chromium、Firefox、WebKit 后，执行 `npx playwright test --config playwright.compat.config.ts`。该套件覆盖三种浏览器引擎的页面、导航、加载状态和模拟会话；手机视口及触摸模拟不代替实体手机 Safari 验收。
