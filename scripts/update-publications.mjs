// Refresh src/content/publications/main.json from the public NASA ADS library linked on the homepage.
// Usage: ADS_API_TOKEN=... npm run update:publications
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toPublications } from "./ads-publications.mjs";

const root = process.cwd();
const outputPath = join(root, "src/content/publications/main.json");
const api = "https://api.adsabs.harvard.edu/v1";
const token = process.env.ADS_API_TOKEN;
if (!token) throw new Error("ADS_API_TOKEN is not set");

const profile = readFileSync(join(root, "src/content/site/profile.yaml"), "utf8");
const libraryUrl = profile.match(/https:\/\/ui\.adsabs\.harvard\.edu\/user\/libraries\/([\w-]+)/);
if (!libraryUrl) throw new Error("profile.yaml has no NASA ADS library link");
const [source, libraryId] = libraryUrl;

const request = async (path) => {
  const response = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`ADS ${path.split("?")[0]} returned ${response.status}`);
  return response.json();
};

const library = await request(`/biblib/libraries/${libraryId}?rows=500`);
const bibcodes = library.documents;
if (!Array.isArray(bibcodes) || bibcodes.length === 0) throw new Error("ADS library is empty");

// identifier: also matches arXiv bibcodes kept in the library after the paper was published.
const query = new URLSearchParams({
  q: `identifier:(${bibcodes.map((bibcode) => `"${bibcode}"`).join(" OR ")})`,
  fl: "bibcode,title,author,author_count,pub,volume,page,pubdate,year,doi,identifier,doctype",
  rows: "500",
  sort: "date desc"
});
const { response } = await request(`/search/query?${query}`);

const items = toPublications(response.docs);

const missing = bibcodes.length - items.length;
if (missing > 0) console.warn(`warning: ${missing} library entries were not found or were duplicates`);

// Keep the old date when ADS returned the same list, so reruns do not touch the page.
const previous = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
if (previous && JSON.stringify(previous.items) === JSON.stringify(items) && previous.source === source) {
  console.log(`no changes; ${items.length} publications, updated ${previous.updated}`);
} else {
  const data = { source, updated: new Date().toISOString().slice(0, 10), items };
  writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${items.length} publications to ${outputPath}`);
}
