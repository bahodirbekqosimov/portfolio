"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, X, LogIn, UserPlus } from "lucide-react";

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  title = "Sign In Required",
  message = "Please sign in to react, leave comments, and save bookmarks.",
}: LoginPromptModalProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  const loginUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
  const registerUrl = `/auth/register?redirect=${encodeURIComponent(pathname)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">{title}</h3>
            <p className="text-xs text-[var(--text-muted)]">Join the conversation</p>
          </div>
        </div>

        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href={loginUrl}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>

          <Link
            href={registerUrl}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] transition-colors"
          >
            <UserPlus className="w-4 h-4 text-orange-500" />
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
