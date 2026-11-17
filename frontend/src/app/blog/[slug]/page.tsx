import React, { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BlogSubNav from "@/components/BlogSubNav";
import BlogPostDetailClient from "./BlogPostDetailClient";
import { PostDetail, EmojiOut } from "@/types/api";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Har bir ochilish = 1 ko'rish. cache() metadata va sahifa bitta so'rovni ishlatishini ta'minlaydi
// (aks holda bitta ochilish 2 marta sanalardi), "no-store" esa har ochilishda backendga boradi.
const getPostData = cache(async function getPostData(slug: string): Promise<{
  post: PostDetail | null;
  emojis: EmojiOut[];
}> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  try {
    const [postRes, emojisRes] = await Promise.all([
      fetch(`${backendUrl}/api/v1/blog_posts/${slug}/`, {
        cache: "no-store",
      }),
      fetch(`${backendUrl}/api/v1/emojis/`, {
        next: { revalidate: 300 },
      }),
    ]);

    if (!postRes.ok) {
      return { post: null, emojis: [] };
    }

    const post: PostDetail = await postRes.json();
    const emojis: EmojiOut[] = emojisRes.ok ? await emojisRes.json() : [];

    return { post, emojis };
  } catch (err) {
    console.error("Failed to fetch post detail:", err);
    return { post: null, emojis: [] };
  }
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await getPostData(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  // Derive description from first text block or fallback
  const firstTextBlock = post.content?.find((b) => b.type === "text") as { text: string } | undefined;
  const description =
    firstTextBlock?.text?.slice(0, 160).replace(/\s+/g, " ").trim() ||
    `Read ${post.title} on Bahodirbek's engineering blog.`;

  const canonicalUrl = `https://bahodirbek.uz/blog/${post.slug}`;
  const images = post.image ? [{ url: post.image, alt: post.title }] : [];

  return {
    title: post.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title} | bahodirbek.uz`,
      description,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: ["Bahodirbek"],
      tags: post.tags?.map((t) => t.name),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | bahodirbek.uz`,
      description,
      images: post.image ? [post.image] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { post, emojis } = await getPostData(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = `https://bahodirbek.uz/blog/${post.slug}`;

  // Article JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: canonicalUrl,
    image: post.image || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      "@type": "Person",
      name: "Bahodirbek",
      url: "https://bahodirbek.uz",
    },
    publisher: {
      "@type": "Organization",
      name: "bahodirbek.uz",
      logo: {
        "@type": "ImageObject",
        url: "https://bahodirbek.uz/logo.png",
      },
    },
    keywords: post.tags?.map((t) => t.name).join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Article structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation bar with Back Link and Persistent Blog Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-orange-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all articles
        </Link>

        <BlogSubNav />
      </div>

      {/* Post Detail Interactive Client */}
      <BlogPostDetailClient post={post} availableEmojis={emojis} />
    </div>
  );
}
