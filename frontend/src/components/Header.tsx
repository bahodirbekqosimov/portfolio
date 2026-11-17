"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X, User, LogOut, Shield, Bookmark, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { toggleTheme, isDark } = useTheme();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Determine active route
  const isHome = pathname === "/";
  const isProjects = pathname.startsWith("/projects");
  const isBlog = pathname.startsWith("/blog");
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors bg-[var(--bg-main)]/90 border-[var(--border-color)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className="font-bold text-lg sm:text-xl tracking-tight text-[var(--text-main)] hover:text-orange-500 transition-colors flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block animate-pulse" />
          bahodirbek.uz
        </Link>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-subtle)]">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isHome
                ? "nav-active shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Home
          </Link>
          <Link
            href="/projects"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isProjects
                ? "nav-active shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Projects
          </Link>
          <Link
            href="/blog"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              isBlog
                ? "nav-active shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            Blog
          </Link>
        </nav>

        {/* Right: Controls & Auth */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-orange-600" />
            )}
          </button>

          {/* Authentication Controls */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-sm font-medium transition-colors"
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate">{user.name}</span>
                {isAdmin && (
                  <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded font-mono font-semibold">
                    ADMIN
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                      <p className="text-xs text-[var(--text-muted)]">Signed in as</p>
                      <p className="text-sm font-medium truncate text-[var(--text-main)]">
                        {user.email}
                      </p>
                    </div>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isAdminRoute
                            ? "nav-active font-medium"
                            : "text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-orange-500" />
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      href="/blog/bookmarks"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-orange-500" />
                      Saved Bookmarks
                    </Link>

                    <Link
                      href="/blog/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <User className="w-4 h-4 text-orange-500" />
                      My Profile
                    </Link>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu & Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)]"
          >
            {isDark ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-orange-600" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isHome ? "nav-active" : "text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              Home
            </Link>
            <Link
              href="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isProjects ? "nav-active" : "text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              Projects
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isBlog ? "nav-active" : "text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              Blog
            </Link>
          </nav>

          <div className="pt-3 border-t border-[var(--border-color)]">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="px-2 py-1 text-xs text-[var(--text-muted)]">
                  Signed in as <span className="font-semibold text-[var(--text-main)]">{user.name}</span>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
                  >
                    <Shield className="w-4 h-4 text-orange-500" />
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/blog/bookmarks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
                >
                  <Bookmark className="w-4 h-4 text-orange-500" />
                  Saved Bookmarks
                </Link>
                <Link
                  href="/blog/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
                >
                  <User className="w-4 h-4 text-orange-500" />
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2 px-4 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
