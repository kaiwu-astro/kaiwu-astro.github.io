# Repository Guidelines

Astro 静态个人学术网站，部署到 GitHub Pages，经 Cloudflare 服务 `wukai.work`（`about.wukai.work` 与 `www.wukai.work` 经 301 重定向到根域）。

## 结构

- `src/pages/`、`src/layouts/`、`src/components/`：页面、布局、组件；`src/content/` 是主要内容来源。
- `public/` 原样复制到 `dist/`（`CNAME`、`robots.txt`、`sitemap.xml`、CV PDF）；`public/assets/` 放 CSS、JS、图片、SVG，受 Cloudflare 长缓存，变更时必须改用版本化文件名（规则见 `CODING_STANDARDS.md`）。
- `.pages.yml` 是 Pages CMS 配置；`scripts/verify-build.mjs` 检查构建产物；`.github/workflows/site-checks.yml` 跑 CI，`main` push 时发布 `dist/`。
- 根目录旧版 `index.html`、`privacy.html`、`impressum.html`、`assets/`、`cv/`、`CNAME`、`.nojekyll`、`robots.txt`、`sitemap.xml` 和旧 CV 文件仅为迁移过渡保留，确认 Pages 已切到 Actions 后应删除。

## 何时读哪份文档

- 修改站点文字、邮箱、CV、`public/sitemap.xml` 或任何公开 URL 前：读 `docs/content.md`。
- 修改 Astro/HTML/CSS/JS/YAML、`public/assets/` 资源（命名与版本化、禁用依赖、GoatCounter），或需要视觉检查前：读 `CODING_STANDARDS.md`。
- 修改或排查 Cloudflare（DNS、SSL/TLS、缓存、规则、响应头/CSP），或 Cloudflare 改动后验证线上站点前：读 `docs/cloudflare.md`。

## 提交

依赖用 `npm ci` 安装，本地开发 `npm run dev`。提交或发布前依次运行 `npm run check`、`npm run build`、`npm run verify`（`verify` 依赖 `dist/`，须在 `build` 之后）；视觉改动另见 `CODING_STANDARDS.md`。每次 agent 修改仓库后，先完成这些检查，通过后直接用 `$commit` skill 提交，再把当前分支推送到 `origin`。不要提交或推送未验证的改动。

提交信息简短、祈使式，例如 `Import Astro website source`。Pull Request 含简短说明、视觉改动截图、执行过的检查命令和关联 issue。

## 手机兼容

网站及其发布的资源（页面、talk deck、PDF 等 `public/` 下的内容）都要兼容手机：触屏可操作、文字可读、无横向滚动。视觉或交互改动发布前，在手机宽度（如 390×844 竖屏、844×390 横屏，headless Chrome 开触屏模拟）检查；通用检查项见 `CODING_STANDARDS.md`。

## 安全

这是公开 GitHub Repo：不提交私人草稿、未公开文档、凭据、本地配置文件或维护日志，也不提交 `dist/`、`node_modules/`、`.astro/`、`implementation-notes.html`、`comments.md` 或本地缓存。仓库只放用于公开展示和部署的资源。
