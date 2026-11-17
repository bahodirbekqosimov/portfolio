import Link from "next/link";
import type { Metadata } from "next";
import { Home, BookOpen, FolderGit2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist or has been moved.",
};

const SUGGESTIONS = [
  { href: "/", label: "Home", description: "Profile, experience and contacts", icon: Home },
  { href: "/projects", label: "Projects", description: "Things I have built", icon: FolderGit2 },
  { href: "/blog", label: "Blog", description: "Articles and engineering notes", icon: BookOpen },
];

export default function NotFound() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Soft background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 w-[520px] max-w-[90vw] h-[320px] rounded-full bg-orange-500/10 blur-3xl"
      />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-orange-500/30 bg-orange-500/10 text-orange-500">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          Error 404
        </div>

        <h1 className="mt-6 text-[96px] sm:text-[140px] leading-none font-extrabold tracking-tighter bg-gradient-to-b from-orange-400 to-orange-600 bg-clip-text text-transparent select-none">
          404
        </h1>

        <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
          This page could not be found
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
          The link may be broken, or the page may have been moved or removed. Check the address, or
          pick one of the places below.
        </p>

        {/* Terminal-style hint */}
        <div className="mt-8 mx-auto max-w-md text-left rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <pre className="px-4 py-3 text-xs sm:text-sm font-mono leading-relaxed text-[var(--text-muted)] whitespace-pre-wrap">
            <span className="text-orange-500">$</span> GET /this-page{"\n"}
            <span className="text-red-500">404</span> Not Found{"\n"}
            <span className="text-orange-500">$</span> cd ~ <span className="text-[var(--text-subtle)]"># try the links below</span>
          </pre>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
          >
            <BookOpen className="w-4 h-4 text-orange-500" />
            Read the Blog
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {SUGGESTIONS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)] group-hover:text-orange-500 transition-colors">
                  <Icon className="w-4 h-4 text-orange-500" />
                  {label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-subtle)] group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
