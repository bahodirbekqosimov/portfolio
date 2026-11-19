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

/** Text with :e12: codes drawn as emoji pictures. Unknown ids (deleted emojis) stay as written. */
export function EmojiText({ text, emojis }: { text: string; emojis?: EmojiOut[] }) {
  const map = useEmojiMap(emojis);
  if (!text.includes(":") || map.size === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(CODE)) {
    const emoji = map.get(Number(match[1]));
    if (!emoji) continue;
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={at}
        src={emoji.image}
        alt={emoji.name}
        title={emoji.name}
        loading="lazy"
        draggable={false}
        className="inline-block h-[1.35em] w-[1.35em] align-[-0.3em] object-contain mx-[0.05em]"
      />
    );
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
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

/** Text with :e12: codes → HTML for the editable field (emoji pictures, line breaks). */
function toHtml(text: string, map: Map<number, EmojiOut>): string {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(CODE)) {
    const emoji = map.get(Number(match[1]));
    if (!emoji) continue;
    const at = match.index ?? 0;
    html += escapeHtml(text.slice(last, at));
    html += `<img src="${escapeHtml(emoji.image)}" alt="${escapeHtml(emoji.name)}" data-code="${emojiCode(emoji)}" draggable="false" class="${IMG_CLASS}">`;
    last = at + match[0].length;
  }
  html += escapeHtml(text.slice(last));
  return html.replace(/\n/g, "<br>");
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
}: {
  ref?: React.Ref<EmojiInputHandle>;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  emojis?: EmojiOut[];
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
      el.innerHTML = toHtml(value, map);
      drawnWith.current = map;
    }
  }, [value, map]);

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
      onKeyDown={(e) => {
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
