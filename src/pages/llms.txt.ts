// llms.txt (https://llmstxt.org/): a plain Markdown summary of the site for language models and agents.
// Built from the same content collections as the pages. Email addresses stay out of it: the HTML pages
// rely on Cloudflare Email Obfuscation, which does not apply to plain text.
import type { APIRoute } from "astro";
import { getEntry } from "astro:content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const profile = (await getEntry("site", "profile"))!.data;
  const about = (await getEntry("about", "main"))!;
  const services = (await getEntry("services", "main"))!.data.items;
  const talks = (await getEntry("talks", "main"))!.data.items;
  const publications = (await getEntry("publications", "main"))!.data;
  const url = (path: string) => new URL(path, profile.canonical).toString();
  const day = (date: Date) => date.toISOString().slice(0, 10);

  const paperLine = (paper: (typeof publications.items)[number]) => {
    const role = paper.authorPosition === 1
      ? "first author"
      : paper.authorPosition
        ? `author ${paper.authorPosition} of ${paper.authorCount}`
        : "a co-author";
    const links = [
      paper.doi && `DOI ${paper.doi}`,
      paper.arxiv && `arXiv:${paper.arxiv}`
    ].filter(Boolean).join(", ");
    const lead = `${paper.authors[0]}${paper.authorCount > 1 ? " et al." : ""}`;
    return `- [${paper.title}](${paper.url}): ${lead}, ${paper.venue}, ${paper.year}; Kai Wu is ${role}${links ? `; ${links}` : ""}`;
  };

  const lines = [
    `# ${profile.name} (${profile.schemaAlternateNames[0]})`,
    "",
    `> ${profile.description}`,
    "",
    `${profile.title} at ${profile.affiliation}. ORCID ${profile.orcid}.`,
    "",
    about.body!.trim(),
    "",
    "Research and technical focus:",
    "",
    ...services.map((service) => `- ${service.title}: ${service.text}`),
    "",
    "## Profile",
    "",
    `- [Homepage](${profile.canonical}): about, talks and contact`,
    `- [Curriculum vitae (PDF)](${url(profile.cvFile)}): appointments, education, publications and academic activities`,
    ...profile.socials.map((social) => `- [${social.label}](${social.href})`),
    "",
    "## Publications",
    "",
    `From the NASA ADS library ${publications.source}, list updated ${day(publications.updated)}. Full page: ${url("publications/")}`,
    "",
    ...publications.items.map(paperLine),
    "",
    "## Talks",
    "",
    ...talks.map((talk) => [
      `- [${talk.title}](${url(talk.slides ?? `/#talks-${talk.id}`)}): ${day(talk.date)}, ${talk.venue}. ${talk.summary}`,
      ...(talk.pdf ? [`  PDF: ${url(talk.pdf)}`] : [])
    ].join("\n")),
    "",
    "## Optional",
    "",
    `- [Site profile API](${url("api/site.json")}): JSON summary; described by [OpenAPI](${url("openapi.json")})`,
    `- [Sitemap](${url("sitemap.xml")})`,
    `- [Contact](${url("/#contact")}): email addresses are listed on the homepage`,
    ""
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
