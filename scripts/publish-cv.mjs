// Publishes the academic CV (LaTeX, private KIT repo) to this website.
// Design and operations: docs/maintenance.md, "Updating The CV".
//
//   node scripts/publish-cv.mjs [--dry-run] [--no-push] [--include-today] [--selftest]
//
// Test hooks (environment): CV_KIT_REPO (KIT path), CV_NOW (ISO timestamp replacing the clock).
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
// TeX lives outside the default PATH (e.g. when started by double-click or launchd).
for (const extra of ["/Library/TeX/texbin", "/opt/homebrew/bin"]) {
  if (!(process.env.PATH ?? "").split(":").includes(extra)) process.env.PATH = `${process.env.PATH ?? ""}:${extra}`;
}

const kitRepo =
  process.env.CV_KIT_REPO ??
  "/Users/wukai/Library/Mobile Documents/com~apple~CloudDocs/LOST.DEAR/Career/job-application-context-kit";
const kitBranch = "main";
const sourcePaths = ["academic/cv/KaiWU_CV.tex", "academic/cv/cv-inprep.bib", "academic/sources/publications.bib"];
const archivePaths = ["academic/cv", "academic/sources/publications.bib"];
const buildDirectory = join(homedir(), "Library/Caches/kaiwu-cv-build");
const stateDirectory = join(homedir(), "Library/Caches/kaiwu-cv-publish");
const lockDirectory = join(stateDirectory, "lock");
const evalCachePath = join(stateDirectory, "evaluated.json");
const publicationStatePath = join(root, "scripts/cv-publication.json");
const profilePath = join(root, "src/content/site/profile.yaml");
const sitemapPath = join(root, "public/sitemap.xml");
const publicDirectory = join(root, "public");
const cutoffHour = 23;
const cutoffMinute = 30;

const args = process.argv.slice(2);
const known = new Set(["--dry-run", "--no-push", "--include-today", "--selftest"]);
const unknown = args.filter((arg) => !known.has(arg));
const dryRun = args.includes("--dry-run");
const noPush = args.includes("--no-push");
const includeToday = args.includes("--include-today");
const selftest = args.includes("--selftest");
let changesPrepared = false;
let committed = false;

const kitEnv = { ...process.env, GIT_OPTIONAL_LOCKS: "0" };
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function fail(message) {
  throw new Error(message);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function log(message) {
  console.log(message);
}

// ---------- Europe/Berlin time ----------

function berlinParts(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  const result = { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
  if (Object.values(result).some((value) => !Number.isFinite(value))) fail("could not determine the Europe/Berlin time");
  return result;
}

function berlinOffsetMinutes(date) {
  const p = berlinParts(date);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function dateInfo(y, m, d) {
  return {
    display: `${d} ${months[m - 1]} ${y}`,
    iso: `${y}-${pad(m)}-${pad(d)}`,
    compact: `${y}${pad(m)}${pad(d)}`
  };
}

// The instant 23:59:59 Berlin time on the given calendar day, as epoch seconds.
function endOfBerlinDay(y, m, d) {
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  const offset = berlinOffsetMinutes(noon);
  return Date.UTC(y, m - 1, d, 23, 59, 59) / 1000 - offset * 60;
}

function computeCutoff() {
  const now = process.env.CV_NOW ? new Date(process.env.CV_NOW) : new Date();
  if (Number.isNaN(now.getTime())) fail(`invalid CV_NOW: ${process.env.CV_NOW}`);
  const p = berlinParts(now);
  const afterCutoffTime = p.h * 60 + p.mi >= cutoffHour * 60 + cutoffMinute;
  const useToday = includeToday || afterCutoffTime;
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d - (useToday ? 0 : 1)));
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth() + 1;
  const d = day.getUTCDate();
  return {
    nowText: `${pad(p.y, 4)}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)} Europe/Berlin`,
    label: `${dateInfo(y, m, d).iso} 23:59:59 Europe/Berlin (${useToday ? "today" : "yesterday"})`,
    epoch: endOfBerlinDay(y, m, d)
  };
}

function berlinDateOfEpoch(epochSeconds) {
  const p = berlinParts(new Date(epochSeconds * 1000));
  return dateInfo(p.y, p.m, p.d);
}

// ---------- process helpers ----------

function run(command, commandArgs, { capture = false, input, timeoutMs, cwd, env, allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env,
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
      if (code === 0 || allowFailure) finish(resolve, capture ? output : code);
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

const kitGit = (gitArgs, options = {}) =>
  run("git", ["-C", kitRepo, ...gitArgs], { ...options, env: kitEnv });

async function commandPath(command) {
  const output = await run("sh", ["-c", `command -v ${command}`], { capture: true, allowFailure: true });
  const path = output.trim().split("\n")[0];
  if (!path) fail(`${command} is not available on PATH (${process.env.PATH})`);
  return path;
}

// ---------- lock ----------

async function acquireLock() {
  await mkdir(stateDirectory, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(lockDirectory);
      await writeFile(join(lockDirectory, "pid"), String(process.pid));
      return true;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const pid = Number((await readFile(join(lockDirectory, "pid"), "utf8").catch(() => "")).trim());
      let alive = false;
      if (Number.isInteger(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          alive = true;
        } catch (killError) {
          alive = killError.code === "EPERM";
        }
      }
      if (alive) return false;
      await rm(lockDirectory, { recursive: true, force: true });
    }
  }
  return false;
}

async function releaseLock() {
  await rm(lockDirectory, { recursive: true, force: true });
}

// ---------- state ----------

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

// Newest commit on the KIT branch, at or before the cutoff, that touched a CV source file.
async function findSourceCommit(cutoffEpoch) {
  const output = await kitGit(["log", kitBranch, "--format=%H %ct", "--", ...sourcePaths], { capture: true });
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const [sha, commitTime] = line.split(" ");
    if (Number(commitTime) <= cutoffEpoch) return { sha, epoch: Number(commitTime) };
  }
  return undefined;
}

async function isAncestor(ancestor, descendant) {
  const code = await kitGit(["merge-base", "--is-ancestor", ancestor, descendant], { allowFailure: true });
  return code === 0;
}

function cvFileFromProfile(profile) {
  const cvFile = profile.match(/^cvFile: (KaiWU_CV_\d{8}\.pdf)$/m)?.[1];
  if (!cvFile) fail("profile.yaml must contain a versioned KaiWU_CV_YYYYMMDD.pdf cvFile");
  return cvFile;
}

// ---------- PDF ----------

async function pdfText(path) {
  return run("pdftotext", [path, "-"], { capture: true });
}

// The footer carries the update date, so ignore dates when deciding whether the CV changed.
function withoutDates(text) {
  return text.replace(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g, "");
}

// The public CV must not carry a phone number. The number is hidden in the LaTeX source by \cvpublic;
// this is the safety net. The main check is a generic international-number pattern, so no number
// lives in this public repo. Optional: strings listed (one per line) in a local file outside the repo
// are also refused, compared with digits normalised.
const phonePattern = /\+\s?\d{1,3}[ \-.]?(?:\(0\))?[ \-.]?\d[\d \-.]{5,}\d/;
const forbiddenStringsPath = join(homedir(), "Library/Application Support/kaiwu-cv-publish/forbidden-strings.txt");

async function checkNoPhone(text) {
  if (phonePattern.test(text)) fail("PDF contains something that looks like a phone number; refusing to publish");
  let listed;
  try {
    listed = await readFile(forbiddenStringsPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const digitsOnly = (value) => value.replace(/\D/g, "");
  const textDigits = digitsOnly(text);
  const lowerText = text.toLowerCase();
  for (const raw of listed.split("\n")) {
    const entry = raw.trim();
    if (!entry || entry.startsWith("#")) continue;
    const digits = digitsOnly(entry);
    const hit = digits.length >= 7 ? textDigits.includes(digits) : lowerText.includes(entry.toLowerCase());
    if (hit) fail("PDF contains a string from the local forbidden-strings list; refusing to publish");
  }
}

async function validatePdf(path, dateText) {
  const content = await readFile(path);
  if (content.length <= 1024 || !content.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    fail("latexmk did not create a valid PDF larger than 1 KB");
  }
  const info = await run("pdfinfo", [path], { capture: true });
  const size = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  if (!size || Math.abs(Number(size[1]) - 595.276) > 1 || Math.abs(Number(size[2]) - 841.89) > 1) {
    fail(`PDF is not A4 (${size ? `${size[1]} x ${size[2]} pts` : "unknown page size"})`);
  }
  const text = await pdfText(path);
  if (!text.includes("Kai Wu")) fail("PDF does not contain 'Kai Wu'; wrong document?");
  if (!text.includes(`Updated ${dateText}`)) fail(`PDF footer does not contain 'Updated ${dateText}'`);
  if (/Academic References/i.test(text)) fail("PDF contains 'Academic References'; refusing to publish referee details");
  await checkNoPhone(text);
  return text;
}

async function compileCv(commit, date) {
  await rm(buildDirectory, { recursive: true, force: true });
  await mkdir(buildDirectory, { recursive: true });
  const archive = spawn("git", ["-C", kitRepo, "archive", commit, ...archivePaths], { env: kitEnv, stdio: ["ignore", "pipe", "inherit"] });
  const tar = spawn("tar", ["-x", "-C", buildDirectory], { stdio: ["pipe", "inherit", "inherit"] });
  archive.stdout.pipe(tar.stdin);
  await Promise.all(
    [archive, tar].map(
      (child) =>
        new Promise((resolve, reject) => {
          child.on("error", reject);
          child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`git archive | tar failed (exit ${code})`))));
        })
    )
  );
  const cvDirectory = join(buildDirectory, "academic/cv");
  await run("latexmk", [`-usepretex=\\newcommand\\cvupdated{${date.display}}\\def\\cvpublic{}`], {
    cwd: cvDirectory,
    timeoutMs: 10 * 60 * 1000
  });
  return join(cvDirectory, "KaiWU_CV.pdf");
}

// ---------- GitHub ----------

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
        fetch(pdfUrl, { cache: "no-store", signal: AbortSignal.timeout(30000) }),
        fetch(cvUrl, { cache: "no-store", signal: AbortSignal.timeout(30000) })
      ]);
      // Drain the PDF body too; an unread response keeps Node from exiting.
      const [cvHtml] = await Promise.all([cvResponse.text(), pdfResponse.arrayBuffer()]);
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

function replaceExactly(text, matcher, replacement, label) {
  const flags = matcher.flags.includes("g") ? matcher.flags : `${matcher.flags}g`;
  const matches = [...text.matchAll(new RegExp(matcher.source, flags))];
  if (matches.length !== 1) fail(`expected exactly one ${label}; found ${matches.length}`);
  return text.replace(matcher, replacement);
}

// ---------- modes ----------

async function runSelftest() {
  log("selftest: 环境检查");
  log(`PATH=${process.env.PATH}`);
  for (const command of ["git", "node", "latexmk", "pdflatex", "biber", "pdfinfo", "pdftotext", "gh", "tar"]) {
    log(`  ${command}: ${await commandPath(command)}`);
  }
  const head = (await kitGit(["rev-parse", kitBranch], { capture: true })).trim();
  log(`  KIT ${kitBranch} = ${head} (${kitRepo})`);
  const blob = await kitGit(["show", `${kitBranch}:academic/cv/KaiWU_CV.tex`], { capture: true });
  log(`  KIT 读取 KaiWU_CV.tex: ${blob.length} 字符`);
  await run("gh", ["auth", "status"]);
  await run("git", ["ls-remote", "--exit-code", "origin", "refs/heads/main"]);
  log("selftest: 全部通过");
}

async function main() {
  if (unknown.length > 0) fail(`unsupported option(s): ${unknown.join(" ")}; supported: ${[...known].join(" ")}`);

  if (selftest) {
    await runSelftest();
    return;
  }

  const cutoff = computeCutoff();
  const source = await findSourceCommit(cutoff.epoch);
  const published = await readJson(publicationStatePath);
  if (!published?.kitCommit) fail("scripts/cv-publication.json is missing or has no kitCommit");
  const profile = await readFile(profilePath, "utf8");
  const currentCv = cvFileFromProfile(profile);

  let decision;
  let date;
  if (!source) {
    decision = "no CV source commit before the cutoff";
  } else {
    date = berlinDateOfEpoch(source.epoch);
    if (source.sha === published.kitCommit) decision = "already published (or baseline)";
    else if (await isAncestor(source.sha, published.kitCommit)) decision = "already published (older than the recorded source commit)";
    else if (published.commitDate && date.iso <= published.commitDate) {
      decision = `a CV dated ${published.commitDate} is already published; at most one version per day`;
    } else {
      const cache = await readJson(evalCachePath);
      if (cache?.commit === source.sha && cache.published === currentCv) {
        decision = `already evaluated (${cache.result})`;
      }
    }
  }
  const pending = Boolean(source) && !decision;

  log(`现在: ${cutoff.nowText}`);
  log(`截止: ${cutoff.label}`);
  log(`源提交 C: ${source ? `${source.sha.slice(0, 12)} (${date.iso})` : "无"}; 已发布所用: ${published.kitCommit.slice(0, 12)}${published.commitDate ? ` (${published.commitDate})` : ""}`);
  log(pending ? `待发布: KaiWU_CV_${date.compact}.pdf (页脚 ${date.display})` : `无事可发: ${decision}`);
  if (dryRun || !pending) return;

  const targetName = `KaiWU_CV_${date.compact}.pdf`;
  const targetPath = join(publicDirectory, targetName);

  log("1. 检查 Git 状态、远程分支和所需命令");
  const branch = (await run("git", ["branch", "--show-current"], { capture: true })).trim();
  if (branch !== "main") fail(`current branch is ${branch || "detached HEAD"}; publish from main`);
  const status = await run("git", ["status", "--porcelain"], { capture: true });
  if (status.trim()) fail("working tree is not clean; commit, stash, or discard changes first");
  await run("git", ["fetch", "origin"]);
  const behind = Number((await run("git", ["rev-list", "--count", "HEAD..origin/main"], { capture: true })).trim());
  if (!Number.isInteger(behind)) fail("could not determine whether main is behind origin/main");
  if (behind > 0) fail(`main is behind origin/main by ${behind} commit(s); fast-forward first`);
  const ahead = Number((await run("git", ["rev-list", "--count", "origin/main..HEAD"], { capture: true })).trim());
  if (ahead > 0 && !noPush) fail(`main is ahead of origin/main by ${ahead} unpushed commit(s); push or review them first`);
  let ghPath;
  for (const command of ["latexmk", "biber", "pdfinfo", "pdftotext", "tar", "gh"]) {
    const path = await commandPath(command);
    if (command === "gh") ghPath = path;
  }

  log(`2. 从 KIT 提交 ${source.sha.slice(0, 12)} 导出并编译（页脚日期 ${date.display}）`);
  const builtPdf = await compileCv(source.sha, date);

  log("3. 验证 PDF：A4、姓名、页脚日期、不含推荐人和电话号码");
  const generatedText = await validatePdf(builtPdf, date.display);

  log("4. 比较编译文本与当前发布的 CV");
  const currentText = await pdfText(join(publicDirectory, currentCv));
  if (withoutDates(generatedText) === withoutDates(currentText)) {
    await mkdir(stateDirectory, { recursive: true });
    await writeFile(evalCachePath, JSON.stringify({ commit: source.sha, published: currentCv, result: "text unchanged" }));
    log("CV text unchanged, nothing to publish");
    return;
  }

  log("5. 更新版本化 PDF、profile、sitemap 和发布记录");
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
  const nextState = { kitCommit: source.sha, commitDate: date.iso, pdf: targetName };
  const previousCvs = (await readdir(publicDirectory)).filter(
    (name) => /^KaiWU_CV_\d{8}\.pdf$/.test(name) && name !== targetName
  );
  changesPrepared = true;
  await copyFile(builtPdf, targetPath);
  if (previousCvs.length > 0) await run("git", ["rm", "--", ...previousCvs.map((name) => join("public", name))]);
  await Promise.all([
    writeFile(profilePath, nextProfile),
    writeFile(sitemapPath, nextCvSitemap),
    writeFile(publicationStatePath, `${JSON.stringify(nextState, null, 2)}\n`)
  ]);

  log("6. 运行 Astro 检查、构建和构建产物验证");
  await run("npm", ["run", "check"]);
  await run("npm", ["run", "build"]);
  await run("npm", ["run", "verify"]);

  if (noPush) {
    log("7. 已按 --no-push 在本地检查后停止；改动尚未暂存、提交或推送");
    return;
  }

  log("7. 暂存改动、创建提交并推送 main");
  await run("git", ["add", "--", join("public", targetName), "src/content/site/profile.yaml", "public/sitemap.xml", "scripts/cv-publication.json"]);
  await run("git", ["commit", "-m", `Update CV for ${date.iso}`, "-m", `Source: KIT ${source.sha}`]);
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

  log("8. 等待该提交对应的 GitHub Pages 部署");
  const runId = await waitForPagesRun(sha);
  await run("gh", ["run", "watch", runId, "--exit-status"]);

  log("9. 轮询线上 PDF 和 /cv/ 回退页面");
  await verifyLiveSite(targetName);
  log(`发布完成：${targetName} 已推送、Pages 已部署，线上 PDF 与 /cv/ 均已验证。`);
}

async function entry() {
  const readOnly = dryRun || selftest;
  if (!readOnly && !(await acquireLock())) {
    log("另一个 publish-cv 正在运行，本次跳过");
    return;
  }
  try {
    await main();
  } finally {
    if (!readOnly) await releaseLock();
  }
}

entry().catch((error) => {
  console.error(`publish-cv: ${error.message}`);
  if (changesPrepared && !committed) {
    console.error("本地改动已保留。若要撤销本次发布，请在仓库根目录运行：git reset --hard HEAD && git clean -fd public");
  }
  process.exitCode = 1;
});
