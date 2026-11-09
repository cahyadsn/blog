"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CommentReplyModal,
  CommentContextItem,
} from "@/components/admin/CommentReplyModal";
import {
  Check,
  AlertTriangle,
  Trash2,
  CornerDownRight,
  Sparkles,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  Clock,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";

export type CommentStatus = "PENDING" | "APPROVED" | "SPAM";
export type StatusFilterTab = "ALL" | "PENDING" | "APPROVED" | "SPAM";

export interface CommentItem {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: CommentStatus;
  isAuthorReply: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  post?: {
    id: string;
    title: string;
    slug: string;
  };
  parent?: {
    id: string;
    authorName: string;
  } | null;
}

export interface CommentCounts {
  ALL: number;
  PENDING: number;
  APPROVED: number;
  SPAM: number;
}

export interface CommentListProps {
  onCountsUpdate?: (counts: CommentCounts) => void;
}

export function CommentList({ onCountsUpdate }: CommentListProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Status Filter: "ALL" | "PENDING" | "APPROVED" | "SPAM"
  const [statusFilter, setStatusFilter] = useState<StatusFilterTab>("ALL");

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Counts across categories
  const [counts, setCounts] = useState<CommentCounts>({
    ALL: 0,
    PENDING: 0,
    APPROVED: 0,
    SPAM: 0,
  });

  // Modal reply state
  const [replyingComment, setReplyingComment] = useState<CommentContextItem | null>(null);

  // In-flight action tracking
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U"
    );
  };

  // Fetch all comments once to calculate tab counts accurately
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/comments?status=ALL");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.comments)) {
        const all: CommentItem[] = data.comments;
        const newCounts: CommentCounts = {
          ALL: all.length,
          PENDING: all.filter((c) => c.status === "PENDING").length,
          APPROVED: all.filter((c) => c.status === "APPROVED").length,
          SPAM: all.filter((c) => c.status === "SPAM").length,
        };
        setCounts(newCounts);
        if (onCountsUpdate) {
          onCountsUpdate(newCounts);
        }
      }
    } catch {
      // counts error silently ignored
    }
  }, [onCountsUpdate]);

  // Fetch comments matching current filter
  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/comments?status=${statusFilter}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengambil daftar komentar");
      }

      setComments(data.comments || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat komentar";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  // Initial and reactive load
  useEffect(() => {
    fetchComments();
    fetchCounts();
  }, [fetchComments, fetchCounts]);

  // Clear success notification after 4 seconds
  useEffect(() => {
    if (successNotification) {
      const timer = setTimeout(() => {
        setSuccessNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successNotification]);

  // Action: Approve or Mark Spam
  const handleStatusChange = async (id: string, newStatus: "APPROVED" | "SPAM") => {
    setActionInProgressId(id);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status komentar");
      }

      // Optimistically update list
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );

      setSuccessNotification(
        newStatus === "APPROVED"
          ? "Komentar berhasil disetujui dan dipublikasikan."
          : "Komentar berhasil ditandai sebagai spam."
      );

      // Refresh counts and re-fetch to respect filter
      fetchCounts();
      if (statusFilter !== "ALL") {
        fetchComments();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui status komentar";
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Delete comment
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus komentar ini secara permanen? Balasan di bawah komentar ini juga akan ikut terhapus."
    );

    if (!confirmed) return;

    setActionInProgressId(id);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus komentar");
      }

      // Remove from list
      setComments((prev) => prev.filter((c) => c.id !== id));
      setSuccessNotification("Komentar berhasil dihapus dari sistem.");

      fetchCounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus komentar";
      setErrorMessage(msg);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Filter comments locally by search query
  const filteredComments = comments.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      c.authorName.toLowerCase().includes(query) ||
      c.authorEmail.toLowerCase().includes(query) ||
      c.content.toLowerCase().includes(query) ||
      (c.post?.title && c.post.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Notifications */}
      {successNotification && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{successNotification}</span>
          </div>
          <button
            onClick={() => setSuccessNotification(null)}
            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-md text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Semua</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {counts.ALL}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Menunggu Moderasi</span>
            {counts.PENDING > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                {counts.PENDING}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("APPROVED")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "APPROVED"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Disetujui</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {counts.APPROVED}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("SPAM")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "SPAM"
                ? "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Spam</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {counts.SPAM}
            </span>
          </button>
        </div>

        {/* Search & Refresh Actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari komentar atau author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchComments();
              fetchCounts();
            }}
            disabled={isLoading}
            className="h-9 px-3"
            title="Segarkan data komentar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredComments.length === 0 && (
        <Card className="text-center py-12 px-4 border-dashed border-2">
          <CardContent className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Tidak Ada Komentar
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {searchQuery
                ? `Tidak ditemukan komentar dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
                : statusFilter === "PENDING"
                ? "Bagus sekali! Tidak ada komentar baru yang menunggu moderasi."
                : statusFilter === "SPAM"
                ? "Tidak ada komentar yang terdeteksi atau ditandai sebagai spam."
                : "Belum ada komentar pembaca pada blog."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-2"
              >
                Hapus Pencarian
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comment Items List */}
      {!isLoading && filteredComments.length > 0 && (
        <div className="space-y-4">
          {filteredComments.map((comment) => {
            const isActing = actionInProgressId === comment.id;

            return (
              <Card
                key={comment.id}
                className={`transition-all ${
                  comment.status === "PENDING"
                    ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
                    : comment.status === "SPAM"
                    ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/10 opacity-75"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                <CardContent className="p-5 space-y-3.5">
                  {/* Header: Author Info, Status, Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                          comment.isAuthorReply
                            ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {getInitials(comment.authorName)}
                      </div>

                      {/* Author Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {comment.authorName}
                          </span>

                          {comment.isAuthorReply && (
                            <Badge
                              variant="default"
                              className="bg-indigo-600 text-white border-transparent text-[10px] py-0 px-2 flex items-center gap-1"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Balasan Author</span>
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {comment.authorEmail}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Timestamp */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-gray-400">
                        {formatDate(comment.createdAt)}
                      </span>
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
                          : "Menunggu Moderasi"}
                      </Badge>
                    </div>
                  </div>

                  {/* Context: Related Post & Parent Comment */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {comment.post && (
                      <Link
                        href={`/blog/${comment.post.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium group"
                      >
                        <span>Artikel: {comment.post.title}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-indigo-500" />
                      </Link>
                    )}

                    {comment.parent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        <CornerDownRight className="w-3 h-3" />
                        <span>Membalas @{comment.parent.authorName}</span>
                      </span>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                    {/* Primary Moderation Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Setujui button */}
                      {comment.status !== "APPROVED" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(comment.id, "APPROVED")}
                          disabled={isActing}
                          className="h-8 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Setujui</span>
                        </Button>
                      )}

                      {/* Tandai Spam button */}
                      {comment.status !== "SPAM" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(comment.id, "SPAM")}
                          disabled={isActing}
                          className="h-8 text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5"
                        >
                          {isActing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          <span>Tandai Spam</span>
                        </Button>
                      )}

                      {/* Balas sebagai Author button */}
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setReplyingComment(comment)}
                        disabled={isActing}
                        className="h-8 text-xs gap-1.5"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Balas sebagai Author</span>
                      </Button>
                    </div>

                    {/* Destructive Action */}
                    <div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        disabled={isActing}
                        className="h-8 text-xs gap-1.5"
                        title="Hapus komentar ini"
                      >
                        {isActing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      <CommentReplyModal
        comment={replyingComment}
        isOpen={!!replyingComment}
        onClose={() => setReplyingComment(null)}
        onSuccess={() => {
          setSuccessNotification("Balasan resmi author berhasil dikirim dan dipublikasikan.");
          fetchComments();
          fetchCounts();
        }}
      />
    </div>
  );
}
