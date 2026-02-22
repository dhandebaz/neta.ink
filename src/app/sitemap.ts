import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://neta.ink";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/complaints`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/rti`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/rankings/delhi`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/politicians`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date()
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date()
    }
  ];
}

