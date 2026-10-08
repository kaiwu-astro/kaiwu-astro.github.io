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
      schemaKnowsAbout: z.array(z.string())
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
        slides: z.string(),
        pdf: z.string().optional()
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
