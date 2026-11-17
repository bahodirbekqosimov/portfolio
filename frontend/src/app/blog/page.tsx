import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import BlogSubNav from "@/components/BlogSubNav";
import BlogListClient from "./BlogListClient";
import { Page, PostListItem, TagWithCount } from "@/types/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Engineering Blog & Articles",
  description:
    "Technical articles, backend deep-dives, architectural case studies, Python, and system design insights by Bahodirbek.",
  alternates: {
    canonical: "https://bahodirbek.uz/blog",
  },
  openGraph: {
    title: "Engineering Blog & Articles | bahodirbek.uz",
    description:
      "Technical articles, backend deep-dives, architectural case studies, Python, and system design insights by Bahodirbek.",
    url: "https://bahodirbek.uz/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Engineering Blog & Articles | bahodirbek.uz",
    description:
      "Technical articles, backend deep-dives, architectural case studies, Python, and system design insights by Bahodirbek.",
  },
};

async function getInitialBlogData(): Promise<{
  postsPage: Page<PostListItem>;
  tags: TagWithCount[];
}> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  try {
    const [postsRes, tagsRes] = await Promise.all([
      fetch(`${backendUrl}/api/v1/blog_posts/?page=1&size=10`, { cache: "no-store" }),
      fetch(`${backendUrl}/api/v1/tags/`, { cache: "no-store" }),
    ]);

    const postsPage: Page<PostListItem> = postsRes.ok
      ? await postsRes.json()
      : { items: [], total: 0, page: 1, size: 10, pages: 0 };
    const tags: TagWithCount[] = tagsRes.ok ? await tagsRes.json() : [];

    return { postsPage, tags };
  } catch (err) {
    console.error("Failed to load blog initial data:", err);
    return {
      postsPage: { items: [], total: 0, page: 1, size: 10, pages: 0 },
      tags: [],
    };
  }
}

export default async function BlogPage() {
  const { postsPage, tags } = await getInitialBlogData();

  // Structured Data (Blog)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Bahodirbek Tech Blog",
    description: "In-depth technical guides, software architecture, and developer insights.",
    url: "https://bahodirbek.uz/blog",
    author: {
      "@type": "Person",
      name: "Bahodirbek",
      url: "https://bahodirbek.uz",
    },
    blogPost: postsPage.items.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `https://bahodirbek.uz/blog/${post.slug}`,
      datePublished: post.published_at,
    })),
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Blog persistent sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Publications
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
            Developer Blog
          </h1>
        </div>

        {/* Compact persistent sub-navigation */}
        <BlogSubNav />
      </div>

      {/* Main Blog List Client */}
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            Loading articles...
          </div>
        }
      >
        <BlogListClient initialPostsPage={postsPage} availableTags={tags} />
      </Suspense>
    </div>
  );
}
