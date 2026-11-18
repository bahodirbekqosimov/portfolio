"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Ban,
  CheckCircle,
  AlertCircle,
  X,
  Search,
  Calendar,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { Page, UserAdminOut } from "@/types/api";
import { confirmDialog, notify } from "@/lib/dialog";

export default function AdminUsersPage() {
  const [usersPage, setUsersPage] = useState<Page<UserAdminOut> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Ban Modal State
  const [banTargetUser, setBanTargetUser] = useState<UserAdminOut | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteComments, setDeleteComments] = useState(true);
  const [banSubmitting, setBanSubmitting] = useState(false);

  const fetchUsers = async (targetPage = page, searchTerm = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("size", "20");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const data = await api.get<Page<UserAdminOut>>(`/api/v1/admin/users/?${params.toString()}`);
      setUsersPage(data);
      setPage(data.page);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTargetUser || !banReason.trim()) return;

    setBanSubmitting(true);
    try {
      await api.post(`/api/v1/admin/users/${banTargetUser.id}/ban/`, {
        reason: banReason.trim(),
        delete_comments: deleteComments,
      });
      setBanTargetUser(null);
      setBanReason("");
      await fetchUsers(page);
    } catch (err: any) {
      notify(err.message || "Failed to ban user");
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleUnbanUser = async (user: UserAdminOut) => {
    if (!(await confirmDialog(`Are you sure you want to unban ${user.name} (${user.email})?`, { title: "Unban user?", confirmLabel: "Unban", danger: false }))) return;
    try {
      await api.post(`/api/v1/admin/users/${user.id}/unban/`);
      await fetchUsers(page);
    } catch (err: any) {
      notify(err.message || "Failed to unban user");
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            User Directory
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            User Management & Security
          </h1>
        </div>

        <div className="text-xs text-[var(--text-muted)]">
          {search.trim() ? "Matching Users" : "Total Registered Users"}: <strong>{usersPage?.total || 0}</strong>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email address..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    Loading users...
                  </td>
                </tr>
              ) : !usersPage || usersPage.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No users found.
                  </td>
                </tr>
              ) : (
                usersPage.items.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[var(--text-main)]">{u.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)]">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500 border border-orange-500/30">
                          <Shield className="w-3 h-3" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">Member</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_banned ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-500/30">
                            <Ban className="w-3 h-3" />
                            BANNED
                          </span>
                          {u.ban_reason && (
                            <div className="text-[10px] text-red-400 mt-0.5 truncate max-w-[160px]">
                              {u.ban_reason}
                            </div>
                          )}
                        </div>
                      ) : !u.is_verified ? (
                        <span className="text-amber-500 text-xs">Unverified</span>
                      ) : (
                        <span className="text-green-500 text-xs font-medium">Active</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--text-muted)]">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.is_admin ? (
                        <span className="text-[10px] text-[var(--text-subtle)] italic">
                          Protected
                        </span>
                      ) : u.is_banned ? (
                        <button
                          onClick={() => handleUnbanUser(u)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-green-500 hover:bg-green-500/10 border border-green-500/30"
                        >
                          Unban User
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setBanTargetUser(u);
                            setBanReason("");
                            setDeleteComments(true);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30"
                        >
                          Ban User
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ban User Dialog */}
      {banTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-500" />
                Ban User: {banTargetUser.name}
              </h2>
              <button
                onClick={() => setBanTargetUser(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBanUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Ban Reason *
                </label>
                <textarea
                  required
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="e.g. Repeated violation of community guidelines / spam..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={deleteComments}
                  onChange={(e) => setDeleteComments(e.target.checked)}
                  className="rounded border-[var(--border-color)] text-red-600 focus:ring-red-500"
                />
                Delete all comments and replies written by this user
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setBanTargetUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={banSubmitting || !banReason.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {banSubmitting ? "Banning..." : "Confirm Ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
