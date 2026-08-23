import type { APIRoute } from "astro";
import { getEntry } from "astro:content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const profile = (await getEntry("site", "profile"))!.data;

  return new Response(JSON.stringify({
    schemaVersion: "1.0.0",
    name: profile.name,
    description: profile.description,
    url: profile.canonical,
    affiliation: profile.affiliation,
    topics: profile.schemaKnowsAbout,
    links: {
      curriculumVitae: new URL(profile.cvFile, profile.canonical).toString(),
      openapi: new URL("openapi.json", profile.canonical).toString(),
      sitemap: new URL("sitemap.xml", profile.canonical).toString()
    }
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
};
