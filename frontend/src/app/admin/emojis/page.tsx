"use client";

import React, { useState, useEffect } from "react";
import { Smile, Plus, Trash2, Edit2, Upload, CheckCircle2, XCircle, X, Save } from "lucide-react";
import { api } from "@/lib/api";
import { EmojiAdminOut, UploadOut } from "@/types/api";

export default function AdminEmojisPage() {
  const [emojis, setEmojis] = useState<EmojiAdminOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEmojis = async () => {
    setLoading(true);
    try {
      const data = await api.get<EmojiAdminOut[]>("/api/v1/admin/emojis/");
      setEmojis(data);
    } catch (err) {
      console.error("Failed to load emojis:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmojis();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setImage("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (emoji: EmojiAdminOut) => {
    setEditingId(emoji.id);
    setName(emoji.name);
    setImage(emoji.image);
    setIsActive(emoji.is_active);
    setModalOpen(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<UploadOut>("/api/v1/admin/uploads/", formData);
      // Backend expects the path or url in image field
      setImage(res.path || res.url);
    } catch (err: any) {
      alert(err.message || "Failed to upload image icon");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !image.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim().toLowerCase(),
        image: image.trim(),
        is_active: isActive,
      };

      if (editingId) {
        await api.patch(`/api/v1/admin/emojis/${editingId}/`, payload);
      } else {
        await api.post("/api/v1/admin/emojis/", payload);
      }

      setModalOpen(false);
      await fetchEmojis();
    } catch (err: any) {
      alert(err.message || "Failed to save emoji reaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, emojiName: string) => {
    if (!confirm(`Are you sure you want to delete emoji "${emojiName}"?`)) return;
    try {
      await api.delete(`/api/v1/admin/emojis/${id}/`);
      await fetchEmojis();
    } catch (err: any) {
      alert(err.message || "Failed to delete emoji");
    }
  };

  const handleToggleActive = async (emoji: EmojiAdminOut) => {
    try {
      await api.patch(`/api/v1/admin/emojis/${emoji.id}/`, {
        is_active: !emoji.is_active,
      });
      await fetchEmojis();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  return (
    <div className="space-y-8">
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
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Reaction Emoji
        </button>
      </div>

      {/* Grid of Emojis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-[var(--text-muted)]">
            Loading reactions...
          </div>
        ) : emojis.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
            No reactions created yet. Click &quot;Add Reaction Emoji&quot; to configure community reactions.
          </div>
        ) : (
          emojis.map((emoji) => (
            <div
              key={emoji.id}
              className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={emoji.image}
                    alt={emoji.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <button
                  onClick={() => handleToggleActive(emoji)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                    emoji.is_active
                      ? "bg-green-500/15 border-green-500/30 text-green-500"
                      : "bg-zinc-500/15 border-zinc-500/30 text-zinc-500"
                  }`}
                  title="Toggle visibility"
                >
                  {emoji.is_active ? "Active" : "Hidden"}
                </button>
              </div>

              <div>
                <h3 className="font-bold text-base text-[var(--text-main)] capitalize">
                  {emoji.name}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">
                  {emoji.image}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  onClick={() => openEditModal(emoji)}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(emoji.id, emoji.name)}
                  className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Emoji"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
