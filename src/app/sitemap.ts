import { MetadataRoute } from "next";
import { db } from "@/db/client";
import { politicians, states } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://neta.ink";

  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/complaints`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rti`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/volunteer`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
  ];

  try {
    const activeStates = await db.select().from(states).where(eq(states.is_enabled, true));

    const stateRoutes = activeStates.flatMap((state) => [
      {
        url: `${baseUrl}/rankings/${state.code.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      {
        url: `${baseUrl}/politicians/${state.code.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }
    ]);

    const allPoliticians = await db.select({ id: politicians.id, updated_at: politicians.updated_at }).from(politicians);

    const politicianRoutes = allPoliticians.map((pol) => ({
      url: `${baseUrl}/politician/${pol.id}`,
      lastModified: pol.updated_at || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...stateRoutes, ...politicianRoutes];
  } catch (error) {
    console.warn("Failed to generate dynamic sitemap (DB likely offline during build). Returning static routes only.", error);
    return staticRoutes;
  }
}
