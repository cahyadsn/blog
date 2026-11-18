"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaSelectModal } from "@/components/admin/MediaSelectModal";
import { MediaItem } from "@/components/admin/MediaLibrary";
import { generateSlug } from "@/lib/markdown";
import {
  X,
  Sparkles,
  FolderOpen,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";

export interface SeriesFormData {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
}

export interface SeriesModalProps {
  isOpen: boolean;
  series?: SeriesFormData | null;
  onClose: () => void;
  onSuccess: (savedSeries: any) => void;
}

export function SeriesModal({
  isOpen,
  series,
  onClose,
  onSuccess,
}: SeriesModalProps) {
  const isEdit = Boolean(series?.id);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // UI & loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [coverImageLoadError, setCoverImageLoadError] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isMediaSelectOpen, setIsMediaSelectOpen] = useState(false);

  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on open/series change
  useEffect(() => {
    if (isOpen) {
      if (series) {
        setTitle(series.title || "");
        setSlug(series.slug || "");
        setDescription(series.description || "");
        setCoverImage(series.coverImage || "");
      } else {
        setTitle("");
        setSlug("");
        setDescription("");
        setCoverImage("");
      }
      setGeneralError(null);
      setFieldErrors({});
      setCoverImageLoadError(false);
      setIsSubmitting(false);
    }
  }, [isOpen, series]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting && !isMediaSelectOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, isMediaSelectOpen, onClose]);

  if (!isOpen) return null;

  // Auto-slug generator
  const handleAutoGenerateSlug = () => {
    if (!title.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        slug: "Isi judul seri terlebih dahulu untuk membuat slug",
      }));
      return;
    }
    const generated = generateSlug(title);
    setSlug(generated);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.slug;
      return next;
    });
  };

  // Upload image to /api/admin/media/upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setGeneralError("Tipe berkas tidak didukung. Harap pilih gambar PNG, JPEG, WebP, GIF, atau SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setGeneralError("Ukuran gambar sampul maksimal 5MB.");
      return;
    }

    setIsUploadingCover(true);
    setGeneralError(null);

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

      setCoverImage(data.media.url);
      setCoverImageLoadError(false);
      if (fieldErrors.coverImage) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.coverImage;
          return next;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah berkas";
      setGeneralError(msg);
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  };

  // Selection from media library modal
  const handleMediaModalSelect = (media: MediaItem) => {
    setCoverImage(media.url);
    setCoverImageLoadError(false);
    if (fieldErrors.coverImage) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.coverImage;
        return next;
      });
    }
    setIsMediaSelectOpen(false);
  };

  // Client validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Judul seri wajib diisi";
    } else if (title.trim().length < 3) {
      errors.title = "Judul seri minimal 3 karakter";
    } else if (title.trim().length > 100) {
      errors.title = "Judul seri maksimal 100 karakter";
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slug.trim()) {
      errors.slug = "Slug URL wajib diisi";
    } else if (slug.trim().length < 3) {
      errors.slug = "Slug minimal 3 karakter";
    } else if (slug.trim().length > 120) {
      errors.slug = "Slug maksimal 120 karakter";
    } else if (!slugRegex.test(slug.trim())) {
      errors.slug = "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)";
    }

    if (description && description.trim().length > 500) {
      errors.description = "Deskripsi maksimal 500 karakter";
    }

    if (coverImage && coverImage.trim()) {
      const trimmed = coverImage.trim();
      const isLocal = trimmed.startsWith("/uploads/");
      const isValidHttp = /^https?:\/\//i.test(trimmed);
      if (!isLocal && !isValidHttp) {
        errors.coverImage = "Format URL tidak valid (harus /uploads/ atau http:// atau https://)";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      coverImage: coverImage.trim() || null,
    };

    const endpoint = isEdit
      ? `/api/admin/series/${series!.id}`
      : "/api/admin/series";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 409) {
          setGeneralError(
            data.error || "Slug sudah digunakan oleh seri lain. Silakan ubah slug."
          );
          setFieldErrors((prev) => ({
            ...prev,
            slug: "Slug sudah digunakan",
          }));
        } else {
          setGeneralError(data.error || "Terjadi kesalahan saat menyimpan seri.");
        }
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.series);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal terhubung ke server";
      setGeneralError(`Terjadi kesalahan jaringan: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {isEdit ? "Edit Seri Artikel" : "Buat Seri Artikel Baru"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isEdit
                  ? "Perbarui metadata seri artikel dan sampul"
                  : "Buat koleksi kurikulum panduan multi-part"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{generalError}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <Input
              label="Judul Seri *"
              placeholder="Contoh: Arsitektur Next.js 15 & Multi-Agent AI"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.title;
                    return next;
                  });
                }
              }}
              error={fieldErrors.title}
            />
          </div>

          {/* Slug with Auto-generate */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Slug URL Seri *
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="arsitektur-nextjs-15"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    if (fieldErrors.slug) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.slug;
                        return next;
                      });
                    }
                  }}
                  error={fieldErrors.slug}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleAutoGenerateSlug}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                title="Buat slug otomatis dari judul"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Auto-Slug
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">
              URL Publik: <span className="font-mono text-indigo-600 dark:text-indigo-400">/series/{slug || "..."}</span>
            </p>
          </div>

          {/* Description */}
          <div>
            <Textarea
              label="Deskripsi Seri (Opsional)"
              placeholder="Jelaskan secara ringkas topik dan tujuan pembelajaran dari seri ini..."
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              error={fieldErrors.description}
            />
            <div className="flex justify-end text-[11px] text-gray-400 mt-1">
              <span>{description.length}/500 karakter</span>
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Sampul Seri (Opsional)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  placeholder="URL sampul (/uploads/... atau https://...)"
                  value={coverImage}
                  onChange={(e) => {
                    setCoverImage(e.target.value);
                    setCoverImageLoadError(false);
                    if (fieldErrors.coverImage) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.coverImage;
                        return next;
                      });
                    }
                  }}
                  error={fieldErrors.coverImage}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsMediaSelectOpen(true)}
                  className="flex items-center gap-1 text-xs whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Pustaka
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="flex items-center gap-1 text-xs whitespace-nowrap"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  Unggah
                </Button>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Preview */}
            {coverImage && (
              <div className="relative aspect-video max-w-xs rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group shadow-xs mt-2">
                {!coverImageLoadError ? (
                  <img
                    src={coverImage}
                    alt="Pratinjau Sampul Seri"
                    className="w-full h-full object-cover"
                    onError={() => setCoverImageLoadError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center text-xs">
                    <AlertCircle className="w-5 h-5 text-amber-500 mb-1" />
                    <span>Gambar tidak dapat dimuat</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage("");
                      setCoverImageLoadError(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="min-w-[110px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                isEdit ? "Simpan Perubahan" : "Buat Seri"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Media Picker Modal */}
      <MediaSelectModal
        isOpen={isMediaSelectOpen}
        onClose={() => setIsMediaSelectOpen(false)}
        onSelect={handleMediaModalSelect}
        title="Pilih Sampul Seri Artikel"
        description="Pilih berkas gambar yang tersedia di pustaka media untuk dijadikan sampul seri"
      />
    </div>
  );
}

export default SeriesModal;
