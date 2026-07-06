# Repository Guidelines

## 项目结构与模块组织

这是一个 Astro 静态个人学术网站，部署到 GitHub Pages，并通过 Cloudflare 服务 `about.wukai.work`。

- `src/pages/` 定义公开页面：主页、`privacy.html`、`impressum.html` 和 `/cv/` fallback。
- `src/layouts/` 和 `src/components/` 存放 Astro 布局和组件。
- `src/content/` 是主要内容来源，包含 profile、about、timeline、science、services 和 legal 内容。
- `public/` 存放构建时原样复制到 `dist/` 的公开文件，包括 `CNAME`、`robots.txt`、`sitemap.xml`、CV PDF 和静态资源。
- `public/assets/` 存放 CSS、JavaScript、图片和 SVG。Cloudflare 会对 `/assets/*` 设置较长浏览器缓存，变更这些资源时必须使用版本化文件名。
- `.pages.yml` 是 Pages CMS 配置。
- `scripts/verify-build.mjs` 检查 Astro 构建产物。
- `.github/workflows/site-checks.yml` 运行 Astro CI，并在 `main` push 时发布 `dist/` 到 GitHub Pages。
- 根目录旧版 `index.html`、`privacy.html`、`impressum.html`、`assets/`、`cv/`、`CNAME`、`.nojekyll`、`robots.txt`、`sitemap.xml` 和旧 CV 文件只在迁移过渡期保留，确认 Pages 已切到 Actions 后应删除。

不要提交 `dist/`、`node_modules/`、`.astro/`、`implementation-notes.html`、`comments.md` 或本地缓存文件。

## 构建、测试与本地开发命令

安装依赖：

```sh
npm ci
```

本地开发：

```sh
npm run dev
```

提交或发布前必须运行：

```sh
npm run check
npm run build
npm run verify
```

`npm run verify` 依赖 `dist/`，所以必须在 `npm run build` 之后运行。

## 内容编辑指南

优先编辑 `src/content/` 下的 Markdown/YAML，不要手改 `dist/`。

- 站点身份、邮箱、CV 文件名、SEO 描述和社交链接：`src/content/site/profile.yaml`
- About：`src/content/about/main.md`
- What I'm doing：`src/content/services/main.yaml`
- Career：`src/content/timeline/*.yaml`
- Scientific Work：`src/content/science/*.yaml`
- Privacy 和 Impressum 正文：`src/content/legal/*.md`

邮箱必须集中维护在 `src/content/site/profile.yaml`。Privacy/Impressum 若需要显示邮箱，应通过组件或共享 profile 数据渲染，不要在多个内容文件中手写重复邮箱。

## 代码风格与命名约定

Astro、HTML、CSS、JavaScript 和 YAML 使用两个空格缩进。HTML 结构保持语义化，各主页区块使用稳定 `id`，例如 `about`、`career`、`scientific-work`、`contact`。

新增资源文件名使用小写和连字符风格，例如 `profile-photo-v2.jpg`、`style-v20260706.css`。变更 CSS、JavaScript、SVG、图片等受 `/assets/*` 长缓存影响的资源时，必须改用新的版本化文件名，并同步更新 Astro 引用和 `scripts/verify-build.mjs`。

优先使用原生 CSS、原生 JavaScript 和本地资源。不要引入前端框架、远程字体、远程图标、地图 iframe 或统计脚本，除非先确认访问稳定性并记录原因、替代方案和风险。

禁止引入或保留以下依赖：

- `fonts.googleapis.com`
- `fonts.gstatic.com`
- `maps.google.com` / `www.google.com/maps` iframe
- `unpkg.com`
- Google Analytics

## CV、Sitemap 与公开 URL

替换 CV 时使用新的版本化文件名，并同步更新：

- `public/` 中的 PDF 文件
- `src/content/site/profile.yaml` 的 `cvFile`
- `public/sitemap.xml`
- Cloudflare `/cv` 和 `/cv/` redirect 目标

修改任何收录到 `public/sitemap.xml` 的公开页面、CV 文件或重要公开 URL 时，必须同步更新对应 `<lastmod>`。本迁移日期为 `2026-07-06`。

## 测试指南

提交前至少运行：

```sh
npm run check
npm run build
npm run verify
```

视觉或交互改动还需要本地打开页面检查桌面和移动端布局、导航、主题切换、科学工作筛选、外部链接、CV 链接和浏览器控制台。

GitHub Actions 会重复运行 `npm ci`、`npm run check`、`npm run build` 和 `npm run verify`，但不能替代本地视觉检查。

## 提交与 Pull Request 规范

沿用简短、祈使式提交信息，例如：

```text
Import Astro website source
```

每次 agent 修改仓库后，必须先完成相关本地测试或手动检查。测试通过后，直接使用 `$commit` skill 创建提交；提交完成后，将当前分支推送到 `origin`。不要把未验证的改动提交或推送。

Pull Request 应包含简短说明、视觉改动截图、执行过的检查命令和关联 issue。

## Cloudflare 操作要求

处理 Cloudflare 配置前，先确认 `about.wukai.work` 是 proxied CNAME，目标为 `kaiwu-astro.github.io`，并确认 API token 具备 Zone Settings、Rulesets/Page Rules 和必要 DNS 权限。

目标配置保持精简：

- SSL/TLS 使用 `Full (strict)`；如出现 525/526，立即回退 `Full` 并记录原因。
- 启用 Always Use HTTPS、Automatic HTTPS Rewrites、Email Address Obfuscation 和 Brotli。
- 禁用 Rocket Loader。
- 配置 `/cv` 和 `/cv/` 到当前版本化 CV PDF 的 redirect，同时保留 Astro `/cv/` fallback。
- `/assets/*` Browser Cache TTL 为 1 month。
- HTML 页面 Browser Cache TTL 控制在 30 min。
- 版本化 CV PDF Browser Cache TTL 为 1 month。
- 安全响应头可使用 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(), microphone=(), geolocation=()` 和与当前本地资源匹配的保守 CSP。

不要在没有明确验证的情况下启用 wildcard DNS、HSTS preload、`includeSubDomains` HSTS 或激进 Bot/WAF 挑战规则。

应用 Cloudflare 改动后，必须验证 `https://about.wukai.work/`、`/privacy.html`、`/impressum.html`、`/cv`、`/cv/`、当前 CV PDF、`robots.txt`、`sitemap.xml`、缓存响应头、安全响应头，以及线上 HTML 是否经过 Cloudflare Email Obfuscation 且不暴露原始邮箱。

## 安全与配置提示

不要提交私人草稿、未公开文档、凭据、本地配置文件或维护日志。仓库里只放用于公开展示和公开部署的资源。
