import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, FolderGit2, Calendar, Tag, ShieldCheck } from "lucide-react";
import { ProjectOut } from "@/types/api";
import { getProjectSlug, parseProjectIdFromSlug } from "@/lib/slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProjectBySlug(slug: string): Promise<ProjectOut | null> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backendUrl}/api/v1/projects/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const projects: ProjectOut[] = await res.json();

    // 1. Match by exact generated slug
    const matchBySlug = projects.find((p) => getProjectSlug(p) === slug);
    if (matchBySlug) return matchBySlug;

    // 2. Match by parsed ID from slug
    const id = parseProjectIdFromSlug(slug);
    if (id !== null) {
      const matchById = projects.find((p) => p.id === id);
      if (matchById) return matchById;
    }

    return null;
  } catch (err) {
    console.error("Failed to load project:", err);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found",
      description: "The requested project could not be found.",
    };
  }

  const title = `${project.title} — Software Project`;
  const description =
    project.description?.slice(0, 160) ||
    `Details, architecture, and technology stack for ${project.title} by Bahodirbek.`;
  const canonicalUrl = `https://bahodirbek.uz/projects/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${project.title} | bahodirbek.uz`,
      description,
      url: canonicalUrl,
      images: project.image ? [{ url: project.image, alt: project.title }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} | bahodirbek.uz`,
      description,
      images: project.image ? [project.image] : [],
    },
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const canonicalUrl = `https://bahodirbek.uz/projects/${slug}`;

  // SoftwareApplication JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.description || undefined,
    url: project.link || canonicalUrl,
    image: project.image || undefined,
    applicationCategory: "DeveloperApplication",
    author: {
      "@type": "Person",
      name: "Bahodirbek",
      url: "https://bahodirbek.uz",
    },
    keywords: project.skills?.map((s) => s.name).join(", "),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back to projects button */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-orange-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all projects
        </Link>
      </div>

      {/* Project Card Showcase */}
      <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        {project.image && (
          <div className="w-full max-h-[460px] overflow-hidden bg-[var(--bg-subtle)] border-b border-[var(--border-color)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-10 space-y-8">
          {/* Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 uppercase tracking-wider">
                <FolderGit2 className="w-3.5 h-3.5" />
                Featured Project
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
                {project.title}
              </h1>
            </div>

            {project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm w-full sm:w-auto"
              >
                Launch Project
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Overview & Architecture
              </h2>
              <div className="text-[var(--text-main)] text-base sm:text-lg leading-relaxed whitespace-pre-line">
                {project.description}
              </div>
            </div>
          )}

          {/* Technologies / Skills */}
          {project.skills && project.skills.length > 0 && (
            <div className="space-y-3 border-t border-[var(--border-color)] pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-500" />
                Technologies & Tools Used
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill) => (
                  <Link
                    key={skill.id}
                    href={`/projects?skill=${encodeURIComponent(skill.name)}`}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-orange-600 hover:text-white hover:border-orange-600 text-[var(--text-main)] transition-all shadow-sm"
                  >
                    #{skill.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
