"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bookmark, User } from "lucide-react";

export default function BlogSubNav() {
  const pathname = usePathname();

  const isBlog = pathname === "/blog" || (pathname.startsWith("/blog/") && !pathname.startsWith("/blog/bookmarks") && !pathname.startsWith("/blog/profile"));
  const isBookmarks = pathname === "/blog/bookmarks";
  const isProfile = pathname === "/blog/profile";

  return (
    <div className="w-fit mx-auto sm:mx-0 p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm inline-flex items-center gap-1">
      <Link
        href="/blog"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
          isBlog
            ? "nav-active shadow-sm"
            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Blog
      </Link>

      <Link
        href="/blog/bookmarks"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
          isBookmarks
            ? "nav-active shadow-sm"
            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
        }`}
      >
        <Bookmark className="w-3.5 h-3.5" />
        Bookmarks
      </Link>

      <Link
        href="/blog/profile"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
          isProfile
            ? "nav-active shadow-sm"
            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
        }`}
      >
        <User className="w-3.5 h-3.5" />
        Profile
      </Link>
    </div>
  );
}
