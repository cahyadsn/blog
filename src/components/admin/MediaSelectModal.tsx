"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaItem, formatFileSize } from "@/components/admin/MediaLibrary";
import {
  X,
  Search,
  Check,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  title?: string;
  description?: string;
}

export function MediaSelectModal({
  isOpen,
  onClose,
  onSelect,
  title = "Pilih Gambar dari Pustaka Media",
  description = "Pilih gambar yang sudah ada atau unggah gambar baru untuk disematkan",
}: MediaSelectModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch media from server
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat pustaka media");
      }
      setMediaList(Array.isArray(data.media) ? data.media : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat media";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedMedia(null);
      setSearchQuery("");
      setErrorMessage(null);
    }
  }, [isOpen, fetchMedia]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  // Direct upload inside select modal
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Tipe berkas tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran berkas melebihi batas 5MB.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah gambar");
      }

      // Add to list and preselect
      setMediaList((prev) => [data.media, ...prev]);
      setSelectedMedia(data.media);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmSelect = () => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onClose();
    }
  };

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return mediaList;
    const q = searchQuery.toLowerCase().trim();
    return mediaList.filter((m) => m.name.toLowerCase().includes(q));
  }, [mediaList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-select-title"
    >
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="media-select-title" className="text-base font-bold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari berkas gambar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchMedia}
              disabled={isLoading}
              title="Segarkan daftar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Unggah Baru</span>
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleDirectUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Memuat galeri media...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {searchQuery ? "Tidak ada gambar yang cocok" : "Belum ada berkas media"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Gunakan tombol &quot;Unggah Baru&quot; di atas untuk menambahkan berkas gambar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {filteredList.map((item) => {
                const isSelected = selectedMedia?.name === item.name;
                return (
                  <div
                    key={item.name}
                    onClick={() => setSelectedMedia(item)}
                    onDoubleClick={() => {
                      setSelectedMedia(item);
                      onSelect(item);
                      onClose();
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col group ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-500/30 shadow-md"
                        : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800/80">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">
            {selectedMedia ? (
              <span>Terpilih: <strong className="text-gray-900 dark:text-gray-100">{selectedMedia.name}</strong></span>
            ) : (
              <span>Pilih salah satu gambar dari galeri di atas</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!selectedMedia}
              onClick={handleConfirmSelect}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Gambar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaSelectModal;
