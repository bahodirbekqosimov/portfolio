"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Reply,
  Trash2,
  Edit2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  X,
  Flag,
} from "lucide-react";
import { CommentOut, CommentReply, Page } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmojiInput, EmojiPickerButton, EmojiText, type EmojiInputHandle } from "@/components/EmojiText";
import LoginPromptModal from "@/components/LoginPromptModal";
import { confirmDialog, notify } from "@/lib/dialog";

interface BlogCommentsProps {
  slug: string;
  initialCommentsCount: number;
}

export default function BlogComments({ slug, initialCommentsCount }: BlogCommentsProps) {
  const { user, isAuthenticated } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<CommentOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCommentsCount);

  // New comment input
  const [newCommentText, setNewCommentText] = useState("");
  const newCommentRef = useRef<EmojiInputHandle>(null);
  const replyRef = useRef<EmojiInputHandle>(null);
  const editRef = useRef<EmojiInputHandle>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reply state: parent comment ID
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // Edit state: comment or reply ID
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // Complaint modal
  const [complaintTargetId, setComplaintTargetId] = useState<number | null>(null);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  // Login prompt modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalAction, setModalAction] = useState("");

  // Fetch comments from API
  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await api.get<Page<CommentOut>>(`/api/v1/blog_posts/${slug}/comments/?page=1&size=50`);
      setComments(data.items);
      // Sarlavhadagi son server bilan bir xil bo'lsin: o'chirilmagan commentlar + javoblar.
      if (data.items.length >= data.total) {
        const visible = data.items.reduce(
          (sum, c) => sum + (c.is_deleted ? 0 : 1) + c.replies.filter((r) => !r.is_deleted).length,
          0
        );
        setTotalComments(visible);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, slug]);

  // Create root comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setModalAction("post a comment");
      setShowLoginModal(true);
      return;
    }
    if (!newCommentText.trim()) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      await api.post(`/api/v1/blog_posts/${slug}/comments/`, {
        text: newCommentText.trim(),
        parent_id: null,
      });
      setNewCommentText("");
      await loadComments();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Create reply
  const handleCreateReply = async (parentId: number) => {
    if (!isAuthenticated) {
      setModalAction("reply to this comment");
      setShowLoginModal(true);
      return;
    }
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await api.post(`/api/v1/blog_posts/${slug}/comments/`, {
        text: replyText.trim(),
        parent_id: parentId,
      });
      setReplyText("");
      setReplyingToId(null);
      await loadComments();
    } catch (err: any) {
      notify(err.message || "Failed to reply");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit comment
  const handleSaveEdit = async (commentId: number) => {
    if (!editText.trim()) return;
    try {
      await api.patch(`/api/v1/comments/${commentId}/`, {
        text: editText.trim(),
      });
      setEditingId(null);
      setEditText("");
      await loadComments();
    } catch (err: any) {
      notify(err.message || "Failed to update comment");
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!(await confirmDialog("Are you sure you want to delete this comment?"))) return;
    try {
      await api.delete(`/api/v1/comments/${commentId}/`);
      await loadComments();
    } catch (err: any) {
      notify(err.message || "Failed to delete comment");
    }
  };

  // Report complaint
  const handleReportComment = async () => {
    if (!complaintTargetId || !complaintReason.trim()) return;
    setComplaintSubmitting(true);
    try {
      const res = await api.post<{ complaints_count: number; comment_deleted: boolean }>(
        `/api/v1/comments/${complaintTargetId}/complaints/`,
        { reason: complaintReason.trim() }
      );
      notify(
        res.comment_deleted
          ? "Comment has been automatically removed due to community reports."
          : "Complaint reported. Thank you for helping keep the discussion civil.",
        "success"
      );
      setComplaintTargetId(null);
      setComplaintReason("");
      await loadComments();
    } catch (err: any) {
      notify(err.message || "Failed to submit report");
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="border-t border-[var(--border-color)] pt-8 mt-12 space-y-6">
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign In to Comment"
        message={`Please log in to ${modalAction}. Your account helps maintain a thoughtful discussion.`}
      />

      {/* Complaint Dialog */}
      {complaintTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" />
              Report Comment
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Specify reason for reporting this comment (e.g. spam, harassment, inappropriate):
            </p>
            <textarea
              value={complaintReason}
              onChange={(e) => setComplaintReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setComplaintTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--text-main)]"
              >
                Cancel
              </button>
              <button
                onClick={handleReportComment}
                disabled={complaintSubmitting || !complaintReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {complaintSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold text-[var(--text-main)] hover:text-orange-500 transition-colors"
        >
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <span>Comments ({totalComments})</span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs sm:text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            Leave a response
          </button>
        )}
      </div>

      {/* Expanded Comments Section */}
      {isExpanded && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Comments List */}
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            /* REQUIREMENT: If there are no comments, display exactly: "Be the first to leave a comment." */
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm font-medium text-[var(--text-muted)]">
              Be the first to leave a comment.
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((rootComment) => (
                <div
                  key={rootComment.id}
                  className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4"
                >
                  {/* Root Comment Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {rootComment.user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rootComment.user.avatar}
                          alt={rootComment.user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-xs font-bold">
                          {rootComment.user?.name ? rootComment.user.name.charAt(0) : "A"}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-[var(--text-main)]">
                          {rootComment.is_deleted ? "[deleted]" : rootComment.user?.name || "Anonymous"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {formatDate(rootComment.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    {!rootComment.is_deleted && (
                      <div className="flex items-center gap-2">
                        {user && user.id === rootComment.user?.id ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(rootComment.id);
                                setEditText(rootComment.text || "");
                              }}
                              className="p-1 text-[var(--text-muted)] hover:text-orange-500 transition-colors"
                              title="Edit comment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(rootComment.id)}
                              className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              if (!isAuthenticated) {
                                setModalAction("report this comment");
                                setShowLoginModal(true);
                              } else {
                                setComplaintTargetId(rootComment.id);
                              }
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                            title="Report comment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Root Comment Content */}
                  {editingId === rootComment.id ? (
                    <div className="space-y-2">
                      <EmojiInput
                        ref={editRef}
                        value={editText}
                        onChange={setEditText}
                        className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <EmojiPickerButton target={editRef} className="mr-auto" />
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border-color)]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(rootComment.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-sm leading-relaxed ${
                        rootComment.is_deleted
                          ? "italic text-[var(--text-muted)]"
                          : "text-[var(--text-main)]"
                      }`}
                    >
                      {rootComment.is_deleted
                        ? "This comment was removed."
                        : <EmojiText text={rootComment.text || ""} />}
                    </p>
                  )}

                  {/* Reply Action */}
                  {!rootComment.is_deleted && (
                    <div>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            setModalAction("reply to this comment");
                            setShowLoginModal(true);
                          } else {
                            setReplyingToId(
                              replyingToId === rootComment.id ? null : rootComment.id
                            );
                            setReplyText("");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Reply
                      </button>

                      {/* Reply Input Box */}
                      {replyingToId === rootComment.id && (
                        <div className="mt-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2 animate-in fade-in">
                          <EmojiInput
                            ref={replyRef}
                            value={replyText}
                            onChange={setReplyText}
                            placeholder={`Reply to ${rootComment.user?.name || "comment"}...`}
                            className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <EmojiPickerButton target={replyRef} className="mr-auto" />
                            <button
                              onClick={() => setReplyingToId(null)}
                              className="px-3 py-1 rounded-lg text-xs font-medium border border-[var(--border-color)]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCreateReply(rootComment.id)}
                              disabled={submitting || !replyText.trim()}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                            >
                              {submitting ? "Replying..." : "Post Reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nested Replies */}
                  {rootComment.replies && rootComment.replies.length > 0 && (
                    <div className="pl-4 sm:pl-6 border-l-2 border-orange-500/20 space-y-3 pt-2">
                      {rootComment.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {reply.user?.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={reply.user.avatar}
                                  alt={reply.user.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-[10px] font-bold">
                                  {reply.user?.name ? reply.user.name.charAt(0) : "A"}
                                </div>
                              )}
                              <span className="text-xs font-bold text-[var(--text-main)]">
                                {reply.is_deleted ? "[deleted]" : reply.user?.name || "Anonymous"}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>

                            {!reply.is_deleted && (
                              <div className="flex items-center gap-1.5">
                                {user && user.id === reply.user?.id ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingId(reply.id);
                                        setEditText(reply.text || "");
                                      }}
                                      className="p-1 text-[var(--text-muted)] hover:text-orange-500"
                                      title="Edit reply"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-[var(--text-muted)] hover:text-red-500"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (!isAuthenticated) {
                                        setModalAction("report this reply");
                                        setShowLoginModal(true);
                                      } else {
                                        setComplaintTargetId(reply.id);
                                      }
                                    }}
                                    className="p-1 text-[var(--text-muted)] hover:text-red-500"
                                    title="Report reply"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {editingId === reply.id ? (
                            <div className="space-y-2">
                              <EmojiInput
                                ref={editRef}
                                value={editText}
                                onChange={setEditText}
                                className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2">
                                <EmojiPickerButton target={editRef} className="mr-auto" />
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1 rounded text-[10px] border border-[var(--border-color)]"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(reply.id)}
                                  className="px-2.5 py-1 rounded text-[10px] bg-orange-600 text-white"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className={`text-xs leading-relaxed ${
                                reply.is_deleted
                                  ? "italic text-[var(--text-muted)]"
                                  : "text-[var(--text-main)]"
                              }`}
                            >
                              {reply.is_deleted ? "This reply was removed." : <EmojiText text={reply.text || ""} />}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bottom Comment Input Form */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-[var(--text-main)]">Leave a response</h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateComment} className="space-y-3">
              <EmojiInput
                ref={newCommentRef}
                value={newCommentText}
                onChange={setNewCommentText}
                placeholder={
                  isAuthenticated
                    ? "Share your perspective or ask a question..."
                    : "Sign in to write a comment..."
                }
                rows={3}
                className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {isAuthenticated && (
                    <EmojiPickerButton target={newCommentRef} />
                  )}
                  {isAuthenticated
                    ? `Posting as ${user?.name}`
                    : "You will be prompted to sign in"}
                </span>

                <button
                  type="submit"
                  disabled={submitting || (isAuthenticated && !newCommentText.trim())}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Sending..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
