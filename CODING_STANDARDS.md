# Coding Standards

## 代码风格与命名约定

Astro、HTML、CSS、JavaScript 和 YAML 使用两个空格缩进。HTML 结构保持语义化；主页导航锚点必须与实际区块一致，目前使用 `about` 和 `contact`。

新增资源文件名使用小写和连字符风格，例如 `profile-photo-v2.jpg`、`style-v20260706.css`。变更 CSS、JavaScript、SVG、图片等受 `/assets/*` 长缓存影响的资源时，必须改用新的版本化文件名，并同步更新 Astro 引用和 `scripts/verify-build.mjs`。

优先使用原生 CSS、原生 JavaScript 和本地资源。不要引入前端框架、远程字体、远程图标、地图 iframe 或统计脚本，除非先确认访问稳定性并记录原因、替代方案和风险。

禁止引入或保留以下依赖：

- `fonts.googleapis.com`
- `fonts.gstatic.com`
- `maps.google.com` / `www.google.com/maps` iframe
- `unpkg.com`
- Google Analytics

GoatCounter 是经确认允许的统计方案：用于了解访客量和来源，无 cookie，并与 conference-calendar 共用账户。替代方案是仅提供请求量的 Cloudflare Zone Analytics 或 Cloudflare Web Analytics。风险是第三方会收到请求技术数据；`count.js` 必须以版本化文件名在本站托管，更新时换新文件名；线上 CSP 由 Cloudflare 响应头改写规则下发，`connect-src` 和 `img-src` 需放行 `https://wukai.goatcounter.com`。

## 视觉检查

视觉或交互改动，除 AGENTS.md 的提交前检查外，还需本地打开页面检查桌面和移动端布局、导航、主题切换、CV 入口和自动日期、学术链接、法律链接及浏览器控制台。CI 不能替代本地视觉检查。
