"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Calendar, Eye, Tag, Share2, Check } from "lucide-react";
import { PostDetail, EmojiOut, ImageBlockOut, PostBlockOut, Page, PostListItem } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import BlogReactions from "@/components/BlogReactions";
import BlogComments from "@/components/BlogComments";
import LoginPromptModal from "@/components/LoginPromptModal";
import { BlogMediaBlock } from "@/components/BlogMediaBlock";
import { EmojiText } from "@/components/EmojiText";

interface BlogPostDetailClientProps {
  post: PostDetail;
  availableEmojis: EmojiOut[];
}

export default function BlogPostDetailClient({
  post,
  availableEmojis,
}: BlogPostDetailClientProps) {
  const { isAuthenticated } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync bookmark status when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsBookmarked(false);
      return;
    }
    const checkBookmark = async () => {
      try {
        const bData = await api.get<Page<PostListItem>>("/api/v1/users/me/bookmarks/?size=50");
        if (bData && Array.isArray(bData.items)) {
          const bookmarked = bData.items.some((item) => item.slug === post.slug);
          setIsBookmarked(bookmarked);
        }
      } catch (err) {
        // ignore
      }
    };
    checkBookmark();
  }, [isAuthenticated, post.slug]);

  // Toggle bookmark
  const handleToggleBookmark = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    try {
      const res = await api.post<{ bookmarked: boolean }>(
        `/api/v1/blog_posts/${post.slug}/bookmark/`
      );
      setIsBookmarked(res.bookmarked);
    } catch (err) {
      console.error("Bookmark error:", err);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  /**
   * Group consecutive image blocks into galleries as per specification:
   * "Frontend groups consecutive image blocks into a single gallery row"
   */
  const renderContentBlocks = (blocks: PostBlockOut[]) => {
    const renderedElements: React.ReactNode[] = [];
    let currentImageGroup: ImageBlockOut[] = [];

    const flushImageGroup = (keyPrefix: number) => {
      if (currentImageGroup.length === 0) return;
      const count = currentImageGroup.length;
      const gridClass =
        count === 1
          ? "grid-cols-1"
          : count === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

      renderedElements.push(
        <div key={`img-group-${keyPrefix}`} className={`grid ${gridClass} gap-4 my-6`}>
          {currentImageGroup.map((imgBlock, idx) => (
            <figure
              key={`img-${keyPrefix}-${idx}`}
              className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)] shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgBlock.url}
                alt={imgBlock.alt_text || post.title}
                className="w-full h-auto max-h-[460px] object-cover"
                loading="lazy"
              />
              {imgBlock.alt_text && (
                <figcaption className="p-2.5 text-center text-xs text-[var(--text-muted)] italic bg-[var(--bg-card)]">
                  {imgBlock.alt_text}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      );
      currentImageGroup = [];
    };

    blocks.forEach((block, index) => {
      if (block.type === "image") {
        currentImageGroup.push(block);
      } else if (block.type !== "text") {
        flushImageGroup(index);
        renderedElements.push(<BlogMediaBlock key={`media-${index}`} block={block} />);
      } else {
        flushImageGroup(index);
        renderedElements.push(
          <div
            key={`text-${index}`}
            className="my-4 text-base sm:text-lg text-[var(--text-main)] leading-relaxed whitespace-pre-line"
          >
            <EmojiText text={block.text} emojis={availableEmojis} />
          </div>
        );
      }
    });

    flushImageGroup(blocks.length);
    return renderedElements;
  };

  return (
    <article className="space-y-8">
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign In to Bookmark"
        message="Please sign in to save this post to your personal bookmarks library."
      />

      {/* Header Info */}
      <header className="space-y-4 border-b border-[var(--border-color)] pb-6">
        {/* Post Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog?tag=${encodeURIComponent(tag.name)}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-colors"
              >
                <Tag className="w-3 h-3" />
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs sm:text-sm text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" />
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-orange-500" />
              {post.views_count} views
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
              title="Share article link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5 text-orange-500" />}
              <span>{copiedLink ? "Copied!" : "Share"}</span>
            </button>

            <button
              onClick={handleToggleBookmark}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all ${
                isBookmarked
                  ? "bg-orange-500/15 border-orange-500 text-orange-500 shadow-sm"
                  : "border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
              }`}
              title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-orange-500" : ""}`} />
              <span>{isBookmarked ? "Saved" : "Bookmark"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Cover Image if present */}
      {post.image && (
        <div className="w-full max-h-[480px] rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)] shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Ordered Content Blocks */}
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        {post.content && post.content.length > 0 ? (
          renderContentBlocks(post.content)
        ) : (
          <p className="text-[var(--text-muted)] italic">No content blocks available.</p>
        )}
      </div>

      {/* Reactions Section */}
      <div className="border-t border-[var(--border-color)] pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Reactions
        </div>
        <BlogReactions
          slug={post.slug}
          initialReactions={post.reactions || []}
          availableEmojis={availableEmojis}
        />
      </div>

      {/* Comments Section */}
      <BlogComments slug={post.slug} initialCommentsCount={post.comments_count || 0} />
    </article>
  );
}
