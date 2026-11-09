"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PostEditor, PostItem } from "@/components/admin/PostEditor";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Calendar,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  X,
  Layers,
} from "lucide-react";

export type StatusFilterType = "all" | "published" | "draft";

export interface PostListProps {
  onPostSelect?: (post: PostItem) => void;
}

export function PostList({ onPostSelect }: PostListProps) {
  // Posts data & loading state
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  // Editor mode state: "list" | "create" | "edit"
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);

  // In-flight action loading states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts from API
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`/api/admin/posts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengambil daftar artikel");
      }

      setPosts(data.posts || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat artikel";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Quick toggle published status
  const handleTogglePublish = async (post: PostItem) => {
    if (!post.id) return;
    const targetId = post.id;
    const nextStatus = !post.published;

    setTogglingId(targetId);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/posts/${targetId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status publikasi");
      }

      // Optimistically update local posts list
      setPosts((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, published: nextStatus } : p))
      );

      setSuccessNotification(
        nextStatus
          ? `Artikel "${post.title}" berhasil dipublikasikan!`
          : `Artikel "${post.title}" diubah menjadi draf.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status artikel";
      setErrorMessage(msg);
    } finally {
      setTogglingId(null);
    }
  };

  // Delete post with confirmation
  const handleDeletePost = async (post: PostItem) => {
    if (!post.id) return;

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus artikel "${post.title}"?\n\nSemua data tag, riwayat komentar, dan balasan terkait akan dihapus permanen.`
    );

    if (!confirmed) return;

    const targetId = post.id;
    setDeletingId(targetId);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/posts/${targetId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus artikel");
      }

      setPosts((prev) => prev.filter((p) => p.id !== targetId));
      setSuccessNotification(`Artikel "${post.title}" berhasil dihapus.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus artikel";
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Switch to create mode
  const handleOpenCreate = () => {
    setSelectedPost(null);
    setMode("create");
  };

  // Switch to edit mode
  const handleOpenEdit = (post: PostItem) => {
    setSelectedPost(post);
    setMode("edit");
    if (onPostSelect) onPostSelect(post);
  };

  // Helper to extract clean tag list
  const getTagList = (post: PostItem): string[] => {
    if (!post.tags) return [];
    return post.tags
      .map((t) => {
        if (typeof t === "string") return t;
        return t.tag?.name || t.name || "";
      })
      .filter(Boolean);
  };

  // If in Create or Edit mode, render PostEditor
  if (mode === "create") {
    return (
      <PostEditor
        onSave={() => {
          setMode("list");
          fetchPosts();
          setSuccessNotification("Artikel baru berhasil dibuat dan disimpan!");
        }}
        onCancel={() => setMode("list")}
      />
    );
  }

  if (mode === "edit" && selectedPost) {
    return (
      <PostEditor
        initialPost={selectedPost}
        onSave={() => {
          setMode("list");
          setSelectedPost(null);
          fetchPosts();
          setSuccessNotification("Perubahan artikel berhasil disimpan!");
        }}
        onCancel={() => {
          setMode("list");
          setSelectedPost(null);
        }}
      />
    );
  }

  // Count summaries for current filter
  const publishedCount = posts.filter((p) => p.published).length;
  const draftCount = posts.filter((p) => !p.published).length;

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Manajemen Artikel
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola seluruh artikel, draf publikasi, dan tinjau konten blog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchPosts()}
            disabled={isLoading}
            title="Muat ulang daftar artikel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Artikel Baru
          </Button>
        </div>
      </div>

      {/* Notifications / Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Terjadi Kesalahan</p>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successNotification && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm font-medium">{successNotification}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar & Status Filter Tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul, slug, atau ringkasan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons / Tabs */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  statusFilter === "published"
                    ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Dipublikasikan
                {statusFilter === "all" && publishedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {publishedCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("draft")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  statusFilter === "draft"
                    ? "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Draf
                {statusFilter === "all" && draftCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {draftCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Memuat daftar artikel...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {searchQuery ? "Tidak ada artikel yang cocok" : "Belum ada artikel"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `Tidak ditemukan artikel dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
                  : "Mulai buat konten pertama Anda dengan editor Markdown terpadu."}
              </p>
            </div>
            <div className="pt-2">
              {searchQuery ? (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                  Hapus Pencarian
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Buat Artikel Pertama
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts Table List */}
      {!isLoading && posts.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Artikel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tag</th>
                  <th className="py-3 px-4">Komentar</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {posts.map((post) => {
                  const tagList = getTagList(post);
                  const isCurrentToggling = togglingId === post.id;
                  const isCurrentDeleting = deletingId === post.id;

                  const formattedDate = post.createdAt
                    ? new Date(post.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Title & Slug */}
                      <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 transition-colors line-clamp-1">
                              {post.title}
                            </span>
                            {post.published && (
                              <a
                                href={`/posts/${post.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Buka artikel publik"
                                className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                            <span>/{post.slug}</span>
                            {post.readingTime && (
                              <span className="text-[11px] font-sans text-gray-400">
                                &bull; {post.readingTime} mnt
                              </span>
                            )}
                          </div>
                          {post.excerpt && (
                            <p className="text-xs text-gray-500 line-clamp-1 pt-0.5">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={post.published ? "success" : "secondary"}>
                          {post.published ? "Dipublikasikan" : "Draf"}
                        </Badge>
                      </td>

                      {/* Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {tagList.length > 0 ? (
                            tagList.slice(0, 3).map((tagName) => (
                              <span
                                key={tagName}
                                className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                              >
                                #{tagName}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">-</span>
                          )}
                          {tagList.length > 3 && (
                            <span className="text-[10px] text-gray-400 self-center">
                              +{tagList.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Comments count */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          <span>{post._count?.comments ?? 0}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Publish Toggle */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(post)}
                            disabled={isCurrentToggling}
                            title={
                              post.published
                                ? "Ubah status menjadi Draf (sembunyikan dari publik)"
                                : "Publikasikan artikel sekarang"
                            }
                            className={`p-1.5 h-8 w-8 ${
                              post.published
                                ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                          >
                            {isCurrentToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : post.published ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>

                          {/* Edit Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(post)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>

                          {/* Delete Button */}
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeletePost(post)}
                            disabled={isCurrentDeleting}
                            className="p-1.5 h-8 w-8"
                            title="Hapus artikel"
                          >
                            {isCurrentDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostList;
