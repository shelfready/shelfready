import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/f/"],
      },
    ],
    sitemap: "https://useshelfready.com/sitemap.xml",
  };
}
