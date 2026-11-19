"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Type,
  Upload,
  Tag as TagIcon,
  X,
  Save,
  Check,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  Page,
  PostAdminListItem,
  PostAdminOut,
  TagOut,
  PostBlockIn,
  PostBlockOut,
  MediaOut,
  MediaKind,
} from "@/types/api";
import { confirmDialog, notify } from "@/lib/dialog";
import { BlogMediaBlock, formatBytes } from "@/components/BlogMediaBlock";
import { EmojiInput, EmojiPickerButton, EmojiText, type EmojiInputHandle } from "@/components/EmojiText";

/** A paragraph block: the text, plus a smiley button that puts a site emoji (:code:) at the cursor. */
function TextBlockField({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const field = useRef<EmojiInputHandle>(null);
  return (
    <div className="space-y-1">
      <EmojiInput
        ref={field}
        value={value}
        onChange={onChange}
        placeholder="Write paragraph text or formatted content..."
        rows={4}
        className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <EmojiPickerButton target={field} />
        <span>Insert emoji</span>
      </div>
    </div>
  );
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostAdminListItem[]>([]);
  const [tags, setTags] = useState<TagOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newStatus, setNewStatus] = useState<"draft" | "published">("draft");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Post Editor Modal State
  const [editingPost, setEditingPost] = useState<PostAdminOut | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "published">("draft");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNewTagInput, setEditNewTagInput] = useState("");
  const [editBlocks, setEditBlocks] = useState<
    Array<
      | { id: string; type: "text"; text: string }
      | { id: string; type: "image"; kind: MediaKind; media_id: number; url?: string; alt_text?: string | null; name?: string | null; size?: number | null }
    >
  >([]);
  const [savingPost, setSavingPost] = useState(false);
  const [editorTab, setEditorTab] = useState<"editor" | "preview">("editor");

  // Media Upload inside Editor
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaAltText, setMediaAltText] = useState("");

  // Tags Manager State
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  const fetchPosts = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await api.get<Page<PostAdminListItem>>(
        `/api/v1/admin/blog_posts/?page=${targetPage}&size=20`
      );
      setPosts(data.items);
      setTotalPages(data.pages);
      setPage(data.page);
    } catch (err) {
      console.error("Failed to load admin posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const data = await api.get<TagOut[]>("/api/v1/tags/");
      setTags(data);
    } catch (err) {
      console.error("Failed to load tags:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick toggle status (publish / unpublish)
  const handleToggleStatus = async (post: PostAdminListItem) => {
    const nextStatus = post.status === "published" ? "draft" : "published";
    try {
      await api.patch(`/api/v1/admin/blog_posts/${post.id}/`, {
        status: nextStatus,
      });
      await fetchPosts(page);
    } catch (err: any) {
      notify(err.message || "Failed to update status");
    }
  };

  // Delete post
  const handleDeletePost = async (postId: number, title: string) => {
    if (!(await confirmDialog(`Are you sure you want to delete post "${title}"? This cannot be undone.`))) return;
    try {
      await api.delete(`/api/v1/admin/blog_posts/${postId}/`);
      await fetchPosts(page);
    } catch (err: any) {
      notify(err.message || "Failed to delete post");
    }
  };

  // Create new post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreateSubmitting(true);
    try {
      const tagList = newTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const created = await api.post<PostAdminOut>("/api/v1/admin/blog_posts/", {
        title: newTitle.trim(),
        tags: tagList,
        status: newStatus,
        content: [],
      });

      setShowCreateModal(false);
      setNewTitle("");
      setNewTags("");
      setNewStatus("draft");
      await fetchPosts(1);

      // Open editor immediately for the created post
      openEditor(created.id);
    } catch (err: any) {
      notify(err.message || "Failed to create blog post");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open full post editor
  const openEditor = async (postId: number) => {
    try {
      const post = await api.get<PostAdminOut>(`/api/v1/admin/blog_posts/${postId}/`);
      setEditingPost(post);
      setEditTitle(post.title);
      setEditSlug(post.slug);
      setEditStatus(post.status);
      setEditTags(post.tags?.map((t) => t.name) || []);

      // Convert content blocks into editable items with unique IDs
      const mediaMap = new Map<number, MediaOut>();
      post.media?.forEach((m) => mediaMap.set(m.id, m));

      const blocksWithId = (post.content || []).map((b, idx) => {
        if (b.type !== "text") {
          const media = mediaMap.get(b.media_id);
          return {
            id: `b-${idx}-${Date.now()}`,
            type: "image" as const,
            kind: b.type,
            media_id: b.media_id,
            url: b.url || media?.url,
            alt_text: b.alt_text || media?.alt_text,
            name: b.name ?? media?.name,
            size: b.size ?? media?.size,
          };
        }
        return {
          id: `b-${idx}-${Date.now()}`,
          type: "text" as const,
          text: b.text,
        };
      });

      setEditBlocks(blocksWithId);
      setEditorTab("editor");
    } catch (err: any) {
      notify(err.message || "Failed to fetch post details");
    }
  };

  // Block Manipulation
  const handleAddTextBlock = () => {
    setEditBlocks([
      ...editBlocks,
      {
        id: `b-new-${Date.now()}`,
        type: "text",
        text: "",
      },
    ]);
  };

  const handleUploadImageBlock = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mediaAltText.trim()) {
        formData.append("alt_text", mediaAltText.trim());
      }

      const media = await api.post<MediaOut>(
        `/api/v1/admin/blog_posts/${editingPost.id}/media/`,
        formData
      );

      setEditBlocks([
        ...editBlocks,
        {
          id: `b-img-${media.id}-${Date.now()}`,
          type: "image",
          kind: media.kind ?? "image",
          media_id: media.id,
          url: media.url,
          alt_text: media.alt_text,
          name: media.name,
          size: media.size,
        },
      ]);

      setMediaAltText("");
    } catch (err: any) {
      notify(err.message || "Failed to upload the file");
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editBlocks.length) return;

    const copy = [...editBlocks];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setEditBlocks(copy);
  };

  const handleDeleteBlock = (index: number) => {
    const copy = [...editBlocks];
    copy.splice(index, 1);
    setEditBlocks(copy);
  };

  const handleUpdateTextBlock = (index: number, text: string) => {
    const copy = [...editBlocks];
    if (copy[index].type === "text") {
      (copy[index] as any).text = text;
      setEditBlocks(copy);
    }
  };

  // Save post changes
  const handleSavePost = async () => {
    if (!editingPost) return;
    setSavingPost(true);
    try {
      // Map blocks back to API contract
      const contentPayload: PostBlockIn[] = editBlocks.map((b) => {
        if (b.type === "image") {
          return { type: b.kind, media_id: b.media_id };
        }
        return { type: "text", text: b.text };
      });

      await api.patch(`/api/v1/admin/blog_posts/${editingPost.id}/`, {
        title: editTitle.trim(),
        slug: editSlug.trim() || undefined,
        status: editStatus,
        tags: editTags,
        content: contentPayload,
      });

      notify("Post saved successfully.", "success");
      setEditingPost(null);
      await fetchPosts(page);
    } catch (err: any) {
      notify(err.message || "Failed to save post");
    } finally {
      setSavingPost(false);
    }
  };

  // Manage Tags
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      await api.post("/api/v1/admin/tags/", { name: newTagName.trim().toLowerCase() });
      setNewTagName("");
      await fetchTags();
    } catch (err: any) {
      notify(err.message || "Failed to add tag");
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: number, tagName: string) => {
    if (!(await confirmDialog(`Delete tag #${tagName}?`))) return;
    try {
      await api.delete(`/api/v1/admin/tags/${tagId}/`);
      await fetchTags();
    } catch (err: any) {
      notify(err.message || "Failed to delete tag");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Content Management
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Blog Posts CMS
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTagsManager(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
          >
            <TagIcon className="w-3.5 h-3.5 text-orange-500" />
            Tags ({tags.length})
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Posts Table */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Title & Slug</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                    Loading posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                    No blog posts yet. Click &quot;New Post&quot; to write your first article.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text-main)]">{post.title}</div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)]">
                        /{post.slug}/
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(post)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          post.status === "published"
                            ? "bg-green-500/15 border-green-500/30 text-green-500 hover:bg-green-500/25"
                            : "bg-amber-500/15 border-amber-500/30 text-amber-500 hover:bg-amber-500/25"
                        }`}
                        title="Click to toggle status"
                      >
                        {post.status === "published" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {post.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)]">
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {post.status === "published" && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--bg-subtle)]"
                            title="View public page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => openEditor(post.id)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--bg-subtle)]"
                          title="Edit content and blocks"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id, post.title)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create New Post */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Create New Blog Post</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Post Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Asynchronous Programming in Python with asyncio"
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="python, fastapi, backend"
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="draft">Draft (Private, not indexable)</option>
                  <option value="published">Published (Public)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting || !newTitle.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {createSubmitting ? "Creating..." : "Create & Edit Content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tags Manager */}
      {showTagsManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-orange-500" />
                Manage Tags
              </h2>
              <button
                onClick={() => setShowTagsManager(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                required
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name (e.g. redis)"
                className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={creatingTag || !newTagName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {creatingTag ? "Adding..." : "Add"}
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {tags.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)] text-xs"
                >
                  <span className="font-medium text-[var(--text-main)]">#{t.name}</span>
                  <button
                    onClick={() => handleDeleteTag(t.id, t.name)}
                    className="p-1 text-[var(--text-muted)] hover:text-red-500"
                    title="Delete tag"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Full Post Editor & Content Blocks Builder */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[var(--border-color)] flex items-center justify-between gap-4 bg-[var(--bg-subtle)]">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">
                  Edit Post: {editingPost.title}
                </h2>
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  Slug: /{editSlug || editingPost.slug}/
                </div>
              </div>

              {/* Tabs & Close */}
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] flex">
                  <button
                    onClick={() => setEditorTab("editor")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      editorTab === "editor" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setEditorTab("preview")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      editorTab === "preview" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <button
                  onClick={() => setEditingPost(null)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {editorTab === "editor" ? (
                <div className="space-y-6">
                  {/* Meta inputs: Title, Slug, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="draft">Draft (Unpublished)</option>
                        <option value="published">Published (Public)</option>
                      </select>
                    </div>
                  </div>

                  {/* Slug & Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Custom Slug (Optional)
                      </label>
                      <input
                        type="text"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        placeholder="my-custom-slug"
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Tags ({editTags.length})
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] min-h-[42px] items-center">
                        {editTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/15 text-orange-500 text-xs font-medium"
                          >
                            #{tag}
                            <button
                              onClick={() => setEditTags(editTags.filter((t) => t !== tag))}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={editNewTagInput}
                          onChange={(e) => setEditNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editNewTagInput.trim()) {
                              e.preventDefault();
                              const formatted = editNewTagInput.trim().toLowerCase();
                              if (!editTags.includes(formatted)) {
                                setEditTags([...editTags, formatted]);
                              }
                              setEditNewTagInput("");
                            }
                          }}
                          placeholder="+ tag and press enter"
                          className="flex-1 min-w-[120px] bg-transparent text-xs text-[var(--text-main)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Content Blocks Builder Section */}
                  <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
                          Ordered Content Blocks ({editBlocks.length})
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Pictures, video, music or any file (up to 100 MB). Consecutive pictures are
                          grouped side-by-side automatically.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddTextBlock}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
                        >
                          <Type className="w-3.5 h-3.5 text-orange-500" />
                          Add Text Block
                        </button>

                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-sm">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {uploadingMedia ? "Uploading..." : "Upload File Block"}
                          <input
                            type="file"
                            onChange={handleUploadImageBlock}
                            disabled={uploadingMedia}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Blocks List */}
                    <div className="space-y-3">
                      {editBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
                              {block.type === "text" ? (
                                <Type className="w-3.5 h-3.5" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5" />
                              )}
                              Block #{index + 1} — {(block.type === "text" ? "text" : block.kind).toUpperCase()}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveBlock(index, "up")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-orange-500 disabled:opacity-30"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === editBlocks.length - 1}
                                onClick={() => handleMoveBlock(index, "down")}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-orange-500 disabled:opacity-30"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(index)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-red-500"
                                title="Delete Block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {block.type === "text" ? (
                            <TextBlockField value={block.text} onChange={(text) => handleUpdateTextBlock(index, text)} />
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              {block.url && block.kind === "image" && (
                                <div className="w-24 h-24 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)] flex-shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={block.url}
                                    alt={block.alt_text || "Uploaded image"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              {block.url && block.kind === "video" && (
                                <video src={block.url} controls preload="metadata" className="w-40 max-h-28 rounded-lg bg-black flex-shrink-0" />
                              )}
                              {block.url && block.kind === "audio" && (
                                <audio src={block.url} controls preload="metadata" className="w-60 flex-shrink-0" />
                              )}
                              <div className="flex-1 text-xs space-y-1 min-w-0">
                                <p className="font-mono text-[var(--text-muted)]">
                                  Media ID: {block.media_id}
                                  {block.size ? ` · ${formatBytes(block.size)}` : ""}
                                </p>
                                {block.name && <p className="text-[var(--text-main)] font-semibold truncate">{block.name}</p>}
                                <p className="text-[var(--text-main)] truncate">
                                  URL: {block.url}
                                </p>
                                <p className="text-[var(--text-subtle)]">
                                  Alt text: {block.alt_text || "None provided"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {editBlocks.length === 0 && (
                        <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl text-xs text-[var(--text-muted)]">
                          No content blocks added yet. Click &quot;Add Text Block&quot; or &quot;Upload File Block&quot;
                          to build this article.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview Tab */
                <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-6">
                  <div className="space-y-2 border-b border-[var(--border-color)] pb-4">
                    <span className="text-xs uppercase font-semibold text-orange-500 tracking-wider">
                      Previewing as Reader
                    </span>
                    <h1 className="text-3xl font-extrabold text-[var(--text-main)]">{editTitle}</h1>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {editTags.map((t) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editBlocks.map((block, idx) =>
                      block.type === "text" ? (
                        <p key={idx} className="text-base text-[var(--text-main)] leading-relaxed whitespace-pre-line">
                          <EmojiText text={block.text} />
                        </p>
                      ) : block.kind === "image" ? (
                        <div key={idx} className="my-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={block.url}
                            alt={block.alt_text || editTitle}
                            className="max-h-96 rounded-xl border border-[var(--border-color)]"
                          />
                        </div>
                      ) : (
                        <BlogMediaBlock
                          key={idx}
                          block={{ type: block.kind, media_id: block.media_id, url: block.url ?? "", alt_text: block.alt_text ?? null, name: block.name, size: block.size }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                Status: <strong className="uppercase text-[var(--text-main)]">{editStatus}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePost}
                  disabled={savingPost || !editTitle.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingPost ? "Saving Changes..." : "Save Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
