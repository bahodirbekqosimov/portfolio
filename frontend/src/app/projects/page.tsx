import React, { Suspense } from "react";
import type { Metadata } from "next";
import { FolderGit2 } from "lucide-react";
import { ProjectOut, HomeOut, SkillOut } from "@/types/api";
import ProjectsListClient from "./ProjectsListClient";

export const metadata: Metadata = {
  title: "Engineering Projects",
  description:
    "Explore open-source projects, high-performance backends, microservices, and web platforms developed by Bahodirbek.",
  alternates: {
    canonical: "https://bahodirbek.uz/projects",
  },
  openGraph: {
    title: "Engineering Projects | bahodirbek.uz",
    description:
      "Explore open-source projects, high-performance backends, microservices, and web platforms developed by Bahodirbek.",
    url: "https://bahodirbek.uz/projects",
  },
};

async function getProjectsData(): Promise<{ projects: ProjectOut[]; skills: SkillOut[] }> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  try {
    const [projectsRes, homeRes] = await Promise.all([
      fetch(`${backendUrl}/api/v1/projects/`, { next: { revalidate: 60 } }),
      fetch(`${backendUrl}/api/v1/home/`, { next: { revalidate: 60 } }),
    ]);

    const projects: ProjectOut[] = projectsRes.ok ? await projectsRes.json() : [];
    const homeData: HomeOut = homeRes.ok
      ? await homeRes.json()
      : {
          profile: null,
          work_experience: [],
          projects: [],
          skills: [],
          contacts: [],
          education: [],
        };

    // Extract unique skills from both home and all projects
    const skillMap = new Map<number, SkillOut>();
    homeData.skills?.forEach((s) => skillMap.set(s.id, s));
    projects.forEach((p) => {
      p.skills?.forEach((s) => skillMap.set(s.id, s));
    });

    return {
      projects,
      skills: Array.from(skillMap.values()),
    };
  } catch (err) {
    console.error("Failed to load projects data:", err);
    return { projects: [], skills: [] };
  }
}

export default async function ProjectsPage() {
  const { projects, skills } = await getProjectsData();

  // Structured Data (CollectionPage)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Engineering Projects — Bahodirbek",
    description: "Curated software engineering projects and applications by Bahodirbek.",
    url: "https://bahodirbek.uz/projects",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: projects.map((project, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "SoftwareApplication",
          name: project.title,
          description: project.description || undefined,
          url: project.link || `https://bahodirbek.uz/projects/${project.id}`,
          applicationCategory: "DeveloperPlatform",
        },
      })),
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header section */}
      <div className="space-y-3 border-b border-[var(--border-color)] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
          <FolderGit2 className="w-3.5 h-3.5" />
          Software Engineering
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-main)]">
          Projects & Code
        </h1>
        <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed">
          Production systems, open-source libraries, APIs, and cloud experiments. Filter by skill to
          explore specific technical stacks.
        </p>
      </div>

      {/* Projects interactive list with Suspense */}
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-[var(--text-muted)]">
            Loading projects...
          </div>
        }
      >
        <ProjectsListClient initialProjects={projects} allSkills={skills} />
      </Suspense>
    </div>
  );
}
