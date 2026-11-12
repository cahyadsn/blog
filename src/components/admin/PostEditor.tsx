"use client";

import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { generateSlug } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MediaSelectModal } from "@/components/admin/MediaSelectModal";
import { MediaItem } from "@/components/admin/MediaLibrary";
import {
  Sparkles,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  FileCode,
  Columns,
  X,
  Plus,
  Loader2,
  BookOpen,
  Upload,
  FolderOpen,
  Trash2,
} from "lucide-react";

export interface PostTagItem {
  tag?: {
    id?: string;
    name: string;
    slug?: string;
  };
  name?: string;
}

export interface PostItem {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  published: boolean;
  readingTime?: number;
  publishedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  tags?: Array<PostTagItem | string>;
  _count?: {
    comments: number;
  };
}

export interface PostEditorProps {
  initialPost?: PostItem | null;
  onSave?: (savedPost: PostItem) => void;
  onCancel?: () => void;
}

export function PostEditor({ initialPost, onSave, onCancel }: PostEditorProps) {
  // Extract initial tag names from initialPost
  const initialTagNames: string[] = React.useMemo(() => {
    if (!initialPost?.tags) return [];
    return initialPost.tags
      .map((t) => {
        if (typeof t === "string") return t;
        return t.tag?.name || t.name || "";
      })
      .filter(Boolean);
  }, [initialPost]);

  // Form states
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [content, setContent] = useState(
    initialPost?.content || "## Pendahuluan\n\nTulis konten artikel Anda di sini..."
  );
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || "");
  const [published, setPublished] = useState(initialPost?.published ?? true);
  const [tags, setTags] = useState<string[]>(initialTagNames);
  const [tagInput, setTagInput] = useState("");

  // Editor layout view: "split" (dual pane) | "editor" | "preview"
  const [activeTab, setActiveTab] = useState<"split" | "editor" | "preview">("split");

  // Markdown live preview rendered HTML
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // UI state: loading, error messages, field errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Media upload & cursor refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // In-flight media upload states
  const [isUploadingEditorImage, setIsUploadingEditorImage] = useState<boolean>(false);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState<boolean>(false);
  const [isDragOverTextarea, setIsDragOverTextarea] = useState<boolean>(false);
  const [coverImageLoadError, setCoverImageLoadError] = useState<boolean>(false);

  // Modal selector state
  const [isMediaSelectOpen, setIsMediaSelectOpen] = useState<boolean>(false);
  const [mediaTarget, setMediaTarget] = useState<"content" | "cover">("content");

  // Configure marked once
  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  // Live preview parser effect
  useEffect(() => {
    let isMounted = true;
    try {
      const parsed = marked.parse(content || "");
      if (parsed instanceof Promise) {
        parsed
          .then((html) => {
            if (isMounted) setPreviewHtml(html);
          })
          .catch(() => {
            if (isMounted) setPreviewHtml("<p class='text-rose-500'>Gagal merender Markdown.</p>");
          });
      } else {
        setPreviewHtml(parsed);
      }
    } catch {
      if (isMounted) setPreviewHtml("<p class='text-rose-500'>Gagal merender Markdown.</p>");
    }
    return () => {
      isMounted = false;
    };
  }, [content]);

  // Insert markdown snippet at current cursor position in textarea
  const insertMarkdownAtCursor = (markdownSnippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => (prev ? `${prev}\n\n${markdownSnippet}` : markdownSnippet));
      return;
    }

    const startPos = textarea.selectionStart ?? textarea.value.length;
    const endPos = textarea.selectionEnd ?? textarea.value.length;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos);

    const needsLeadingNewline = textBefore.length > 0 && !textBefore.endsWith("\n");
    const needsTrailingNewline = textAfter.length > 0 && !textAfter.startsWith("\n");

    const formattedSnippet =
      (needsLeadingNewline ? "\n\n" : "") +
      markdownSnippet +
      (needsTrailingNewline ? "\n\n" : "");

    const newContent = textBefore + formattedSnippet + textAfter;
    setContent(newContent);

    if (fieldErrors.content) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.content;
        return next;
      });
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + formattedSnippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Helper to upload an image file to /api/admin/media/upload
  const uploadImageFile = async (file: File): Promise<MediaItem | null> => {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setGeneralError(`Tipe berkas "${file.name}" tidak didukung. Harap unggah PNG, JPEG, WebP, GIF, atau SVG.`);
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      setGeneralError(`Ukuran berkas "${file.name}" melebihi batas maksimum 5MB.`);
      return null;
    }

    if (file.size === 0) {
      setGeneralError(`Berkas "${file.name}" kosong.`);
      return null;
    }

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

    return data.media;
  };

  // Editor toolbar: direct file upload
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploadingEditorImage(true);
    setGeneralError(null);

    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded) {
        insertMarkdownAtCursor(`![${uploaded.name}](${uploaded.url})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar";
      setGeneralError(`Gagal mengunggah gambar: ${msg}`);
    } finally {
      setIsUploadingEditorImage(false);
      if (editorFileInputRef.current) {
        editorFileInputRef.current.value = "";
      }
    }
  };

  // Editor textarea drag-and-drop upload
  const handleTextareaDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOverTextarea) setIsDragOverTextarea(true);
  };

  const handleTextareaDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverTextarea(false);
  };

  const handleTextareaDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverTextarea(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) return;

    setIsUploadingEditorImage(true);
    setGeneralError(null);

    try {
      for (const file of files) {
        const uploaded = await uploadImageFile(file);
        if (uploaded) {
          insertMarkdownAtCursor(`![${uploaded.name}](${uploaded.url})`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar dropzone";
      setGeneralError(`Gagal mengunggah gambar yang di-drop: ${msg}`);
    } finally {
      setIsUploadingEditorImage(false);
    }
  };

  // Cover image: direct file upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploadingCoverImage(true);
    setGeneralError(null);

    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded) {
        setCoverImage(uploaded.url);
        setCoverImageLoadError(false);
        if (fieldErrors.coverImage) {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.coverImage;
            return next;
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah gambar sampul";
      setGeneralError(`Gagal mengunggah gambar sampul: ${msg}`);
    } finally {
      setIsUploadingCoverImage(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  };

  // Callback when an image is selected from MediaSelectModal
  const handleMediaModalSelect = (media: MediaItem) => {
    if (mediaTarget === "cover") {
      setCoverImage(media.url);
      setCoverImageLoadError(false);
      if (fieldErrors.coverImage) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.coverImage;
          return next;
        });
      }
    } else {
      insertMarkdownAtCursor(`![${media.name}](${media.url})`);
    }
    setIsMediaSelectOpen(false);
  };

  // Auto-generate slug from title
  const handleAutoGenerateSlug = () => {
    if (!title.trim()) {
      setFieldErrors((prev) => ({ ...prev, slug: "Masukkan judul terlebih dahulu untuk membuat slug" }));
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

  // Add tag handler
  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, "");
    if (!cleanTag) return;

    if (!tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput("");
  };

  // Remove tag handler
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Tag input keydown
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Client-side validation harmonized with /uploads/...
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Judul artikel wajib diisi";
    } else if (title.trim().length < 5) {
      errors.title = "Judul artikel minimal 5 karakter";
    } else if (title.trim().length > 200) {
      errors.title = "Judul artikel maksimal 200 karakter";
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

    if (!excerpt.trim()) {
      errors.excerpt = "Ringkasan (excerpt) wajib diisi";
    } else if (excerpt.trim().length < 10) {
      errors.excerpt = "Ringkasan minimal 10 karakter";
    } else if (excerpt.trim().length > 300) {
      errors.excerpt = "Ringkasan maksimal 300 karakter";
    }

    if (!content.trim()) {
      errors.content = "Konten artikel wajib diisi";
    } else if (content.trim().length < 20) {
      errors.content = "Konten artikel minimal 20 karakter";
    }

    if (coverImage && coverImage.trim()) {
      const trimmed = coverImage.trim();
      const isLocalUpload = trimmed.startsWith("/uploads/");
      const isValidHttpUrl = /^https?:\/\//i.test(trimmed);

      if (!isLocalUpload && !isValidHttpUrl) {
        errors.coverImage = "Format URL gambar sampul tidak valid (harus diawali /uploads/ atau http:// atau https://)";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save handler (POST for create, PUT for update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setGeneralError("Harap perbaiki kolom yang belum memenuhi syarat sebelum menyimpan.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content: content,
      coverImage: coverImage.trim() || null,
      published: published,
      tags: tags,
    };

    const isEdit = Boolean(initialPost?.id);
    const endpoint = isEdit ? `/api/admin/posts/${initialPost!.id}` : "/api/admin/posts";
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
          setGeneralError(data.error || "Slug sudah digunakan oleh artikel lain. Gunakan slug yang berbeda.");
          setFieldErrors((prev) => ({ ...prev, slug: "Slug sudah digunakan" }));
        } else {
          setGeneralError(data.error || "Terjadi kesalahan saat menyimpan artikel");
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(isEdit ? "Artikel berhasil diperbarui!" : "Artikel berhasil diterbitkan!");
      if (onSave) {
        onSave(data.post);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Koneksi ke server gagal";
      setGeneralError(`Terjadi kesalahan jaringan: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Kembali
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {initialPost?.id ? "Edit Artikel" : "Buat Artikel Baru"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {initialPost?.id
                ? `Mengedit artikel: ${initialPost.title}`
                : "Tulis artikel blog baru dengan format Markdown dan pratinjau live"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Simpan Artikel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Gagal Menyimpan</p>
              <p className="text-xs mt-0.5">{generalError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata Card */}
        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Informasi Artikel
            </h3>

            {/* Title */}
            <div>
              <Input
                label="Judul Artikel *"
                placeholder="Masukkan judul artikel yang menarik..."
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
                Slug URL *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="contoh-slug-artikel"
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
                  title="Generate otomatis dari judul"
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-Slug
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Alamat URL artikel: <span className="font-mono text-indigo-600 dark:text-indigo-400">/posts/{slug || "..."}</span>
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <Textarea
                label="Ringkasan Singkat (Excerpt) *"
                placeholder="Tulis ringkasan singkat artikel dalam 1-2 kalimat (10–300 karakter)..."
                rows={3}
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  if (fieldErrors.excerpt) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.excerpt;
                      return next;
                    });
                  }
                }}
                error={fieldErrors.excerpt}
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>Minimal 10 karakter</span>
                <span>{excerpt.length}/300 karakter</span>
              </div>
            </div>

            {/* Cover Image Section with 16:9 Preview, Media Selector, & Direct Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Gambar Sampul (Cover Image)
              </label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="URL gambar (contoh: /uploads/... atau https://...)"
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
                    onClick={() => {
                      setMediaTarget("cover");
                      setIsMediaSelectOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                    Pilih dari Pustaka
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={isUploadingCoverImage}
                    className="flex items-center gap-1.5 text-xs whitespace-nowrap"
                  >
                    {isUploadingCoverImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    Unggah Sampul
                  </Button>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 16:9 Thumbnail Preview with Remove Button */}
              {coverImage && (
                <div className="mt-3 relative aspect-video max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group shadow-sm">
                  {!coverImageLoadError ? (
                    <img
                      src={coverImage}
                      alt="Pratinjau Sampul"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setCoverImageLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                      <AlertCircle className="w-6 h-6 text-amber-500 mb-1" />
                      <span className="text-xs">Gambar tidak dapat dimuat dari URL ini</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage("");
                        setCoverImageLoadError(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus Sampul
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Tag / Topik Artikel
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik tag lalu tekan Enter atau koma..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTag()}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </Button>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">Belum ada tag yang ditambahkan</span>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="inline-flex items-center gap-1.5 pr-1.5 py-1 text-xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors cursor-pointer"
                        title="Hapus tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Published Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 mt-4">
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Status Publikasi
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {published
                    ? "Artikel akan langsung dapat diakses dan dibaca oleh publik."
                    : "Artikel disimpan sebagai draf internal (tidak dapat dilihat pembaca)."}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={published ? "success" : "secondary"}>
                  {published ? "Dipublikasikan" : "Draf"}
                </Badge>
                <button
                  type="button"
                  role="switch"
                  aria-checked={published}
                  onClick={() => setPublished(!published)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    published ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      published ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content & Markdown Live Preview Card */}
        <Card>
          <CardContent className="space-y-4">
            {/* View Mode Switcher Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Editor Konten Markdown & Live Preview
                </h3>
              </div>

              {/* View layout selector */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("split")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "split"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "editor"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Editor Saja
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pratinjau Saja
                </button>
              </div>
            </div>

            {/* Error Message for Content */}
            {fieldErrors.content && (
              <p className="text-xs text-rose-500 font-medium">{fieldErrors.content}</p>
            )}

            {/* Dual Pane Layout / Tabbed View */}
            <div
              className={
                activeTab === "split"
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
                  : "w-full"
              }
            >
              {/* Left Pane: Markdown Source Textarea */}
              {(activeTab === "split" || activeTab === "editor") && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Markdown Source
                    </span>

                    {/* Editor Action Toolbar */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMediaTarget("content");
                          setIsMediaSelectOpen(true);
                        }}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Pilih gambar dari pustaka media untuk disisipkan ke posisi kursor"
                      >
                        <FolderOpen className="w-3 h-3 text-indigo-500" />
                        Pilih dari Pustaka
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editorFileInputRef.current?.click()}
                        disabled={isUploadingEditorImage}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Unggah gambar lokal dan langsung sisipkan ke posisi kursor"
                      >
                        {isUploadingEditorImage ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3 text-emerald-500" />
                        )}
                        Unggah Gambar
                      </Button>
                      <input
                        ref={editorFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                        onChange={handleEditorImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Textarea with Drag & Drop Listener */}
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value);
                        if (fieldErrors.content) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.content;
                            return next;
                          });
                        }
                      }}
                      onDragOver={handleTextareaDragOver}
                      onDragLeave={handleTextareaDragLeave}
                      onDrop={handleTextareaDrop}
                      rows={20}
                      placeholder="Tulis artikel dengan sintaks Markdown (heading ##, list -, code ```). Tarik & lepaskan gambar langsung ke area ini untuk mengunggah..."
                      className={`w-full font-mono text-sm leading-relaxed p-4 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[480px] resize-y ${
                        isDragOverTextarea
                          ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20"
                          : "border-gray-300 dark:border-gray-700"
                      }`}
                    />

                    {/* Drag Over Overlay indicator */}
                    {isDragOverTextarea && (
                      <div className="absolute inset-0 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 backdrop-blur-[1px] border-2 border-dashed border-indigo-600 flex items-center justify-center pointer-events-none">
                        <div className="bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          <Upload className="w-4 h-4 animate-bounce" />
                          <span>Lepaskan gambar di sini untuk mengunggah otomatis</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                    <span>Tips: Anda dapat menarik & melepaskan (drag & drop) gambar langsung ke textarea</span>
                    <span>
                      {content.length} karakter &bull; ~
                      {Math.max(1, Math.ceil(content.trim().split(/\s+/).filter(Boolean).length / 200))}{" "}
                      menit baca
                    </span>
                  </div>
                </div>
              )}

              {/* Right Pane: Live Preview Container */}
              {(activeTab === "split" || activeTab === "preview") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      Live Markdown Preview
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      Diperbarui Otomatis
                    </span>
                  </div>
                  <div
                    className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[480px] max-h-[720px] overflow-y-auto shadow-sm prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html:
                        previewHtml ||
                        "<p class='text-gray-400 italic text-sm'>Tulis teks Markdown di editor untuk melihat pratinjau live secara instan...</p>",
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Batal
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {initialPost?.id ? "Perbarui Artikel" : "Terbitkan Artikel"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Media Selector Modal */}
      <MediaSelectModal
        isOpen={isMediaSelectOpen}
        onClose={() => setIsMediaSelectOpen(false)}
        onSelect={handleMediaModalSelect}
        title={mediaTarget === "cover" ? "Pilih Gambar Sampul Artikel" : "Sisipkan Gambar ke Konten Artikel"}
        description={
          mediaTarget === "cover"
            ? "Pilih gambar dari pustaka media untuk dijadikan sampul artikel (16:9)"
            : "Pilih gambar untuk disisipkan sebagai format Markdown pada posisi kursor"
        }
      />
    </div>
  );
}

export default PostEditor;
