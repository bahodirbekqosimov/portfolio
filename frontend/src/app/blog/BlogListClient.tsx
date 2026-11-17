"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Calendar,
  Tag,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  LogIn,
  RotateCcw,
} from "lucide-react";
import { Page, PostListItem, TagWithCount } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import LoginPromptModal from "@/components/LoginPromptModal";

interface BlogListClientProps {
  initialPostsPage: Page<PostListItem>;
  availableTags: TagWithCount[];
}

export default function BlogListClient({
  initialPostsPage,
  availableTags,
}: BlogListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [postsPage, setPostsPage] = useState<Page<PostListItem>>(initialPostsPage);
  const [loading, setLoading] = useState(false);

  // Search & Filter States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.getAll("tag").filter(Boolean)
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  // Bookmark tracking for items on listing
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalAction, setModalAction] = useState("");

  // Sync with URL query parameters & API
  const fetchPosts = async (
    newPage = page,
    newSearch = search,
    newTags = selectedTags,
    newDateFrom = dateFrom,
    newDateTo = dateTo,
    silent = false
  ) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", newPage.toString());
      params.set("size", "10");
      if (newSearch.trim()) params.set("search", newSearch.trim());
      newTags.forEach((t) => params.append("tag", t));
      if (newDateFrom) params.set("date_from", newDateFrom);
      if (newDateTo) params.set("date_to", newDateTo);

      // Update URL without full page reload
      if (!silent) {
        router.push(`/blog?${params.toString()}`, { scroll: false });
      }

      const data = await api.get<Page<PostListItem>>(`/api/v1/blog_posts/?${params.toString()}`);
      setPostsPage(data);
    } catch (err) {
      if (!silent) console.error("Failed to fetch blog posts:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Sync bookmarks from backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setBookmarkedSlugs(new Set());
      return;
    }
    const loadUserBookmarks = async () => {
      try {
        const bData = await api.get<Page<PostListItem>>("/api/v1/users/me/bookmarks/?size=50");
        if (bData && Array.isArray(bData.items)) {
          setBookmarkedSlugs(new Set(bData.items.map((item) => item.slug)));
        }
      } catch (err) {
        console.error("Failed to load user bookmarks:", err);
      }
    };
    loadUserBookmarks();
  }, [isAuthenticated]);

  // Always fetch fresh data on mount when navigating to /blog
  useEffect(() => {
    fetchPosts(page, search, selectedTags, dateFrom, dateTo, true);
  }, []);

  // Silent live polling every 5 seconds without user noticing (silent = true)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!showLoginModal) {
        fetchPosts(page, search, selectedTags, dateFrom, dateTo, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [page, search, selectedTags, dateFrom, dateTo, showLoginModal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts(1, search, selectedTags, dateFrom, dateTo);
  };

  const handleTagToggle = (tagName: string) => {
    let updatedTags: string[];
    if (selectedTags.includes(tagName)) {
      updatedTags = selectedTags.filter((t) => t !== tagName);
    } else {
      updatedTags = [...selectedTags, tagName];
    }
    setSelectedTags(updatedTags);
    setPage(1);
    fetchPosts(1, search, updatedTags, dateFrom, dateTo);
  };

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
    fetchPosts(1, search, selectedTags, from, to);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
    setPage(1);
    fetchPosts(1, "", [], "", "");
  };

  // Toggle bookmark
  const handleToggleBookmark = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setModalAction("bookmark this article");
      setShowLoginModal(true);
      return;
    }

    try {
      const res = await api.post<{ bookmarked: boolean }>(`/api/v1/blog_posts/${slug}/bookmark/`);
      setBookmarkedSlugs((prev) => {
        const next = new Set(prev);
        if (res.bookmarked) {
          next.add(slug);
        } else {
          next.delete(slug);
        }
        return next;
      });
    } catch (err) {
      console.error("Bookmark toggle error:", err);
    }
  };

  // Format publication date
  const formatPublishedDate = (dateStr: string) => {
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

  const hasActiveFilters = search || selectedTags.length > 0 || dateFrom || dateTo;

  return (
    <div className="space-y-8">
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign In to Bookmark"
        message={`Please log in to ${modalAction}. Your saved articles will be synced across all devices.`}
      />

      {/* Visitor Banner if logged out */}
      {!isAuthenticated && (
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-main)]">
            <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span>
              Welcome! You can read all posts freely. Sign in to react, leave comments, and save
              bookmarks.
            </span>
          </div>
          <Link
            href="/auth/login?redirect=/blog"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white w-fit transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </Link>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts by title or content keywords..."
            className="w-full pl-10 pr-24 py-2.5 rounded-xl text-sm border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
          >
            Search
          </button>
        </form>

        {/* Tags filter list */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-orange-500" />
              Filter by Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t.name);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTagToggle(t.name)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? "nav-active shadow-sm"
                        : "border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
                    }`}
                  >
                    #{t.name} ({t.posts_count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              Dates:
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
              title="From date"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
              title="To date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Posts Listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            Loading articles...
          </div>
        ) : postsPage.items.length > 0 ? (
          postsPage.items.map((post) => {
            const isBookmarked = bookmarkedSlugs.has(post.slug);
            return (
              <article
                key={post.slug}
                onClick={() => router.push(`/blog/${post.slug}`)}
                className="cursor-pointer group p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/40 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <time dateTime={post.published_at}>{formatPublishedDate(post.published_at)}</time>
                  </div>

                  <h2 className="text-xl font-bold text-[var(--text-main)] group-hover:text-orange-500 transition-colors">
                    {/* Real HTML link with valid href for Googlebot crawling */}
                    <Link
                      href={`/blog/${post.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.title}
                    </Link>
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleBookmark(post.slug, e);
                    }}
                    className={`p-2 rounded-xl border transition-all ${
                      isBookmarked
                        ? "bg-orange-500/10 border-orange-500 text-orange-500"
                        : "border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-orange-500"
                    }`}
                    title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                    aria-label="Bookmark"
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-orange-500" : ""}`} />
                  </button>

                  <Link
                    href={`/blog/${post.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-orange-600 hover:text-white border border-[var(--border-color)] text-[var(--text-main)] transition-colors"
                  >
                    Read
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-orange-500/40" />
            <h3 className="text-lg font-semibold text-[var(--text-main)]">No articles found</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your search query, tags, or date filters."
                : "Articles are being prepared and will appear here shortly."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {postsPage.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            disabled={page <= 1}
            onClick={() => {
              const prev = page - 1;
              setPage(prev);
              fetchPosts(prev, search, selectedTags, dateFrom, dateTo);
            }}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-[var(--text-muted)] px-3">
            Page {page} of {postsPage.pages} ({postsPage.total} articles)
          </span>

          <button
            disabled={page >= postsPage.pages}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              fetchPosts(next, search, selectedTags, dateFrom, dateTo);
            }}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
