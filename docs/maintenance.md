# Website Maintenance

This site is an Astro static site. Editable content lives under `src/content/`, the Pages CMS configuration lives in `.pages.yml`, and static public files live under `public/`.

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
