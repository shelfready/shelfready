import type { MetadataRoute } from "next";

const BASE = "https://useshelfready.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/demo`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/docs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/demo/audit`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/demo/feeds`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/demo/enrichment`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
