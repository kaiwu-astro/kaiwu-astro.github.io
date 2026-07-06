# Website Maintenance

This site is an Astro static site. Editable content lives under `src/content/`, the Pages CMS configuration lives in `.pages.yml`, and static public files live under `public/`.

The canonical repository is `/Users/wukai/source_codes/personal_website`. The previous Astro staging repository at `../astro_personal_website` was used only as a read-only source during the 2026-07-06 migration and should not be used for future development or pushes.

## Editing Workflow

Use Pages CMS for routine content edits. Pages CMS reads `.pages.yml` from the repository root and presents form editors for the profile, homepage, career, scientific work, and legal pages. When Pages CMS saves a change, it writes the edited Markdown/YAML file back to the repository as a Git commit.

For local fallback edits, change only the Markdown or YAML files listed below. Do not edit generated HTML in `dist/`.

## Content Map

- Site profile: `src/content/site/profile.yaml`
- About text: `src/content/about/main.md`
- Service cards: `src/content/services/main.yaml`
- Career timeline: `src/content/timeline/work.yaml`, `education.yaml`, `skills.yaml`
- Scientific work: `src/content/science/papers.yaml`, `teaching.yaml`, `talks.yaml`, `conferences.yaml`, `activities.yaml`
- Legal pages: `src/content/legal/impressum.md`, `privacy.md`

The About and legal page bodies are Markdown below the frontmatter. The profile, services, timeline, and science files are YAML.

## Local Commands

```bash
npm run check
npm run build
npm run verify
npm run preview -- --host 127.0.0.1
```

`npm run verify` expects `dist/` to exist, so run `npm run build` first.

## Profile And Homepage

Edit `src/content/site/profile.yaml` for the name, title, emails, location, CV filename, SEO description, social links, and schema.org `Person` data.

Edit `src/content/about/main.md` for the About title and Markdown body. Edit `src/content/services/main.yaml` for the "What I'm doing" cards. Each service item needs a `title`, `icon`, and `text`. The `icon` value must match a symbol id in `public/assets/images/icons-v20260706.svg` without the `icon-` prefix.

## Career

Edit the YAML files in `src/content/timeline/`. The display order is controlled in `src/pages/index.astro` by `timelineOrder`.

Timeline entries support:

- `title`
- optional `subtitle`
- `text`, as an array of paragraph strings
- optional `href`

Longer timeline groups get a Show all / Show less toggle automatically.

## Scientific Work

Edit the YAML files in `src/content/science/`. The homepage filter uses each file's `category` and `filterLabel`. Keep `category` lowercase and one of:

```text
papers
teaching
talks
conferences
activities
```

The display order is controlled in `src/pages/index.astro` by `scienceOrder`.

## Updating The CV

Replace the PDF in `public/`. If the filename changes:

1. Put the new PDF in `public/`.
2. Update `cvFile` in `src/content/site/profile.yaml`.
3. Update `public/sitemap.xml`.
4. Run the local commands above.

The public `/cv/` URL redirects to the file named by `cvFile`, so the redirect stays stable as long as `cvFile` matches the PDF filename.

## Legal Pages

Edit `src/content/legal/impressum.md` and `src/content/legal/privacy.md`. Their output URLs stay:

- `/impressum.html`
- `/privacy.html`

Keep `canonicalPath` in each file's frontmatter aligned with those URLs.

## Static Metadata

Static hosting files are in `public/`:

- `CNAME`
- `robots.txt`
- `sitemap.xml`

Update `sitemap.xml` when public URLs or important last-modified dates change.

## Deployment

GitHub Pages should publish through GitHub Actions, not from the branch root. The workflow in `.github/workflows/site-checks.yml` runs:

```bash
npm ci
npm run check
npm run build
npm run verify
```

On `main` pushes, the workflow uploads `dist/` with `actions/upload-pages-artifact` and deploys it with `actions/deploy-pages`.

During the migration, old root-level static files may remain temporarily so the site does not break if Pages is still pointed at the branch root. After Pages is confirmed to publish from Actions and the deployed Astro site is verified, remove the old root-level copies: `index.html`, `privacy.html`, `impressum.html`, `assets/`, `cv/`, `KaiWu_CV_0705.pdf`, `robots.txt`, `sitemap.xml`, `CNAME`, and `.nojekyll`. Keep the corresponding files under `public/`.

## Cache And Versioned Assets

Cloudflare may cache `/assets/*` in browsers for one month. When CSS, JavaScript, SVG, or images under `public/assets/` change, rename the changed files with a version suffix such as `style-v20260706.css`, update every Astro/script reference, and update `scripts/verify-build.mjs`.

Do not long-cache unversioned HTML or unversioned public resources. HTML browser cache should stay around 30 minutes. Versioned CV PDFs may use a one-month browser cache.

## Email Protection

Email addresses are maintained in `src/content/site/profile.yaml`. Pages that display email addresses should read from that profile data instead of duplicating addresses in Markdown.

The deployed site relies on Cloudflare Email Address Obfuscation. After publishing, verify that the live HTML for `/`, `/privacy.html`, and `/impressum.html` does not expose raw email addresses or `mailto:` links and includes Cloudflare email protection markup.

## Cloudflare Release Checklist

Expected baseline:

- `about.wukai.work` is a proxied CNAME to `kaiwu-astro.github.io`.
- SSL/TLS is `Full (strict)`. If 525/526 appears, temporarily roll back to `Full` and record the reason.
- Always Use HTTPS, Automatic HTTPS Rewrites, Brotli, and Email Address Obfuscation are enabled.
- Rocket Loader is disabled.
- HTML cache is 1800 seconds.
- `/assets/*` and versioned `KaiWu_CV*.pdf` / `KaiWU_CV*.pdf` cache is 2592000 seconds.
- `/cv` and `/cv/` redirect to the current versioned CV PDF, with Astro `/cv/` kept as a fallback.
- Response headers include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

Do not enable wildcard DNS, HSTS preload, `includeSubDomains` HSTS, or aggressive Bot/WAF challenges unless explicitly reviewed.

After any Cloudflare or release change, verify:

- `https://about.wukai.work/`
- `https://about.wukai.work/privacy.html`
- `https://about.wukai.work/impressum.html`
- `https://about.wukai.work/cv`
- `https://about.wukai.work/cv/`
- the current CV PDF
- `https://about.wukai.work/robots.txt`
- `https://about.wukai.work/sitemap.xml`
- cache headers for HTML, versioned assets, and the CV PDF
- security headers
- theme toggle and science filters
