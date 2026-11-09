"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  User,
  CornerDownRight,
} from "lucide-react";

export interface CommentContextItem {
  id: string;
  postId?: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: "PENDING" | "APPROVED" | "SPAM";
  isAuthorReply?: boolean;
  createdAt?: string;
  post?: {
    id?: string;
    title: string;
    slug?: string;
  };
}

export interface CommentReplyModalProps {
  comment: CommentContextItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CommentReplyModal({
  comment,
  isOpen,
  onClose,
  onSuccess,
}: CommentReplyModalProps) {
  const [authorName, setAuthorName] = useState<string>("Admin");
  const [authorEmail, setAuthorEmail] = useState<string>("admin@blog.local");
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form whenever a new comment is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthorName("Admin");
      setAuthorEmail("admin@blog.local");
      setContent("");
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, comment]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !comment) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedContent = content.trim();
    if (trimmedContent.length < 2) {
      setErrorMessage("Konten balasan minimal 2 karakter");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/comments/${comment.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorName: authorName.trim() || "Admin",
          authorEmail: authorEmail.trim() || "admin@blog.local",
          content: trimmedContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal mengirim balasan sebagai author");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat membalas komentar";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <CornerDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="reply-modal-title"
                className="text-base font-bold text-gray-900 dark:text-gray-100"
              >
                Balas Komentar
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kirim balasan resmi dengan penanda identitas author blog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Article Reference */}
          {comment.post && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 text-xs font-medium">
              <FileText className="w-4 h-4 flex-shrink-0 text-indigo-500" />
              <span className="truncate">
                Artikel: <span className="font-semibold">{comment.post.title}</span>
              </span>
            </div>
          )}

          {/* Original Comment Quote */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>{comment.authorName}</span>
                <span className="font-normal text-gray-400">({comment.authorEmail})</span>
              </div>
              <Badge
                variant={
                  comment.status === "APPROVED"
                    ? "success"
                    : comment.status === "SPAM"
                    ? "danger"
                    : "warning"
                }
              >
                {comment.status === "APPROVED"
                  ? "Disetujui"
                  : comment.status === "SPAM"
                  ? "Spam"
                  : "Menunggu"}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-3 leading-relaxed">
              &ldquo;{comment.content}&rdquo;
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Author / Admin"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Admin"
              disabled={isSubmitting}
              required
            />
            <Input
              label="Email Balasan"
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="admin@blog.local"
              disabled={isSubmitting}
              required
            />
          </div>

          <Textarea
            label="Isi Balasan Admin"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tuliskan balasan teknis atau tanggapan resmi Anda di sini..."
            rows={4}
            disabled={isSubmitting}
            required
          />

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Balasan ini akan otomatis disetujui (<code className="text-indigo-600 dark:text-indigo-400">APPROVED</code>) dan memiliki tanda khusus identitas author (<code className="text-indigo-600 dark:text-indigo-400">isAuthorReply: true</code>).
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || content.trim().length < 2}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Balasan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
