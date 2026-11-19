"use client";

/* Site emojis inside text (blog paragraphs and comments): written as :e<id>: (e.g. :e12:), shown as the picture
   of that emoji from Reactions & Emojis. The id never changes, so renaming an emoji does not break old text.
   The "e" keeps times like 10:30:45 from turning into emojis. */
import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Search, Smile } from "lucide-react";
import type { EmojiOut } from "@/types/api";
import { api } from "@/lib/api";

/** The text code of an emoji: id 12 → "e12" (written as :e12:). */
export const emojiCode = (emoji: Pick<EmojiOut, "id">) => `e${emoji.id}`;

/* One request per page load, shared by every text block, comment and picker. */
let emojiPromise: Promise<EmojiOut[]> | null = null;
function loadEmojis(): Promise<EmojiOut[]> {
  emojiPromise ??= api.get<EmojiOut[]>("/api/v1/emojis/").catch(() => {
    emojiPromise = null;
    return [];
  });
  return emojiPromise;
}

/** All site emojis (empty while loading). `seed` skips the request when the page already has the list. */
export function useSiteEmojis(seed?: EmojiOut[]): EmojiOut[] {
  const [list, setList] = useState<EmojiOut[]>(seed ?? []);
  useEffect(() => {
    if (seed && seed.length) return;
    let alive = true;
    loadEmojis().then((items) => alive && setList(items));
    return () => {
      alive = false;
    };
  }, [seed]);
  return list;
}

function useEmojiMap(seed?: EmojiOut[]) {
  const list = useSiteEmojis(seed);
  return useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);
}

const CODE = /:e(\d{1,9}):/g;

/* Links in blog text: [text](url). Only web, mail and site-relative addresses, so no javascript: links. */
const LINK = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:|\/)[^\s()]*)\)/g;
const LINK_CLASS =
  "text-[var(--primary-orange,#f97316)] underline underline-offset-2 decoration-1 hover:opacity-80 break-words";

/** A typed or pasted address made usable as a link: "www.x.uz" / "x.uz/page" → "https://…". Null if it is not one. */
export function toHref(raw: string): string | null {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return null;
  if (/^(https?:\/\/|mailto:)\S+$/i.test(t)) return t;
  if (/^\/[^\s]*$/.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`;
  return null;
}

type Piece = { kind: "text"; text: string } | { kind: "emoji"; emoji: EmojiOut } | { kind: "link"; href: string; label: Piece[] };

/** Text → pieces: plain text, emoji pictures, and (when `links`) links whose label may hold emojis. */
function pieces(text: string, map: Map<number, EmojiOut>, links: boolean): Piece[] {
  const out: Piece[] = [];
  const emojisIn = (t: string) => {
    let last = 0;
    for (const m of t.matchAll(CODE)) {
      const emoji = map.get(Number(m[1]));
      if (!emoji) continue;
      const at = m.index ?? 0;
      if (at > last) out.push({ kind: "text", text: t.slice(last, at) });
      out.push({ kind: "emoji", emoji });
      last = at + m[0].length;
    }
    if (last < t.length) out.push({ kind: "text", text: t.slice(last) });
  };
  if (!links) {
    emojisIn(text);
    return out;
  }
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    emojisIn(text.slice(last, at));
    out.push({ kind: "link", href: m[2], label: pieces(m[1], map, false) });
    last = at + m[0].length;
  }
  emojisIn(text.slice(last));
  return out;
}

const isExternal = (href: string) => {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return typeof window === "undefined" || new URL(href).host !== window.location.host;
  } catch {
    return true;
  }
};

function renderPieces(list: Piece[], keyBase = ""): React.ReactNode[] {
  return list.map((p, i) => {
    const key = `${keyBase}${i}`;
    if (p.kind === "text") return <React.Fragment key={key}>{p.text}</React.Fragment>;
    if (p.kind === "emoji")
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={p.emoji.image}
          alt={p.emoji.name}
          title={p.emoji.name}
          loading="lazy"
          draggable={false}
          className="inline-block h-[1.35em] w-[1.35em] align-[-0.3em] object-contain mx-[0.05em]"
        />
      );
    const external = isExternal(p.href);
    return (
      <a
        key={key}
        href={p.href}
        className={LINK_CLASS}
        {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
      >
        {renderPieces(p.label, `${key}-`)}
      </a>
    );
  });
}

/**
 * Text with :e12: codes drawn as emoji pictures. Unknown ids (deleted emojis) stay as written.
 * With `links` (blog text), [text](url) is drawn as a link.
 */
export function EmojiText({ text, emojis, links = false }: { text: string; emojis?: EmojiOut[]; links?: boolean }) {
  const map = useEmojiMap(emojis);
  if (!text.includes(":") && !(links && text.includes("]("))) return <>{text}</>;
  return <>{renderPieces(pieces(text, map, links))}</>;
}

/* ---------- editing: a field that shows emoji pictures while typing ---------- */

/** What an EmojiInput lets a picker button do. */
export interface EmojiInputHandle {
  insert: (emoji: EmojiOut) => void;
  focus: () => void;
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const IMG_CLASS = "inline-block h-[1.35em] w-[1.35em] align-[-0.3em] object-contain mx-[0.05em]";

function emojiImg(emoji: EmojiOut): HTMLImageElement {
  const img = document.createElement("img");
  img.src = emoji.image;
  img.alt = emoji.name;
  img.dataset.code = emojiCode(emoji);
  img.draggable = false;
  img.className = IMG_CLASS;
  return img;
}

const escapeAttr = (t: string) => escapeHtml(t).replace(/"/g, "&quot;");

/** Text with :e12: codes (and [text](url) links) → HTML for the editable field. */
function toHtml(text: string, map: Map<number, EmojiOut>, links = false): string {
  const draw = (list: Piece[]): string =>
    list
      .map((p) =>
        p.kind === "text"
          ? escapeHtml(p.text)
          : p.kind === "emoji"
            ? `<img src="${escapeAttr(p.emoji.image)}" alt="${escapeAttr(p.emoji.name)}" data-code="${emojiCode(p.emoji)}" draggable="false" class="${IMG_CLASS}">`
            : `<a href="${escapeAttr(p.href)}" data-href="${escapeAttr(p.href)}" title="${escapeAttr(p.href)}" class="${LINK_CLASS}">${draw(p.label)}</a>`
      )
      .join("");
  return draw(pieces(text, map, links)).replace(/\n/g, "<br>");
}

/** The editable field's content back to plain text with :e12: codes. */
function toText(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? "").replace(/ /g, " ");
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "IMG") {
      if (node.dataset.code) out += `:${node.dataset.code}:`;
      return;
    }
    if (node.tagName === "BR") {
      out += "\n";
      return;
    }
    const href = node.tagName === "A" ? node.dataset.href || node.getAttribute("href") : null;
    if (href && !node.parentElement?.closest("a")) {
      const before = out;
      out = "";
      node.childNodes.forEach(walk);
      const label = out.replace(/[\]\n]/g, " ");
      out = before + (label.trim() ? `[${label}](${href})` : "");
      return;
    }
    const block = node !== root && (node.tagName === "DIV" || node.tagName === "P");
    if (block && out && !out.endsWith("\n")) out += "\n";
    node.childNodes.forEach(walk);
  };
  walk(root);
  return out.replace(/\n$/, "");
}

/**
 * A text field (like a textarea) that shows site emojis as pictures while typing. The value is plain text with
 * :e12: codes, the same as what is saved and shown on the site. Pasting keeps plain text only.
 */
export function EmojiInput({
  ref,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
  emojis,
  links = false,
}: {
  ref?: React.Ref<EmojiInputHandle>;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  emojis?: EmojiOut[];
  /** Blog text: select some text and press Ctrl+L (⌘L) to make it a link; again on a link removes it. */
  links?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const list = useSiteEmojis(emojis);
  const map = useMemo(() => new Map(list.map((e) => [e.id, e])), [list]);

  // Show the value; skip when it is what the field already holds (typing), so the cursor never jumps.
  // When the emoji list arrives (it loads after the field), draw again so the codes become pictures.
  const drawnWith = useRef<Map<number, EmojiOut> | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (toText(el) !== value || drawnWith.current !== map) {
      el.innerHTML = toHtml(value, map, links);
      drawnWith.current = map;
    }
  }, [value, map, links]);

  // Remember the cursor while the field has it: a picker button takes the focus away before it inserts.
  useEffect(() => {
    const keep = () => {
      const sel = window.getSelection();
      const el = box.current;
      if (el && sel && sel.rangeCount && el.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", keep);
    return () => document.removeEventListener("selectionchange", keep);
  }, []);

  const emit = () => {
    const el = box.current;
    if (!el) return;
    // Everything deleted: drop the leftover <br> so the placeholder shows again.
    if (!el.textContent && !el.querySelector("img")) el.innerHTML = "";
    onChange(toText(el));
  };

  /** Ctrl+L: the selection becomes a link (its own text if that is an address, else asks for one); on a link, unlinks. */
  const toggleLink = () => {
    const el = box.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    const startEl = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const existing = startEl?.closest("a");
    if (existing && el.contains(existing)) {
      const parent = existing.parentNode!;
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      emit();
      return;
    }
    if (range.collapsed) return;
    const selected = range.toString();
    let href = toHref(selected);
    if (!href) {
      const typed = window.prompt("Link address (https://…)", "https://");
      if (typed === null) return;
      href = toHref(typed);
      if (!href) return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.dataset.href = href;
    a.title = href;
    a.className = LINK_CLASS;
    a.appendChild(range.extractContents());
    a.querySelectorAll("a").forEach((inner) => inner.replaceWith(...Array.from(inner.childNodes)));
    range.insertNode(a);
    // put the cursor just after the link, outside it, so further typing is plain text
    const after = document.createTextNode("");
    a.after(after);
    const next = document.createRange();
    next.setStart(after, 0);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
    emit();
  };

  useImperativeHandle(ref, () => ({
    focus: () => box.current?.focus(),
    insert: (emoji: EmojiOut) => {
      const el = box.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      let range = saved.current && el.contains(saved.current.startContainer) ? saved.current : null;
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      range.deleteContents();
      const img = emojiImg(emoji);
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      saved.current = range.cloneRange();
      emit();
    },
  }));

  return (
    <div
      ref={box}
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={emit}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
      onClick={(e) => {
        // a link in the field is for editing: ctrl/⌘-click opens it, a plain click only places the cursor
        const a = (e.target as HTMLElement).closest("a");
        if (!a) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) window.open(a.getAttribute("href") ?? "", "_blank", "noopener,noreferrer");
      }}
      onKeyDown={(e) => {
        if (links && (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "l") {
          e.preventDefault();
          toggleLink();
          return;
        }
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          document.execCommand("insertLineBreak");
        }
      }}
      style={{ minHeight: `${rows * 1.6 + 1.6}em` }}
      className={`emoji-input whitespace-pre-wrap break-words overflow-y-auto max-h-80 cursor-text ${className}`}
    />
  );
}

/** Smiley button with a searchable emoji grid; the picked emoji goes into the EmojiInput at its cursor. */
export function EmojiPickerButton({
  target,
  emojis,
  align = "left",
  className = "",
}: {
  target: React.RefObject<EmojiInputHandle | null>;
  emojis?: EmojiOut[];
  align?: "left" | "right";
  className?: string;
}) {
  const list = useSiteEmojis(emojis);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
  }, [list, search]);

  /* A tap anywhere outside closes the grid and still reaches what was tapped (e.g. "Post Comment"). */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div ref={box} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSearch("");
        }}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
        title="Insert emoji"
        aria-label="Insert emoji"
        aria-expanded={open}
      >
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} bottom-full mb-2 w-[min(20rem,calc(100vw-2rem))] p-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl z-40`}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emoji…"
              aria-label="Search emoji"
              className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          {list.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)]">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)]">No emoji found</div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto overscroll-contain pr-0.5">
              {filtered.map((emoji) => (
                <button
                  key={emoji.id}
                  type="button"
                  // keep the field's cursor: do not take the focus on press
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => target.current?.insert(emoji)}
                  className="aspect-square rounded-lg flex items-center justify-center hover:bg-orange-500/10 transition-colors"
                  title={emoji.name}
                  aria-label={emoji.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={emoji.image} alt="" loading="lazy" className="w-6 h-6 object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
