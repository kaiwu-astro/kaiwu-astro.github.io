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

The CV is published automatically from the LaTeX source in the private KIT repo (`Career/job-application-context-kit`, branch `main`). Editing and committing the CV in KIT is all that is needed; there is no Word step any more.

**Source and trigger.** The CV sources are `academic/cv/KaiWU_CV.tex`, `academic/cv/cv-inprep.bib` and `academic/sources/publications.bib`. Only committed content counts; the KIT working tree is never read. The KIT commit is the change marker.

**Cutoff rule (Europe/Berlin).** At run time, if the local time is 23:30 or later, the cutoff is today 23:59:59; otherwise yesterday 23:59:59. The publisher takes the newest commit C on KIT `main`, at or before the cutoff, that touched a CV source file, and D = C's committer date (Berlin). If C is newer than the source commit recorded in `scripts/cv-publication.json`, it compiles C and publishes `public/KaiWU_CV_<D>.pdf`. So a commit made during the day goes out at 23:30 that night, or in the next run after midnight. If several days were skipped, only the last change day is published, at most one version per day (a second commit on an already-published day waits for a later day's change). The footer `Updated <D> | Page n` and the file name both use D.

**Build.** `git archive C academic/cv academic/sources/publications.bib` is extracted into `~/Library/Caches/kaiwu-cv-build/` and compiled there with `latexmk -usepretex='\newcommand\cvupdated{<D>}'`. The PDF must be A4, contain `Kai Wu` and `Updated <D>`, and must not contain `Academic References` (the public base CV has no referee details). The pretex also defines `\cvpublic`, which hides the phone number in the header (`\ifdefined\cvpublic` in `KaiWU_CV.tex`), and the PDF must not contain anything that looks like an international phone number (generic `+<country code> ...` pattern, so no number is stored in this public repo). Optionally, if `~/Library/Application Support/kaiwu-cv-publish/forbidden-strings.txt` exists (one string per line, `#` comments; digits are normalised when comparing), any listed string in the PDF text is refused too; the file is skipped when absent. If its text, ignoring dates, equals the currently published CV, nothing is published; that verdict is cached in `~/Library/Caches/kaiwu-cv-publish/evaluated.json`.

**Release steps.** Delete the previous versioned PDF, write `public/KaiWU_CV_<D>.pdf`, update `cvFile`, both CV sitemap dates and `scripts/cv-publication.json` (source commit, date, PDF name; committed with the release for traceability), run `npm run check`, `npm run build`, `npm run verify`, commit (`Update CV for <D>`, source SHA in the body), push, wait for the Pages workflow, and check the live PDF and `/cv/`. The preflight requires `main` clean, on `main`, not behind `origin/main`, and not ahead of it (unreviewed local commits are never pushed by the publisher).

**Scheduling.** The launchd user agent `work.wukai.publish-cv` (template `scripts/work.wukai.publish-cv.plist`, installed at `~/Library/LaunchAgents/`) runs `scripts/publish-cv-launchd.sh` at 23:30 daily, at login/boot (`RunAtLoad`), and every hour (`StartInterval`), so missed runs are caught up. With nothing to publish a run is an instant no-op that logs a few lines. A lock in `~/Library/Caches/kaiwu-cv-publish/lock` prevents concurrent runs. Log: `~/Library/Logs/publish-cv.log`. On failure (dirty or behind `main`, compile or network error, ...) the run is skipped, a macOS notification appears, and the next trigger retries.

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/work.wukai.publish-cv.plist   # enable
launchctl bootout gui/$(id -u)/work.wukai.publish-cv                                  # disable (then delete the plist to remove)
launchctl kickstart gui/$(id -u)/work.wukai.publish-cv                                # run now
```

**Manual commands.**

```sh
npm run publish:cv                              # same as the scheduled run
npm run publish:cv -- --dry-run                 # print cutoff, C, D, and whether it would publish; changes nothing
npm run publish:cv -- --include-today           # publish today's committed version immediately (cutoff = today)
npm run publish:cv -- --no-push                 # stop after local checks; changes left unstaged
npm run publish:cv -- --selftest                # check PATH tools, KIT access and gh auth
```

**Troubleshooting.**

- Read `~/Library/Logs/publish-cv.log`. `--dry-run` shows why nothing is published (e.g. the commit is not yet before the cutoff, or the day already has a version).
- If a local check fails after files were prepared, they are left for inspection. Because the release began from a clean tree, revert with `git reset --hard HEAD && git clean -fd public` (this discards uncommitted work, so confirm the tree only holds the failed release).
- launchd reads the KIT repo under iCloud (`~/Library/Mobile Documents`), which macOS privacy (TCC) may restrict for background processes; `--selftest` run through launchd verifies access. If blocked, grant `/bin/sh` and `/opt/homebrew/bin/node` Full Disk Access in System Settings > Privacy & Security.
- To retry a cached "text unchanged" verdict, delete `~/Library/Caches/kaiwu-cv-publish/evaluated.json`.
- Test hooks: `CV_KIT_REPO=<path>` points at another KIT clone; `CV_NOW=<ISO time>` overrides the clock.

### Cloudflare CV Redirect

Since 2026-09-19, the Cloudflare rule `redirect_about_cv_to_current_pdf` is disabled. `/cv` and `/cv/` are served by the Astro `/cv/` fallback (`src/pages/cv/index.astro`); GitHub Pages redirects `/cv` to `/cv/`. CV updates therefore require no Cloudflare change. Keep the rule disabled unless this routing design is deliberately changed.

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
- `openapi.json`

The generated `/api/site.json` endpoint reads from `src/content/site/profile.yaml`. Keep the OpenAPI document aligned with that endpoint and run `npm run verify` after changing either file.

## Agent Access

`robots.txt` explicitly permits the supported AI crawlers, but robots directives cannot override a Cloudflare challenge. In Cloudflare Security Settings, configure the Search, Agent, and Training AI bot policies as **Allow (do not block)** for this public academic site.

Check Security Analytics before changing rules so the blocking service is known. If Super Bot Fight Mode, managed WAF rules, Browser Integrity Check, or a custom rule caused the challenge, add the following zone-level custom rule before blocking/challenge rules:

```text
(http.host eq "about.wukai.work" and (
  http.user_agent contains "GPTBot" or
  http.user_agent contains "ClaudeBot" or
  http.user_agent contains "ChatGPT-User" or
  http.user_agent contains "PerplexityBot" or
  http.user_agent contains "Google-Extended" or
  http.user_agent contains "Applebot-Extended" or
  http.user_agent contains "DeepSeekBot" or
  http.user_agent contains "ora-agent"
))
```

Use the **Skip** action for all remaining custom rules, Super Bot Fight Mode, managed rules, Browser Integrity Check, and User Agent Blocking. Keep rate limiting active. Cloudflare Bot Fight Mode cannot be bypassed by a Skip rule; if Security Analytics identifies it as the blocker, turn Bot Fight Mode off and rely on scoped WAF/rate-limit rules instead.

The source for structured API errors is `cloudflare/api-errors-worker.mjs`. Deploy it as a Cloudflare Worker route limited to `about.wukai.work/api/*`. The handler passes successful static API responses through and converts upstream HTML errors to `application/problem+json` with `code`, `message`, and `hint`. It deliberately does not run on normal HTML or asset routes.

After the Worker and bot rules are deployed, run the user-agent checks in the release checklist for every listed crawler. Each homepage request must return HTTP 200 without `cf-mitigated: challenge`; `/api/site.json` must return JSON; and an unknown `/api/...` path must return a non-2xx `application/problem+json` response.

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
