# Comprehensive Codebase Survey Report: Requirement R1 (Interactive Like / Clap Counter)

## 1. Observation

### 1.1 Database Schema & Migration Mechanism
- **File**: `prisma/schema.prisma` (lines 10-28)
  ```prisma
  model Post {
    id          String    @id @default(cuid())
    title       String
    slug        String    @unique
    excerpt     String
    content     String
    coverImage  String?
    published   Boolean   @default(true)
    readingTime Int       @default(3)
    publishedAt DateTime  @default(now())
    createdAt   DateTime  @default(now())
    updatedAt   DateTime  @updatedAt

    tags        PostTag[]
    comments    Comment[]

    @@index([slug])
    @@index([publishedAt])
  }
  ```
  *Direct Observation*: The `Post` model does not currently contain a `likes` or `claps` field. SQLite is the datasource (`datasource db { provider = "sqlite", url = env("DATABASE_URL") }`).
- **File**: `package.json` (lines 10-12)
  ```json
  "scripts": {
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:seed": "tsx prisma/seed.ts"
  }
  ```
  *Direct Observation*: There is no `prisma/migrations/` directory in the repository. Schema synchronization is managed via `prisma db push` (`npm run db:push`) and `@prisma/client` is generated via `prisma generate` (`npm run db:generate`).
- **File**: `src/lib/db.ts` (lines 1-13)
  ```typescript
  import { PrismaClient } from "@prisma/client";

  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

  export const db =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
  ```
  *Direct Observation*: Prisma Client singleton is exported as `db`.

### 1.2 Post Detail Page & UI Components
- **File**: `src/app/posts/[slug]/page.tsx`
  - Next.js dynamic Route parameter typing (lines 12-16 & lines 67-71):
    ```typescript
    export async function generateMetadata({
      params,
    }: {
      params: Promise<{ slug: string }>;
    }): Promise<Metadata> {
      const { slug } = await params;
      ...
    }

    export default async function PostDetailPage({
      params,
    }: {
      params: Promise<{ slug: string }>;
    }) {
      const { slug } = await params;
    ```
  - Header metadata display bar (lines 133-148):
    ```tsx
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
    ```
  - Article content & comments transition (lines 152-159):
    ```tsx
    <div
      className="prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />

    {/* Kolom Komentar */}
    <CommentSection postId={post.id} initialComments={post.comments} />
    ```
  *Direct Observation*: `PostDetailPage` is a React Server Component. Database query uses `db.post.findUnique({ where: { slug }, include: ... })` which automatically fetches all scalar attributes of `Post` (including `likes` once added). Lucide icons (`Heart`, `ThumbsUp`, `Sparkles`, etc.) are already installed (`lucide-react@^1.16.0`).

### 1.3 Home Page & Post Cards
- **File**: `src/app/page.tsx` (lines 40-59 & lines 134-138):
  - Fetches posts with `db.post.findMany({ where: whereClause, orderBy: { publishedAt: "desc" }, include: { tags: ..., _count: ... } })`. Because no `select` restriction is specified, all scalar columns on `Post` are fetched.
  - Renders `<PostCard key={post.id} post={post} />`.
- **File**: `src/components/blog/PostCard.tsx` (lines 6-19 & lines 49-60):
  ```typescript
  export interface PostCardProps {
    post: {
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      readingTime: number;
      publishedAt: string | Date;
      tags: { tag: { name: string; slug: string } }[];
      _count?: {
        comments: number;
      };
    };
  }
  ```
  ```tsx
  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
    <div className="flex items-center gap-4">
      <span className="flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" />
        {formattedDate}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {post.readingTime} mnt baca
      </span>
    </div>

    <Link href={`/posts/${post.slug}`} ...>Baca <ArrowRight ... /></Link>
  </div>
  ```
  *Direct Observation*: `PostCardProps` does not currently include `likes`. Total likes can be positioned next to reading time in the card footer.

### 1.4 API Route Patterns & Async Parameter Conventions
- **File**: `src/app/api/posts/route.ts`: Only `GET` and `POST` for post collections exist. There are no subroutes under `src/app/api/posts/`.
- **File**: `src/app/api/admin/posts/[id]/route.ts` (lines 7-10):
  ```typescript
  export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    ...
  }
  ```
  *Direct Observation*: Next.js 16.4.6 enforces asynchronous route params `Promise<{ id: string }>` requiring `await params`.

### 1.5 Baseline Test Suite & Build Verification
- **Vitest Test Suite**: Running `npm.cmd test` passes 160 tests across 9 test files:
  ```
  Test Files  9 passed (9)
       Tests  160 passed (160)
    Duration  19.14s
  ```
- **Next.js Production Build**: Running `npm.cmd run build` completes with exit code 0:
  ```
  ✓ Compiled successfully in 20.7s
  ✓ Generating static pages using 7 workers (13/13) in 5.0s
  ```

---

## 2. Logic Chain

1. **Schema Column Selection**:
   - SQLite stores integer numbers natively.
   - Adding `likes Int @default(0)` to the `Post` model in `prisma/schema.prisma` guarantees that all existing posts in `prisma/dev.db` automatically receive `0` without nullability issues or data migration loss.
   - Synchronizing with `npx prisma db push && npx prisma generate` updates the database table structure and refreshes the TypeScript client types.

2. **Route Handler Architecture (`src/app/api/posts/[id]/like/route.ts`)**:
   - The user request specifies: `POST /api/posts/[id]/like` or `/api/posts/[slug]/like`, to retrieve and increment the like counter.
   - In Next.js App Router, dynamic segment `[id]` matches any string segment (both cuid IDs like `cm...` and url slugs like `optimasi-performa-nextjs-15-rsc`).
   - By creating `src/app/api/posts/[id]/like/route.ts` with parameter lookup:
     ```typescript
     const { id: identifier } = await params;
     const post = await db.post.findFirst({
       where: {
         OR: [{ id: identifier }, { slug: identifier }],
       },
       select: { id: true, slug: true, likes: true },
     });
     ```
     both endpoints (`/api/posts/<cuid>/like` and `/api/posts/<slug>/like`) map to the exact same handler without duplicating routes or creating routing ambiguities.
   - Supporting both `GET` (returns `{ success: true, likes: post.likes }`) and `POST` (increments and returns `{ success: true, likes: updated.likes }`) completely satisfies "retrieve and increment the like counter".
   - Concurrency safety: Using Prisma's atomic increment `data: { likes: { increment: 1 } }` delegates incrementation to SQLite (`UPDATE "Post" SET "likes" = "likes" + 1`), preventing lost updates under concurrent access.

3. **Spam Prevention & Rate-Limiting Strategy**:
   - Requirement R1 explicitly specifies: *"debounce/rate-limiting to prevent rapid spam clicking"*.
   - A two-tier defense provides maximum protection and great UX:
     - **Server-Side Rate Limiter (`src/lib/rate-limit.ts`)**: An in-memory sliding window map keyed by `ip:postId`. If requests exceed 10 likes per 10 seconds per IP, return HTTP 429 (`Too Many Requests`) with a `Retry-After` header and informative error message.
     - **Client-Side Debounce & Optimistic UI (`src/components/blog/LikeButton.tsx`)**:
       - When clicked, immediately update UI state (`likes + 1`), trigger heart scale animation and floating `+1` bubble.
       - Debounce network transmission by 400-500ms or queue rapid clicks so that multiple rapid claps result in batched/debounced requests rather than flood the server.
       - If the server responds with 429 or network fails, roll back optimistic state and alert user.

4. **UI Placement & Visual Feedback**:
   - **Post Detail Page (`src/app/posts/[slug]/page.tsx`)**:
     1. In the header meta bar (lines 133-148), display static total like count: `<span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400"><Heart className="w-4 h-4 fill-rose-500/20" />{post.likes} suka</span>`.
     2. Below article prose (line 155) and above comments (line 158), render an interactive `<LikeButton postId={post.id} slug={post.slug} initialLikes={post.likes} />`.
   - **Post Card (`src/components/blog/PostCard.tsx`)**:
     - Update `PostCardProps` to include `likes?: number;`.
     - In card footer alongside Calendar and Clock, render `<span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400" title={`${post.likes ?? 0} suka`}><Heart className="w-3.5 h-3.5 fill-rose-500/20" />{post.likes ?? 0}</span>`.
   - **Home Page (`src/app/page.tsx`)**:
     - `db.post.findMany` already includes all scalar fields, so `post.likes` is automatically passed into `<PostCard />`.

5. **Test Strategy**:
   - Create `tests/likes-api.test.ts` with test cases:
     - T1: Increment like by post ID (200 OK, returns incremented count).
     - T2: Increment like by post slug (200 OK, returns incremented count).
     - T3: Retrieve like count via GET (200 OK, returns current count).
     - T4: Return 404 when liking non-existent post.
     - T5: Server-side rate limiter returns 429 Too Many Requests when requests exceed threshold.
     - T6: Rate limit resets after window expiry.
     - T7: Real SQLite DB integration verifying atomic increment persistence.

---

## 3. Caveats

1. **In-Memory Rate Limiting**: The in-memory sliding window rate limiter stores timestamps in process memory. In serverless multi-instance deployments without shared cache (like Redis), limits are local to each process instance. For this single-process Next.js SQLite blog architecture, an in-memory Map is optimal, lightweight, zero-dependency, and fully testable in Vitest.
2. **Next.js Async Route Params**: Next.js 16 requires dynamic params to be awaited: `const { id } = await params;`. Implementers must not attempt synchronous access (`params.id`), which would fail compilation.
3. **Windows PowerShell Execution Policy**: The Windows environment blocks `npm.ps1`. All commands must use `npm.cmd` or `npx.cmd`.
4. **Turbopack Build Lock**: When running `npm.cmd run build`, ensure no concurrent build process is running to avoid `.next/lock` collision.

---

## 4. Conclusion & Actionable Recommendations

### Concrete Implementation Blueprint for R1:

| Component | Target File | Action | Key Specifications |
|---|---|---|---|
| **Prisma Model** | `prisma/schema.prisma` | Edit `Post` model | Add `likes Int @default(0)` |
| **Database Sync** | Terminal | Execute CLI | `npm.cmd run db:push && npm.cmd run db:generate` |
| **Rate Limiter** | `src/lib/rate-limit.ts` | Create new utility | Sliding window Map tracking IP+PostId, 429 Too Many Requests |
| **API Endpoint** | `src/app/api/posts/[id]/like/route.ts` | Create Route Handler | `GET` (retrieve) & `POST` (atomic `increment: 1`), resolves both ID & slug, `await params` |
| **Interactive Component** | `src/components/blog/LikeButton.tsx` | Create `"use client"` component | Heart icon, scale-125 pop animation, floating `+1` bubble, optimistic state, 500ms debounce |
| **Post Detail View** | `src/app/posts/[slug]/page.tsx` | Edit Server Component | Display total likes in header metadata bar and render `<LikeButton />` in engagement section before comments |
| **Post Card View** | `src/components/blog/PostCard.tsx` | Edit Component & Props | Add `likes?: number` to `PostCardProps`, render Heart icon + count in footer |
| **Automated Tests** | `tests/likes-api.test.ts` | Create Vitest Suite | Test ID/slug increment, GET retrieval, 404 not found, atomic math, 429 rate-limiting, and DB persistence |

---

## 5. Verification Method

1. **Prisma Schema & Generation Verification**:
   ```powershell
   npx.cmd prisma validate
   npm.cmd run db:push
   npm.cmd run db:generate
   ```
   *Expected outcome*: Schema validates successfully, `prisma/dev.db` is updated with `likes` column default 0, and `@prisma/client` types are generated without errors.

2. **Automated Vitest Test Suite Execution**:
   ```powershell
   npm.cmd test
   ```
   *Expected outcome*: All 160 existing tests across 9 test files continue to pass, and all new tests in `tests/likes-api.test.ts` pass with 100% green status.

3. **Production Build Verification**:
   ```powershell
   npm.cmd run build
   ```
   *Expected outcome*: `next build` compiles successfully with exit code 0, generating static and dynamic routes including `/posts/[slug]` and `/api/posts/[id]/like`.

4. **Invalidation Conditions**:
   - Calling `POST /api/posts/<invalid-id>/like` returns anything other than 404.
   - Concurrently liking the same post results in a lost increment.
   - Rapid clicking (>10 clicks in <10 seconds) bypasses rate-limiting without triggering HTTP 429.
   - Accessing `params.id` without `await params` causing Next.js 16 runtime/type warning.
