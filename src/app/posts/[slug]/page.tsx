import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "@/components/blog/CommentSection";
import { LikeButton } from "@/components/blog/LikeButton";
import { Calendar, Clock, ChevronLeft, User, Heart } from "lucide-react";

export const revalidate = 0; // dynamic

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      published: true,
      publishedAt: true,
    },
  });

  if (!post || !post.published) {
    return {
      title: "Artikel Tidak Ditemukan",
    };
  }

  const ogImageUrl = post.coverImage || `/posts/${post.slug}/opengraph-image`;

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      authors: ["Antigravity Editorial Agent"],
      url: `/posts/${post.slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl],
    },
  };
}

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
          <span>•</span>
          <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-medium">
            <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
            {post.likes ?? 0} suka
          </span>
        </div>
      </header>

      {/* Konten Artikel Prose */}
      <div
        className="prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Bagian Interaktif Like / Clap Button */}
      <div className="my-12 py-8 border-y border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
          Menyukai artikel ini? Berikan apresiasi Anda!
        </p>
        <LikeButton
          postId={post.id}
          slug={post.slug}
          postSlug={post.slug}
          initialLikes={post.likes ?? 0}
        />
      </div>

      {/* Kolom Komentar */}
      <CommentSection postId={post.id} initialComments={post.comments} />
    </article>
  );
}
