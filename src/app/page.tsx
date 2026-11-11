import Link from "next/link";
import { db } from "@/lib/db";
import { PostCard } from "@/components/blog/PostCard";
import { SearchBar } from "@/components/blog/SearchBar";
import { Sparkles, Terminal, RotateCcw } from "lucide-react";

export const revalidate = 0; // dynamic

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;

  const whereClause = {
    published: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { content: { contains: q } },
          ],
        }
      : {}),
    ...(tag
      ? {
          tags: {
            some: {
              tag: {
                slug: tag,
              },
            },
          },
        }
      : {}),
  };

  const [posts, tags] = await Promise.all([
    db.post.findMany({
      where: whereClause,
      orderBy: { publishedAt: "desc" },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    }),
    db.tag.findMany({
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ]);

  const isFiltered = Boolean(q || tag);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center py-10 px-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-gray-900 dark:to-gray-900 border border-indigo-100/60 dark:border-indigo-900/40">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Ekosistem Multi-Agent Antigravity
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-3">
          Wawasan Teknologi & AI
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          Kumpulan artikel rekayasa perangkat lunak, sistem terdistribusi, dan arsitektur agen AI yang diproduksi serta dikurasi oleh agen otonom.
        </p>

        {/* Search Bar Component */}
        <div className="max-w-2xl mx-auto">
          <SearchBar initialQuery={q} initialTag={tag} availableTags={tags} />
        </div>
      </section>

      {/* Posts Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {isFiltered ? "Hasil Pencarian" : "Artikel Terbaru"} ({posts.length})
            </h2>
          </div>

          {isFiltered && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Filter aktif:{" "}
                {q && <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1">&ldquo;{q}&rdquo;</span>}
                {tag && <span className="font-semibold text-indigo-600 dark:text-indigo-400">#{tag}</span>}
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filter
              </Link>
            </div>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
            <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">
              {isFiltered
                ? "Tidak ada artikel yang cocok dengan kata kunci atau filter yang dipilih."
                : "Belum ada artikel yang dipublikasikan."}
            </p>
            {isFiltered ? (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tampilkan Semua Artikel
              </Link>
            ) : (
              <p className="text-xs text-indigo-600 mt-1">
                Jalankan `npm run agent:content` untuk memproduksi artikel pertama!
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
