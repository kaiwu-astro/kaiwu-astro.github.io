// Shared schema.org nodes, so every page describes Kai Wu with the same @id.
import type { CollectionEntry } from "astro:content";

type Profile = CollectionEntry<"site">["data"];

export const personId = "https://wukai.work/#person";

export const personNode = (profile: Profile) => ({
  "@type": "Person",
  "@id": personId,
  name: profile.name,
  alternateName: profile.schemaAlternateNames,
  jobTitle: "Postdoctoral Researcher",
  description: profile.description,
  url: profile.canonical,
  image: new URL("assets/images/profile-photo.jpg", profile.canonical).toString(),
  worksFor: {
    "@type": "ResearchOrganization",
    name: "Astronomisches Rechen-Institut",
    parentOrganization: { "@type": "CollegeOrUniversity", name: "Heidelberg University" }
  },
  alumniOf: profile.schemaAlumniOf.map((name) => ({ "@type": "CollegeOrUniversity", name })),
  identifier: {
    "@type": "PropertyValue",
    propertyID: "ORCID",
    value: profile.orcid,
    url: `https://orcid.org/${profile.orcid}`
  },
  sameAs: profile.socials.map((social) => social.href),
  knowsAbout: profile.schemaKnowsAbout
});
