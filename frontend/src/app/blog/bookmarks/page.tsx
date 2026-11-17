"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Calendar, ChevronRight, Trash2, ArrowLeft, BookOpen, LogIn } from "lucide-react";
import BlogSubNav from "@/components/BlogSubNav";
import { Page, PostListItem } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function BookmarksPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const data = await api.get<Page<PostListItem>>("/api/v1/users/me/bookmarks/?size=50");
      setBookmarks(data.items || []);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleRemoveBookmark = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/v1/blog_posts/${slug}/bookmark/`);
      setBookmarks((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err) {
      console.error("Remove bookmark error:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header and Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <Bookmark className="w-3.5 h-3.5" />
            Library
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
            Saved Bookmarks
          </h1>
        </div>

        <BlogSubNav />
      </div>

      {/* Main Content */}
      {authLoading ? (
        <div className="p-12 text-center text-sm text-[var(--text-muted)]">
          Checking authentication...
        </div>
      ) : !isAuthenticated ? (
        <div className="p-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Sign In to View Bookmarks</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Your saved articles will be synced across all your devices once you sign in.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/login?redirect=/blog/bookmarks"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In Now
            </Link>
          </div>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-sm text-[var(--text-muted)]">
          Loading your bookmarks...
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="space-y-4">
          {bookmarks.map((post) => (
            <div
              key={post.slug}
              onClick={() => router.push(`/blog/${post.slug}`)}
              className="cursor-pointer group p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/40 transition-all shadow-sm flex items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <span>{formatDate(post.published_at)}</span>
                </div>
                <h3 className="text-lg font-bold text-[var(--text-main)] group-hover:text-orange-500 transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleRemoveBookmark(post.slug, e)}
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-red-500/10 hover:border-red-500/30 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                  title="Remove from bookmarks"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                >
                  Read
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
          <Bookmark className="w-12 h-12 mx-auto text-orange-500/40" />
          <h3 className="text-lg font-semibold text-[var(--text-main)]">No bookmarks yet</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Click the bookmark icon on any article in the blog to save it here for quick reference.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors mt-2"
          >
            <BookOpen className="w-4 h-4" />
            Explore Articles
          </Link>
        </div>
      )}
    </div>
  );
}
