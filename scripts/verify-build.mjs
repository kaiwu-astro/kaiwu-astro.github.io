import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const profile = readFileSync(join(root, "src/content/site/profile.yaml"), "utf8");
const cvFileMatch = profile.match(/^cvFile: (KaiWU_CV_(\d{4})(\d{2})(\d{2})(?:-\d+)?\.pdf)$/m);
if (!cvFileMatch) throw new Error("profile.yaml must contain a versioned KaiWU_CV_YYYYMMDD[-N].pdf cvFile");

const [, cvFile, year, month, day] = cvFileMatch;
const cvDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
if (
  cvDate.getUTCFullYear() !== Number(year) ||
  cvDate.getUTCMonth() !== Number(month) - 1 ||
  cvDate.getUTCDate() !== Number(day)
) {
  throw new Error("profile.yaml cvFile contains an invalid date");
}

const cvUpdatedIso = `${year}-${month}-${day}`;
const cvUpdatedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC"
}).format(cvDate);

const requiredFiles = [
  "index.html",
  "impressum.html",
  "privacy.html",
  "cv/index.html",
  "api/site.json",
  "openapi.json",
  cvFile,
  "sitemap.xml",
  "robots.txt",
  "CNAME",
  "get_config.sh",
  "assets/css/style-v20260930.css",
  "assets/js/script-v20260930.js",
  "assets/goatcounter-count-v20260928.js",
  "assets/images/profile-photo.jpg",
  "assets/images/icons-v20260706.svg",
  "assets/images/avatar.svg"
];

const sitemapUrls = [
  "https://about.wukai.work/",
  "https://about.wukai.work/api/site.json",
  "https://about.wukai.work/openapi.json",
  `https://about.wukai.work/${cvFile}`,
  "https://about.wukai.work/cv/",
  "https://about.wukai.work/impressum.html",
  "https://about.wukai.work/privacy.html"
];

const forbiddenPatterns = [
  /google-analytics/i,
  /googletagmanager/i,
  /fonts\.googleapis/i,
  /fonts\.gstatic/i,
  /unpkg\.com/i,
  /cdn\.jsdelivr\.net/i,
  /cdnjs\.cloudflare\.com/i
];

const fail = (message) => {
  console.error(`verify failed: ${message}`);
  process.exitCode = 1;
};

if (!existsSync(dist)) {
  fail("dist/ is missing; run npm run build first");
} else {
  for (const file of requiredFiles) {
    const path = join(dist, file);
    if (!existsSync(path)) fail(`missing ${file}`);
    else if (statSync(path).isFile() && statSync(path).size === 0) fail(`${file} is empty`);
  }

  const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
  const styleCss = readFileSync(join(dist, "assets/css/style-v20260930.css"), "utf8");
  const scriptJs = readFileSync(join(dist, "assets/js/script-v20260930.js"), "utf8");
  const getConfigScript = readFileSync(join(dist, "get_config.sh"), "utf8");
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  const cvPage = readFileSync(join(dist, "cv/index.html"), "utf8");
  const siteProfile = JSON.parse(readFileSync(join(dist, "api/site.json"), "utf8"));
  const openapi = JSON.parse(readFileSync(join(dist, "openapi.json"), "utf8"));

  const h1Count = indexHtml.match(/<h1(?:\s|>)/g)?.length ?? 0;
  if (h1Count !== 1) fail(`homepage must contain exactly one H1; found ${h1Count}`);

  const sectionIds = ["about", "contact"];
  for (const id of sectionIds) {
    if (!indexHtml.includes(`id="${id}"`)) fail(`homepage missing #${id}`);
    if (!indexHtml.includes(`href="#${id}"`)) fail(`homepage missing nav link for #${id}`);
  }

  for (const [, target] of indexHtml.matchAll(/<a\b[^>]*href="#([^\"]+)"[^>]*>/gi)) {
    if (!indexHtml.includes(`id="${target}"`)) fail(`homepage has a link to missing #${target}`);
  }

  for (const marker of ['id="career"', 'id="scientific-work"', 'href="#career"', 'href="#scientific-work"', "data-filter-btn", "data-filter-item"]) {
    if (indexHtml.includes(marker)) fail(`homepage contains removed-section marker ${marker}`);
  }

  if (!indexHtml.includes('<p class="chinese-name" lang="zh-Hans">吴开</p>')) {
    fail("homepage missing the Chinese name");
  }

  const cvEntry = indexHtml.match(/<a\b(?=[^>]*\bdata-cv-entry(?:\s|=|>))(?=[^>]*\bhref="([^"]+)")[^>]*>([\s\S]*?)<\/a>/i);
  if (!cvEntry || cvEntry[1] !== `/${cvFile}`) fail("homepage CV entry does not link to the current PDF");

  const updatedElement = indexHtml.match(/<time\b(?=[^>]*\bdata-cv-updated="([^"]+)")[^>]*>([\s\S]*?)<\/time>/i);
  const updatedText = updatedElement?.[2].replace(/<[^>]*>/g, "").trim();
  if (
    !updatedElement ||
    updatedElement[1] !== cvUpdatedIso ||
    updatedText !== cvUpdatedDate ||
    !indexHtml.includes("Updated <time")
  ) {
    fail("homepage CV updated date does not match the current PDF filename");
  }

  for (const [label, href] of [
    ["NASA ADS", "https://ui.adsabs.harvard.edu/user/libraries/r6M69CAYQUWEcOfqPQ74_g"],
    ["ORCID", "https://orcid.org/0000-0003-0349-0079"],
    ["Google Scholar", "https://scholar.google.com/citations?user=zspJ42IAAAAJ"],
    ["GitHub", "https://github.com/kaiwu-astro"]
  ]) {
    if (!indexHtml.includes(`href="${href}"`) || !indexHtml.includes(`>${label}</a>`)) {
      fail(`homepage missing the ${label} profile link`);
    }
  }

  if (/\b(?:filterScience|data-filter-btn|data-filter-item)\b/.test(scriptJs)) {
    fail("homepage script contains removed science filter logic");
  }
  if (/\.(?:timeline|timeline-list|timeline-item|skills-list|filter-list|filter-select|project-item)\b/.test(styleCss)) {
    fail("homepage stylesheet contains removed career or science styles");
  }

  for (const url of sitemapUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }

  if (!cvPage.includes(cvFile)) fail("cv redirect page does not point to the PDF");
  for (const page of ["index.html", "privacy.html", "impressum.html", "cv/index.html"]) {
    const html = readFileSync(join(dist, page), "utf8");
    if (!/<script\b(?=[^>]*\bdata-goatcounter="https:\/\/wukai\.goatcounter\.com\/count")(?=[^>]*\basync(?:\s|=|>))(?=[^>]*\bsrc="\/assets\/goatcounter-count-v20260928\.js")[^>]*><\/script>/i.test(html)) {
      fail(`${page} missing local GoatCounter script`);
    }
    if (/<script\b[^>]*\bsrc=["'](?:https?:)?\/\/gc\.zgo\.at\/count\.js["']/i.test(html)) {
      fail(`${page} references remote GoatCounter script`);
    }
  }
  for (const page of ["index.html", "cv/index.html"]) {
    if (!readFileSync(join(dist, page), "utf8").includes('data-goatcounter-click="cv-pdf"')) {
      fail(`${page} missing CV click event`);
    }
  }
  if (!robots.includes("Sitemap: https://about.wukai.work/sitemap.xml")) {
    fail("robots.txt missing sitemap URL");
  }

  for (const agent of [
    "GPTBot",
    "ClaudeBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "DeepSeekBot",
    "ora-agent"
  ]) {
    if (!robots.includes(`User-agent: ${agent}\nAllow: /`)) fail(`robots.txt does not explicitly allow ${agent}`);
  }

  if (siteProfile.schemaVersion !== "1.0.0") fail("site API has an unexpected schemaVersion");
  if (siteProfile.url !== "https://about.wukai.work/") fail("site API has an unexpected canonical URL");
  if (!Array.isArray(siteProfile.topics) || siteProfile.topics.length === 0) fail("site API has no topics");
  if (openapi.openapi !== "3.1.0") fail("OpenAPI document must use OpenAPI 3.1.0");
  if (!openapi.paths?.["/api/site.json"]?.get?.responses?.["200"]) {
    fail("OpenAPI document does not describe GET /api/site.json");
  }
  const problemRequired = openapi.components?.schemas?.Problem?.required ?? [];
  for (const field of ["code", "message", "hint"]) {
    if (!problemRequired.includes(field)) fail(`OpenAPI Problem schema does not require ${field}`);
  }

  for (const assetPath of ["/assets/css/style-v20260930.css", "/assets/js/script-v20260930.js"]) {
    if (!indexHtml.includes(assetPath)) fail(`homepage does not reference ${assetPath}`);
  }

  if (!getConfigScript.startsWith("#!/bin/sh\n")) fail("get_config.sh is not a POSIX sh script");
  if (/set -o pipefail|IFS=\$'/.test(getConfigScript)) {
    fail("get_config.sh contains Bash-only shell syntax");
  }

  const combined = `${indexHtml}\n${styleCss}\n${scriptJs}`;
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(combined)) fail(`forbidden third-party reference matched ${pattern}`);
  }
}

if (!process.exitCode) {
  console.log("verify passed");
}
