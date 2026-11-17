"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  UserCircle,
  Upload,
  RefreshCw,
  Trash2,
  Save,
  Plus,
  FileText,
  ImageIcon,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileDown,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { BioIn, BioOut, ProfileImageOut } from "@/types/api";

const BIO_MAX_LENGTH = 5000;
const HEADLINE_MAX_LENGTH = 120;
const MAX_IMAGE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const CV_SOURCES = [
  { section: "Name", from: "Your account name (Blog → Profile)", href: "/blog/profile" },
  { section: "Headline & Profile", from: "Headline and Bio on this page", href: "/admin/profile" },
  { section: "Contacts", from: "Portfolio & Resume → Contacts", href: "/admin/resume" },
  { section: "Experience", from: "Portfolio & Resume → Experience", href: "/admin/resume" },
  { section: "Projects", from: "Only projects with “Showcase on Home Page”", href: "/admin/projects" },
  { section: "Technical Skills", from: "Only skills shown on the home page", href: "/admin/resume" },
];

type Notice = { kind: "success" | "error"; text: string } | null;

async function loadOrNull<T>(endpoint: string): Promise<T | null> {
  try {
    return await api.get<T>(endpoint);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [image, setImage] = useState<ProfileImageOut | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageNotice, setImageNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState<BioOut | null>(null);
  const [bioDraft, setBioDraft] = useState("");
  const [headlineDraft, setHeadlineDraft] = useState("");
  const [bioBusy, setBioBusy] = useState(false);
  const [bioNotice, setBioNotice] = useState<Notice>(null);

  const loadData = async () => {
    try {
      const [imageData, bioData] = await Promise.all([
        loadOrNull<ProfileImageOut>("/api/v1/admin/profile/image/"),
        loadOrNull<BioOut>("/api/v1/admin/bio/"),
      ]);
      setImage(imageData);
      setBio(bioData);
      setBioDraft(bioData?.content ?? "");
      setHeadlineDraft(bioData?.headline ?? "");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    await loadData();
  };

  useEffect(() => {
    // Initial state is already "loading"; the loader only sets state after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // ---------- Profile image ----------
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageNotice({ kind: "error", text: "Only JPEG, PNG, WEBP or GIF images are allowed." });
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageNotice({ kind: "error", text: `Image must be smaller than ${MAX_IMAGE_MB} MB.` });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setImageBusy(true);
    setImageNotice(null);
    try {
      const saved = image
        ? await api.put<ProfileImageOut>("/api/v1/admin/profile/image/", formData)
        : await api.post<ProfileImageOut>("/api/v1/admin/profile/image/", formData);
      setImage(saved);
      setImageNotice({ kind: "success", text: image ? "Profile image replaced." : "Profile image uploaded." });
    } catch (err) {
      // Another tab may have created or removed the image in the meantime: resync.
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) await fetchAll();
      setImageNotice({ kind: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setImageBusy(false);
    }
  };

  const deleteImage = async () => {
    if (!confirm("Delete the profile image? It will be removed from the public website.")) return;
    setImageBusy(true);
    setImageNotice(null);
    try {
      await api.delete("/api/v1/admin/profile/image/");
      setImage(null);
      setImageNotice({ kind: "success", text: "Profile image deleted." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setImage(null);
      }
      setImageNotice({ kind: "error", text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setImageBusy(false);
    }
  };

  // ---------- Bio ----------
  const trimmedDraft = bioDraft.trim();
  const trimmedHeadline = headlineDraft.trim();
  const bioUnchanged =
    bio !== null && trimmedDraft === bio.content && trimmedHeadline === (bio.headline ?? "");
  const bioInvalid = trimmedDraft.length === 0 || trimmedDraft.length > BIO_MAX_LENGTH;

  const saveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bioInvalid) return;
    setBioBusy(true);
    setBioNotice(null);
    try {
      const payload: BioIn = { content: trimmedDraft, headline: trimmedHeadline || null };
      const saved = bio
        ? await api.patch<BioOut>("/api/v1/admin/bio/", payload)
        : await api.post<BioOut>("/api/v1/admin/bio/", payload);
      setBio(saved);
      setBioDraft(saved.content);
      setHeadlineDraft(saved.headline ?? "");
      setBioNotice({ kind: "success", text: bio ? "Bio updated." : "Bio created." });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        const fresh = await loadOrNull<BioOut>("/api/v1/admin/bio/").catch(() => null);
        setBio(fresh);
      }
      setBioNotice({ kind: "error", text: err instanceof Error ? err.message : "Failed to save bio." });
    } finally {
      setBioBusy(false);
    }
  };

  const deleteBio = async () => {
    if (!confirm("Delete the bio? It will be removed from the public website.")) return;
    setBioBusy(true);
    setBioNotice(null);
    try {
      await api.delete("/api/v1/admin/bio/");
      setBio(null);
      setBioDraft("");
      setHeadlineDraft("");
      setBioNotice({ kind: "success", text: "Bio deleted. You can create a new one at any time." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBio(null);
      }
      setBioNotice({ kind: "error", text: err instanceof Error ? err.message : "Failed to delete bio." });
    } finally {
      setBioBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <UserCircle className="w-3.5 h-3.5" />
            Home Page Profile
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Profile Image & Bio
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            The portrait and introduction shown at the top of the public home page.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors w-fit"
        >
          <Eye className="w-3.5 h-3.5 text-orange-500" />
          View Home Page
        </Link>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-sm text-red-500 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {loadError}
          </span>
          <button onClick={fetchAll} className="text-xs font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading profile data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6">
          {/* Profile image card */}
          <section className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-orange-500" />
              Profile Image
            </h2>

            <div className="w-full max-w-[240px] mx-auto aspect-[3/4] rounded-xl overflow-hidden border-2 border-orange-500/40 bg-[var(--bg-subtle)]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-orange-500">
                  <UserCircle className="w-14 h-14 opacity-60 mb-2" />
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-70">No image</span>
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center">
              {image
                ? `Last updated ${formatTimestamp(image.updated_at)}`
                : `JPEG, PNG, WEBP or GIF, up to ${MAX_IMAGE_MB} MB. A 3:4 portrait works best.`}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleFileSelected}
            />

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={imageBusy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60 transition-colors"
              >
                {image ? <RefreshCw className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {imageBusy ? "Working..." : image ? "Replace Image" : "Upload Image"}
              </button>
              {image && (
                <button
                  type="button"
                  disabled={imageBusy}
                  onClick={deleteImage}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/40 disabled:opacity-60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Image
                </button>
              )}
            </div>

            <NoticeLine notice={imageNotice} />
          </section>

          {/* Bio card */}
          <section className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                Bio
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                  bio
                    ? "bg-green-500/15 text-green-500 border-green-500/30"
                    : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                }`}
              >
                {bio ? "Published" : "Not created"}
              </span>
            </div>

            <form onSubmit={saveBio} className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="bio-headline"
                  className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                >
                  Headline <span className="normal-case font-normal">(shown under your name and on the CV)</span>
                </label>
                <input
                  id="bio-headline"
                  type="text"
                  value={headlineDraft}
                  onChange={(e) => setHeadlineDraft(e.target.value)}
                  maxLength={HEADLINE_MAX_LENGTH}
                  placeholder="e.g. Python Backend Engineer"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                />
              </div>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                rows={10}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Write a short introduction about yourself..."
                className="w-full px-3.5 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] leading-relaxed focus:outline-none focus:border-orange-500 resize-y"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">
                  {trimmedDraft.length} / {BIO_MAX_LENGTH}
                  {bio && ` · Last updated ${formatTimestamp(bio.updated_at)}`}
                </span>
                <div className="flex items-center gap-2">
                  {bio && (
                    <button
                      type="button"
                      disabled={bioBusy}
                      onClick={deleteBio}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/40 disabled:opacity-60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={bioBusy || bioInvalid || bioUnchanged}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60 transition-colors"
                  >
                    {bio ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {bioBusy ? "Saving..." : bio ? "Save Changes" : "Create Bio"}
                  </button>
                </div>
              </div>
            </form>

            <NoticeLine notice={bioNotice} />
          </section>

          {/* CV card */}
          <section className="lg:col-span-2 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-orange-500" />
                  CV (generated automatically)
                </h2>
                <p className="text-sm text-[var(--text-muted)] max-w-2xl">
                  The CV is built from your portfolio every time someone downloads it, so it is always up to
                  date. There is nothing to upload: just keep the sections below current.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/api/v1/cv/?download=false"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <Eye className="w-4 h-4 text-orange-500" />
                  Preview
                </a>
                <a
                  href="/api/v1/cv/"
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {CV_SOURCES.map((source) => (
                <Link
                  key={source.section}
                  href={source.href}
                  className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-orange-500/40 transition-colors"
                >
                  <div className="font-semibold text-[var(--text-main)]">{source.section}</div>
                  <div className="text-[var(--text-muted)] mt-0.5">{source.from}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const isError = notice.kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`text-xs font-medium flex items-center gap-1.5 ${isError ? "text-red-500" : "text-green-500"}`}
    >
      {isError ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      {notice.text}
    </div>
  );
}
