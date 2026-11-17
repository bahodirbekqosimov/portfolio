"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ArrowRight, FolderGit2 } from "lucide-react";
import { ProjectOut, SkillOut } from "@/types/api";
import { getProjectSlug } from "@/lib/slug";

interface ProjectsListClientProps {
  initialProjects: ProjectOut[];
  allSkills: SkillOut[];
}

export default function ProjectsListClient({
  initialProjects,
  allSkills,
}: ProjectsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSkill = searchParams.get("skill") || "";

  const handleSkillSelect = (skillName: string) => {
    if (activeSkill.toLowerCase() === skillName.toLowerCase()) {
      router.push("/projects", { scroll: false });
    } else {
      router.push(`/projects?skill=${encodeURIComponent(skillName)}`, { scroll: false });
    }
  };

  // Filter projects by active skill
  const filteredProjects = useMemo(() => {
    if (!activeSkill) return initialProjects;
    return initialProjects.filter((p) =>
      p.skills?.some((s) => s.name.toLowerCase() === activeSkill.toLowerCase())
    );
  }, [initialProjects, activeSkill]);

  return (
    <div className="space-y-10">
      {/* Skill Filter Buttons */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Filter by Technology
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => router.push("/projects", { scroll: false })}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              !activeSkill
                ? "nav-active shadow-sm"
                : "border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
            }`}
          >
            All Projects ({initialProjects.length})
          </button>

          {allSkills.map((skill) => {
            const isSelected = activeSkill.toLowerCase() === skill.name.toLowerCase();
            return (
              <button
                key={skill.id}
                onClick={() => handleSkillSelect(skill.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  isSelected
                    ? "nav-active shadow-sm"
                    : "border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
                }`}
              >
                #{skill.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertical Projects List with clear separators */}
      <div className="space-y-12">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, index) => {
            const slug = getProjectSlug(project);
            return (
              <div key={project.id} className="space-y-8">
                <article className="p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm hover:border-orange-500/40 transition-all flex flex-col md:flex-row gap-8 items-start">
                  {/* Project Image */}
                  {project.image ? (
                    <div className="w-full md:w-80 h-52 flex-shrink-0 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)] group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-80 h-52 flex-shrink-0 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-subtle)] flex flex-col items-center justify-center text-orange-500/60">
                      <FolderGit2 className="w-12 h-12 mb-2" />
                      <span className="text-xs font-medium">Showcase Project</span>
                    </div>
                  )}

                  {/* Project Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-2xl font-bold text-[var(--text-main)] hover:text-orange-500 transition-colors">
                        <Link href={`/projects/${slug}`}>{project.title}</Link>
                      </h2>

                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-orange-500 hover:text-white hover:border-orange-500 text-xs font-medium transition-colors"
                          title="Visit live project"
                        >
                          Visit
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-[var(--text-muted)] text-base leading-relaxed whitespace-pre-line">
                        {project.description}
                      </p>
                    )}

                    {/* Skill Tags */}
                    {project.skills && project.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {project.skills.map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => handleSkillSelect(skill.name)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                              activeSkill.toLowerCase() === skill.name.toLowerCase()
                                ? "bg-orange-600 text-white border-orange-600"
                                : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-orange-500 hover:border-orange-500/50"
                            }`}
                          >
                            #{skill.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Standalone Project Page Link */}
                    <div className="pt-2">
                      <Link
                        href={`/projects/${slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 group transition-colors"
                      >
                        Project Details & Architecture
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </article>

                {/* Clear separator line between projects */}
                {index < filteredProjects.length - 1 && (
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border-color)]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[var(--bg-main)] px-3 text-xs text-[var(--text-subtle)]">
                        ✦
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
            <FolderGit2 className="w-12 h-12 mx-auto text-orange-500/50" />
            <h3 className="text-lg font-semibold text-[var(--text-main)]">
              No projects found for {activeSkill ? `"#${activeSkill}"` : "display"}
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Try clearing the skill filter to see all projects.
            </p>
            {activeSkill && (
              <button
                onClick={() => router.push("/projects", { scroll: false })}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
