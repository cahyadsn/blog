import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SeriesCard } from "@/components/blog/SeriesCard";
import { BookOpen, Bookmark, ChevronLeft, Sparkles, FolderX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0; // dynamic

export const metadata: Metadata = {
  title: "Koleksi Seri Artikel & Panduan | Antigravity Blog",
  description:
    "Kumpulan seri artikel dan kurikulum panduan rekayasa perangkat lunak, arsitektur sistem, dan multi-agent AI yang disajikan secara terstruktur dan mendalam.",
  openGraph: {
    title: "Koleksi Seri Artikel & Panduan | Antigravity Blog",
    description:
      "Kumpulan seri artikel dan kurikulum panduan rekayasa perangkat lunak terstruktur.",
    type: "website",
  },
};

export default async function SeriesCatalogPage() {
  const seriesList = await db.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      posts: {
        where: { published: true },
        select: { id: true, readingTime: true },
      },
    },
  });

  const totalPublishedInAllSeries = seriesList.reduce(
    (acc, s) => acc + s.posts.length,
    0
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-gray-900 dark:to-purple-950/20 p-8 sm:p-12 shadow-sm">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide">
            <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Koleksi & Seri Panduan</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
            Seri Artikel &{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              Panduan Lengkap
            </span>
          </h1>

          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Pelajari topik rekayasa perangkat lunak, arsitektur sistem modular, dan
            orkestrasi multi-agent AI secara bertahap melalui kurikulum artikel yang
            terstruktur dan komprehensif.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <strong className="text-gray-900 dark:text-gray-100">
                {seriesList.length}
              </strong>{" "}
              Seri Tersedia
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <strong className="text-gray-900 dark:text-gray-100">
                {totalPublishedInAllSeries}
              </strong>{" "}
              Materi Terpublikasi
            </span>
          </div>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-200/40 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-16 w-56 h-56 bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Series Cards Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Daftar Seri Terbit
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pilih seri panduan untuk mulai membaca dari bab pertama
            </p>
          </div>
          <Badge variant="secondary" className="font-semibold text-xs">
            {seriesList.length} Seri
          </Badge>
        </div>

        {seriesList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
              <FolderX className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                Belum Ada Seri Artikel
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Seri artikel baru sedang disusun oleh tim editorial kami. Silakan jelajahi
                artikel reguler di beranda.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <span>Eksplorasi Artikel di Beranda</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seriesList.map((series) => (
              <SeriesCard key={series.id} series={series} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
