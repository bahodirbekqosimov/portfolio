import React from "react";
import Link from "next/link";
import { Terminal } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const yearString = currentYear > 2026 ? `2026–${currentYear}` : "2026";

  return (
    <footer className="w-full border-t border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] text-sm py-8 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Brand & copyright */}
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-[var(--text-main)]">bahodirbek.uz</span>
          <span className="text-[var(--text-subtle)]">|</span>
          <span>© {yearString} All rights reserved.</span>
        </div>

        {/* Right: Quick links */}
        <div className="flex items-center gap-6 text-xs sm:text-sm">
          <Link href="/" className="hover:text-orange-500 transition-colors">
            Home
          </Link>
          <Link href="/projects" className="hover:text-orange-500 transition-colors">
            Projects
          </Link>
          <Link href="/blog" className="hover:text-orange-500 transition-colors">
            Blog
          </Link>
        </div>
      </div>
    </footer>
  );
}
