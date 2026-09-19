import { copyFile, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = process.cwd();
const source = "/Users/wukai/Library/Mobile Documents/com~apple~CloudDocs/LOST.DEAR/Career/CV/KaiWU_CV.docx";
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }).replaceAll("-", "");
const targetName = `KaiWU_CV_${today}.pdf`;
const target = join(root, "public", targetName);
const wordStagingPdf = join(dirname(source), ".KaiWU_CV-publish-staging.pdf");
const existingPdf = join(dirname(source), targetName);

function fail(message) {
  throw new Error(`publish-cv: ${message}`);
}

function run(command, args, { timeoutMs, ...options } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    const timeout = timeoutMs ? setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs) : undefined;
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`${command} ${signal ? `was terminated by ${signal}` : `exited with ${code}`}`));
    });
  });
}

async function stableFile(path) {
  const first = await stat(path);
  if (!first.isFile() || first.size === 0) fail(`source is not a non-empty file: ${path}`);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const second = await stat(path);
  if (first.size !== second.size || first.mtimeMs !== second.mtimeMs) {
    fail("source changed while being read; save Word and run again");
  }
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function validatePdf(path) {
  const content = await readFile(path);
  if (content.length < 1024 || !content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    fail("Word did not create a valid, non-empty PDF");
  }
  await run("pdfinfo", [path]);
}

function replaceExactly(text, matcher, replacement, label) {
  const flags = matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`;
  const matches = [...text.matchAll(new RegExp(matcher.source, flags))];
  if (matches.length !== 1) fail(`expected exactly one ${label}; found ${matches.length}`);
  return text.replace(matcher, replacement);
}

async function main() {
  if (!process.argv.includes("--publish")) {
    fail("this command writes public site files; rerun as: npm run publish:cv -- --publish");
  }
  await stableFile(source);
  const useExistingPdf = process.argv.includes("--use-existing-pdf");
  const work = await mkdtemp(join(tmpdir(), "kaiwu-cv-"));
  const generatedPdf = useExistingPdf ? existingPdf : wordStagingPdf;

  try {
    if (useExistingPdf) {
      const sourceStat = await stat(source);
      const pdfStat = await stat(existingPdf);
      if (pdfStat.mtimeMs < sourceStat.mtimeMs) {
        fail(`existing PDF predates the DOCX and cannot be used: ${existingPdf}`);
      }
    } else {
      const appleScript = `on run argv
  set sourceFile to POSIX file (item 1 of argv)
  set sourceHfsPath to sourceFile as text
  set outputFile to item 2 of argv
  tell application "Microsoft Word"
    activate
    set documentWasOpen to false
    try
      set cvDocument to first document whose full name is sourceHfsPath
      set documentWasOpen to true
    on error
      open sourceFile
      set cvDocument to active document
    end try
    try
      save as cvDocument file name outputFile file format format PDF
    on error errorMessage number errorNumber
      if not documentWasOpen then close cvDocument saving no
      error errorMessage number errorNumber
    end try
    if not documentWasOpen then close cvDocument saving no
  end tell
end run`;
      await rm(generatedPdf, { force: true });
      await run("osascript", ["-e", appleScript, source, generatedPdf], { timeoutMs: 120000 });
    }
    await validatePdf(generatedPdf);

    let replacePdf = true;
    try {
      const existingDigest = await sha256(target);
      const generatedDigest = await sha256(generatedPdf);
      if (existingDigest !== generatedDigest) {
        fail(`same-day target already exists and differs: ${target}; refuse to overwrite it`);
      }
      replacePdf = false;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const profilePath = join(root, "src/content/site/profile.yaml");
    const sitemapPath = join(root, "public/sitemap.xml");
    const profile = await readFile(profilePath, "utf8");
    const sitemap = await readFile(sitemapPath, "utf8");
    const nextProfile = replaceExactly(profile, /^cvFile: .+$/m, `cvFile: ${targetName}`, "profile cvFile");
    const nextSitemap = replaceExactly(
      sitemap,
      /<loc>https:\/\/about\.wukai\.work\/KaiWU_CV_\d{8}\.pdf<\/loc>\n    <lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
      `<loc>https://about.wukai.work/${targetName}</loc>\n    <lastmod>${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}</lastmod>`,
      "CV sitemap entry"
    );
    const nextCvSitemap = replaceExactly(
      nextSitemap,
      /(<loc>https:\/\/about\.wukai\.work\/cv\/<\/loc>\n    <lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/,
      `$1${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}$2`,
      "CV alias sitemap lastmod"
    );

    const stagedProfile = join(work, "profile.yaml");
    const stagedSitemap = join(work, "sitemap.xml");
    await Promise.all([
      writeFile(stagedProfile, nextProfile),
      writeFile(stagedSitemap, nextCvSitemap)
    ]);

    const originalProfile = profile;
    const originalSitemap = sitemap;
    try {
      if (replacePdf) await copyFile(generatedPdf, target);
      await rename(stagedProfile, profilePath);
      await rename(stagedSitemap, sitemapPath);
    } catch (error) {
      await Promise.allSettled([
        writeFile(profilePath, originalProfile),
        writeFile(sitemapPath, originalSitemap),
        replacePdf ? rm(target, { force: true }) : Promise.resolve()
      ]);
      throw error;
    }
    console.log(`Prepared ${targetName}. Run npm run check && npm run build && npm run verify, then commit and push.`);
  } finally {
    if (!useExistingPdf) await rm(generatedPdf, { force: true });
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
