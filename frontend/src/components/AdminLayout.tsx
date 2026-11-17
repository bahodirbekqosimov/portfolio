"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FolderGit2,
  MessageSquare,
  Users,
  Briefcase,
  UserCircle,
  Smile,
  Shield,
  ArrowLeft,
  Menu,
  X,
  Lock,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/blog", label: "Blog Posts", icon: BookOpen, exact: false },
  { href: "/admin/projects", label: "Projects", icon: FolderGit2, exact: false },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare, exact: false },
  { href: "/admin/users", label: "Users & Bans", icon: Users, exact: false },
  { href: "/admin/profile", label: "Profile Image & Bio", icon: UserCircle, exact: false },
  { href: "/admin/resume", label: "Portfolio & Resume", icon: Briefcase, exact: false },
  { href: "/admin/emojis", label: "Reactions & Emojis", icon: Smile, exact: false },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Guard: Loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-muted)] font-medium">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Guard: Unauthorized or Non-Admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Access Restricted</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
              This administrative dashboard is restricted to authorized platform administrators only.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
            <Link
              href="/auth/login?redirect=/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white"
            >
              <LogIn className="w-4 h-4" />
              Sign In as Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col md:flex-row">
      {/* Mobile Sidebar Toggle Button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
          <Shield className="w-4 h-4 text-orange-500" />
          Admin CMS
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-main)]"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Logo / Header */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 font-extrabold text-base tracking-tight text-[var(--text-main)]"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div>Admin Console</div>
                <div className="text-[10px] font-mono text-orange-500">bahodirbek.uz</div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? "nav-active shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-orange-500"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Info & Return */}
        <div className="p-4 border-t border-[var(--border-color)] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public Website
          </Link>
          <div className="px-3 py-1 text-[10px] text-[var(--text-subtle)]">
            Logged in as <span className="text-[var(--text-main)] font-semibold">{user?.name}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-10 max-w-6xl">
        {children}
      </div>
    </div>
  );
}
