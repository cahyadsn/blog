"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MediaItem, formatFileSize, formatMediaDate } from "@/components/admin/MediaLibrary";
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface MediaDeleteModalProps {
  isOpen: boolean;
  media: MediaItem | null;
  onClose: () => void;
  onConfirmDelete: (media: MediaItem) => Promise<void>;
}

export function MediaDeleteModal({
  isOpen,
  media,
  onClose,
  onConfirmDelete,
}: MediaDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset errors when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsDeleting(false);
    }
  }, [isOpen, media]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !media) {
    return null;
  }

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onConfirmDelete(media);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus berkas";
      setErrorMessage(msg);
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-delete-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="media-delete-title"
                className="text-base font-bold text-gray-900 dark:text-gray-100"
              >
                Hapus Berkas Media
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Konfirmasi penghapusan permanen dari server
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Image Preview Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
            <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              <img
                src={media.url}
                alt={media.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate" title={media.name}>
                {media.name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {formatFileSize(media.size)} &bull; {formatMediaDate(media.createdAt)}
              </p>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Peringatan:</span> Berkas ini akan dihapus permanen dari direktori server. Artikel yang menyematkan gambar ini mungkin menampilkan gambar rusak.
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Berkas</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaDeleteModal;
