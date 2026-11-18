"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface SeriesPostSummary {
  id: string;
  title: string;
  slug: string;
  orderInSeries?: number | null;
  readingTime?: number | null;
}

export interface SeriesData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  posts: SeriesPostSummary[];
}

export interface SeriesNavProps {
  series: SeriesData;
  currentPostId?: string;
  currentSlug?: string;
  className?: string;
}

export interface SeriesWidgetProps extends SeriesNavProps {
  type?: "toc" | "nav" | "both";
}

/**
 * Top TOC banner for displaying series table of contents within an article.
 */
export function SeriesTOCBanner({
  series,
  currentPostId,
  currentSlug,
  className = "",
}: SeriesNavProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!series || !series.posts || series.posts.length === 0) return null;

  const currentIndex = series.posts.findIndex(
    (p) =>
      (currentPostId && p.id === currentPostId) ||
      (currentSlug && p.slug === currentSlug)
  );

  const currentPartNumber =
    currentIndex >= 0
      ? series.posts[currentIndex].orderInSeries ?? currentIndex + 1
      : 1;
  const totalParts = series.posts.length;

  return (
    <div
      className={`rounded-2xl border border-indigo-200/90 dark:border-indigo-800/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/30 dark:via-gray-900 dark:to-purple-950/20 shadow-sm overflow-hidden mb-10 ${className}`}
    >
      {/* Banner Header */}
      <div className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Bagian dari Seri Artikel
              </span>
              <Badge variant="secondary" className="text-[10px] py-0 px-2 font-bold">
                Bagian {currentPartNumber} dari {totalParts}
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              <Link
                href={`/series/${series.slug}`}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {series.title}
              </Link>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
        >
          <span className="hidden sm:inline">
            {isOpen ? "Sembunyikan Materi" : "Lihat Semua Materi"}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Parts List */}
      {isOpen && (
        <div className="p-3 sm:p-4 bg-white/60 dark:bg-gray-900/40">
          <ol className="space-y-1.5">
            {series.posts.map((post, idx) => {
              const isCurrent =
                (currentPostId && post.id === currentPostId) ||
                (currentSlug && post.slug === currentSlug) ||
                idx === currentIndex;

              const partNumber = post.orderInSeries ?? idx + 1;

              return (
                <li key={post.id}>
                  {isCurrent ? (
                    <div className="flex items-center justify-between gap-3 p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-indigo-100/90 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-700/60 text-indigo-950 dark:text-indigo-100 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {partNumber}
                        </span>
                        <span className="font-bold text-sm truncate">
                          {post.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          variant="default"
                          className="text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1 py-0.5 px-2"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Sedang Dibaca</span>
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/posts/${post.slug}`}
                      className="group flex items-center justify-between gap-3 p-2.5 sm:px-3 sm:py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-950/80 dark:group-hover:text-indigo-300 text-xs font-semibold flex items-center justify-center flex-shrink-0 transition-colors">
                          {partNumber}
                        </span>
                        <span className="text-sm font-medium truncate group-hover:font-semibold">
                          {post.title}
                        </span>
                      </div>
                      {post.readingTime && (
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {post.readingTime} mnt
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Bottom Prev/Next navigation cards rendered at the end of an article.
 */
export function SeriesPrevNextNav({
  series,
  currentPostId,
  currentSlug,
  className = "",
}: SeriesNavProps) {
  if (!series || !series.posts || series.posts.length === 0) return null;

  const currentIndex = series.posts.findIndex(
    (p) =>
      (currentPostId && p.id === currentPostId) ||
      (currentSlug && p.slug === currentSlug)
  );

  const prevPost = currentIndex > 0 ? series.posts[currentIndex - 1] : null;
  const nextPost =
    currentIndex >= 0 && currentIndex < series.posts.length - 1
      ? series.posts[currentIndex + 1]
      : null;

  return (
    <div className={`my-10 space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          Navigasi Seri Artikel
        </span>
        <Link
          href={`/series/${series.slug}`}
          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 lowercase first-letter:uppercase"
        >
          <span>Daftar isi seri</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Previous Post Card */}
        {prevPost ? (
          <Link
            href={`/posts/${prevPost.slug}`}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all"
          >
            <div>
              <div className="flex items-center gap-1 text-xs font-bold text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Bagian Sebelumnya</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                {prevPost.title}
              </h4>
            </div>
            {prevPost.readingTime && (
              <span className="mt-3 text-[11px] text-gray-400">
                ~{prevPost.readingTime} menit baca
              </span>
            )}
          </Link>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 text-gray-400 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-xs font-semibold mb-1">
              <ChevronLeft className="w-4 h-4" />
              <span>Bagian Sebelumnya</span>
            </div>
            <p className="text-xs text-gray-500">
              Ini adalah artikel bagian pertama dalam seri.
            </p>
          </div>
        )}

        {/* Next Post Card */}
        {nextPost ? (
          <Link
            href={`/posts/${nextPost.slug}`}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm text-right transition-all"
          >
            <div>
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                <span>Bagian Selanjutnya</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                {nextPost.title}
              </h4>
            </div>
            {nextPost.readingTime && (
              <span className="mt-3 text-[11px] text-gray-400">
                ~{nextPost.readingTime} menit baca
              </span>
            )}
          </Link>
        ) : (
          <Link
            href={`/series/${series.slug}`}
            className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-400 text-right transition-all"
          >
            <div>
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Seri Selesai!</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 transition-colors">
                Lihat Ikhtisar Lengkap Seri &rarr;
              </h4>
            </div>
            <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
              Selamat, Anda telah menyelesaikan seluruh seri ini!
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Unified Component exporting both or selective TOC / Prev-Next
 */
export function SeriesNavWidget({
  series,
  currentPostId,
  currentSlug,
  type = "both",
  className = "",
}: SeriesWidgetProps) {
  if (!series) return null;

  if (type === "toc") {
    return (
      <SeriesTOCBanner
        series={series}
        currentPostId={currentPostId}
        currentSlug={currentSlug}
        className={className}
      />
    );
  }

  if (type === "nav") {
    return (
      <SeriesPrevNextNav
        series={series}
        currentPostId={currentPostId}
        currentSlug={currentSlug}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <SeriesTOCBanner
        series={series}
        currentPostId={currentPostId}
        currentSlug={currentSlug}
      />
      <SeriesPrevNextNav
        series={series}
        currentPostId={currentPostId}
        currentSlug={currentSlug}
      />
    </div>
  );
}

export default SeriesNavWidget;
