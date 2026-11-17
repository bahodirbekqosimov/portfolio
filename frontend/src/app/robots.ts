import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects/", "/blog/"],
        disallow: ["/admin/", "/auth/", "/api/"],
      },
    ],
    sitemap: "https://bahodirbek.uz/sitemap.xml",
  };
}
