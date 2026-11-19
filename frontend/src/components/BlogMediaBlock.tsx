import type { ImageBlockOut } from "@/types/api";

export function formatBytes(size: number | null | undefined): string {
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Last part of the file name in capitals (PDF, ZIP, MP3) for the file icon. */
function extensionOf(name: string | null | undefined, url: string): string {
  const source = name || url;
  const ext = source.split("?")[0].split(".").pop() || "";
  return ext.length > 0 && ext.length <= 5 ? ext.toUpperCase() : "FILE";
}

/** Video, audio or a downloadable file inside a blog post (pictures are drawn as a gallery by the page). */
export function BlogMediaBlock({ block }: { block: ImageBlockOut }) {
  const name = block.name || block.alt_text || "file";
  const caption = block.alt_text && block.alt_text !== block.name ? block.alt_text : null;

  if (block.type === "video") {
    return (
      <figure className="my-6 rounded-xl overflow-hidden border border-[var(--border-color)] bg-black shadow-sm">
        <video src={block.url} controls playsInline preload="metadata" className="w-full max-h-[560px] bg-black">
          <a href={block.url} download={name}>
            {name}
          </a>
        </video>
        {caption && (
          <figcaption className="p-2.5 text-center text-xs text-[var(--text-muted)] italic bg-[var(--bg-card)]">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === "audio") {
    return (
      <figure className="my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-orange)]/15 text-[var(--primary-orange)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-main)]">{caption || name}</p>
            {block.size ? <p className="text-xs text-[var(--text-muted)]">{formatBytes(block.size)}</p> : null}
          </div>
        </div>
        <audio src={block.url} controls preload="metadata" className="w-full" />
      </figure>
    );
  }

  return (
    <a
      href={block.url}
      download={name}
      className="my-4 flex items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm transition hover:border-[var(--primary-orange)]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[11px] font-bold tracking-wide text-[var(--text-muted)]">
        {extensionOf(block.name, block.url)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--text-main)]">{name}</span>
        <span className="block text-xs text-[var(--text-muted)]">
          {[formatBytes(block.size), caption].filter(Boolean).join(" · ") || "Download"}
        </span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--primary-orange)]" aria-hidden="true">
        <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
      </svg>
    </a>
  );
}
