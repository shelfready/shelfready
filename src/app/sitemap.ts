import type { MetadataRoute } from "next";

const BASE = "https://useshelfready.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/demo`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/docs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/status`, changeFrequency: "daily", priority: 0.4 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/blog/why-ai-shopping-agents-cant-see-your-store`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog/anatomy-of-an-acp-feed`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog/gtin-hygiene-for-independent-stores`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/changelog`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/careers`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/security`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/dpa`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE}/demo/audit`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/demo/feeds`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/demo/enrichment`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
