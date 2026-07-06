import { defineCollection, z } from "astro:content";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
  icon: z.string().optional()
});

const timelineItemSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  text: z.array(z.string()),
  href: z.string().optional()
});

const timelineGroupSchema = z.object({
  title: z.string(),
  icon: z.string(),
  recordLink: linkSchema.optional(),
  items: z.array(timelineItemSchema)
});

const scienceGroupSchema = timelineGroupSchema.extend({
  category: z.enum(["papers", "teaching", "talks", "conferences", "activities"]),
  filterLabel: z.string()
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
  timeline: defineCollection({
    type: "data",
    schema: timelineGroupSchema
  }),
  science: defineCollection({
    type: "data",
    schema: scienceGroupSchema
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
