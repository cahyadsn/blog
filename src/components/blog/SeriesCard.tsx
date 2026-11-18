import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface SeriesCardData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  posts?: Array<{ id: string; readingTime?: number | null }>;
  _count?: { posts: number };
}

export interface SeriesCardProps {
  series: SeriesCardData;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const postCount = series.posts ? series.posts.length : series._count?.posts ?? 0;
  const totalReadingTime = series.posts
    ? series.posts.reduce((acc, p) => acc + (p.readingTime || 3), 0)
    : 0;

  return (
    <div className="group flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300">
      {/* Cover / Gradient Banner */}
      <Link href={`/series/${series.slug}`} className="block relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {series.coverImage ? (
          <img
            src={series.coverImage}
            alt={series.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 flex flex-col items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-500">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Seri Artikel
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 dark:bg-gray-900/90 shadow-sm border border-gray-200/50 dark:border-gray-700/50 font-bold text-xs py-1 px-2.5">
            <Layers className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            {postCount} Bagian
          </Badge>
        </div>
      </Link>

      {/* Content Section */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {totalReadingTime > 0 ? `~${totalReadingTime} menit baca total` : `${postCount} materi`}
            </span>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            <Link href={`/series/${series.slug}`}>
              {series.title}
            </Link>
          </h3>

          {series.description && (
            <p className="mt-2.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
              {series.description}
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Mulai Belajar
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Kurikulum Terstruktur
          </span>
        </div>
      </div>
    </div>
  );
}
