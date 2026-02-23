import type { MetadataRoute } from "next";
import { db } from "@/db/client";
import { politicians } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://neta.ink";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now
    },
    {
      url: `${baseUrl}/complaints`,
      lastModified: now
    },
    {
      url: `${baseUrl}/rti`,
      lastModified: now
    },
    {
      url: `${baseUrl}/rankings/delhi`,
      lastModified: now
    },
    {
      url: `${baseUrl}/politicians/delhi`,
      lastModified: now
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now
    }
  ];

  try {
    const politicianRows = await db.select().from(politicians);

    const politicianRoutes: MetadataRoute.Sitemap = politicianRows.map((pol) => ({
      url: `${baseUrl}/politician/${pol.id}`,
      lastModified: now
    }));

    return [...staticRoutes, ...politicianRoutes];
  } catch {
    return staticRoutes;
  }
}
