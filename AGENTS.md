# Repository Guidelines

## 项目结构与模块组织

这是一个 Astro 静态个人学术网站，部署到 GitHub Pages，并通过 Cloudflare 服务 `about.wukai.work`。

- `src/pages/` 定义公开页面：主页、`privacy.html`、`impressum.html` 和 `/cv/` fallback。
- `src/layouts/` 和 `src/components/` 存放 Astro 布局和组件。
- `src/content/` 是主要内容来源，包含 profile、about、services 和 legal 内容。
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

提交或发布前必须依次运行：

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
- 主页保留简短 About 叙述及少量研究与技术方向；不要重复 CV 中可能过时的履历、完整论文、讲座、会议、教学、技能和学术服务罗列。
- CV PDF 文件名位于 profile 的 `cvFile`；主页的 `Updated` 日期从该版本化文件名自动生成。
- Privacy 和 Impressum 正文：`src/content/legal/*.md`

邮箱必须集中维护在 `src/content/site/profile.yaml`。Privacy/Impressum 若需要显示邮箱，应通过组件或共享 profile 数据渲染，不要在多个内容文件中手写重复邮箱。

## CV、Sitemap 与公开 URL

替换 CV 时使用新的版本化文件名，并同步更新：

- `public/` 中的 PDF 文件
- `src/content/site/profile.yaml` 的 `cvFile`
- `public/sitemap.xml`

自 2026-09-19 起，Cloudflare 规则 `redirect_about_cv_to_current_pdf` 已禁用。`/cv` 和 `/cv/` 由 Astro `/cv/` fallback 提供，GitHub Pages 会将 `/cv` 重定向到 `/cv/`，所以更新 CV 无需修改 Cloudflare。

修改任何收录到 `public/sitemap.xml` 的公开页面、CV 文件或重要公开 URL 时，必须同步更新对应 `<lastmod>`。本迁移日期为 `2026-07-06`。

## 编码与测试规范

修改 Astro、HTML、CSS、JavaScript、YAML 或 `public/assets/` 资源（缩进、资源命名与版本化、禁用依赖、GoatCounter 约束）以及需要视觉检查时，先读 `CODING_STANDARDS.md`。

## 提交与 Pull Request 规范

沿用简短、祈使式提交信息，例如：

```text
Import Astro website source
```

每次 agent 修改仓库后，必须先完成相关本地测试或手动检查（见上文命令与 `CODING_STANDARDS.md`）。测试通过后，直接使用 `$commit` skill 创建提交；提交完成后，将当前分支推送到 `origin`。不要把未验证的改动提交或推送。

Pull Request 应包含简短说明、视觉改动截图、执行过的检查命令和关联 issue。

## Cloudflare

修改或排查 Cloudflare 配置（DNS、SSL/TLS、缓存、规则、响应头/CSP）、或在 Cloudflare 改动后验证线上站点前，先读 `docs/cloudflare.md`。

## 安全与配置提示

这是一个公开的 GitHub Repo, 不要提交私人草稿、未公开文档、凭据、本地配置文件或维护日志。仓库里只放用于公开展示和公开部署的资源。
