import { defineCollection, z } from "astro:content";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  icon: z.string().optional()
});

export const collections = {
  site: defineCollection({
    type: "data",
    schema: z.object({
      name: z.string(),
      title: z.string(),
      affiliation: z.string(),
      location: z.string(),
      emails: z.array(z.string()),
      cvFile: z.string(),
      canonical: z.string(),
      description: z.string(),
      socialImage: z.string(),
      socials: z.array(linkSchema),
      schemaKnowsAbout: z.array(z.string()),
      schemaAlternateNames: z.array(z.string()),
      schemaAlumniOf: z.array(z.string()),
      orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/)
    })
  }),
  about: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string()
    })
  }),
  services: defineCollection({
    type: "data",
    schema: z.object({
      items: z.array(z.object({
        title: z.string(),
        icon: z.string(),
        text: z.string()
      }))
    })
  }),
  talks: defineCollection({
    type: "data",
    schema: z.object({
      items: z.array(z.object({
        id: z.string().regex(/^\d{8}-[a-z0-9-]+$/),
        title: z.string(),
        date: z.coerce.date(),
        venue: z.string(),
        summary: z.string(),
        slides: z.string().optional(),
        slides_label: z.string().optional(),
        pdf: z.string().optional()
      }))
    })
  }),
  publications: defineCollection({
    type: "data",
    schema: z.object({
      source: z.string().url(),
      updated: z.coerce.date(),
      items: z.array(z.object({
        bibcode: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        authorCount: z.number().int().positive(),
        authorPosition: z.number().int().positive().nullable(),
        venue: z.string(),
        year: z.number().int(),
        published: z.boolean(),
        doi: z.string().optional(),
        arxiv: z.string().optional(),
        url: z.string().url()
      }))
    })
  }),
  legal: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      canonicalPath: z.string()
    })
  })
};
