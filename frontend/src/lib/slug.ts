/**
 * Slug generation and parsing helpers
 */

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export function getProjectSlug(project: { id: number; title: string }): string {
  const base = slugify(project.title) || "project";
  return `${base}-${project.id}`;
}

export function parseProjectIdFromSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const idOnly = parseInt(slug, 10);
  return isNaN(idOnly) ? null : idOnly;
}
