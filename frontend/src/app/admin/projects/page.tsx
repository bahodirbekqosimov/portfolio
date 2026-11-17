"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Upload,
  X,
  Save,
  Check,
  Tag,
  ArrowUpDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { ProjectAdminOut, SkillOut, UploadOut } from "@/types/api";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectAdminOut[]>([]);
  const [skills, setSkills] = useState<SkillOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showHome, setShowHome] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjectsAndSkills = async () => {
    setLoading(true);
    try {
      const [projectsData, homeData] = await Promise.all([
        api.get<ProjectAdminOut[]>("/api/v1/admin/projects/"),
        api.get<any>("/api/v1/home/"),
      ]);
      setProjects(projectsData);
      setSkills(homeData.skills || []);
    } catch (err) {
      console.error("Failed to load projects/skills:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndSkills();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImage("");
    setLink("");
    setIsActive(true);
    setShowHome(true);
    setSortOrder(0);
    setSelectedSkillIds([]);
    setModalOpen(true);
  };

  const openEditModal = (p: ProjectAdminOut) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDescription(p.description || "");
    setImage(p.image || "");
    setLink(p.link || "");
    setIsActive(p.is_active);
    setShowHome(p.show_home);
    setSortOrder(p.sort_order);
    setSelectedSkillIds(p.skills?.map((s) => s.id) || []);
    setModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<UploadOut>("/api/v1/admin/uploads/", formData);
      setImage(res.url);
    } catch (err: any) {
      alert(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        image: image.trim() || null,
        link: link.trim() || null,
        is_active: isActive,
        show_home: showHome,
        sort_order: sortOrder,
        skill_ids: selectedSkillIds,
      };

      if (editingId) {
        await api.patch(`/api/v1/admin/projects/${editingId}/`, payload);
      } else {
        await api.post("/api/v1/admin/projects/", payload);
      }

      setModalOpen(false);
      await fetchProjectsAndSkills();
    } catch (err: any) {
      alert(err.message || "Failed to save project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete project "${title}"?`)) return;
    try {
      await api.delete(`/api/v1/admin/projects/${id}/`);
      await fetchProjectsAndSkills();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  const toggleSkillSelection = (skillId: number) => {
    if (selectedSkillIds.includes(skillId)) {
      setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      setSelectedSkillIds([...selectedSkillIds, skillId]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <FolderGit2 className="w-3.5 h-3.5" />
            Project Showcase
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Projects CMS
          </h1>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Projects Table */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Skills</th>
                <th className="py-3 px-4">Home</th>
                <th className="py-3 px-4">Active</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                    No projects found. Click &quot;Add Project&quot; to showcase your work.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-[var(--text-main)]">{p.title}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        {p.description || "No description"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.skills?.map((s) => (
                          <span
                            key={s.id}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)]"
                          >
                            #{s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.show_home
                            ? "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                            : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {p.show_home ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.is_active
                            ? "bg-green-500/15 text-green-500 border border-green-500/30"
                            : "bg-zinc-500/15 text-zinc-500"
                        }`}
                      >
                        {p.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {p.sort_order}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.link && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                            title="Visit Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                          title="Delete"
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

      {/* Modal: Create / Edit Project */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingId ? "Edit Project" : "Add New Project"}
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
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Task Queue"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Architecture overview, features, and technical details..."
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    External Link
                  </label>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Project Image & Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Project Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://... or upload below"
                    className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-orange-500 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-orange-500" />
                    {uploadingImage ? "Uploading..." : "Upload File"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Skills Multi-Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Associated Skills
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] max-h-36 overflow-y-auto">
                  {skills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    return (
                      <button
                        type="button"
                        key={skill.id}
                        onClick={() => toggleSkillSelection(skill.id)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                          isSelected
                            ? "bg-orange-600 text-white border-orange-600 font-semibold"
                            : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]"
                        }`}
                      >
                        #{skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Flags: is_active and show_home */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-orange-600 focus:ring-orange-500"
                  />
                  Active (Publicly Visible)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--text-main)]">
                  <input
                    type="checkbox"
                    checked={showHome}
                    onChange={(e) => setShowHome(e.target.checked)}
                    className="rounded border-[var(--border-color)] text-orange-600 focus:ring-orange-500"
                  />
                  Showcase on Home Page
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {submitting ? "Saving..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
