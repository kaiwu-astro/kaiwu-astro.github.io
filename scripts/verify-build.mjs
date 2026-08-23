import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const requiredFiles = [
  "index.html",
  "impressum.html",
  "privacy.html",
  "cv/index.html",
  "api/site.json",
  "openapi.json",
  "KaiWU_CV_20260718.pdf",
  "sitemap.xml",
  "robots.txt",
  "CNAME",
  "get_config.sh",
  "assets/css/style-v20260718.css",
  "assets/js/script-v20260718.js",
  "assets/images/profile-photo.jpg",
  "assets/images/icons-v20260706.svg",
  "assets/images/avatar.svg"
];

const sitemapUrls = [
  "https://about.wukai.work/",
  "https://about.wukai.work/api/site.json",
  "https://about.wukai.work/openapi.json",
  "https://about.wukai.work/KaiWU_CV_20260718.pdf",
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
  const styleCss = readFileSync(join(dist, "assets/css/style-v20260718.css"), "utf8");
  const scriptJs = readFileSync(join(dist, "assets/js/script-v20260718.js"), "utf8");
  const getConfigScript = readFileSync(join(dist, "get_config.sh"), "utf8");
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  const cvPage = readFileSync(join(dist, "cv/index.html"), "utf8");
  const siteProfile = JSON.parse(readFileSync(join(dist, "api/site.json"), "utf8"));
  const openapi = JSON.parse(readFileSync(join(dist, "openapi.json"), "utf8"));

  const h1Count = indexHtml.match(/<h1(?:\s|>)/g)?.length ?? 0;
  if (h1Count !== 1) fail(`homepage must contain exactly one H1; found ${h1Count}`);

  const mainHtml = indexHtml.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i)?.[1] ?? "";
  const noScriptMain = mainHtml
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  const visibleText = noScriptMain
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = visibleText.match(/[\p{L}\p{N}]+(?:['’+.-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  if (wordCount < 500) fail(`homepage must expose at least 500 words without JavaScript; found ${wordCount}`);

  for (const id of ["about", "career", "scientific-work", "contact"]) {
    if (!indexHtml.includes(`id="${id}"`)) fail(`homepage missing #${id}`);
    if (!indexHtml.includes(`href="#${id}"`)) fail(`homepage missing nav link for #${id}`);
  }

  if (!indexHtml.includes('<p class="chinese-name" lang="zh-Hans">吴开</p>')) {
    fail("homepage missing the Chinese name");
  }

  for (const label of ["All", "Papers", "Teaching", "Talks", "Conferences", "Activities"]) {
    if (!indexHtml.includes(`>${label}<`)) fail(`homepage missing science filter ${label}`);
  }

  for (const url of sitemapUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }

  if (!cvPage.includes("KaiWU_CV_20260718.pdf")) fail("cv redirect page does not point to the PDF");
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
