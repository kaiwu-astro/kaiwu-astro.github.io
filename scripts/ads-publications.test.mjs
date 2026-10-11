import assert from "node:assert/strict";
import test from "node:test";
import { isKaiWu, maxAuthors, toPublication, toPublications } from "./ads-publications.mjs";

const article = {
  bibcode: "2024MNRAS.533.4485W",
  title: ["Influence of planets on debris discs in star clusters - II"],
  author: ["Wu, Kai", "Kouwenhoven, M. B. N.", "Spurzem, R.", "Pang, Xiaoying"],
  author_count: 4,
  pub: "Monthly Notices of the Royal Astronomical Society",
  volume: "533",
  page: ["4485"],
  year: "2024",
  doi: ["10.1093/mnras/stae2067"],
  identifier: ["arXiv:2409.00996", "10.1093/mnras/stae2067", "2024MNRAS.533.4485W"],
  doctype: "article"
};

test("isKaiWu matches ADS spellings of Kai Wu only", () => {
  for (const name of ["Wu, Kai", "Wu, K.", "Wu, K"]) assert.equal(isKaiWu(name), true, name);
  for (const name of ["Wu, Kaixuan", "Wu, Ke", "Wu, Xiaoying", "Kai, Wu"]) assert.equal(isKaiWu(name), false, name);
});

test("journal article keeps venue, DOI, arXiv id and author position", () => {
  const entry = toPublication(article);
  assert.equal(entry.venue, "Monthly Notices of the Royal Astronomical Society, 533, 4485");
  assert.equal(entry.doi, "10.1093/mnras/stae2067");
  assert.equal(entry.arxiv, "2409.00996");
  assert.equal(entry.authorPosition, 1);
  assert.equal(entry.year, 2024);
  assert.equal(entry.published, true);
  assert.equal(entry.url, "https://ui.adsabs.harvard.edu/abs/2024MNRAS.533.4485W/abstract");
});

test("preprint drops the arXiv DOI and is labelled as a preprint", () => {
  const entry = toPublication({
    bibcode: "2025arXiv251003933W",
    title: ["DRAGON-III simulation"],
    author: ["Wu, Kai", "Spurzem, R."],
    pub: "arXiv e-prints",
    year: "2025",
    doi: ["10.48550/arXiv.2510.03933"],
    identifier: ["arXiv:2510.03933"],
    doctype: "eprint"
  });
  assert.equal(entry.venue, "arXiv preprint");
  assert.equal(entry.published, false);
  assert.equal("doi" in entry, false);
  assert.equal(entry.arxiv, "2510.03933");
});

test("long author lists are cut but always keep Kai Wu", () => {
  const author = Array.from({ length: 20 }, (_, i) => `Author, ${i}.`);
  author[11] = "Wu, K.";
  const entry = toPublication({ ...article, author, author_count: 20 });
  assert.equal(entry.authors.length, 12);
  assert.equal(entry.authors.at(-1), "Wu, K.");
  assert.equal(entry.authorCount, 20);
  const short = toPublication({ ...article, author: author.slice(0, 11).concat("Other, A."), author_count: 12 });
  assert.equal(short.authors.length, maxAuthors);
  assert.equal(short.authorPosition, null);
});

test("duplicate ADS records are listed once", () => {
  assert.equal(toPublications([article, article]).length, 1);
});
