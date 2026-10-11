// Turns NASA ADS search records into the entries of src/content/publications/main.json.

// Authors kept per paper; Kai Wu is always kept even when listed later.
export const maxAuthors = 8;

export const isKaiWu = (author) => /^Wu, K(?:ai\b|\.|$)/.test(author);

export function toPublication(doc) {
  const authors = doc.author ?? [];
  const position = authors.findIndex(isKaiWu) + 1;
  const published = doc.doctype !== "eprint";
  const arxiv = doc.identifier?.find((id) => id.startsWith("arXiv:"))?.slice("arXiv:".length);
  const doi = doc.doi?.find((value) => !value.startsWith("10.48550/"));
  return {
    bibcode: doc.bibcode,
    title: doc.title?.[0] ?? doc.bibcode,
    authors: authors.slice(0, Math.max(maxAuthors, position)),
    authorCount: doc.author_count ?? authors.length,
    authorPosition: position || null,
    venue: published ? [doc.pub, doc.volume, doc.page?.[0]].filter(Boolean).join(", ") : "arXiv preprint",
    year: Number(doc.year),
    published,
    ...(doi && { doi }),
    ...(arxiv && { arxiv }),
    url: `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(doc.bibcode)}/abstract`
  };
}

// ADS returns one record per paper even when the library holds both its arXiv and journal bibcodes.
export function toPublications(docs) {
  const seen = new Set();
  return docs.filter((doc) => !seen.has(doc.bibcode) && seen.add(doc.bibcode)).map(toPublication);
}
