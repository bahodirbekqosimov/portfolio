"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search, Smile } from "lucide-react";
import { EmojiOut, ReactionSummary } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import LoginPromptModal from "@/components/LoginPromptModal";

interface BlogReactionsProps {
  slug: string;
  initialReactions: ReactionSummary[];
  availableEmojis: EmojiOut[];
}

export default function BlogReactions({
  slug,
  initialReactions,
  availableEmojis,
}: BlogReactionsProps) {
  const { isAuthenticated } = useAuth();
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingEmojiId, setLoadingEmojiId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [search, setSearch] = useState("");

  const closePicker = () => {
    setShowPicker(false);
    setSearch("");
  };

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? availableEmojis.filter((e) => e.name.toLowerCase().includes(q)) : availableEmojis;
  }, [availableEmojis, search]);

  // A user has at most one reaction per post; highlight it in the picker.
  const myEmojiId = reactions.find((r) => r.reacted_by_me)?.emoji_id ?? null;

  const handleToggleReaction = async (emojiId: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setLoadingEmojiId(emojiId);
    closePicker();
    try {
      const res = await api.post<{ reacted: boolean; reactions: ReactionSummary[] }>(
        `/api/v1/blog_posts/${slug}/reactions/`,
        { emoji_id: emojiId }
      );
      setReactions(res.reactions);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    } finally {
      setLoadingEmojiId(null);
    }
  };

  // Only display reactions where count > 0
  const activeReactions = reactions.filter((r) => r.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign In to React"
        message="Please sign in to react to this article and join the community."
      />

      {/* Render existing reactions with count > 0 */}
      {activeReactions.map((r) => (
        <button
          key={r.emoji_id}
          onClick={() => handleToggleReaction(r.emoji_id)}
          disabled={loadingEmojiId === r.emoji_id}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all ${
            r.reacted_by_me
              ? "bg-orange-500/15 border-orange-500 text-orange-500 shadow-sm"
              : "border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]"
          }`}
          title={`React with ${r.name}`}
        >
          {r.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.image} alt={r.name} className="w-4 h-4 object-contain inline-block" />
          ) : (
            <span>{r.name}</span>
          )}
          <span className="font-semibold">{r.count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => {
            if (!isAuthenticated) {
              setShowLoginModal(true);
            } else {
              setShowPicker(!showPicker);
            }
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-orange-500 transition-colors"
          title="Add a reaction"
        >
          <Smile className="w-4 h-4" />
          <span>React</span>
          <Plus className="w-3 h-3" />
        </button>

        {/* Emoji Picker Popup: compact, searchable, scrolls inside */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={closePicker} />
            <div
              className="absolute left-0 bottom-full mb-2 w-[min(20rem,calc(100vw-2rem))] p-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl z-40 animate-in fade-in zoom-in-95"
              onKeyDown={(e) => e.key === "Escape" && closePicker()}
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
              {filteredEmojis.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">No emoji found</div>
              ) : (
                <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto overscroll-contain pr-0.5">
                  {filteredEmojis.map((emoji) => (
                    <button
                      key={emoji.id}
                      onClick={() => handleToggleReaction(emoji.id)}
                      className={`aspect-square rounded-lg flex items-center justify-center transition-colors ${
                        emoji.id === myEmojiId
                          ? "bg-orange-500/20 ring-1 ring-orange-500"
                          : "hover:bg-orange-500/10"
                      }`}
                      title={emoji.name}
                      aria-label={emoji.name}
                    >
                      {emoji.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={emoji.image}
                          alt=""
                          loading="lazy"
                          className="w-6 h-6 object-contain hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="text-base">{emoji.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
