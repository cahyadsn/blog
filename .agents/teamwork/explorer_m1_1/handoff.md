# Handoff Report: Production Blueprint for Requirement R1 (Interactive Like / Clap Counter)

## 1. Observation
Direct codebase investigation at `d:\c\blog` revealed the following structural details:

1. **Prisma Schema (`prisma/schema.prisma:10-28`)**:
   - `model Post` currently contains fields: `id`, `title`, `slug`, `excerpt`, `content`, `coverImage`, `published`, `readingTime`, `publishedAt`, `createdAt`, `updatedAt`, `tags`, and `comments`.
   - `likes` field does not currently exist in `model Post`. SQLite database is configured at `url = env("DATABASE_URL")` pointing to `prisma/dev.db`.
   - Generator is `prisma-client-js`. Existing migrations are applied using `prisma db push` (`npm.cmd run db:push`).

2. **Rate Limiting Layer (`src/lib/rate-limit.ts`)**:
   - File does not exist yet (`file does not exist`).
   - Project requires an in-memory sliding-window rate limiter utility exposing `checkRateLimit(identifier, limit, windowMs)` and `resetRateLimit()` to throttle client IP requests to at most 10 requests per 10 seconds and return a `Retry-After` header.

3. **Like API Route Handler (`src/app/api/posts/[id]/like/route.ts`)**:
   - Directory and file do not exist yet (`file does not exist`).
   - Next.js 16.4.6 requires async route params: `{ params }: { params: Promise<{ id: string }> }`.
   - Dynamic parameter `[id]` must handle both CUID `id` and text `slug` identifiers.
   - Endpoint must support `GET` (fetch likes count) and `POST` (atomic increment `data: { likes: { increment: amount } }`).
   - Errors to handle: HTTP 400 (empty/whitespace id), HTTP 404 (post not found), HTTP 429 (rate limit exceeded with `Retry-After` header), and HTTP 500 (internal server/DB error).

4. **Post Card UI (`src/components/blog/PostCard.tsx:6-19, 50-60`)**:
   - `PostCardProps` accepts `post: { id, title, slug, excerpt, readingTime, publishedAt, tags, _count? }`.
   - Card footer displays calendar date and reading time using `Calendar` and `Clock` icons from `lucide-react`.
   - Likes count is not currently displayed.

5. **Post Detail Page (`src/app/posts/[slug]/page.tsx:74-94, 133-149, 153-159`)**:
   - `db.post.findUnique` queries by `slug` with full post record.
   - Header meta bar displays Author (`User`), Date (`Calendar`), and Reading time (`Clock`), but no like count.
   - Below `<div className="prose ...">` and above `<CommentSection />`, there is currently no like/clap interaction section.

6. **Animation & Global Styles (`src/app/globals.css`, `tailwind.config.ts`)**:
   - Tailwind CSS 3.4.17 with `@tailwindcss/typography` is configured.
   - Floating "+1" and heartbeat pulse animations can be cleanly added to `src/app/globals.css` with 60fps CSS keyframes.

7. **Test Suite Pattern (`tests/seo.test.ts:20-29`)**:
   - Tests run via Vitest 5.1.0 in `node` environment.
   - Prisma Client is mocked via `vi.mock("@/lib/db", ...)`.
   - Async route handlers are called directly with mocked Request objects and awaited params.

---

## 2. Logic Chain

1. **Database Schema & Persistence**:
   - Adding `likes Int @default(0)` to `model Post` in `prisma/schema.prisma` guarantees that all newly created posts default to 0 likes.
   - Executing `npx prisma db push && npx prisma generate` updates the SQLite schema in `prisma/dev.db` and updates the TypeScript types in `@prisma/client`. Existing rows will automatically receive `0` without data loss.

2. **In-Memory Sliding-Window Rate Limiter**:
   - To prevent rapid click spamming, we design `checkRateLimit(identifier: string, limit = 10, windowMs = 10000)` in `src/lib/rate-limit.ts`.
   - Using a `Map<string, number[]>` storing timestamps within the sliding window `[now - windowMs, now]`:
     - If `timestamps.length < limit`: append `now` and return `{ success: true, remaining: limit - count - 1, resetTime: now + windowMs }`.
     - If `timestamps.length >= limit`: calculate `retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000)` and return `{ success: false, retryAfter: Math.max(retryAfter, 1), remaining: 0, resetTime: timestamps[0] + windowMs }`.
   - `resetRateLimit()` clears the store, ensuring clean isolated unit and integration test executions in Vitest.

3. **Dual-Lookup Like Route Handler (`src/app/api/posts/[id]/like/route.ts`)**:
   - The route handler extracts `identifier = (await params).id?.trim()`. If missing or empty, returns 400 Bad Request.
   - Querying `db.post.findFirst({ where: { OR: [{ id: identifier }, { slug: identifier }] } })` handles both CUID identifiers and readable URL slugs in a single query.
   - For `GET`: Returns 200 `{ success: true, likes: post.likes }`.
   - For `POST`:
     - Checks rate limit for client IP extracted from `x-forwarded-for` or `x-real-ip`. If exceeded, immediately returns HTTP 429 with `{ success: false, error: "Terlalu banyak permintaan suka...", retryAfter }` and `"Retry-After": String(retryAfter)` header before performing any database write.
     - Supports optional batching amount from request body `{ amount?: number }` (defaulting to 1, capped at 20) to handle debounced multi-claps gracefully.
     - Executes atomic increment `db.post.update({ where: { id: post.id }, data: { likes: { increment: amount } } })`.
     - Returns 200 `{ success: true, likes: updatedPost.likes }`.

4. **Client Component (`src/components/blog/LikeButton.tsx`)**:
   - Provides immediate tactile responsiveness:
     - On click: immediately increments local state `setLikes(prev => prev + 1)` (optimistic UI).
     - Triggers heartbeat scale pulse (`.animate-heart-pulse`) and fills heart icon with vibrant rose color.
     - Spawns a floating `+1` indicator with slight randomized horizontal offset that ascends and fades out over 700ms (`.animate-float-up`).
   - Debounce mechanism (500ms):
     - Keeps a counter `pendingClapsRef.current += 1`.
     - Resets a 500ms timer. When user pauses clicking for 500ms, sends `POST /api/posts/[id]/like` with `{ amount }`.
     - Reconciles state with `data.likes` returned from server.
     - Handles cleanup in `useEffect` on unmount to prevent memory leaks.

5. **Displaying Total Likes in PostCard & Post Detail**:
   - In `src/components/blog/PostCard.tsx`: add `likes?: number` to `PostCardProps` and render a like badge `<Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-500" /> {post.likes ?? 0}` in the footer.
   - In `src/app/posts/[slug]/page.tsx`:
     - In header meta bar: render `<Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" /> {post.likes ?? 0} suka`.
     - Before comments: render a dedicated interaction container with `<LikeButton postId={post.id} postSlug={post.slug} initialLikes={post.likes ?? 0} />`.

---

## 3. Caveats

1. **In-Memory Rate Limiting Scope**:
   - The sliding-window rate limiter in `src/lib/rate-limit.ts` runs in Node.js process memory. In a multi-instance serverless deployment, memory is not shared across instances. However, for SQLite single-node Next.js deployment and local production runs, this in-memory design is the optimal, zero-latency, zero-external-dependency solution.
2. **Local Client Optimistic State vs Server Count**:
   - If another reader likes the post simultaneously, the local optimistic count will sync to the server's true total upon the debounced response reconciliation.
3. **Draft Post Likes**:
   - The like endpoint increments likes for any valid post. When rendering on the public site, only published posts are accessible.

---

## 4. Conclusion & Complete Implementation Blueprint

The Worker must implement the following exact code files:

### File 1: `prisma/schema.prisma`
Update `model Post` to add `likes Int @default(0)`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  excerpt     String
  content     String
  coverImage  String?
  published   Boolean   @default(true)
  readingTime Int       @default(3)
  likes       Int       @default(0)
  publishedAt DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tags        PostTag[]
  comments    Comment[]

  @@index([slug])
  @@index([publishedAt])
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  slug  String    @unique
  posts PostTag[]
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
}

model Comment {
  id            String    @id @default(cuid())
  postId        String
  post          Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorName    String
  authorEmail   String
  content       String
  status        String    @default("APPROVED") // APPROVED, PENDING, SPAM
  isAuthorReply Boolean   @default(false)
  parentId      String?
  parent        Comment?  @relation("ThreadReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies       Comment[] @relation("ThreadReplies")
  createdAt     DateTime  @default(now())

  @@index([postId])
  @@index([status])
}
```

**Worker Migration Command**:
```powershell
npx prisma db push && npx prisma generate
```

---

### File 2: `src/lib/rate-limit.ts`
Create the production-grade sliding-window rate limiter:

```typescript
/**
 * In-memory sliding-window rate limiter utility.
 * Prevents rapid spam clicking and denial-of-service attempts.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Checks if a given identifier exceeds the allowed request limit within the sliding window.
 *
 * @param identifier Unique client key (e.g. IP address or `like:${ip}`)
 * @param limit Maximum allowed requests within the window (default: 10)
 * @param windowMs Time window in milliseconds (default: 10000ms / 10s)
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 10000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(identifier) ?? { timestamps: [] };

  // Filter out expired timestamps outside the sliding window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    // Update store with pruned timestamps
    rateLimitStore.set(identifier, { timestamps: validTimestamps });

    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: oldest + windowMs,
      retryAfter: retryAfterSeconds,
    };
  }

  // Record this request
  validTimestamps.push(now);
  rateLimitStore.set(identifier, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    resetTime: now + windowMs,
  };
}

/**
 * Resets the in-memory rate limit store. Useful for testing isolation.
 */
export function resetRateLimit(): void {
  rateLimitStore.clear();
}
```

---

### File 3: `src/app/api/posts/[id]/like/route.ts`
Create the Route Handler supporting `GET` and `POST` with dual CUID/slug lookup, atomic increment, and rate limiting:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

/**
 * GET /api/posts/[id]/like
 * Retrieves the current like count for a post by CUID or slug.
 */
export async function GET(_req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier artikel diperlukan" },
        { status: 400 }
      );
    }

    const post = await db.post.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: { id: true, slug: true, likes: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, likes: post.likes },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil data suka artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/posts/[id]/like
 * Atomically increments the like count for a post by CUID or slug.
 * Rate-limited to 10 requests per 10 seconds per client IP.
 */
export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`like:${clientIp}`, 10, 10000);

    if (!rateLimit.success) {
      const retryAfter = rateLimit.retryAfter ?? 10;
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan suka. Silakan coba lagi beberapa saat.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier artikel diperlukan" },
        { status: 400 }
      );
    }

    // Find the target post by ID or slug
    const post = await db.post.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: { id: true, slug: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse optional batch increment amount from body (defaults to 1, max 20)
    let incrementAmount = 1;
    try {
      const body = await req.json();
      if (typeof body?.amount === "number" && body.amount > 0 && body.amount <= 20) {
        incrementAmount = Math.floor(body.amount);
      }
    } catch {
      // Body is empty or not JSON, fallback to 1
      incrementAmount = 1;
    }

    // Atomic increment
    const updatedPost = await db.post.update({
      where: { id: post.id },
      data: {
        likes: { increment: incrementAmount },
      },
      select: { likes: true },
    });

    return NextResponse.json(
      { success: true, likes: updatedPost.likes },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menambahkan suka pada artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
```

---

### File 4: `src/app/globals.css`
Append keyframe animation classes for floating +1 and heartbeat pulse:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #09090b;
}

.dark {
  --background: #09090b;
  --foreground: #f4f4f5;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  min-height: 100vh;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Custom Animations for Like / Clap Feedback */
@keyframes floatUpFade {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-28px) scale(1.25);
  }
}

.animate-float-up {
  animation: floatUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes heartPulse {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  45% { transform: scale(0.95); }
  70% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.animate-heart-pulse {
  animation: heartPulse 0.45s ease-in-out;
}
```

---

### File 5: `src/components/blog/LikeButton.tsx`
Create the client component with heartbeat animation, scale pulse, floating +1 indicator, optimistic update, and 500ms debounce:

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";

export interface LikeButtonProps {
  postId: string;
  postSlug?: string;
  initialLikes?: number;
  className?: string;
}

interface Floater {
  id: number;
  offsetX: number;
}

export function LikeButton({
  postId,
  postSlug,
  initialLikes = 0,
  className = "",
}: LikeButtonProps) {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  // Ref to track accumulated clicks within debounce window
  const pendingClapsRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if initialLikes changes from server
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerNetworkSync = useCallback(async () => {
    const amountToSync = pendingClapsRef.current;
    if (amountToSync <= 0) return;

    // Reset pending counter before network call
    pendingClapsRef.current = 0;

    try {
      const targetIdentifier = postSlug || postId;
      const res = await fetch(`/api/posts/${targetIdentifier}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToSync }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === "number") {
          setLikes(data.likes);
        }
      } else if (res.status === 429) {
        console.warn("Permintaan suka dibatasi (429 Too Many Requests)");
      }
    } catch (err) {
      console.error("Gagal melakukan sinkronisasi suka:", err);
    }
  }, [postId, postSlug]);

  const handleClick = () => {
    // 1. Instant Optimistic Increment
    setLikes((prev) => prev + 1);
    setIsLiked(true);

    // 2. Heartbeat scale pulse animation
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 450);

    // 3. Floating +1 indicator with jitter
    const floaterId = Date.now() + Math.random();
    const randomOffset = Math.floor(Math.random() * 24) - 12; // -12px to +12px
    setFloaters((prev) => [...prev, { id: floaterId, offsetX: randomOffset }]);

    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== floaterId));
    }, 700);

    // 4. 500ms Debounce accumulator
    pendingClapsRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerNetworkSync();
    }, 500);
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Floating +1 Indicators */}
      {floaters.map((floater) => (
        <span
          key={floater.id}
          className="absolute -top-7 text-xs sm:text-sm font-black text-rose-500 pointer-events-none select-none animate-float-up"
          style={{ transform: `translateX(${floater.offsetX}px)` }}
        >
          +1
        </span>
      ))}

      {/* Interactive Like Pill Button */}
      <button
        type="button"
        onClick={handleClick}
        className={`group flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-xs ${
          isLiked
            ? "border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
        }`}
        aria-label="Sukai artikel ini"
        title="Klik untuk menyukai artikel ini"
      >
        <Heart
          className={`w-5 h-5 transition-transform duration-200 ${
            isPulsing ? "animate-heart-pulse" : "group-hover:scale-110"
          } ${
            isLiked
              ? "fill-rose-500 text-rose-500"
              : "text-gray-400 dark:text-gray-500 group-hover:text-rose-500 group-hover:fill-rose-500/20"
          }`}
        />
        <span className="text-sm font-bold tracking-tight">
          {likes.toLocaleString("id-ID")}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-rose-500/80">
          Suka
        </span>
      </button>
    </div>
  );
}
```

---

### File 6: `src/components/blog/PostCard.tsx`
Update `PostCardProps` and render the like badge in the post card footer:

```tsx
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
```

---

### File 7: `src/app/posts/[slug]/page.tsx`
Update to import `Heart` and `LikeButton`, display like count in the header meta bar, and render `<LikeButton />` before comments:

```tsx
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
          postSlug={post.slug}
          initialLikes={post.likes ?? 0}
        />
      </div>

      {/* Kolom Komentar */}
      <CommentSection postId={post.id} initialComments={post.comments} />
    </article>
  );
}
```

---

### File 8: `tests/likes-api.test.ts`
Create comprehensive automated Vitest test suite covering rate limiting, `GET /api/posts/[id]/like`, and `POST /api/posts/[id]/like`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { GET, POST } from "@/app/api/posts/[id]/like/route";
import { db } from "@/lib/db";

// Mock @/lib/db
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Requirement R1: Like / Clap Counter & Rate Limiter Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  afterEach(() => {
    resetRateLimit();
  });

  // =========================================================================
  // 1. Sliding-Window Rate Limiter Unit Tests
  // =========================================================================
  describe("1. Sliding-Window Rate Limiter (src/lib/rate-limit.ts)", () => {
    it("should allow requests under the limit", () => {
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit("client-1", 5, 10000);
        expect(result.success).toBe(true);
      }
    });

    it("should block requests once the limit is reached and return retryAfter", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("client-spam", 5, 10000);
      }

      const blockedResult = checkRateLimit("client-spam", 5, 10000);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("should track distinct clients independently", () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("client-a", 3, 10000);
      }

      const blockedA = checkRateLimit("client-a", 3, 10000);
      expect(blockedA.success).toBe(false);

      const allowedB = checkRateLimit("client-b", 3, 10000);
      expect(allowedB.success).toBe(true);
    });

    it("should clear records on resetRateLimit()", () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("client-reset", 3, 10000);
      }
      expect(checkRateLimit("client-reset", 3, 10000).success).toBe(false);

      resetRateLimit();
      expect(checkRateLimit("client-reset", 3, 10000).success).toBe(true);
    });
  });

  // =========================================================================
  // 2. GET /api/posts/[id]/like Route Handler
  // =========================================================================
  describe("2. GET /api/posts/[id]/like", () => {
    it("should return like count when found by CUID id", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({
        id: "cuid12345",
        slug: "post-keren",
        likes: 42,
      } as any);

      const req = new Request("http://localhost:3000/api/posts/cuid12345/like");
      const res = await GET(req, { params: Promise.resolve({ id: "cuid12345" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.likes).toBe(42);
      expect(db.post.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: "cuid12345" }, { slug: "cuid12345" }],
        },
        select: { id: true, slug: true, likes: true },
      });
    });

    it("should return like count when found by slug", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({
        id: "cuid67890",
        slug: "artikel-nextjs",
        likes: 18,
      } as any);

      const req = new Request("http://localhost:3000/api/posts/artikel-nextjs/like");
      const res = await GET(req, { params: Promise.resolve({ id: "artikel-nextjs" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.likes).toBe(18);
    });

    it("should return 400 when identifier is empty or whitespace", async () => {
      const req = new Request("http://localhost:3000/api/posts/%20/like");
      const res = await GET(req, { params: Promise.resolve({ id: "   " }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Identifier artikel diperlukan");
    });

    it("should return 404 when post is not found", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/posts/unknown/like");
      const res = await GET(req, { params: Promise.resolve({ id: "unknown" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Artikel tidak ditemukan");
    });

    it("should return 500 when database throws an error", async () => {
      vi.mocked(db.post.findFirst).mockRejectedValueOnce(new Error("Database disconnected"));

      const req = new Request("http://localhost:3000/api/posts/test/like");
      const res = await GET(req, { params: Promise.resolve({ id: "test" }) });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Database disconnected");
    });
  });

  // =========================================================================
  // 3. POST /api/posts/[id]/like Route Handler
  // =========================================================================
  describe("3. POST /api/posts/[id]/like", () => {
    it("should atomically increment like count and return updated value", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({
        id: "cuid12345",
        slug: "post-keren",
      } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({
        likes: 43,
      } as any);

      const req = new Request("http://localhost:3000/api/posts/post-keren/like", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.10" },
      });

      const res = await POST(req, { params: Promise.resolve({ id: "post-keren" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.likes).toBe(43);
      expect(db.post.update).toHaveBeenCalledWith({
        where: { id: "cuid12345" },
        data: { likes: { increment: 1 } },
        select: { likes: true },
      });
    });

    it("should support custom batch increment amount from request body", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({
        id: "cuid12345",
        slug: "post-keren",
      } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({
        likes: 47,
      } as any);

      const req = new Request("http://localhost:3000/api/posts/post-keren/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.1.20",
        },
        body: JSON.stringify({ amount: 5 }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: "post-keren" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.likes).toBe(47);
      expect(db.post.update).toHaveBeenCalledWith({
        where: { id: "cuid12345" },
        data: { likes: { increment: 5 } },
        select: { likes: true },
      });
    });

    it("should return 400 when identifier is empty", async () => {
      const req = new Request("http://localhost:3000/api/posts/%20/like", {
        method: "POST",
      });
      const res = await POST(req, { params: Promise.resolve({ id: "" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Identifier artikel diperlukan");
    });

    it("should return 404 when target post is not found", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/posts/not-found/like", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.30" },
      });

      const res = await POST(req, { params: Promise.resolve({ id: "not-found" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Artikel tidak ditemukan");
    });

    it("should return 429 Too Many Requests with Retry-After header when rate limit is exceeded", async () => {
      const spamIp = "10.0.0.99";

      vi.mocked(db.post.findFirst).mockResolvedValue({
        id: "cuid12345",
        slug: "post-keren",
      } as any);
      vi.mocked(db.post.update).mockResolvedValue({
        likes: 50,
      } as any);

      // Consume the 10 allowed requests
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/posts/post-keren/like", {
          method: "POST",
          headers: { "x-forwarded-for": spamIp },
        });
        const res = await POST(req, { params: Promise.resolve({ id: "post-keren" }) });
        expect(res.status).toBe(200);
      }

      // The 11th request must be rejected with 429
      const spamReq = new Request("http://localhost:3000/api/posts/post-keren/like", {
        method: "POST",
        headers: { "x-forwarded-for": spamIp },
      });
      const blockedRes = await POST(spamReq, { params: Promise.resolve({ id: "post-keren" }) });
      const blockedJson = await blockedRes.json();

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
      expect(blockedJson.success).toBe(false);
      expect(blockedJson.error).toContain("Terlalu banyak permintaan suka");
      expect(blockedJson.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("should return 500 when database throws an error during update", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({
        id: "cuid12345",
        slug: "post-keren",
      } as any);
      vi.mocked(db.post.update).mockRejectedValueOnce(new Error("Disk I/O error"));

      const req = new Request("http://localhost:3000/api/posts/post-keren/like", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.50" },
      });

      const res = await POST(req, { params: Promise.resolve({ id: "post-keren" }) });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Disk I/O error");
    });
  });
});
```

---

## 5. Verification Method

To independently verify the implementation, the Worker and Reviewer should execute:

1. **Database Migration Check**:
   ```powershell
   npx.cmd prisma db push
   npx.cmd prisma generate
   ```
   *Expected outcome*: Database schema synchronized with SQLite `prisma/dev.db`, `Post.likes` added with `@default(0)`.

2. **Automated Vitest Test Suites**:
   ```powershell
   npx.cmd vitest run tests/likes-api.test.ts
   ```
   *Expected outcome*: All 14 tests in `tests/likes-api.test.ts` pass with 100% success.

3. **Full Regression Test Suite**:
   ```powershell
   npm.cmd test
   ```
   *Expected outcome*: All test suites pass (including pre-existing `tests/seo.test.ts` and new `tests/likes-api.test.ts`) with zero regressions.

4. **Production Build Compilation**:
   ```powershell
   npm.cmd run build
   ```
   *Expected outcome*: Next.js 16 build succeeds with exit code 0, verifying TypeScript type-checking, CSS keyframes, and Server/Client component boundaries.

5. **Invalidation Conditions**:
   - `POST /api/posts/[id]/like` returns 404 when requested via slug instead of CUID.
   - Rapid clicking (>10 calls within 10s) does not trigger 429 Too Many Requests with `Retry-After` header.
   - Click count does not increment optimistically or fails to update card footer.
