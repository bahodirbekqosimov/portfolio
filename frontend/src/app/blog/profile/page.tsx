"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  Check,
  AlertCircle,
  LogIn,
  LogOut,
  Save,
} from "lucide-react";
import BlogSubNav from "@/components/BlogSubNav";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, isAuthenticated, loading, logout, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [updatingName, setUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Sync name when user loads
  React.useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdatingName(true);
    setNameSuccess(false);
    setNameError("");

    try {
      await api.patch("/api/v1/users/me/", { name: name.trim() });
      await refreshProfile();
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setNameError(err.message || "Failed to update profile name.");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.put("/api/v1/users/me/avatar/", formData);
      await refreshProfile();
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header & Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" />
            Account Settings
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
            Personal Profile
          </h1>
        </div>

        <BlogSubNav />
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[var(--text-muted)]">
          Loading profile...
        </div>
      ) : !isAuthenticated || !user ? (
        <div className="p-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Sign In to View Profile</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage your personal profile, update your avatar, and track your activity.
          </p>
          <div className="pt-2">
            <Link
              href="/auth/login?redirect=/blog/profile"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign In Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Avatar Card */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-500/20 bg-[var(--bg-subtle)] shadow-md">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-500/10 text-orange-500 text-4xl font-extrabold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Upload Overlay */}
              <label className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-semibold">Change</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            {uploadingAvatar && (
              <p className="text-xs text-orange-500 font-medium">Uploading avatar...</p>
            )}
            {avatarError && (
              <p className="text-xs text-red-500">{avatarError}</p>
            )}

            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">{user.name}</h2>
              <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
            </div>

            {user.is_admin && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Shield className="w-3.5 h-3.5" />
                Administrator
              </span>
            )}

            <div className="w-full pt-4 border-t border-[var(--border-color)] space-y-2 text-xs text-[var(--text-muted)] text-left">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-500" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors mt-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Right: Update Details Form */}
          <div className="md:col-span-2 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-[var(--text-main)] border-b border-[var(--border-color)] pb-3">
              Profile Information
            </h2>

            {nameSuccess && (
              <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Profile name updated successfully!</span>
              </div>
            )}

            {nameError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Email Address (Fixed)
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] cursor-not-allowed"
                />
                <span className="text-[10px] text-[var(--text-muted)]">
                  Email cannot be changed directly according to security policy.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updatingName || !name.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updatingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
