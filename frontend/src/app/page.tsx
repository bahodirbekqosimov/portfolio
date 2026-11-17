import React from "react";
import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Mail,
  ExternalLink,
  BookOpen,
  Send,
  Sparkles,
  ArrowRight,
  FileDown,
} from "lucide-react";
import { HomeOut } from "@/types/api";
import { parseContactData } from "@/lib/contact";

// Fetch home data on server
async function getHomeData(): Promise<HomeOut> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  try {
    // Admin paneldagi o'zgarishlar (rasm, bio) darhol ko'rinishi uchun keshlanmaydi.
    const res = await fetch(`${backendUrl}/api/v1/home/`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch home data: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch home data:", err);
    return {
      profile: null,
      profile_image: null,
      bio: null,
      work_experience: [],
      projects: [],
      skills: [],
      contacts: [],
      education: [],
    };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Present";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default async function HomePage() {
  const data = await getHomeData();
  const profile = data.profile;
  const name = profile?.name || "Bahodirbek";
  // Portret va bio faqat Admin Panel > Profile Image & Bio orqali boshqariladi.
  const portraitUrl = data.profile_image?.url || null;
  const bioText = data.bio?.content || null;
  const headline = data.bio?.headline || null;

  // Structured Data (JSON-LD) for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: name,
    url: "https://bahodirbek.uz",
    image: portraitUrl || "https://bahodirbek.uz/avatar-placeholder.png",
    ...(bioText ? { description: bioText } : {}),
    jobTitle: headline || "Software Engineer",
    sameAs: data.contacts
      .map((c) => parseContactData(c.data).href)
      .filter((href): href is string => !!href && href.startsWith("http")),
    knowsAbout: data.skills.map((s) => s.name),
  };

  return (
    <div className="w-full">
      {/* Structured Data Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-20">
        {/* 1. Profile Section */}
        <section
          id="profile"
          className="p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm transition-all"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Left: 3:4 Portrait Profile Image — rasm yo'q bo'lsa joy ham ajratilmaydi */}
            {portraitUrl && (
              <div className="w-48 sm:w-56 flex-shrink-0 aspect-[3/4] relative rounded-xl overflow-hidden border-2 border-orange-500/40 bg-[var(--bg-subtle)] shadow-md group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}

            {/* Right: Info and Introduction */}
            <div className="flex-1 text-center md:text-left space-y-4">
              {headline && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-orange-500/30 bg-orange-500/10 text-orange-500">
                  <Sparkles className="w-3.5 h-3.5" />
                  {headline}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
                Hello, I am <span className="text-orange-500">{name}</span>
              </h1>

              {bioText && (
                <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl whitespace-pre-line">
                  {bioText}
                </p>
              )}

              {/* Action Buttons: Blog button near profile */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  Read My Blog
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
                >
                  <FolderGit2 className="w-4 h-4 text-orange-500" />
                  Explore Projects
                </Link>

                <a
                  href="#contacts"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
                >
                  <Send className="w-4 h-4 text-orange-500" />
                  Get in Touch
                </a>

                {/* CV har safar portfolio ma'lumotlaridan yangidan yasaladi */}
                <a
                  href="/api/v1/cv/"
                  download
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
                >
                  <FileDown className="w-4 h-4 text-orange-500" />
                  Download CV
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Work Experience Section */}
        <section id="experience" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
            <Briefcase className="w-5 h-5 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Work Experience
            </h2>
          </div>

          {data.work_experience.length > 0 ? (
            <div className="space-y-4">
              {data.work_experience.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <h3 className="text-lg font-bold text-[var(--text-main)]">{item.job_title}</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] w-fit">
                      {formatDate(item.start_date)} — {formatDate(item.end_date)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-orange-500 mb-2">{item.company}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">
              Work experience details will appear here as they are added to the platform.
            </div>
          )}
        </section>

        {/* 3. Skills Section */}
        <section id="skills" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Skills & Tech Stack
            </h2>
          </div>

          {data.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {data.skills.map((skill) => (
                <Link
                  key={skill.id}
                  href={`/projects?skill=${encodeURIComponent(skill.name)}`}
                  className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-orange-600 hover:text-white hover:border-orange-600 text-[var(--text-main)] text-sm font-medium transition-all shadow-sm hover:scale-105 active:scale-95"
                >
                  #{skill.name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">
              Skills will appear here once added in the admin dashboard.
            </div>
          )}
        </section>

        {/* 4. Projects Section */}
        <section id="projects" className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-3">
              <FolderGit2 className="w-5 h-5 text-orange-500" />
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
                Selected Projects
              </h2>
            </div>
            <Link
              href="/projects"
              className="text-xs sm:text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
            >
              View All Projects
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm hover:border-orange-500/50 transition-all group"
                >
                  {project.image && (
                    <div className="w-full h-44 overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-main)] group-hover:text-orange-500 transition-colors">
                          {project.title}
                        </h3>
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`External link for ${project.title}`}
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-orange-500 hover:bg-[var(--bg-subtle)] transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {project.skills && project.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--border-color)]">
                        {project.skills.map((skill) => (
                          <Link
                            key={skill.id}
                            href={`/projects?skill=${encodeURIComponent(skill.name)}`}
                            className="text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-orange-500 border border-[var(--border-color)] transition-colors"
                          >
                            #{skill.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">
              Projects will appear here once configured to show on home.
            </div>
          )}
        </section>

        {/* 5. Contacts Section */}
        <section id="contacts" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
            <Mail className="w-5 h-5 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">
              Contact & Connections
            </h2>
          </div>

          {data.contacts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.contacts.map((contact) => {
                const parsed = parseContactData(contact.data);

                return (
                  <div
                    key={contact.id}
                    className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/40 transition-all flex items-center gap-3.5 shadow-sm group"
                  >
                    {contact.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={contact.image}
                        alt={contact.name}
                        className="w-9 h-9 rounded-lg object-contain p-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-sm shrink-0">
                        {contact.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        {contact.name}
                      </div>
                      {parsed.href ? (
                        <a
                          href={parsed.href}
                          target={parsed.isExternal ? "_blank" : undefined}
                          rel={parsed.isExternal ? "noopener noreferrer" : undefined}
                          className="text-sm font-medium text-[var(--text-main)] group-hover:text-orange-500 truncate block transition-colors"
                          title={parsed.displayText}
                        >
                          {parsed.displayText}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-[var(--text-main)] truncate block">
                          {parsed.displayText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">
              Contact information will appear here once added in the admin dashboard.
            </div>
          )}
        </section>

        {/* 6. Education Section */}
        <section id="education" className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
            <GraduationCap className="w-5 h-5 text-orange-500" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Education</h2>
          </div>

          {data.education.length > 0 ? (
            <div className="space-y-4">
              {data.education.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-orange-500/40 transition-all shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <h3 className="text-lg font-bold text-[var(--text-main)]">
                      {item.institution}
                    </h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] w-fit">
                      {formatDate(item.start_date)} — {formatDate(item.end_date)}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-orange-500 mb-2">{item.degree}</div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-[var(--border-color)] text-center text-sm text-[var(--text-muted)] bg-[var(--bg-card)]">
              Education details will appear here once added in the admin dashboard.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
