import Link from "next/link";
import { Calendar, Clock, ArrowRight, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface PostCardProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    readingTime: number;
    publishedAt: string | Date;
    tags: { tag: { name: string; slug: string } }[];
    likes?: number;
    _count?: {
      comments: number;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="group h-full flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200">
      <CardContent className="flex flex-col flex-grow p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {post.tags.map(({ tag }) => (
            <Badge key={tag.slug} variant="default">
              #{tag.name}
            </Badge>
          ))}
        </div>

        <Link href={`/posts/${post.slug}`} className="block">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2">
            {post.title}
          </h2>
        </Link>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed flex-grow">
          {post.excerpt}
        </p>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readingTime} mnt baca
            </span>
            <span className="flex items-center gap-1 text-rose-500 dark:text-rose-400 font-medium">
              <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" />
              {post.likes ?? 0}
            </span>
          </div>

          <Link
            href={`/posts/${post.slug}`}
            className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform"
          >
            Baca
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
