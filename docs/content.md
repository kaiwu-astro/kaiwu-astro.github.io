# 内容、CV 与公开 URL

优先编辑 `src/content/` 下的 Markdown/YAML，不要手改 `dist/`。

## 内容位置

- 站点身份、邮箱、CV 文件名、SEO 描述和社交链接：`src/content/site/profile.yaml`
- About：`src/content/about/main.md`
- What I'm doing：`src/content/services/main.yaml`
- Privacy 和 Impressum 正文：`src/content/legal/*.md`

主页只保留简短 About 叙述及少量研究与技术方向；不要重复 CV 中可能过时的履历、完整论文、讲座、会议、教学、技能和学术服务罗列。

邮箱只在 `profile.yaml` 维护。Privacy/Impressum 需要显示邮箱时，通过组件或共享 profile 数据渲染，不要在多个内容文件中手写。

## 替换 CV

使用新的版本化文件名，并同步更新：

- `public/` 中的 PDF 文件
- `profile.yaml` 的 `cvFile`（主页的 `Updated` 日期从该文件名自动生成）
- `public/sitemap.xml`

自 2026-09-19 起，Cloudflare 规则 `redirect_about_cv_to_current_pdf` 已禁用。`/cv` 和 `/cv/` 由 Astro `/cv/` fallback 提供，GitHub Pages 会将 `/cv` 重定向到 `/cv/`，所以更新 CV 无需修改 Cloudflare。

## Sitemap

修改 `public/sitemap.xml` 收录的公开页面、CV 文件或重要公开 URL 时，同步更新对应 `<lastmod>`。本迁移日期为 `2026-07-06`。
