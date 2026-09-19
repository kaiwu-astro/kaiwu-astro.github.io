import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const source = "/Users/wukai/Library/Mobile Documents/com~apple~CloudDocs/LOST.DEAR/Career/CV/KaiWU_CV.docx";
const exportDirectory = join(homedir(), "Library/Caches/kaiwu-cv-export");
const exportedPdf = join(exportDirectory, "KaiWU_CV.pdf");
const profilePath = join(root, "src/content/site/profile.yaml");
const sitemapPath = join(root, "public/sitemap.xml");
const publicDirectory = join(root, "public");
const args = process.argv.slice(2);
const noPush = args.includes("--no-push");
let changesPrepared = false;
let committed = false;

function fail(message) {
  throw new Error(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function berlinDate() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  const day = value("day");
  const month = value("month");
  const year = value("year");
  if (!day || !month || !year) fail("could not determine the Europe/Berlin date");
  const numericMonth = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    month: "2-digit"
  }).formatToParts(now).find((part) => part.type === "month")?.value;
  if (!numericMonth) fail("could not determine the Europe/Berlin month number");
  return {
    display: `${day} ${month} ${year}`,
    iso: `${year}-${numericMonth}-${day.padStart(2, "0")}`,
    compact: `${year}${numericMonth}${day.padStart(2, "0")}`
  };
}

function run(command, commandArgs, { capture = false, input, timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: capture ? ["pipe", "pipe", "inherit"] : input === undefined ? "inherit" : ["pipe", "inherit", "inherit"]
    });
    let output = "";
    let settled = false;
    let timeout;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      callback(value);
    };

    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
    }

    child.on("error", (error) => finish(reject, error));
    child.on("close", (code, signal) => {
      if (code === 0) finish(resolve, output);
      else finish(reject, new Error(`${command} ${signal ? `was terminated by ${signal}` : `exited with ${code}`}`));
    });

    if (timeoutMs) {
      timeout = setTimeout(() => {
        child.kill("SIGTERM");
        finish(reject, new Error(`${command} timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    }

    if (input !== undefined) child.stdin.end(input);
  });
}

async function commandPath(command) {
  const output = await run("sh", ["-c", `command -v ${command}`], { capture: true });
  const path = output.trim().split("\n")[0];
  if (!path) fail(`${command} is not available on PATH`);
  return path;
}

async function stableFile(path) {
  const first = await stat(path);
  if (!first.isFile() || first.size === 0) fail(`source is not a non-empty file: ${path}`);
  await sleep(1500);
  const second = await stat(path);
  if (first.size !== second.size || first.mtimeMs !== second.mtimeMs) {
    fail("source changed while being read; save Word and run again");
  }
}

function replaceExactly(text, matcher, replacement, label) {
  const flags = matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`;
  const matches = [...text.matchAll(new RegExp(matcher.source, flags))];
  if (matches.length !== 1) fail(`expected exactly one ${label}; found ${matches.length}`);
  return text.replace(matcher, replacement);
}

function cvFileFromProfile(profile) {
  const cvFile = profile.match(/^cvFile: (KaiWU_CV_\d{8}\.pdf)$/m)?.[1];
  if (!cvFile) fail("profile.yaml must contain a versioned KaiWU_CV_YYYYMMDD.pdf cvFile");
  return cvFile;
}

async function pdfText(path) {
  return run("pdftotext", [path, "-"], { capture: true });
}

// The footer carries a Word DATE field, so ignore dates when deciding whether the CV changed.
function withoutDates(text) {
  return text.replace(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g, "");
}

async function validatePdf(path, dateText) {
  const content = await readFile(path);
  if (content.length <= 1024 || !content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    fail("Word did not create a valid PDF larger than 1 KB");
  }
  await run("pdfinfo", [path]);
  const text = await pdfText(path);
  if (!text.includes("Kai Wu")) fail("exported PDF does not contain 'Kai Wu'; wrong document?");
  if (!text.includes(dateText)) {
    fail(`exported PDF does not contain today's date (${dateText}); the Word DATE field may be stale or this is the wrong document`);
  }
  return text;
}

async function waitForPagesRun(sha) {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const output = await run("gh", ["run", "list", "--commit", sha, "--json", "databaseId"], { capture: true });
    const runs = JSON.parse(output);
    if (runs[0]?.databaseId) return String(runs[0].databaseId);
    if (attempt < 12) await sleep(5000);
  }
  fail(`could not find a GitHub Actions run for ${sha} after 60 seconds`);
}

async function verifyLiveSite(targetName) {
  const pdfUrl = `https://about.wukai.work/${targetName}`;
  const cvUrl = "https://about.wukai.work/cv/";
  const deadline = Date.now() + 5 * 60 * 1000;
  let lastFailure = "no response received";

  while (Date.now() <= deadline) {
    try {
      const [pdfResponse, cvResponse] = await Promise.all([
        fetch(pdfUrl, { cache: "no-store" }),
        fetch(cvUrl, { cache: "no-store" })
      ]);
      const cvHtml = await cvResponse.text();
      const pdfContentType = pdfResponse.headers.get("content-type")?.toLowerCase() ?? "";
      const pdfReady = pdfResponse.status === 200 && pdfContentType.includes("pdf");
      const cvReady = cvResponse.status === 200 && cvHtml.includes(targetName);
      if (pdfReady && cvReady) return;
      lastFailure = `${pdfUrl}: ${pdfResponse.status} ${pdfContentType || "without content-type"}; ${cvUrl}: ${cvResponse.status} ${cvReady ? "updated" : "not updated"}`;
    } catch (error) {
      lastFailure = error.message;
    }
    if (Date.now() + 10000 > deadline) break;
    await sleep(10000);
  }

  fail(`site did not serve the new CV within five minutes: ${lastFailure}`);
}

const appleScript = `on run argv
  set sourceFile to POSIX file (item 1 of argv)
  set sourceHfs to sourceFile as text
  set outputPath to item 2 of argv
  tell application "Microsoft Word"
    open sourceFile with read only
    set cvDoc to active document
    if (full name of cvDoc) is not sourceHfs then error "active document is not the CV"
    try
      save as cvDoc file name outputPath file format format PDF
    on error m number n
      close cvDoc saving no
      error m number n
    end try
    close cvDoc saving no
    return "ok"
  end tell
end run`;

async function main() {
  if (args.length > 1 || (args.length === 1 && !noPush)) {
    fail("the only supported option is --no-push");
  }

  const date = berlinDate();
  const targetName = `KaiWU_CV_${date.compact}.pdf`;
  const targetPath = join(publicDirectory, targetName);

  console.log("1. 检查 Git 状态、远程分支和所需命令");
  const branch = (await run("git", ["branch", "--show-current"], { capture: true })).trim();
  if (branch !== "main") fail(`current branch is ${branch || "detached HEAD"}; publish from main`);
  const status = await run("git", ["status", "--porcelain"], { capture: true });
  if (status.trim()) fail("working tree is not clean; commit, stash, or discard changes first");
  await run("git", ["fetch", "origin"]);
  const behind = Number((await run("git", ["rev-list", "--count", "HEAD..origin/main"], { capture: true })).trim());
  if (!Number.isInteger(behind)) fail("could not determine whether main is behind origin/main");
  if (behind > 0) fail(`main is behind origin/main by ${behind} commit(s); fast-forward first`);
  let ghPath;
  for (const command of ["pdfinfo", "pdftotext", "gh", "osascript"]) {
    const path = await commandPath(command);
    if (command === "gh") ghPath = path;
  }

  console.log("2. 确认 iCloud 中的源 CV 已保存且稳定");
  await stableFile(source);

  console.log("3. 通过 Word 导出只读 PDF 到固定缓存目录");
  await mkdir(exportDirectory, { recursive: true });
  await rm(exportedPdf, { force: true });
  try {
    await run("osascript", ["-", source, exportedPdf], { input: appleScript, timeoutMs: 120000 });
  } catch (error) {
    fail(`${error.message}; check Microsoft Word for a dialog that needs your approval`);
  }

  console.log("4. 验证 PDF 结构、姓名和 Word DATE 字段日期");
  const generatedText = await validatePdf(exportedPdf, date.display);

  console.log("5. 比较导出文本与当前发布的 CV");
  const profile = await readFile(profilePath, "utf8");
  const currentCv = cvFileFromProfile(profile);
  const currentText = await pdfText(join(publicDirectory, currentCv));
  if (withoutDates(generatedText) === withoutDates(currentText)) {
    console.log("CV unchanged, nothing to publish");
    return;
  }

  console.log("6. 更新版本化 PDF、profile 和 sitemap");
  const sitemap = await readFile(sitemapPath, "utf8");
  const nextProfile = replaceExactly(profile, /^cvFile: .+$/m, `cvFile: ${targetName}`, "profile cvFile");
  const nextSitemap = replaceExactly(
    sitemap,
    /<loc>https:\/\/about\.wukai\.work\/KaiWU_CV_\d{8}\.pdf<\/loc>\n    <lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/,
    `<loc>https://about.wukai.work/${targetName}</loc>\n    <lastmod>${date.iso}</lastmod>`,
    "CV sitemap entry"
  );
  const nextCvSitemap = replaceExactly(
    nextSitemap,
    /(<loc>https:\/\/about\.wukai\.work\/cv\/<\/loc>\n    <lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>)/,
    `$1${date.iso}$2`,
    "CV alias sitemap lastmod"
  );
  const previousCvs = (await readdir(publicDirectory)).filter(
    (name) => /^KaiWU_CV_\d{8}\.pdf$/.test(name) && name !== targetName
  );
  changesPrepared = true;
  await copyFile(exportedPdf, targetPath);
  if (previousCvs.length > 0) await run("git", ["rm", "--", ...previousCvs.map((name) => join("public", name))]);
  await Promise.all([
    writeFile(profilePath, nextProfile),
    writeFile(sitemapPath, nextCvSitemap)
  ]);

  console.log("7. 运行 Astro 检查、构建和构建产物验证");
  await run("npm", ["run", "check"]);
  await run("npm", ["run", "build"]);
  await run("npm", ["run", "verify"]);

  if (noPush) {
    console.log("8. 已按 --no-push 在本地检查后停止；改动尚未暂存、提交或推送");
    return;
  }

  console.log("8. 暂存改动、创建提交并推送 main");
  await run("git", ["add", "--", join("public", targetName), "src/content/site/profile.yaml", "public/sitemap.xml"]);
  await run("git", [
    "commit",
    "-m",
    `Update CV for ${date.iso}`
  ]);
  committed = true;
  const sha = (await run("git", ["rev-parse", "HEAD"], { capture: true })).trim();
  await run("git", [
    "-c",
    "credential.https://github.com.helper=",
    "-c",
    `credential.https://github.com.helper=!${ghPath} auth git-credential`,
    "push",
    "origin",
    "main"
  ]);

  console.log("9. 等待该提交对应的 GitHub Pages 部署");
  const runId = await waitForPagesRun(sha);
  await run("gh", ["run", "watch", runId, "--exit-status"]);

  console.log("10. 轮询线上 PDF 和 /cv/ 回退页面");
  await verifyLiveSite(targetName);
  console.log(`发布完成：${targetName} 已推送、Pages 已部署，线上 PDF 与 /cv/ 均已验证。`);
}

main().catch((error) => {
  console.error(`publish-cv: ${error.message}`);
  if (changesPrepared && !committed) {
    console.error("本地改动已保留。若要撤销本次发布，请在仓库根目录运行：git reset --hard HEAD && git clean -fd public");
  }
  process.exitCode = 1;
});
