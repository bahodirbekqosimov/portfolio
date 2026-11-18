"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckSquare,
  Edit2,
  Plus,
  Repeat,
  Save,
  Search,
  Smile,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { EmojiAdminOut, UploadOut } from "@/types/api";

type Confirmation = { ids: number[]; title: string } | null;

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function AdminEmojisPage() {
  const [emojis, setEmojis] = useState<EmojiAdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Search and selection
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [deleting, setDeleting] = useState(false);

  // Create / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchEmojis = async () => {
    try {
      const data = await api.get<EmojiAdminOut[]>("/api/v1/admin/emojis/");
      setEmojis(data);
      // Drop selections that no longer exist
      setSelected((prev) => new Set(data.filter((e) => prev.has(e.id)).map((e) => e.id)));
    } catch (err) {
      setError(errorText(err, "Failed to load emojis."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial state is already "loading"; the loader only sets state after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmojis();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? emojis.filter((e) => e.name.toLowerCase().includes(q)) : emojis;
  }, [emojis, query]);

  const visibleSelected = visible.filter((e) => selected.has(e.id)).length;

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectVisible = () =>
    setSelected((prev) => new Set([...prev, ...visible.map((e) => e.id)]));

  const clearVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((e) => next.delete(e.id));
      return next;
    });

  const invertVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((e) => (next.has(e.id) ? next.delete(e.id) : next.add(e.id)));
      return next;
    });

  const askDeleteSelected = () => {
    if (selected.size === 0) return;
    setConfirmation({
      ids: [...selected],
      title: `Delete ${selected.size} selected emoji${selected.size === 1 ? "" : "s"}?`,
    });
  };

  const runDelete = async () => {
    if (!confirmation) return;
    setDeleting(true);
    setError("");
    try {
      const res = await api.post<{ deleted: number }>("/api/v1/admin/emojis/bulk_delete/", {
        ids: confirmation.ids,
      });
      setNotice(`Deleted ${res.deleted} emoji${res.deleted === 1 ? "" : "s"}.`);
      setConfirmation(null);
      setModalOpen(false);
      await fetchEmojis();
    } catch (err) {
      setError(errorText(err, "Failed to delete emojis."));
      setConfirmation(null);
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setImage("");
    setIsActive(true);
    setModalError("");
    setModalOpen(true);
  };

  const openEditModal = (emoji: EmojiAdminOut) => {
    setEditingId(emoji.id);
    setName(emoji.name);
    setImage(emoji.image);
    setIsActive(emoji.is_active);
    setModalError("");
    setModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setModalError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<UploadOut>("/api/v1/admin/uploads/", formData);
      setImage(res.path || res.url);
    } catch (err) {
      setModalError(errorText(err, "Failed to upload image."));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !image.trim()) return;
    setSubmitting(true);
    setModalError("");
    try {
      const payload = { name: name.trim().toLowerCase(), image: image.trim(), is_active: isActive };
      if (editingId) await api.patch(`/api/v1/admin/emojis/${editingId}/`, payload);
      else await api.post("/api/v1/admin/emojis/", payload);
      setModalOpen(false);
      await fetchEmojis();
    } catch (err) {
      setModalError(errorText(err, "Failed to save emoji."));
    } finally {
      setSubmitting(false);
    }
  };

  const toolbarButton =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-main)] hover:border-orange-500/60 disabled:opacity-40 disabled:pointer-events-none transition-colors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <Smile className="w-3.5 h-3.5" />
            Article Reactions
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Reactions & Emojis
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {emojis.length} emojis · {emojis.filter((e) => e.is_active).length} active. Click
            emojis to select them, then delete the selection in one go.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Reaction Emoji
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-500">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-green-500/40 bg-green-500/10 text-xs text-green-500">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar: sticky so bulk actions stay reachable while scrolling */}
      <div className="sticky top-16 z-20 -mx-1 px-1 py-3 bg-[var(--bg-main)] border-b border-[var(--border-color)] space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emojis (e.g. face, cat, flag, heart)…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={selectVisible} disabled={visible.length === 0} className={toolbarButton}>
            <CheckSquare className="w-3.5 h-3.5" />
            Select {query ? "results" : "all"} ({visible.length})
          </button>
          <button onClick={invertVisible} disabled={visible.length === 0} className={toolbarButton}>
            <Repeat className="w-3.5 h-3.5" />
            Invert
          </button>
          <button onClick={clearVisible} disabled={visibleSelected === 0} className={toolbarButton}>
            <Square className="w-3.5 h-3.5" />
            Clear
          </button>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {selected.size} selected
          </span>
          <button
            onClick={askDeleteSelected}
            disabled={selected.size === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete selected
          </button>
        </div>
      </div>

      {/* Compact emoji grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading reactions...</div>
      ) : emojis.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
          No reactions created yet. Click &quot;Add Reaction Emoji&quot; to configure community reactions.
        </div>
      ) : visible.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">
          No emojis match &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
          {visible.map((emoji) => {
            const isSelected = selected.has(emoji.id);
            return (
              <div
                key={emoji.id}
                className={`group relative rounded-xl border transition-colors ${
                  isSelected
                    ? "border-red-500 bg-red-500/10"
                    : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/50"
                } ${emoji.is_active ? "" : "opacity-50"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleOne(emoji.id)}
                  aria-pressed={isSelected}
                  title={emoji.name}
                  className="w-full flex flex-col items-center gap-1.5 px-1.5 pt-3 pb-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={emoji.image}
                    alt={emoji.name}
                    loading="lazy"
                    className="w-9 h-9 object-contain"
                  />
                  <span className="w-full text-[10px] leading-tight text-[var(--text-muted)] capitalize line-clamp-2 text-center">
                    {emoji.name}
                  </span>
                  {!emoji.is_active && (
                    <span className="text-[9px] font-semibold uppercase text-zinc-500">Hidden</span>
                  )}
                </button>
                <span
                  className={`pointer-events-none absolute top-1.5 left-1.5 w-4 h-4 rounded-md border flex items-center justify-center ${
                    isSelected ? "bg-red-600 border-red-600 text-white" : "border-[var(--border-color)] bg-[var(--bg-subtle)]"
                  }`}
                >
                  {isSelected && <X className="w-3 h-3" />}
                </span>
                <button
                  type="button"
                  onClick={() => openEditModal(emoji)}
                  className="absolute top-1 right-1 p-1 rounded-md text-[var(--text-muted)] hover:text-orange-500 opacity-60 group-hover:opacity-100"
                  title="Edit"
                  aria-label={`Edit ${emoji.name}`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* In-page confirmation (browser dialogs can be blocked) */}
      {confirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-500/15 text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[var(--text-main)]">{confirmation.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Reactions visitors gave with these emojis are removed too. This cannot be undone.
                  To keep reactions, hide an emoji instead (Edit → uncheck Active).
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmation(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
              >
                Cancel
              </button>
              <button
                onClick={runDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Emoji */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingId ? "Edit Reaction Emoji" : "New Reaction Emoji"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalError && (
                <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-xs text-red-500">
                  {modalError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Reaction Name (e.g. love, celebrate, rocket, mindblown) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="love"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Emoji Icon Image *
                </label>
                <div className="space-y-2">
                  {image && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.startsWith("http") || image.startsWith("/") ? image : `/media/${image}`} alt="" className="w-12 h-12 object-contain" />
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Upload image or provide path"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <label className="w-full inline-flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-orange-500 cursor-pointer text-[var(--text-main)]">
                    <Upload className="w-3.5 h-3.5 text-orange-500" />
                    {uploadingImage ? "Uploading..." : "Upload PNG/SVG Icon"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                Active (Available for visitors to react)
              </label>

              <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-color)]">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => setConfirmation({ ids: [editingId], title: `Delete "${name}"?` })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/40 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !name.trim() || !image.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {submitting ? "Saving..." : "Save Emoji"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
