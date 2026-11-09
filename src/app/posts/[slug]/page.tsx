import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "@/components/blog/CommentSection";
import { Calendar, Clock, ChevronLeft, User } from "lucide-react";

export const revalidate = 0; // dynamic

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      tags: {
        include: { tag: true },
      },
      comments: {
        where: {
          status: "APPROVED",
          parentId: null, // top-level comments
        },
        include: {
          replies: {
            where: { status: "APPROVED" },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!post || !post.published) {
    notFound();
  }

  const htmlContent = await parseMarkdownToHtml(post.content);

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="max-w-3xl mx-auto">
      {/* Tombol Kembali */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Kembali ke Beranda
      </Link>

      {/* Header Post */}
      <header className="mb-10 pb-8 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map(({ tag }) => (
            <Badge key={tag.slug} variant="default">
              #{tag.name}
            </Badge>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl sm:leading-tight font-extrabold text-gray-900 dark:text-gray-100 mb-6">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
            <User className="w-4 h-4 text-indigo-600" />
            Antigravity Editorial Agent
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formattedDate}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {post.readingTime} menit baca
          </span>
        </div>
      </header>

      {/* Konten Artikel Prose */}
      <div
        className="prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Kolom Komentar */}
      <CommentSection postId={post.id} initialComments={post.comments} />
    </article>
  );
}
