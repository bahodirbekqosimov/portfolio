import { MetadataRoute } from "next";
import { ProjectOut, Page, PostListItem } from "@/types/api";
import { getProjectSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  const baseUrl = "https://bahodirbek.uz";

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Dynamic projects routes
  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/projects/`, { cache: "no-store" });
    if (res.ok) {
      const projects: ProjectOut[] = await res.json();
      projectRoutes = projects.map((p) => ({
        url: `${baseUrl}/projects/${getProjectSlug(p)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error("Sitemap failed to fetch projects:", err);
  }

  // Dynamic blog posts routes (only published posts)
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${backendUrl}/api/v1/blog_posts/?page=1&size=50`, {
      cache: "no-store",
    });
    if (res.ok) {
      const pageData: Page<PostListItem> = await res.json();
      blogRoutes = pageData.items.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.published_at || Date.now()),
        changeFrequency: "weekly",
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error("Sitemap failed to fetch blog posts:", err);
  }

  return [...staticRoutes, ...projectRoutes, ...blogRoutes];
}
