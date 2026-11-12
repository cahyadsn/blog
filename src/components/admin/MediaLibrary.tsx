"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaDeleteModal } from "@/components/admin/MediaDeleteModal";
import {
  UploadCloud,
  Search,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileCode,
  HardDrive,
  X,
} from "lucide-react";

export interface MediaItem {
  name: string;
  url: string;
  size: number;
  type?: string;
  createdAt?: string | Date;
}

export interface MediaLibraryProps {
  onMediaCountChange?: (count: number) => void;
}

/**
 * Client-safe file size formatter
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Client-safe Indonesian date formatter
 */
export function formatMediaDate(dateStr?: string | Date): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "-";
  }
}

export function MediaLibrary({ onMediaCountChange }: MediaLibraryProps) {
  // Media items state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Uploading state & drag drop
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<"url" | "markdown" | null>(null);

  // Delete modal state
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);

  // Fetch media from server
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar pustaka media");
      }
      const list = Array.isArray(data.media) ? data.media : [];
      setMediaList(list);
      if (onMediaCountChange) {
        onMediaCountChange(list.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat berkas";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [onMediaCountChange]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Client-side file validation and upload execution
  const processUploadFile = async (file: File) => {
    setUploadError(null);
    setSuccessNotice(null);

    // Whitelist check
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Tipe berkas tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.");
      return;
    }

    // Size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimum 5MB.`);
      return;
    }

    if (file.size === 0) {
      setUploadError("Berkas gambar tidak boleh kosong (0 bytes).");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah berkas");
      }

      setSuccessNotice(`Berkas "${data.media?.name || file.name}" berhasil diunggah!`);
      
      // Prepend newly uploaded item to list
      setMediaList((prev) => {
        const updated = [data.media, ...prev];
        if (onMediaCountChange) {
          onMediaCountChange(updated.length);
        }
        return updated;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle direct file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadFile(files[0]);
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadFile(files[0]);
    }
  };

  // Copy Public URL
  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.name);
    setCopiedType("url");
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Copy Markdown Snippet
  const handleCopyMarkdown = (item: MediaItem) => {
    const snippet = `![${item.name}](${item.url})`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(item.name);
    setCopiedType("markdown");
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Confirm delete handler called from modal
  const handleConfirmDelete = async (item: MediaItem) => {
    const res = await fetch(`/api/admin/media/${encodeURIComponent(item.name)}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Gagal menghapus berkas");
    }

    setMediaList((prev) => {
      const updated = prev.filter((m) => m.name !== item.name);
      if (onMediaCountChange) {
        onMediaCountChange(updated.length);
      }
      return updated;
    });

    setSuccessNotice(`Berkas "${item.name}" berhasil dihapus.`);
    setMediaToDelete(null);
  };

  // Filter media items by search query
  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) return mediaList;
    const query = searchQuery.toLowerCase().trim();
    return mediaList.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.type && m.type.toLowerCase().includes(query))
    );
  }, [mediaList, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Pustaka Media & Unggah Gambar
            </h2>
            <Badge variant="secondary" className="text-xs">
              {mediaList.length} berkas
            </Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola gambar lokal, salin URL publik, atau gunakan snippet Markdown langsung ke artikel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchMedia}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Unggah Gambar</span>
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs font-semibold">{successNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {(errorMessage || uploadError) && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <p className="text-xs font-semibold">{uploadError || errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setUploadError(null);
            }}
            className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.005]"
            : "border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-gray-50/50 dark:bg-gray-900/50"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {isUploading ? "Sedang Mengunggah Berkas..." : "Tarik & Lepaskan Gambar di Sini"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            atau klik untuk memilih berkas dari komputer Anda. Mendukung PNG, JPEG, WebP, GIF, dan SVG (Maks. 5MB)
          </p>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari gambar berdasarkan nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <HardDrive className="w-3.5 h-3.5" />
          <span>
            Menampilkan {filteredMedia.length} dari {mediaList.length} media
          </span>
        </div>
      </div>

      {/* Media Grid / Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs">Memuat berkas media...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {searchQuery ? "Tidak Ada Gambar Ditemukan" : "Pustaka Media Masih Kosong"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada berkas yang cocok dengan kata kunci "${searchQuery}". Coba gunakan kata kunci lain.`
                : "Unggah gambar pertama Anda untuk disematkan ke dalam artikel blog."}
            </p>
            {searchQuery && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Reset Pencarian
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <Card
              key={item.name}
              className="overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail Preview */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center border-b border-gray-100 dark:border-gray-800">
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Extension Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                      {item.name.split(".").pop() || "IMG"}
                    </Badge>
                  </div>
                </div>

                {/* Info Metadata */}
                <div className="p-3.5 space-y-1">
                  <p
                    className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(item.size)}</span>
                    <span>{formatMediaDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-1.5">
                {/* Copy URL */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(item)}
                  className="flex-1 text-[11px] py-1 px-1.5 h-8 gap-1"
                  title="Salin tautan publik gambar"
                >
                  {copiedId === item.name && copiedType === "url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>URL</span>
                    </>
                  )}
                </Button>

                {/* Copy Markdown */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyMarkdown(item)}
                  className="flex-1 text-[11px] py-1 px-1.5 h-8 gap-1"
                  title="Salin sintaks Markdown gambar"
                >
                  {copiedId === item.name && copiedType === "markdown" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Markdown</span>
                    </>
                  )}
                </Button>

                {/* Delete Trigger */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMediaToDelete(item)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 h-8"
                  title="Hapus berkas dari server"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <MediaDeleteModal
        isOpen={Boolean(mediaToDelete)}
        media={mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}

export default MediaLibrary;
