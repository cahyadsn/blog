/**
 * Series Navigation Calculation Module
 * Provides pure business logic for calculating table of contents, active steps,
 * and previous/next article navigation pointers within multi-part series collections.
 */

export interface SeriesNavigationPost {
  id: string;
  title: string;
  slug: string;
  orderInSeries?: number | null;
  published?: boolean;
  readingTime?: number | null;
  publishedAt?: Date | string | null;
}

export interface SeriesNavigationInput {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  posts: SeriesNavigationPost[];
}

export interface SeriesNavigationPart {
  id: string;
  title: string;
  slug: string;
  orderInSeries: number;
  isActive: boolean;
}

export interface SeriesNavigationPostSummary {
  id: string;
  title: string;
  slug: string;
}

export interface SeriesNavigationResult {
  series: {
    id: string;
    title: string;
    slug: string;
  };
  currentOrder: number;
  totalParts: number;
  parts: SeriesNavigationPart[];
  previousPost: SeriesNavigationPostSummary | null;
  nextPost: SeriesNavigationPostSummary | null;
}

/**
 * Calculates series table of contents and prev/next links for a specific post.
 * Handles drafts filtering, custom ordering, and edge cases (first, last, single, missing).
 */
export function calculateSeriesNavigation(
  series: SeriesNavigationInput | null | undefined,
  currentPost: { id?: string; slug?: string } | string | null | undefined
): SeriesNavigationResult | null {
  if (!series || !series.posts || !Array.isArray(series.posts) || series.posts.length === 0) {
    return null;
  }

  if (!currentPost) {
    return null;
  }

  // Filter out unpublished/draft posts
  const publishedPosts = series.posts.filter((post) => post.published !== false);

  if (publishedPosts.length === 0) {
    return null;
  }

  // Sort published posts by orderInSeries ascending, fallback to original order
  const sortedPosts = [...publishedPosts].sort((a, b) => {
    const orderA = typeof a.orderInSeries === "number" ? a.orderInSeries : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.orderInSeries === "number" ? b.orderInSeries : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Secondary sort by publishedAt if available
    if (a.publishedAt && b.publishedAt) {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    }
    return 0;
  });

  // Identify current post index in sorted published array
  const targetId = typeof currentPost === "string" ? currentPost : currentPost.id;
  const targetSlug = typeof currentPost === "string" ? currentPost : currentPost.slug;

  const currentIndex = sortedPosts.findIndex(
    (post) =>
      (targetId && post.id === targetId) ||
      (targetSlug && post.slug === targetSlug)
  );

  // If current post is not found in published series posts, navigation cannot be computed
  if (currentIndex === -1) {
    return null;
  }

  const currentItem = sortedPosts[currentIndex];

  const prev = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
  const next = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

  const previousPost: SeriesNavigationPostSummary | null = prev
    ? { id: prev.id, title: prev.title, slug: prev.slug }
    : null;

  const nextPost: SeriesNavigationPostSummary | null = next
    ? { id: next.id, title: next.title, slug: next.slug }
    : null;

  const parts: SeriesNavigationPart[] = sortedPosts.map((post, idx) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    orderInSeries: post.orderInSeries ?? idx + 1,
    isActive: idx === currentIndex,
  }));

  return {
    series: {
      id: series.id,
      title: series.title,
      slug: series.slug,
    },
    currentOrder: currentItem.orderInSeries ?? currentIndex + 1,
    totalParts: sortedPosts.length,
    parts,
    previousPost,
    nextPost,
  };
}
