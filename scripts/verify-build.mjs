import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const requiredFiles = [
  "index.html",
  "impressum.html",
  "privacy.html",
  "cv/index.html",
  "KaiWu_CV_0705.pdf",
  "sitemap.xml",
  "robots.txt",
  "CNAME",
  "assets/css/style.css",
  "assets/js/script.js",
  "assets/images/profile-photo.jpg",
  "assets/images/icons.svg",
  "assets/images/avatar.svg"
];

const sitemapUrls = [
  "https://about.wukai.work/",
  "https://about.wukai.work/KaiWu_CV_0705.pdf",
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
  const styleCss = readFileSync(join(dist, "assets/css/style.css"), "utf8");
  const scriptJs = readFileSync(join(dist, "assets/js/script.js"), "utf8");
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  const cvPage = readFileSync(join(dist, "cv/index.html"), "utf8");

  for (const id of ["about", "career", "scientific-work", "contact"]) {
    if (!indexHtml.includes(`id="${id}"`)) fail(`homepage missing #${id}`);
    if (!indexHtml.includes(`href="#${id}"`)) fail(`homepage missing nav link for #${id}`);
  }

  for (const label of ["All", "Papers", "Teaching", "Talks", "Conferences", "Activities"]) {
    if (!indexHtml.includes(`>${label}<`)) fail(`homepage missing science filter ${label}`);
  }

  for (const url of sitemapUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) fail(`sitemap missing ${url}`);
  }

  if (!cvPage.includes("KaiWu_CV_0705.pdf")) fail("cv redirect page does not point to the PDF");
  if (!readFileSync(join(dist, "robots.txt"), "utf8").includes("Sitemap: https://about.wukai.work/sitemap.xml")) {
    fail("robots.txt missing sitemap URL");
  }

  const combined = `${indexHtml}\n${styleCss}\n${scriptJs}`;
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(combined)) fail(`forbidden third-party reference matched ${pattern}`);
  }
}

if (!process.exitCode) {
  console.log("verify passed");
}
