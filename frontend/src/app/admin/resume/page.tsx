"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  GraduationCap,
  Mail,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Code,
  ExternalLink,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { parseContactData } from "@/lib/contact";
import {
  WorkExperienceAdminOut,
  EducationAdminOut,
  ContactAdminOut,
  SkillAdminOut,
  UploadOut,
} from "@/types/api";
import { confirmDialog, notify } from "@/lib/dialog";

type Tab = "experience" | "education" | "contacts" | "skills";

export default function AdminResumePage() {
  const [activeTab, setActiveTab] = useState<Tab>("experience");
  const [loading, setLoading] = useState(true);

  // Data
  const [experiences, setExperiences] = useState<WorkExperienceAdminOut[]>([]);
  const [educations, setEducations] = useState<EducationAdminOut[]>([]);
  const [contacts, setContacts] = useState<ContactAdminOut[]>([]);
  const [skills, setSkills] = useState<SkillAdminOut[]>([]);

  // Experience modal
  const [expModal, setExpModal] = useState(false);
  const [expId, setExpId] = useState<number | null>(null);
  const [expCompany, setExpCompany] = useState("");
  const [expJobTitle, setExpJobTitle] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expStart, setExpStart] = useState("");
  const [expEnd, setExpEnd] = useState("");
  const [expCurrent, setExpCurrent] = useState(false);
  const [expOrder, setExpOrder] = useState(0);

  // Education modal
  const [eduModal, setEduModal] = useState(false);
  const [eduId, setEduId] = useState<number | null>(null);
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduDesc, setEduDesc] = useState("");
  const [eduStart, setEduStart] = useState("");
  const [eduEnd, setEduEnd] = useState("");
  const [eduCurrent, setEduCurrent] = useState(false);
  const [eduOrder, setEduOrder] = useState(0);

  // Contact modal
  const [contactModal, setContactModal] = useState(false);
  const [contactId, setContactId] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactData, setContactData] = useState("");
  const [contactImage, setContactImage] = useState("");
  const [contactOrder, setContactOrder] = useState(0);

  // Skill modal
  const [skillModal, setSkillModal] = useState(false);
  const [skillId, setSkillId] = useState<number | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillShowHome, setSkillShowHome] = useState(true);
  const [skillOrder, setSkillOrder] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [expData, eduData, conData, skiData] = await Promise.all([
        api.get<WorkExperienceAdminOut[]>("/api/v1/admin/work_experience/"),
        api.get<EducationAdminOut[]>("/api/v1/admin/education/"),
        api.get<ContactAdminOut[]>("/api/v1/admin/contacts/"),
        api.get<SkillAdminOut[]>("/api/v1/admin/skills/"),
      ]);
      setExperiences(expData);
      setEducations(eduData);
      setContacts(conData);
      setSkills(skiData);
    } catch (err) {
      console.error("Failed to load resume data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Handlers for Experience
  const saveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      company: expCompany.trim(),
      job_title: expJobTitle.trim(),
      description: expDesc.trim() || null,
      start_date: expStart,
      end_date: expCurrent ? null : expEnd || null,
      sort_order: expOrder,
    };
    try {
      if (expId) {
        await api.patch(`/api/v1/admin/work_experience/${expId}/`, payload);
      } else {
        await api.post("/api/v1/admin/work_experience/", payload);
      }
      setExpModal(false);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to save work experience");
    }
  };

  const deleteExperience = async (id: number) => {
    if (!(await confirmDialog("Delete this experience?"))) return;
    try {
      await api.delete(`/api/v1/admin/work_experience/${id}/`);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to delete");
    }
  };

  // Handlers for Education
  const saveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      institution: eduInstitution.trim(),
      degree: eduDegree.trim(),
      description: eduDesc.trim() || null,
      start_date: eduStart,
      end_date: eduCurrent ? null : eduEnd || null,
      sort_order: eduOrder,
    };
    try {
      if (eduId) {
        await api.patch(`/api/v1/admin/education/${eduId}/`, payload);
      } else {
        await api.post("/api/v1/admin/education/", payload);
      }
      setEduModal(false);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to save education");
    }
  };

  const deleteEducation = async (id: number) => {
    if (!(await confirmDialog("Delete this education entry?"))) return;
    try {
      await api.delete(`/api/v1/admin/education/${id}/`);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to delete");
    }
  };

  // Handlers for Contacts
  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: contactName.trim(),
      data: contactData.trim(),
      image: contactImage.trim() || null,
      sort_order: contactOrder,
    };
    try {
      if (contactId) {
        await api.patch(`/api/v1/admin/contacts/${contactId}/`, payload);
      } else {
        await api.post("/api/v1/admin/contacts/", payload);
      }
      setContactModal(false);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to save contact");
    }
  };

  const deleteContact = async (id: number) => {
    if (!(await confirmDialog("Delete this contact?"))) return;
    try {
      await api.delete(`/api/v1/admin/contacts/${id}/`);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to delete");
    }
  };

  const applyContactPrefix = (prefix: string) => {
    const clean = contactData.replace(
      /^(mailto:|tel:|sms:|tg:\/\/resolve\?domain=|https?:\/\/t\.me\/|https?:\/\/)/i,
      ""
    );
    setContactData(`${prefix}${clean}`);
  };

  const setContactPreset = (name: string, prefix: string) => {
    setContactName(name);
    if (
      !contactData ||
      contactData === "mailto:" ||
      contactData === "tel:" ||
      contactData === "https://" ||
      contactData === "https://t.me/"
    ) {
      setContactData(prefix);
    } else {
      applyContactPrefix(prefix);
    }
  };

  // Handlers for Skills
  const saveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: skillName.trim(),
      show_home: skillShowHome,
      sort_order: skillOrder,
    };
    try {
      if (skillId) {
        await api.patch(`/api/v1/admin/skills/${skillId}/`, payload);
      } else {
        await api.post("/api/v1/admin/skills/", payload);
      }
      setSkillModal(false);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to save skill");
    }
  };

  const deleteSkill = async (id: number) => {
    if (!(await confirmDialog("Delete this skill?"))) return;
    try {
      await api.delete(`/api/v1/admin/skills/${id}/`);
      await fetchAll();
    } catch (err: any) {
      notify(err.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" />
            Portfolio Data
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Resume & Home Management
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("experience")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "experience" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Experience ({experiences.length})
          </button>
          <button
            onClick={() => setActiveTab("education")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "education" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Education ({educations.length})
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "contacts" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "skills" ? "nav-active shadow-sm" : "text-[var(--text-muted)]"
            }`}
          >
            Skills ({skills.length})
          </button>
        </div>
      </div>

      {/* 1. Experience Tab */}
      {activeTab === "experience" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--text-main)]">Work Experience Entries</h2>
            <button
              onClick={() => {
                setExpId(null);
                setExpCompany("");
                setExpJobTitle("");
                setExpDesc("");
                setExpStart("");
                setExpEnd("");
                setExpCurrent(false);
                setExpOrder(0);
                setExpModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Experience
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Role & Company</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {experiences.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text-main)]">{exp.job_title}</div>
                      <div className="text-xs text-orange-500">{exp.company}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--text-muted)]">
                      {exp.start_date} — {exp.end_date || "Present"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {exp.sort_order}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setExpId(exp.id);
                            setExpCompany(exp.company);
                            setExpJobTitle(exp.job_title);
                            setExpDesc(exp.description || "");
                            setExpStart(exp.start_date);
                            setExpEnd(exp.end_date || "");
                            setExpCurrent(!exp.end_date);
                            setExpOrder(exp.sort_order);
                            setExpModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteExperience(exp.id)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Education Tab */}
      {activeTab === "education" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--text-main)]">Education History</h2>
            <button
              onClick={() => {
                setEduId(null);
                setEduInstitution("");
                setEduDegree("");
                setEduDesc("");
                setEduStart("");
                setEduEnd("");
                setEduCurrent(false);
                setEduOrder(0);
                setEduModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Education
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Institution & Degree</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {educations.map((edu) => (
                  <tr key={edu.id} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text-main)]">{edu.institution}</div>
                      <div className="text-xs text-orange-500">{edu.degree}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--text-muted)]">
                      {edu.start_date} — {edu.end_date || "Present"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {edu.sort_order}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEduId(edu.id);
                            setEduInstitution(edu.institution);
                            setEduDegree(edu.degree);
                            setEduDesc(edu.description || "");
                            setEduStart(edu.start_date);
                            setEduEnd(edu.end_date || "");
                            setEduCurrent(!edu.end_date);
                            setEduOrder(edu.sort_order);
                            setEduModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEducation(edu.id)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Contacts Tab */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--text-main)]">Contact Details</h2>
            <button
              onClick={() => {
                setContactId(null);
                setContactName("");
                setContactData("");
                setContactImage("");
                setContactOrder(0);
                setContactModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Contact Info (Display & Code)</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {contacts.map((c) => {
                  const parsed = parseContactData(c.data);
                  return (
                    <tr key={c.id} className="hover:bg-[var(--bg-subtle)]/50">
                      <td className="py-3.5 px-4 font-bold text-[var(--text-main)]">
                        <div className="flex items-center gap-2">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image}
                              alt={c.name}
                              className="w-6 h-6 rounded-md object-contain p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-color)] shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-500 font-bold text-xs flex items-center justify-center shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-[var(--text-main)] text-xs sm:text-sm">
                            {parsed.displayText || "—"}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] text-orange-400">
                              <Code className="w-3 h-3 text-orange-500" />
                              {c.data}
                            </span>
                            {parsed.href && (
                              <a
                                href={parsed.href}
                                target={parsed.isExternal ? "_blank" : undefined}
                                rel={parsed.isExternal ? "noopener noreferrer" : undefined}
                                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-orange-500 transition-colors"
                                title="Test link"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>test</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                        {c.sort_order}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setContactId(c.id);
                              setContactName(c.name);
                              setContactData(c.data);
                              setContactImage(c.image || "");
                              setContactOrder(c.sort_order);
                              setContactModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteContact(c.id)}
                            className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Skills Tab */}
      {activeTab === "skills" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--text-main)]">Skills & Tech Stack</h2>
            <button
              onClick={() => {
                setSkillId(null);
                setSkillName("");
                setSkillShowHome(true);
                setSkillOrder(0);
                setSkillModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Skill
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Skill Name</th>
                  <th className="py-3 px-4">Show on Home</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {skills.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-subtle)]/50">
                    <td className="py-3.5 px-4 font-bold text-[var(--text-main)]">#{s.name}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          s.show_home ? "bg-orange-500/15 text-orange-500" : "bg-zinc-500/10 text-zinc-500"
                        }`}
                      >
                        {s.show_home ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {s.sort_order}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSkillId(s.id);
                            setSkillName(s.name);
                            setSkillShowHome(s.show_home);
                            setSkillOrder(s.sort_order);
                            setSkillModal(true);
                          }}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSkill(s.id)}
                          className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      {expModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              {expId ? "Edit Work Experience" : "Add Work Experience"}
            </h2>
            <form onSubmit={saveExperience} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Company Name"
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <input
                type="text"
                required
                placeholder="Job Title"
                value={expJobTitle}
                onChange={(e) => setExpJobTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Start date</span>
                  <input
                    type="date"
                    required
                    value={expStart}
                    onChange={(e) => setExpStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">End date</span>
                  <input
                    type="date"
                    value={expCurrent ? "" : expEnd}
                    onChange={(e) => setExpEnd(e.target.value)}
                    disabled={expCurrent}
                    required={!expCurrent}
                    min={expStart || undefined}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] disabled:opacity-40"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={expCurrent}
                  onChange={(e) => {
                    setExpCurrent(e.target.checked);
                    if (e.target.checked) setExpEnd("");
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                I currently work here <span className="text-[var(--text-muted)]">(shown as &quot;Present&quot;)</span>
              </label>
              <textarea
                placeholder="Description of duties and accomplishments..."
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <input
                type="number"
                placeholder="Sort order"
                value={expOrder}
                onChange={(e) => setExpOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-orange-600 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {eduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              {eduId ? "Edit Education" : "Add Education"}
            </h2>
            <form onSubmit={saveEducation} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Institution (e.g. University of Computer Science)"
                value={eduInstitution}
                onChange={(e) => setEduInstitution(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <input
                type="text"
                required
                placeholder="Degree (e.g. B.S. in Computer Science)"
                value={eduDegree}
                onChange={(e) => setEduDegree(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Start date</span>
                  <input
                    type="date"
                    required
                    value={eduStart}
                    onChange={(e) => setEduStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">End date</span>
                  <input
                    type="date"
                    value={eduCurrent ? "" : eduEnd}
                    onChange={(e) => setEduEnd(e.target.value)}
                    disabled={eduCurrent}
                    required={!eduCurrent}
                    min={eduStart || undefined}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] disabled:opacity-40"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={eduCurrent}
                  onChange={(e) => {
                    setEduCurrent(e.target.checked);
                    if (e.target.checked) setEduEnd("");
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                I currently study here <span className="text-[var(--text-muted)]">(shown as &quot;Present&quot;)</span>
              </label>
              <textarea
                placeholder="Description / Honors / Specialization..."
                value={eduDesc}
                onChange={(e) => setEduDesc(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <input
                type="number"
                placeholder="Sort order"
                value={eduOrder}
                onChange={(e) => setEduOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEduModal(false)}
                  className="px-4 py-2 rounded-xl text-xs border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-orange-600 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <h2 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                {contactId ? "Edit Contact" : "Add Contact"}
              </h2>
              <button
                type="button"
                onClick={() => setContactModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveContact} className="space-y-4">
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Quick presets:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Email", prefix: "mailto:" },
                    { label: "Phone", prefix: "tel:" },
                    { label: "Telegram", prefix: "https://t.me/" },
                    { label: "GitHub", prefix: "https://github.com/" },
                    { label: "LinkedIn", prefix: "https://linkedin.com/in/" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setContactPreset(preset.label, preset.prefix)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-orange-500 hover:text-orange-500 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-[var(--text-main)] block mb-1">
                  Name / Type
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Email, Phone, Telegram, GitHub"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Code / Data Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-orange-500" />
                    Contact Code / URI Scheme
                  </label>
                  <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                    code format
                  </span>
                </div>

                {/* Quick prefix buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-muted)]">Prefixes:</span>
                  {[
                    { label: "mailto:", prefix: "mailto:" },
                    { label: "tel:", prefix: "tel:" },
                    { label: "https://t.me/", prefix: "https://t.me/" },
                    { label: "https://github.com/", prefix: "https://github.com/" },
                    { label: "https://", prefix: "https://" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => applyContactPrefix(item.prefix)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-orange-500 hover:border-orange-500/50 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  placeholder="mailto:email@example.com or tel:+998901234567"
                  value={contactData}
                  onChange={(e) => setContactData(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] font-mono text-xs text-orange-400 focus:outline-none focus:border-orange-500 transition-colors"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </div>

              {/* Live Preview */}
              {contactData.trim() ? (
                (() => {
                  const preview = parseContactData(contactData);
                  return (
                    <div className="p-3 rounded-xl border border-orange-500/25 bg-orange-500/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-orange-500 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          Live Preview
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-orange-500/15 text-orange-400 border border-orange-500/30">
                          {preview.type}
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-color)]">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                            Public site display:
                          </span>
                          <span className="font-semibold text-[var(--text-main)] truncate text-right">
                            {preview.displayText || "—"}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                            Action on click (href):
                          </span>
                          <code className="font-mono text-[11px] text-orange-400 truncate text-right">
                            {preview.href || "(plain text)"}
                          </code>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}

              {/* Optional Image and Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                    Icon / Image URL (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... image or SVG logo"
                    value={contactImage}
                    onChange={(e) => setContactImage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={contactOrder}
                    onChange={(e) => setContactOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors shadow-sm"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {skillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              {skillId ? "Edit Skill" : "Add Skill"}
            </h2>
            <form onSubmit={saveSkill} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Skill name (e.g. Python, Docker)"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={skillShowHome}
                  onChange={(e) => setSkillShowHome(e.target.checked)}
                  className="rounded text-orange-600"
                />
                Show on Home Page
              </label>
              <input
                type="number"
                placeholder="Sort order"
                value={skillOrder}
                onChange={(e) => setSkillOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSkillModal(false)}
                  className="px-4 py-2 rounded-xl text-xs border border-[var(--border-color)] text-[var(--text-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-orange-600 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
