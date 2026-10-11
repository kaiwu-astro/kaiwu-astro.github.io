# 内容、CV 与公开 URL

优先编辑 `src/content/` 下的 Markdown/YAML，不要手改 `dist/`。

## 内容位置

- 站点身份、邮箱、CV 文件名、SEO 描述和社交链接：`src/content/site/profile.yaml`
- About：`src/content/about/main.md`
- What I'm doing：`src/content/services/main.yaml`
- Talks：`src/content/talks/main.yaml`；slides、PDF、视频等静态文件在 `public/talks/<id>/`
- Publications：`src/content/publications/main.json`，由脚本生成，不要手改（见下文“论文列表”）
- Privacy 和 Impressum 正文：`src/content/legal/*.md`

主页只保留简短 About 叙述、少量研究与技术方向，以及 Talks 节；不要重复 CV 中可能过时的履历、完整论文、讲座、会议、教学、技能和学术服务罗列。Talks 节只收在本站公开了材料（slides 或视频，放在 `public/talks/YYYYMMDD-<slug>/`）的讲座，不设单独的讲座页：每条是主页上的卡片 `#talks-YYYYMMDD-<slug>`，标题链接到 `slides`（无 slides 时回退到该锚点），图标链接到该锚点；可选字段 `slides_label` 覆盖主按钮文字（默认 “View slides”）。数据在 `src/content/talks/main.yaml`，最新的在前；没有公开材料的讲座只留在 CV 里。完整论文列表只放在单独的 `/publications/` 页（由 ADS 自动生成，主页 Profiles 处链接过去），主页本身不罗列论文。新增讲座时同步更新 `scripts/verify-build.mjs`（材料文件、卡片锚点和 sitemap URL），并在 sitemap 中加入 deck 页与讲座 PDF、更新主页的 `<lastmod>`。

邮箱只在 `profile.yaml` 维护。Privacy/Impressum 需要显示邮箱时，通过组件或共享 profile 数据渲染，不要在多个内容文件中手写。

## 论文列表

`/publications/` 页、`llms.txt` 的论文段和对应 JSON-LD 都读 `src/content/publications/main.json`。数据来自 `profile.yaml` 里链接的公开 NASA ADS library：先在 ADS 网页上增删 library 里的论文，再运行

```sh
ADS_API_TOKEN=... npm run update:publications
```

脚本用 `identifier:` 查询，arXiv 预印本正式发表后会自动换成期刊信息；列表没变时保留原 `updated` 日期。有变化时同步更新 sitemap 里 `/publications/` 的 `<lastmod>`。ADS token 不入库；本机 agent 可从 scix MCP 配置的 `SCIX_API_TOKEN` 读取，不要打印。

## 面向 AI 与搜索引擎的元数据

- `llms.txt` 由 `src/pages/llms.txt.ts` 从内容集合生成，不写邮箱（纯文本不经过 Cloudflare Email Obfuscation）。
- 首页、`/publications/` 和 talk deck 的 JSON-LD 共用 `src/lib/schema.ts` 的 Person 节点（`@id` 为 `https://wukai.work/#person`）；别名、毕业院校和 ORCID 在 `profile.yaml` 的 `schemaAlternateNames`、`schemaAlumniOf`、`orcid`。deck 是静态 HTML，其 `<head>` 里的 canonical、og 和 JSON-LD 需手动维护。
- AI 爬虫策略只由 `public/robots.txt` 决定，Cloudflare 侧的 Bot 设置见 `docs/cloudflare.md`。

## 替换 CV

使用新的版本化文件名，并同步更新：

- `public/` 中的 PDF 文件
- `profile.yaml` 的 `cvFile`（主页的 `Updated` 日期从该文件名自动生成）
- `public/sitemap.xml`

自 2026-09-19 起，Cloudflare 规则 `redirect_about_cv_to_current_pdf` 已禁用。`/cv` 和 `/cv/` 由 Astro `/cv/` fallback 提供，GitHub Pages 会将 `/cv` 重定向到 `/cv/`，所以更新 CV 无需修改 Cloudflare。

## Sitemap

修改 `public/sitemap.xml` 收录的公开页面、CV 文件或重要公开 URL 时，同步更新对应 `<lastmod>`。本迁移日期为 `2026-07-06`。

Sitemap 只列可编入索引的最终 URL：`/cv/` 是 `noindex` 跳转页，不要列入（列 CV PDF 本身）；`about.wukai.work`、`www.wukai.work` 等 301 来源也不列。sitemap 已在 Google Search Console（域名资源 `wukai.work`）提交，Google 会定期重读，改动后无需重新提交。
