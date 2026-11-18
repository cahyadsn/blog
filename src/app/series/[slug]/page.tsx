import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  BookOpen,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Bookmark,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 0; // dynamic

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const series = await db.series.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      coverImage: true,
    },
  });

  if (!series) {
    return {
      title: "Seri Tidak Ditemukan | Antigravity Blog",
    };
  }

  const ogImageUrl = series.coverImage || `/opengraph-image`;

  return {
    title: `${series.title} — Seri Artikel & Panduan | Antigravity Blog`,
    description:
      series.description ||
      `Kurikulum panduan lengkap untuk seri ${series.title}. Pelajari langkah demi langkah.`,
    openGraph: {
      title: `${series.title} — Seri Artikel & Panduan`,
      description:
        series.description ||
        `Kurikulum panduan lengkap untuk seri ${series.title}. Pelajari langkah demi langkah.`,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: series.title,
        },
      ],
    },
  };
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const series = await db.series.findUnique({
    where: { slug },
    include: {
      posts: {
        where: { published: true },
        orderBy: [{ orderInSeries: "asc" }, { publishedAt: "asc" }],
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  });

  if (!series) {
    notFound();
  }

  const totalReadingTime = series.posts.reduce(
    (acc, post) => acc + (post.readingTime || 3),
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/series"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Seri</span>
        </Link>
      </div>

      {/* Series Hero Header */}
      <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 overflow-hidden shadow-sm">
        {series.coverImage ? (
          <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
            <img
              src={series.coverImage}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full py-10 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
          </div>
        )}

        <div className="p-6 sm:p-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-semibold text-xs py-1 px-3">
              <Bookmark className="w-3.5 h-3.5 mr-1.5 text-indigo-600 dark:text-indigo-400" />
              Seri Panduan
            </Badge>
            <Badge variant="default" className="text-xs py-1 px-3">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              {series.posts.length} Bagian
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            {series.title}
          </h1>

          {series.description && (
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
              {series.description}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Perkiraan waktu baca total:{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                ~{totalReadingTime} menit
              </strong>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Alur pembelajaran terurut
            </span>
          </div>
        </div>
      </section>

      {/* Curriculum Roadmap / List of Posts */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Kurikulum Seri & Daftar Isi
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Disarankan membaca secara berurutan untuk pemahaman maksimal
            </p>
          </div>
        </div>

        {series.posts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Belum ada artikel yang dipublikasikan dalam seri ini.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Artikel sedang dalam penulisan atau review oleh tim editorial.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {series.posts.map((post, idx) => {
              const partNumber = post.orderInSeries ?? idx + 1;
              const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <div
                  key={post.id}
                  className="group relative flex flex-col sm:flex-row sm:items-start gap-4 p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all duration-200"
                >
                  {/* Part Number Badge */}
                  <div className="flex-shrink-0 flex sm:flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      {partNumber}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:block">
                      Bagian
                    </span>
                  </div>

                  {/* Post Information */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 sm:hidden">
                        Bagian {partNumber}
                      </span>
                      {post.tags.map(({ tag }) => (
                        <Badge key={tag.slug} variant="secondary" className="text-[10px] py-0 px-2">
                          #{tag.name}
                        </Badge>
                      ))}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <Link href={`/posts/${post.slug}`} className="focus:outline-none">
                        {post.title}
                      </Link>
                    </h3>

                    {post.excerpt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {post.readingTime} menit baca
                      </span>
                    </div>
                  </div>

                  {/* Read Button */}
                  <div className="sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 group-hover:bg-indigo-600 text-gray-700 dark:text-gray-200 group-hover:text-white text-xs font-semibold shadow-xs transition-all"
                    >
                      <span>Baca</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
