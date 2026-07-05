# Repository Guidelines

## 项目结构与模块组织

这是一个用于 GitHub Pages 的静态个人学术网站。

- `index.html` 是主页，包含站点内容和各个区块的结构。
- `assets/css/style.css` 负责页面布局、响应式规则和主题样式。
- `assets/js/script.js` 负责少量前端交互。
- `assets/images/` 存放 SVG 标志和站点头像。
- `privacy.html` 和 `impressum.html` 是公开隐私说明和法律说明页面。
- `KaiWu_CV_0705.pdf` 是站点中提供下载的当前简历文件；替换简历时使用新的版本化文件名，避免浏览器或 CDN 缓存旧文件。
- `sitemap.xml` 是静态文件，里面的 `<lastmod>` 不会自动更新。
- `.github/workflows/site-checks.yml` 运行轻量静态检查，防止关键文件缺失或被禁止的第三方依赖回归。

仓库没有独立的源码目录、构建目录或生成产物目录。新增资源请放在 `assets/` 下，并使用相对路径，保证 GitHub Pages 可正常访问。

## 构建、测试与本地开发命令

这个项目不需要包管理器，也不需要构建步骤。常用本地命令如下：

```sh
python3 -m http.server 8000
```

在本地启动静态服务器，地址为 `http://localhost:8000`。

```sh
git status
```

查看提交前有哪些文件发生了变化。

```sh
curl -IL https://kaiwu-astro.github.io/
```

检查已部署的 GitHub Pages 网站是否能正常响应。

## 代码风格与命名约定

HTML、CSS 和 JavaScript 都使用两个空格缩进。HTML 结构要语义化且易读，各区块应使用清晰的 `id`，例如 `about`、`career`、`work`、`contact`。

新增资源文件名使用小写和连字符风格，例如 `profile-photo.jpg`、`conference-logo.svg`。优先使用原生 CSS 和原生 JavaScript，除非确有必要，否则不要引入框架。

## 外部依赖与大陆可访问性

站点面向公开学术访问，新增或修改页面时不要依赖容易在中国大陆访问受阻的第三方服务。字体、图标、地图、脚本和统计都应优先使用本地资源或系统能力。

禁止引入或保留以下依赖：

- `fonts.googleapis.com`
- `fonts.gstatic.com`
- `maps.google.com` / `www.google.com/maps` iframe
- `unpkg.com`
- Google Analytics

如确实需要第三方服务，必须先确认其在主要访问地区稳定可用，并在 `implementation-notes.html` 记录原因、替代方案和风险。

## 测试指南

仓库没有自动化测试套件。提交或发布前请手动检查：

- 使用 `python3 -m http.server 8000` 在本地打开站点。
- 检查桌面和移动端宽度下的布局是否正常。
- 确认导航标签、外部链接和版本化简历下载都可用。
- 检查浏览器控制台是否有报错。

如果新增 JavaScript 行为，保持逻辑简洁，并直接验证受影响的交互。

GitHub Actions 中的 `Site checks` 会检查关键文件、XML/JS 语法和禁止的第三方依赖，但不能替代本地视觉检查。

## 提交与 Pull Request 规范

当前提交历史采用简短、祈使式的提交信息，例如：

```text
Build personal academic website
```

请沿用同样风格：用一句简洁的话描述用户能看到的变化。Pull Request 应包含简短说明、视觉改动截图，以及你做过的手动检查说明。如有关联 issue，也请一并链接。

## Agent 操作要求

每次 agent 修改仓库后，必须先完成相关本地测试或手动检查。测试通过后，直接使用 `$commit` skill 创建提交；提交完成后，将当前分支推送到 `origin`。不要把未验证的改动提交或推送。

修改任何已收录到 `sitemap.xml` 的公开页面、CV 文件或其他公开 URL 时，必须同步更新对应条目的 `<lastmod>` 日期。新增或删除公开页面、版本化 CV 或重要公开资源时，也要同步增删 `sitemap.xml` 条目。

处理 Cloudflare 配置时，先确认 `about.wukai.work` 是否为 proxied 状态，以及当前 API token 是否具备 Zone Settings、Rulesets/Page Rules 和必要 DNS 权限。Cloudflare Email Obfuscation、Redirect Rules、Cache Rules、Response Header Transform Rules 等只有在流量经过 Cloudflare 代理时才会对站点生效。不要在没有明确验证的情况下启用 wildcard DNS、HSTS preload、`includeSubDomains` HSTS 或激进 Bot/WAF 挑战规则；如需暂缓，记录到 `implementation-notes.html`。

Cloudflare 目标配置应保持精简：`about.wukai.work` CNAME 指向 `kaiwu-astro.github.io`，不要添加 `*.wukai.work` wildcard；保留 GitHub Pages 域名验证 TXT 记录；SSL/TLS 使用 `Full (strict)`；启用 Always Use HTTPS、Automatic HTTPS Rewrites、Email Address Obfuscation 和 Brotli；禁用 Rocket Loader；配置 `/cv` 到当前版本化 CV PDF 的重定向；仅在资源文件名适合长期缓存时，才给 `/assets/*` 设置较长浏览器缓存；安全响应头可使用 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(), microphone=(), geolocation=()` 和与当前本地资源匹配的保守 CSP。通过 API 操作时，token 至少需要对应 zone 的 Zone Settings 读写、Rulesets 或 Page Rules 读写，以及必要时 DNS 读写权限。应用任何 Cloudflare 改动后，必须验证 `https://about.wukai.work/`、`https://about.wukai.work/cv`、当前 CV PDF、`sitemap.xml` 和线上响应头。

## 安全与配置提示

不要提交私人草稿、未公开文档、凭据或本地配置文件。仓库里只放用于公开展示的资源。替换简历时使用新的版本化文件名，并同步更新 `index.html`、`sitemap.xml` 和需要的 Cloudflare `/cv` 重定向目标。
