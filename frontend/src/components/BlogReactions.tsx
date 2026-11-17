"use client";

import React, { useState } from "react";
import { Plus, Smile } from "lucide-react";
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

  const handleToggleReaction = async (emojiId: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setLoadingEmojiId(emojiId);
    setShowPicker(false);
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

        {/* Emoji Picker Popup */}
        {showPicker && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowPicker(false)} />
            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl z-40 animate-in fade-in zoom-in-95">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Choose a reaction
              </div>
              <div className="grid grid-cols-4 gap-2">
                {availableEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    onClick={() => handleToggleReaction(emoji.id)}
                    className="p-2 rounded-xl hover:bg-orange-500/10 border border-transparent hover:border-orange-500/30 flex flex-col items-center justify-center transition-all group"
                    title={emoji.name}
                  >
                    {emoji.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={emoji.image}
                        alt={emoji.name}
                        className="w-6 h-6 object-contain group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <span className="text-base">{emoji.name}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
