# Cloudflare Configuration

This file records the intended Cloudflare setup for `about.wukai.work`. It must not contain API tokens, account IDs, or other secrets.

## Current API Finding

The available Cloudflare token can read DNS records for `wukai.work`, but it cannot read or edit zone settings, Page Rules, or Rulesets. Calls for SSL mode, Always Use HTTPS, Email Obfuscation, Brotli, Page Rules, and Rulesets returned permission errors.

The DNS record for `about.wukai.work` is currently:

```text
CNAME about.wukai.work -> kaiwu-astro.github.io
proxied: false
```

Because it is DNS-only, Cloudflare response features such as Email Obfuscation, Redirect Rules, Cache Rules, Transform Rules, and security headers will not run for this site until the record is proxied through Cloudflare.

## Desired Non-Secret Settings

These settings should be applied only after confirming that GitHub Pages HTTPS works for `about.wukai.work` through Cloudflare proxying.

- DNS: keep `about.wukai.work` as a CNAME to `kaiwu-astro.github.io`; do not add wildcard DNS for `*.wukai.work`.
- GitHub domain verification: keep the TXT record for `_github-pages-challenge-kaiwu-astro.wukai.work`.
- SSL/TLS mode: `Full (strict)`.
- Always Use HTTPS: enabled.
- Automatic HTTPS Rewrites: enabled.
- Email Address Obfuscation: enabled.
- Brotli: enabled.
- Rocket Loader: disabled.
- Redirect Rule: `https://about.wukai.work/cv` redirects to `https://about.wukai.work/KaiWu_CV_0705.pdf`.
- Cache Rule: cache `/assets/*` as static assets with a long browser TTL only when asset filenames are versioned or otherwise safe to cache.
- Response headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - A conservative CSP matching the current local-only asset setup.

## Deferred Settings

Do not enable HSTS with `includeSubDomains` or HSTS preload without an explicit check of all important `wukai.work` subdomains. A bad HSTS configuration can break unrelated subdomains and is harder to roll back.

Do not enable aggressive Bot/WAF challenge rules for this academic homepage without checking that search engines, academic crawlers, and link preview bots are not affected.

## Required API Permissions

To apply the desired settings through the API, use a Cloudflare token scoped to `wukai.work` with the minimum necessary permissions for:

- Zone Settings: read and edit.
- Rulesets or Page Rules: read and edit.
- DNS: read, and edit only if changing `about.wukai.work` from DNS-only to proxied.

After applying any Cloudflare setting, verify `https://about.wukai.work/`, `https://about.wukai.work/cv`, `https://about.wukai.work/KaiWu_CV_0705.pdf`, `https://about.wukai.work/sitemap.xml`, and the response headers from a clean external request.
