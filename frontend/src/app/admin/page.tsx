"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  FolderGit2,
  MessageSquare,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Page,
  PostAdminListItem,
  ProjectAdminOut,
  CommentAdminOut,
  UserAdminOut,
} from "@/types/api";

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [postsPage, setPostsPage] = useState<Page<PostAdminListItem> | null>(null);
  const [projects, setProjects] = useState<ProjectAdminOut[]>([]);
  const [commentsPage, setCommentsPage] = useState<Page<CommentAdminOut> | null>(null);
  const [reportedComments, setReportedComments] = useState<CommentAdminOut[]>([]);
  const [usersPage, setUsersPage] = useState<Page<UserAdminOut> | null>(null);
  const [publishedPosts, setPublishedPosts] = useState(0);
  const [draftPosts, setDraftPosts] = useState(0);
  const [reportedTotal, setReportedTotal] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [postsRes, projectsRes, commentsRes, reportedRes, usersRes, publishedRes, draftRes] = await Promise.allSettled([
          api.get<Page<PostAdminListItem>>("/api/v1/admin/blog_posts/?page=1&size=10"),
          api.get<ProjectAdminOut[]>("/api/v1/admin/projects/"),
          api.get<Page<CommentAdminOut>>("/api/v1/admin/comments/?page=1&size=5"),
          api.get<Page<CommentAdminOut>>("/api/v1/admin/comments/?complained=true&page=1&size=10"),
          api.get<Page<UserAdminOut>>("/api/v1/admin/users/?page=1&size=5"),
          // Soni barcha postlar bo'yicha (faqat birinchi sahifa emas): backend `total` qaytaradi.
          api.get<Page<PostAdminListItem>>("/api/v1/admin/blog_posts/?status=published&page=1&size=1"),
          api.get<Page<PostAdminListItem>>("/api/v1/admin/blog_posts/?status=draft&page=1&size=1"),
        ]);

        if (postsRes.status === "fulfilled") setPostsPage(postsRes.value);
        if (projectsRes.status === "fulfilled") setProjects(projectsRes.value);
        if (commentsRes.status === "fulfilled") setCommentsPage(commentsRes.value);
        if (reportedRes.status === "fulfilled") {
          setReportedComments(reportedRes.value.items || []);
          setReportedTotal(reportedRes.value.total);
        }
        if (publishedRes.status === "fulfilled") setPublishedPosts(publishedRes.value.total);
        if (draftRes.status === "fulfilled") setDraftPosts(draftRes.value.total);
        if (usersRes.status === "fulfilled") setUsersPage(usersRes.value);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute post counts
  const totalPosts = postsPage?.total || 0;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            System Overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Blog Post
          </Link>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-orange-500" />
            New Project
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Blog Posts */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
            <span>Blog Articles</span>
            <BookOpen className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-main)]">
            {loading ? "..." : totalPosts}
          </div>
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <span className="text-green-500 font-medium">● {publishedPosts} published</span>
            <span className="text-amber-500 font-medium">○ {draftPosts} drafts</span>
          </div>
        </div>

        {/* Total Projects */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
            <span>Portfolio Projects</span>
            <FolderGit2 className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-main)]">
            {loading ? "..." : projects.length}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            <span>{projects.filter((p) => p.show_home).length} showcased on home page</span>
          </div>
        </div>

        {/* Comments & Complaints */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
            <span>Comments</span>
            <MessageSquare className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-main)]">
            {loading ? "..." : commentsPage?.total || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            {reportedComments.length > 0 ? (
              <span className="text-red-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {reportedTotal} reported
              </span>
            ) : (
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Clean queue
              </span>
            )}
          </div>
        </div>

        {/* Registered Users */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
            <span>Registered Users</span>
            <Users className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-main)]">
            {loading ? "..." : usersPage?.total || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            <span>Community members registered</span>
          </div>
        </div>
      </div>

      {/* Reported Comments Alert (If any) */}
      {reportedComments.length > 0 && (
        <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Pending Comment Reports ({reportedTotal})</span>
            </div>
            <Link
              href="/admin/comments"
              className="text-xs font-semibold text-red-500 hover:underline flex items-center gap-1"
            >
              Open Moderation Queue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Community members have flagged comments for review. In accordance with platform policy, 3
            reports automatically remove a comment.
          </p>
        </div>
      )}

      {/* Two-Column Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Posts */}
        <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              Recent Blog Posts
            </h2>
            <Link
              href="/admin/blog"
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              Manage all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading posts...</div>
          ) : postsPage && postsPage.items.length > 0 ? (
            <div className="space-y-3">
              {postsPage.items.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-[var(--text-main)] truncate">{post.title}</div>
                    <div className="text-[var(--text-muted)] flex items-center gap-2">
                      <span>slug: {post.slug}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      post.status === "published"
                        ? "bg-green-500/15 text-green-500 border border-green-500/30"
                        : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
              No blog posts created yet.
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-orange-500" />
              Active Projects
            </h2>
            <Link
              href="/admin/projects"
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              Manage all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">Loading projects...</div>
          ) : projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="font-semibold text-[var(--text-main)] truncate">{project.title}</div>
                    <div className="text-[var(--text-muted)] truncate">
                      {project.skills?.map((s) => `#${s.name}`).join(" ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.show_home && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/15 text-orange-500 border border-orange-500/30">
                        Home
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        project.is_active
                          ? "bg-green-500/15 text-green-500"
                          : "bg-zinc-500/15 text-zinc-500"
                      }`}
                    >
                      {project.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
              No projects added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
