"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SeriesModal } from "@/components/admin/SeriesModal";
import {
  SeriesDeleteModal,
  SeriesDeleteTarget,
} from "@/components/admin/SeriesDeleteModal";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  BookOpen,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  X,
  Clock,
} from "lucide-react";

export interface SeriesPostItem {
  id: string;
  title: string;
  slug: string;
  orderInSeries?: number | null;
  readingTime?: number | null;
  published: boolean;
}

export interface AdminSeriesItem {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  posts?: SeriesPostItem[];
  _count?: {
    posts: number;
  };
}

export interface SeriesListProps {
  onCountsUpdate?: (count: number) => void;
}

export function SeriesList({ onCountsUpdate }: SeriesListProps) {
  const [seriesList, setSeriesList] = useState<AdminSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(
    null
  );

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSeries, setEditingSeries] = useState<AdminSeriesItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingSeries, setDeletingSeries] = useState<SeriesDeleteTarget | null>(
    null
  );

  // Fetch series from /api/admin/series
  const fetchSeries = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/series");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar seri");
      }

      const list: AdminSeriesItem[] = Array.isArray(data.series)
        ? data.series
        : [];
      setSeriesList(list);
      if (onCountsUpdate) {
        onCountsUpdate(list.length);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan memuat data";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onCountsUpdate]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // Open modal for Create
  const handleCreateNew = () => {
    setEditingSeries(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleEdit = (series: AdminSeriesItem) => {
    setEditingSeries(series);
    setIsModalOpen(true);
  };

  // Open modal for Delete
  const handleDeleteClick = (series: AdminSeriesItem) => {
    setDeletingSeries(series);
    setIsDeleteModalOpen(true);
  };

  // Confirm safe delete
  const handleConfirmDelete = async (series: SeriesDeleteTarget) => {
    const res = await fetch(`/api/admin/series/${series.id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Gagal menghapus seri artikel");
    }

    setSuccessNotification(`Seri "${series.title}" berhasil dihapus.`);
    setIsDeleteModalOpen(false);
    setDeletingSeries(null);
    fetchSeries();
  };

  // Modal success handler (create or update)
  const handleModalSuccess = (savedSeries: AdminSeriesItem) => {
    const isEdit = Boolean(editingSeries);
    setSuccessNotification(
      isEdit
        ? `Seri "${savedSeries.title}" berhasil diperbarui.`
        : `Seri "${savedSeries.title}" berhasil dibuat.`
    );
    fetchSeries();
  };

  // Filter series based on search query
  const filteredSeries = seriesList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      s.title.toLowerCase().includes(query) ||
      s.slug.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen Seri Artikel & Panduan</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola kurikulum koleksi panduan multi-part dan penomoran urutan artikel
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSeries}
            disabled={isLoading}
            className="flex items-center gap-1.5"
            title="Segarkan daftar seri"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Seri Baru</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{successNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Cari seri artikel berdasarkan judul, slug, atau deskripsi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Series Table / List Card */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Memuat daftar seri artikel...
              </p>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  {searchQuery ? "Seri Tidak Ditemukan" : "Belum Ada Seri Artikel"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `Tidak ada seri yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                    : "Mulai kelompokkan artikel panduan Anda menjadi seri pembelajaran bertahap."}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateNew}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Buat Seri Pertama
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-850/50 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-4">Sampul</th>
                  <th className="py-3.5 px-4">Judul & Slug</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Deskripsi</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Artikel</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Dibuat</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
                {filteredSeries.map((series) => {
                  const postCount =
                    series.posts ? series.posts.length : series._count?.posts ?? 0;
                  const createdDate = new Date(series.createdAt).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  );

                  return (
                    <tr
                      key={series.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Cover Thumbnail */}
                      <td className="py-3 px-4 w-20">
                        <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          {series.coverImage ? (
                            <img
                              src={series.coverImage}
                              alt={series.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                      </td>

                      {/* Title & Slug */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                          {series.title}
                        </div>
                        <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                          <span>/series/{series.slug}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 hidden md:table-cell max-w-sm text-xs text-gray-500 dark:text-gray-400">
                        <p className="line-clamp-2">
                          {series.description || (
                            <span className="italic text-gray-400">
                              Tidak ada deskripsi
                            </span>
                          )}
                        </p>
                      </td>

                      {/* Total Posts */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={postCount > 0 ? "secondary" : "default"}
                          className="font-bold text-xs py-0.5 px-2"
                        >
                          <Layers className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                          {postCount} Bagian
                        </Badge>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 hidden lg:table-cell text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {createdDate}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/series/${series.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Buka Halaman Publik Seri"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleEdit(series)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Edit Seri"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(series)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Hapus Seri"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Series Create / Edit Modal */}
      <SeriesModal
        isOpen={isModalOpen}
        series={editingSeries}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSeries(null);
        }}
        onSuccess={handleModalSuccess}
      />

      {/* Series Delete Confirmation Modal */}
      <SeriesDeleteModal
        isOpen={isDeleteModalOpen}
        series={deletingSeries}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingSeries(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}

export default SeriesList;
