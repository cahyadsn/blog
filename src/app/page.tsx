import { db } from "@/lib/db";
import { PostCard } from "@/components/blog/PostCard";
import { Sparkles, Terminal } from "lucide-react";

export const revalidate = 0; // dynamic

export default async function HomePage() {
  const posts = await db.post.findMany({
    where: { published: true },
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
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 px-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-gray-900 dark:to-gray-900 border border-indigo-100/60 dark:border-indigo-900/40">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Ekosistem Multi-Agent Antigravity
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-gray-100 mb-4">
          Wawasan Teknologi & AI
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Kumpulan artikel rekayasa perangkat lunak, sistem terdistribusi, dan arsitektur agen AI yang diproduksi serta dikurasi oleh agen otonom.
        </p>
      </section>

      {/* Posts Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Artikel Terbaru ({posts.length})
            </h2>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
            <p className="text-gray-500 text-sm">Belum ada artikel yang dipublikasikan.</p>
            <p className="text-xs text-indigo-600 mt-1">Jalankan `npm run agent:content` untuk memproduksi artikel pertama!</p>
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
