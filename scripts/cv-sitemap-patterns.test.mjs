import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cvAliasEntryPattern, cvFileEntryPattern } from "./cv-sitemap-patterns.mjs";

const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const count = (pattern) => sitemap.match(new RegExp(pattern.source, "g"))?.length ?? 0;

test("publish-cv 的 CV PDF sitemap 正则恰好匹配当前 sitemap 一次", () => {
  assert.equal(count(cvFileEntryPattern), 1);
});

test("publish-cv 的 /cv/ 别名 sitemap 正则恰好匹配当前 sitemap 一次", () => {
  assert.equal(count(cvAliasEntryPattern), 1);
});
