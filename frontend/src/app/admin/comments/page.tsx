"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  AlertTriangle,
  Trash2,
  RotateCcw,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { Page, CommentAdminOut } from "@/types/api";
import { confirmDialog, notify } from "@/lib/dialog";

export default function AdminCommentsPage() {
  const [commentsPage, setCommentsPage] = useState<Page<CommentAdminOut> | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterComplained, setFilterComplained] = useState(false);
  const [filterDeleted, setFilterDeleted] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchComments = async (targetPage = page, complained = filterComplained) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("size", "20");
      if (complained) params.set("complained", "true");
      if (filterDeleted !== null) params.set("is_deleted", filterDeleted.toString());
      if (search.trim()) params.set("search", search.trim());

      const data = await api.get<Page<CommentAdminOut>>(
        `/api/v1/admin/comments/?${params.toString()}`
      );
      setCommentsPage(data);
      setPage(data.page);
    } catch (err) {
      console.error("Failed to fetch admin comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(1, filterComplained);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterComplained, filterDeleted]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComments(1, filterComplained);
  };

  // Restore comment
  const handleRestore = async (commentId: number) => {
    try {
      await api.post(`/api/v1/admin/comments/${commentId}/restore/`);
      await fetchComments(page, filterComplained);
    } catch (err: any) {
      notify(err.message || "Failed to restore comment");
    }
  };

  // Delete comment
  const handleDelete = async (commentId: number) => {
    if (!(await confirmDialog("Are you sure you want to delete this comment?"))) return;
    try {
      await api.delete(`/api/v1/comments/${commentId}/`);
      await fetchComments(page, filterComplained);
    } catch (err: any) {
      notify(err.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            Community Moderation
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Comment Management
          </h1>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterComplained(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              !filterComplained
                ? "nav-active shadow-sm"
                : "border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            All Comments
          </button>
          <button
            onClick={() => setFilterComplained(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterComplained
                ? "bg-red-600 text-white shadow-sm"
                : "border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Reported Only
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comment text or author..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterDeleted === null ? "" : filterDeleted ? "true" : "false"}
            onChange={(e) => {
              const val = e.target.value;
              setFilterDeleted(val === "" ? null : val === "true");
            }}
            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
          >
            <option value="">All Statuses</option>
            <option value="false">Active Only</option>
            <option value="true">Deleted Only</option>
          </select>
        </div>
      </div>

      {/* Comments Table */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Comment Text</th>
                <th className="py-3 px-4">Post Slug</th>
                <th className="py-3 px-4">Complaints</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    Loading comments...
                  </td>
                </tr>
              ) : !commentsPage || commentsPage.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No comments found.
                  </td>
                </tr>
              ) : (
                commentsPage.items.map((comment) => (
                  <tr key={comment.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text-main)]">{comment.user_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">ID: #{comment.user_id}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div
                        className={`leading-relaxed line-clamp-2 ${
                          comment.is_deleted
                            ? "italic text-[var(--text-muted)] line-through"
                            : "text-[var(--text-main)]"
                        }`}
                      >
                        {comment.text || "[No content]"}
                      </div>
                      {comment.deleted_reason && (
                        <div className="text-[10px] text-red-500 font-medium">
                          Reason: {comment.deleted_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/blog/${comment.post_slug}`}
                        target="_blank"
                        className="font-mono text-xs text-orange-500 hover:underline flex items-center gap-1"
                      >
                        {comment.post_slug}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      {comment.complaints_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          {comment.complaints_count}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          comment.is_deleted
                            ? "bg-red-500/15 text-red-500 border border-red-500/30"
                            : "bg-green-500/15 text-green-500 border border-green-500/30"
                        }`}
                      >
                        {comment.is_deleted ? "Deleted" : "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)] text-xs whitespace-nowrap">
                      {formatDate(comment.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {comment.is_deleted ? (
                          <button
                            onClick={() => handleRestore(comment.id)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-green-500 hover:bg-green-500/10"
                            title="Restore comment"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-red-500 hover:bg-red-500/10"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
