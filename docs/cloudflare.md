# Cloudflare 操作要求

处理 Cloudflare 配置前，先确认 `about.wukai.work` 是 proxied CNAME，目标为 `kaiwu-astro.github.io`，并确认 API token 具备 Zone Settings、Rulesets/Page Rules 和必要 DNS 权限。

目标配置保持精简：

- SSL/TLS 使用 `Full (strict)`；如出现 525/526，立即回退 `Full` 并记录原因。
- 启用 Always Use HTTPS、Automatic HTTPS Rewrites、Email Address Obfuscation 和 Brotli。
- 禁用 Rocket Loader。
- 保持 Cloudflare 规则 `redirect_about_cv_to_current_pdf` 禁用（原因见 AGENTS.md 的 CV 一节）。
- `/assets/*` Browser Cache TTL 为 1 month。
- HTML 页面 Browser Cache TTL 控制在 30 min。
- 版本化 CV PDF Browser Cache TTL 为 1 month。
- 安全响应头可使用 `X-Content-Type-Options: nosniff`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(), microphone=(), geolocation=()` 和与当前本地资源匹配的保守 CSP；Cloudflare 响应头改写规则下发的 CSP 须在 `connect-src` 和 `img-src` 放行 `https://wukai.goatcounter.com`。

不要在没有明确验证的情况下启用 wildcard DNS、HSTS preload、`includeSubDomains` HSTS 或激进 Bot/WAF 挑战规则。

应用 Cloudflare 改动后，必须验证 `https://about.wukai.work/`、`/privacy.html`、`/impressum.html`、`/cv`、`/cv/`、当前 CV PDF、`robots.txt`、`sitemap.xml`、缓存响应头、安全响应头，以及线上 HTML 是否经过 Cloudflare Email Obfuscation 且不暴露原始邮箱。
