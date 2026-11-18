"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { ConfirmRequest, Notice, registerDialogHost } from "@/lib/dialog";

const NOTICE_TIMEOUT_MS = 6000;

export default function DialogHost() {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const current = queue[0];

  useEffect(
    () =>
      registerDialogHost({
        confirm: (request) => setQueue((q) => [...q, request]),
        notify: (notice) => {
          setNotices((list) => [...list.slice(-3), notice]);
          setTimeout(() => setNotices((list) => list.filter((n) => n.id !== notice.id)), NOTICE_TIMEOUT_MS);
        },
      }),
    []
  );

  useEffect(() => {
    if (current) confirmButton.current?.focus();
  }, [current]);

  const answer = (ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  const danger = current?.danger ?? true;

  return (
    <>
      {current && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => answer(false)}
          onKeyDown={(e) => e.key === "Escape" && answer(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-message"
            className="w-full max-w-sm p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`shrink-0 p-2 rounded-xl ${
                  danger ? "bg-red-500/15 text-red-500" : "bg-orange-500/15 text-orange-500"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 id="dialog-title" className="text-base font-bold text-[var(--text-main)]">
                  {current.title ?? "Are you sure?"}
                </h2>
                <p id="dialog-message" className="text-sm text-[var(--text-muted)] break-words">
                  {current.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => answer(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
              >
                {current.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmButton}
                onClick={() => answer(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {current.confirmLabel ?? (danger ? "Delete" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-20 right-4 left-4 sm:left-auto z-[110] flex flex-col items-end gap-2 pointer-events-none">
        {notices.map((notice) => {
          const styles = {
            error: "border-red-500/40 text-red-500",
            success: "border-green-500/40 text-green-500",
            info: "border-orange-500/40 text-orange-500",
          }[notice.kind];
          const Icon = { error: XCircle, success: CheckCircle2, info: Info }[notice.kind];
          return (
            <div
              key={notice.id}
              role={notice.kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto w-full sm:w-80 flex items-start gap-2.5 p-3 rounded-xl border bg-[var(--bg-card)] shadow-xl ${styles}`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1 text-xs text-[var(--text-main)] break-words">{notice.message}</span>
              <button
                onClick={() => setNotices((list) => list.filter((n) => n.id !== notice.id))}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
