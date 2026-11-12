# Handoff Report: Specification Mining for Interaction & Community Features (R1, R2, R3)

**Author**: Specification Miner Agent (`spec_miner_survey_3`)  
**Target Recipient**: Orchestrator Agent (`b89343ec-d337-44ce-94cc-38ecb7f139fb`)  
**Date**: 2026-11-12T02:22:00Z  
**Working Directory**: `d:\c\blog`  
**State Folder**: `d:\c\blog\.agents\teamwork\spec_miner_survey_3`  
**Integrity Mode**: Development / Strict Specification  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Interaction (R1) | Like / Clap Increment Route Handler | Atomically increments `likes` count on a post by 1 and returns updated counter | HTTP `POST /api/posts/[id]/like` with route param `id` (or `slug`) | `200 OK` + `{ success: true, likes: number }` | `404 Not Found` if post not found; `400 Bad Request` if id/slug invalid; `429 Too Many Requests` if rate limited | `ORIGINAL_REQUEST.md`, `src/app/api/admin/posts/[id]/route.ts` |
| 2 | Interaction (R1) | Like / Clap Query (GET) | Retrieves current like counter for a post without mutating count | HTTP `GET /api/posts/[id]/like` with route param `id` (or `slug`) | `200 OK` + `{ success: true, likes: number }` | `404 Not Found` if post not found; `400 Bad Request` if id invalid | `ORIGINAL_REQUEST.md`, `src/app/posts/[slug]/page.tsx` |
| 3 | Interaction (R1) | Server Rate Limiter & Debounce | Prevents spam clicks and abusive automated flooding per client IP | Client IP / `x-forwarded-for` / `x-real-ip` within sliding window (e.g., max 10 requests / 10s) | Allows request to proceed to DB increment | `429 Too Many Requests` + `{ success: false, error: string, retryAfter: number }` + `Retry-After` header | `ORIGINAL_REQUEST.md` (R1 acceptance criteria) |
| 4 | Interaction (R1) | Client Like / Clap Button Component | Interactive UI button with instant visual animation (pulse/scale/hearts) and optimistic increment | Props: `postId: string`, `initialLikes: number` | Rendered interactive button with dynamic count | Client-side debounced dispatch; falls back on network failure | `src/app/posts/[slug]/page.tsx`, `src/components/ui/button.tsx` |
| 5 | Interaction (R1) | Post Card Like Metric Badge | Displays total likes count alongside publication date and reading time on cards | Post object with `likes: number` | Rendered like icon & number badge on post card | Defaults to 0 if null/undefined | `src/components/blog/PostCard.tsx`, `src/app/page.tsx` |
| 6 | Newsletter (R2) | Subscriber Zod Validation Schema | Strict validation of email input before database processing | String input (`email`) | Validated email string | `400 Bad Request` + detailed issue message | `src/lib/validations.ts`, `tests/validations.test.ts` |
| 7 | Newsletter (R2) | Public Subscription Route Handler | Handles subscriber registration, checks deduplication, saves to DB | HTTP `POST /api/newsletter/subscribe` + JSON `{ email: string }` | `201 Created` or `200 OK` + informative message | `400 Bad Request` on validation error; `500 Internal Server Error` on DB error | `ORIGINAL_REQUEST.md` (R2 acceptance criteria) |
| 8 | Newsletter (R2) | Idempotent Duplicate Subscription Handler | Silently prevents duplicate database records while providing positive user feedback | Existing email in `Subscriber` table | `200 OK` + `{ success: true, message: string, alreadySubscribed: true }` | Does NOT throw server error (no 500, no 409); preserves single row | `ORIGINAL_REQUEST.md` § R2 Acceptance Criteria |
| 9 | Newsletter (R2) | Newsletter Subscription Form Component | Responsive UI component with input, submit button, loading state, and inline feedback | User typed email string | Rendered form with success / error banner | Displays validation feedback inline | `src/components/blog/Footer.tsx`, `src/app/posts/[slug]/page.tsx` |
| 10 | Admin (R2) | Admin Subscribers List API | Protected route handler retrieving list of subscribers and summary stats | HTTP `GET /api/admin/subscribers` | `200 OK` + `{ success: true, subscribers: Array, totalCount: number, activeCount: number }` | `401 Unauthorized` via middleware if not authenticated | `src/middleware.ts`, `src/app/admin/page.tsx` |
| 11 | Admin (R2) | Admin Dashboard Subscriber Metrics | Displays newsletter subscriber totals without disturbing posts and comments metrics | Admin subscriber stats | Updated Admin UI with subscriber metric card and list tab | Safe fallback if fetch fails | `src/app/admin/page.tsx` |
| 12 | Test & Build (R3) | Next.js 15+ Async Params Contract | Next.js 15+ enforces `params: Promise<{ ... }>` for Route Handlers and dynamic pages | `{ params: Promise<{ id: string }> }` | Unwrapped params via `await params` | Type error or runtime failure if params accessed synchronously | `src/app/api/admin/posts/[id]/route.ts`, Next.js 16.4.6 |
| 13 | Test & Build (R3) | Vitest Test Suite Execution | Automated regression and feature verification in `node` environment | `npm.cmd test` (`vitest run`) | 160 existing tests pass across 9 test files | Fails if any assertion or mock throws | `vitest.config.ts`, `package.json` |
| 14 | Test & Build (R3) | Next.js Turbopack Production Build | Comprehensive compile, TypeScript check, lint, and static page generation | `npm.cmd run build` (`next build`) | Exit code 0, 13 static pages, zero TS/type errors | Exit code 1 on compilation or type mismatch | `package.json`, `tsconfig.json`, `next.config.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Like Counter API | Non-existent Post ID (`POST /api/posts/non-existent-cuid/like`) | Returns `404 Not Found` with `{ success: false, error: "Artikel tidak ditemukan" }`. Does not create orphaned records. |
| 2 | Like Counter API | Empty or whitespace ID (`POST /api/posts/%20%20/like`) | Returns `400 Bad Request` with `{ success: false, error: "ID artikel tidak valid" }`. Avoids unhandled database lookup. |
| 3 | Like Counter API | Post identified by slug instead of cuid (`POST /api/posts/optimasi-performa-nextjs-15-rsc/like`) | Finds post by `slug` fallback, increments `likes`, and returns `200 OK` with updated count. |
| 4 | Rate Limiting | 15 rapid sequential like requests within 2 seconds from same IP (`127.0.0.1`) | First 10 requests return `200 OK`; 11th through 15th requests return `429 Too Many Requests` with `Retry-After: 10`. |
| 5 | Rate Limiting | Requests from distinct IP addresses (`192.168.1.1` vs `192.168.1.2`) | Tracked independently; neither IP triggers rate-limit block due to the other's activity. |
| 6 | Rate Limiting in Tests | Vitest test executing multiple consecutive tests requiring fresh rate-limit state | Calling `resetRateLimit()` between test cases clears in-memory sliding window, ensuring test isolation. |
| 7 | Newsletter Validation | Malformed email without domain (`"john.doe@"`) | Zod `SubscriberSchema` rejects with `Format alamat email tidak valid`; API returns `400 Bad Request`. |
| 8 | Newsletter Validation | Email with leading/trailing whitespace (`"  alice@company.com  "`) | `.trim()` normalizes the input; successfully registers `"alice@company.com"`. |
| 9 | Newsletter Validation | Uppercase / mixed-case email (`"Subscriber@DOMAIN.COM"`) | Normalizes to lowercase (`subscriber@domain.com`); avoids duplicate registrations with different case variations. |
| 10 | Newsletter Validation | Oversized email string (> 100 characters) | Zod `SubscriberSchema` rejects with `Email maksimal 100 karakter`; API returns `400 Bad Request`. |
| 11 | Newsletter Validation | Empty string or missing `email` field (`{}` or `{ email: "" }`) | Zod rejects with `Email wajib diisi` or `Email tidak boleh kosong`; API returns `400 Bad Request`. |
| 12 | Newsletter Deduplication | Submitting an email that already exists in `Subscriber` table | Returns `200 OK` with `{ success: true, message: "Email Anda sudah terdaftar dalam newsletter kami.", alreadySubscribed: true }`. Does not throw 500/409, does not create duplicate row. |
| 13 | Admin Metrics | Fetching `/admin` when subscriber count is 0 | Metric card shows `0` gracefully without throwing NaN, null pointer, or layout shift. |
| 14 | Next.js 15 Async Params | Calling route handler in Vitest without wrapping params in `Promise.resolve()` | If passed `{ params: { id: "123" } }` instead of `{ params: Promise.resolve({ id: "123" }) }`, `await params` still handles both promises and raw objects, but type contract mandates `Promise<{ id: string }>`. |

---

## 1. Observation

### 1.1 Environment, Tooling & Dependency Versions
- **Operating System**: Windows 11 (PowerShell environment requires `.cmd` wrappers: `npm.cmd`, `npx.cmd`).
- **Next.js Version**: `16.4.6` (Turbopack enabled, React Server Components enabled, React 19 canary `19.0.0`).
- **Vitest Version**: `5.1.0` (Environment configured as `node` in `vitest.config.ts`, `globals: true`, `@/*` alias mapped to `./src/*`).
- **TypeScript**: `5.7.3` with strict mode enabled (`"strict": true`, `"moduleResolution": "bundler"`).
- **ORM / Database**: Prisma `^6.4.1` with SQLite database located at `prisma/dev.db`.
- **Validation Library**: Zod `4.6.7` (verified installed in `node_modules/zod/package.json`).

### 1.2 Baseline Verification Results
1. **Existing Vitest Test Run (`npm.cmd test`)**:
   ```
   RUN v5.1.0 D:/c/blog
   ✓ tests/auth.test.ts (4 tests) 485ms
   ✓ tests/admin-validations.test.ts (33 tests) 119ms
   ✓ tests/admin-comments-api.test.ts (21 tests) 263ms
   ✓ tests/admin-posts-api.test.ts (26 tests) 225ms
   ✓ tests/markdown.test.ts (3 tests) 284ms
   ✓ tests/validations.test.ts (6 tests) 26ms
   ✓ tests/admin-integration.test.ts (15 tests) 16582ms
   ✓ tests/challenger-2-verification.test.ts (17 tests) 5584ms
   ✓ tests/seo.test.ts (35 tests) 5252ms

   Test Files  9 passed (9)
        Tests  160 passed (160)
     Duration  36.78s
   ```
   **Observation**: All 160 existing tests across 9 test files currently pass without failures. Zero regressions must be maintained.

2. **Existing Production Build (`npm.cmd run build`)**:
   ```
   ▲ Next.js 16.4.6 (Turbopack)
   ✓ Running next.config.ts took 3.4s
   ✓ Compiled successfully in 46s
   Finished TypeScript in 31.4s ...
   Generating static pages using 7 workers (13/13) in 5.2s
   Finalizing page optimization ...
   Exit code: 0
   ```
   **Observation**: TypeScript compilation passes cleanly. 13 static pages are generated.

### 1.3 Database Schema & Architecture (`prisma/schema.prisma`)
- Current schema defines models: `Post`, `Tag`, `PostTag`, `Comment`.
- In `Post`:
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
- **Missing Elements**:
  - `likes Int @default(0)` field is absent in `Post`.
  - `Subscriber` model does not exist yet.

### 1.4 Route Handler Conventions & Async Params Contract
- Inspection of `src/app/api/admin/posts/[id]/route.ts`:
  ```typescript
  export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    ...
  }
  ```
- Inspection of `src/app/posts/[slug]/page.tsx`:
  ```typescript
  export default async function PostDetailPage({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    ...
  }
  ```
- **Observation**: Next.js 15/16 strictly treats route parameters as `Promise`. In Vitest tests, dynamic route handlers must be invoked with `{ params: Promise.resolve({ id: "..." }) }`.

### 1.5 Admin UI Structure (`src/app/admin/page.tsx`)
- Metrics state:
  ```typescript
  interface AdminMetrics {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalComments: number;
    pendingComments: number;
    approvedComments: number;
    spamComments: number;
  }
  ```
- Metrics fetch logic queries `/api/admin/posts?status=all` and `/api/admin/comments?status=ALL`.
- Tabs: Currently toggles between `"posts"` and `"comments"`.
- Middleware (`src/middleware.ts`): Protects `/admin/:path*` and `/api/admin/:path*`. Public endpoints (`/api/posts/...`, `/api/newsletter/subscribe`) are outside the protection matcher.

---

## 2. Logic Chain

1. **Database Schema Extension**:
   - `ORIGINAL_REQUEST.md` R1 requires persisting likes to `Post` with default 0. Therefore, `likes Int @default(0)` must be added to `Post` in `prisma/schema.prisma`.
   - `ORIGINAL_REQUEST.md` R2 requires storing subscribers with `id`, unique `email`, active status, and `createdAt`. Therefore, `model Subscriber` must be added with `@unique` on `email` and `@default(true)` on `active`.
   - SQLite migration must be applied via `prisma db push` to avoid data loss on `prisma/dev.db`.

2. **Like / Clap Counter Specification**:
   - Atomic increments: To prevent race conditions during concurrent likes, Prisma's atomic increment syntax `likes: { increment: 1 }` must be used.
   - Dual identifier resolution: A client might send either the post's CUID `id` or the readable `slug` (as in `/posts/[slug]`). The endpoint `POST /api/posts/[id]/like/route.ts` should lookup the post by `id`, and if not found, fall back to lookup by `slug`. This guarantees zero 404 confusion between components.
   - Return payload: Returns `{ success: true, likes: updatedPost.likes }` with status 200.
   - Rate limiting & debouncing:
     - Client side: The `LikeButton` component maintains local optimistic state and triggers animation immediately. Rapid multi-clicks are debounced (or batched) before sending network requests.
     - Server side: An in-memory rate limiter in `src/lib/rate-limit.ts` tracks request timestamps by client IP. If a single IP exceeds 10 like requests in 10 seconds, it returns `429 Too Many Requests` with `{ success: false, error: "Terlalu banyak permintaan suka...", retryAfter: 10 }` and a `Retry-After: 10` header.

3. **Newsletter Subscription Specification**:
   - Zod schema: `SubscriberSchema` in `src/lib/validations.ts` enforces `email: z.string().trim().email(...).max(100)`.
   - Normalization: Incoming email must be lowercased and trimmed to avoid duplicate entries with differing casing (e.g. `User@domain.com` vs `user@domain.com`).
   - Deduplication handling:
     - Requirement explicitly states: "when submitting an already registered email, returns 200 with clear message indicating already subscribed, without throwing server error or creating duplicate rows."
     - Therefore: If `db.subscriber.findUnique({ where: { email } })` finds an existing record, the API returns HTTP 200 with `{ success: true, message: "Email Anda sudah terdaftar dalam newsletter kami.", alreadySubscribed: true }`.
     - Only if not registered does it execute `db.subscriber.create({ data: { email, active: true } })` and return HTTP 201 with `{ success: true, message: "Terima kasih telah berlangganan newsletter kami!", subscriber }`.

4. **Admin Dashboard Metrics Integration**:
   - Adding a subscriber metric card (e.g., "Pelanggan Newsletter") must not mutate or alter the existing calculation of `totalPosts`, `publishedPosts`, `draftPosts`, `totalComments`, `pendingComments`, `approvedComments`, or `spamComments`.
   - An API route `GET /api/admin/subscribers` can return `{ success: true, subscribers, count, activeCount }`.
   - On the `/admin` page, `AdminMetrics` can include `totalSubscribers: number` (or a dedicated state). If the fetch fails, it gracefully falls back without breaking post or comment moderation tabs.

5. **Testing Architecture & Assertions Matrix**:
   - Testing must span three tiers:
     - **Tier 1 (Unit)**: Zod schema parsing, rate limit utility logic, markdown/format functions.
     - **Tier 2 (Route Handler Contracts with Mocked DB)**: Testing `POST /api/posts/[id]/like`, `POST /api/newsletter/subscribe`, and `GET /api/admin/subscribers` with `vi.mock("@/lib/db")`, mocking Next.js `Request` and `Promise<{ id }>` params, asserting status codes (200, 201, 400, 404, 429, 500) and response bodies.
     - **Tier 3 (Real SQLite DB Integration)**: Testing actual migrations and constraints on SQLite `prisma/dev.db` (unique email constraint, atomic increments, cascade safety) with isolated prefixes and cleanup in `beforeAll` / `afterAll`.
   - Build verification: `npm.cmd run build` must run with exit code 0.

---

## 3. Caveats

1. **In-Memory Rate Limiting Scope**:
   - An in-memory rate limiter (`Map<string, { count: number, resetAt: number }>`) is lightweight, zero-dependency, and fully compatible with Vitest and single Next.js server processes.
   - *Caveat*: In multi-instance serverless deployments (e.g. Vercel multi-region serverless lambdas), in-memory stores are local to each worker instance. For local SQLite development and the Antigravity blog architecture, this is the optimal and intended pattern, but tests must provide an exportable `resetRateLimit()` method to ensure clean test isolation.
2. **Next.js 16 Deprecation Warning for Middleware**:
   - During `npm.cmd run build`, Next.js 16 outputs: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
   - This is an upstream Next.js 16 canary deprecation warning. It does not cause build failure (build exits 0). Changing `src/middleware.ts` is outside the scope of R1/R2/R3 and must remain untouched to avoid regressions with existing test files (`tests/auth.test.ts`, etc.).
3. **Zod 4.6.7 Error Issue Structure**:
   - Zod 4 uses `result.error.issues` array with `issue.message`. Schemas must provide descriptive Indonesian error messages matching existing conventions in `src/lib/validations.ts`.
4. **SQLite Concurrency & Atomic Increments**:
   - SQLite supports single-writer concurrency. Utilizing Prisma's atomic increment (`likes: { increment: 1 }`) issues `UPDATE "Post" SET "likes" = "likes" + 1 WHERE "id" = ?`, which is natively atomic and thread-safe in SQLite.

---

## 4. Conclusion & Formal Specifications

### 4.1 Prisma Schema Formal Specification
Add the following model and field updates to `prisma/schema.prisma`:

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
  likes       Int       @default(0)   // <-- Added field (R1)
  publishedAt DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tags        PostTag[]
  comments    Comment[]

  @@index([slug])
  @@index([publishedAt])
}

model Subscriber {                    // <-- Added model (R2)
  id        String   @id @default(cuid())
  email     String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  @@index([email])
}
```

### 4.2 Zod Validation Schemas Specification (`src/lib/validations.ts`)
Add `SubscriberSchema` to `src/lib/validations.ts`:

```typescript
export const SubscriberSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .min(1, "Email tidak boleh kosong")
    .email("Format alamat email tidak valid")
    .max(100, "Email maksimal 100 karakter"),
});

export type SubscriberInput = z.infer<typeof SubscriberSchema>;
```

### 4.3 Rate Limiting Specification (`src/lib/rate-limit.ts`)
A dedicated sliding-window rate limiter utility:

```typescript
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 10000
): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  record.count += 1;
  return { success: true };
}

export function resetRateLimit(): void {
  rateLimitStore.clear();
}
```

### 4.4 Like API Endpoint Specification (`src/app/api/posts/[id]/like/route.ts`)
- **Route Path**: `src/app/api/posts/[id]/like/route.ts`
- **HTTP Methods**: `POST` (increment), `GET` (retrieve)
- **Parameters**: `context: { params: Promise<{ id: string }> }`
- **Behavior Matrix**:
  1. `POST` valid ID or Slug:
     - Validates rate limit using client IP from request headers. If exceeded, returns `429` with `Retry-After`.
     - Validates ID string is non-empty. If empty, returns `400`.
     - Finds post by `id` or `slug`. If not found, returns `404`.
     - Increments `likes` by 1 using `db.post.update({ where: { id: post.id }, data: { likes: { increment: 1 } } })`.
     - Returns `200 OK` with `{ success: true, likes: updatedPost.likes }`.
  2. `GET` valid ID or Slug:
     - Finds post by `id` or `slug`. If not found, returns `404`.
     - Returns `200 OK` with `{ success: true, likes: post.likes }`.

### 4.5 Newsletter Subscription API Specification (`src/app/api/newsletter/subscribe/route.ts`)
- **Route Path**: `src/app/api/newsletter/subscribe/route.ts`
- **HTTP Method**: `POST`
- **Request Body**: `{ email: string }`
- **Behavior Matrix**:
  1. Parse body with `SubscriberSchema.safeParse(body)`.
     - If failure: return `400 Bad Request` with `{ success: false, error: error.issues[0].message }`.
  2. Normalize email: `const email = data.email.toLowerCase().trim()`.
  3. Query existing subscriber: `db.subscriber.findUnique({ where: { email } })`.
     - If found: return `200 OK` with:
       ```json
       {
         "success": true,
         "message": "Email Anda sudah terdaftar dalam newsletter kami.",
         "alreadySubscribed": true
       }
       ```
     - If not found: insert into DB:
       ```typescript
       const subscriber = await db.subscriber.create({
         data: { email, active: true }
       });
       ```
       Return `201 Created` with:
       ```json
       {
         "success": true,
         "message": "Terima kasih telah berlangganan newsletter kami!",
         "subscriber": {
           "id": subscriber.id,
           "email": subscriber.email,
           "active": subscriber.active,
           "createdAt": subscriber.createdAt
         }
       }
       ```

### 4.6 Admin Subscribers API Specification (`src/app/api/admin/subscribers/route.ts`)
- **Route Path**: `src/app/api/admin/subscribers/route.ts`
- **HTTP Method**: `GET`
- **Protection**: Protected by `src/middleware.ts` (requires valid admin cookie).
- **Behavior**:
  - Queries all subscribers ordered by `createdAt: "desc"`.
  - Calculates `totalCount` and `activeCount`.
  - Returns `200 OK` with `{ success: true, subscribers, totalCount, activeCount }`.

### 4.7 UI Component Touchpoints Specification
1. **`src/components/blog/PostCard.tsx`**:
   - Update `PostCardProps.post` interface to include `likes?: number`.
   - Render like count badge in the footer metadata row beside `Calendar` and `Clock`:
     ```tsx
     <span className="flex items-center gap-1">
       <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
       {post.likes ?? 0}
     </span>
     ```
2. **`src/components/blog/LikeButton.tsx`**:
   - New client component for `/posts/[slug]`.
   - Receives `postId` and `initialLikes`.
   - Manages state: `likes`, `hasLiked`, `isAnimating`, `isLoading`.
   - On click: immediately triggers CSS pulse animation and increments local count; sends debounced `POST /api/posts/[id]/like`.
3. **`src/components/blog/NewsletterForm.tsx`**:
   - New client component for `/posts/[slug]` (bottom section) and/or `src/components/blog/Footer.tsx`.
   - Manages states: `email`, `status: "idle" | "loading" | "success" | "alreadySubscribed" | "error"`, `message`.
   - Sends `POST /api/newsletter/subscribe`. Displays clear Indonesian feedback messages.
4. **`src/app/admin/page.tsx`**:
   - Add a 5th metric card for "Pelanggan Newsletter" displaying `totalSubscribers`.
   - Add a "Pelanggan" tab in the admin navigation tab bar showing subscriber list.
   - Must preserve all existing metrics and tab functionality.

---

## 5. Verification Method

### 5.1 Test Suites to Execute
1. **Full Vitest Test Suite**:
   ```powershell
   npm.cmd test
   ```
   **Expected Outcome**: All existing 160 tests PLUS newly added tests must pass with 0 failures across all test files.

2. **Targeted Like API Suite**:
   ```powershell
   npx.cmd vitest run tests/like-api.test.ts
   ```
   **Assertions to Verify**:
   - `POST /api/posts/[id]/like` returns 200 and increments count.
   - `GET /api/posts/[id]/like` returns current like count.
   - Returns 404 for non-existent post ID or slug.
   - Returns 400 for empty or whitespace ID.
   - Returns 429 when requests exceed rate limit threshold.
   - Cleans up state when `resetRateLimit()` is called.

3. **Targeted Newsletter Suite**:
   ```powershell
   npx.cmd vitest run tests/newsletter.test.ts
   ```
   **Assertions to Verify**:
   - `SubscriberSchema` rejects invalid, missing, and oversized email formats.
   - `POST /api/newsletter/subscribe` returns 201 for new valid email.
   - `POST /api/newsletter/subscribe` returns 200 with `alreadySubscribed: true` for duplicate email.
   - Database contains exactly 1 row for duplicate submissions.
   - Email is normalized to lowercase in database.

4. **Targeted Admin Subscribers Suite**:
   ```powershell
   npx.cmd vitest run tests/admin-subscribers.test.ts
   ```
   **Assertions to Verify**:
   - `GET /api/admin/subscribers` returns subscriber list and statistics.
   - Metrics calculation updates `totalSubscribers` without modifying posts/comments counts.

5. **Next.js Production Build**:
   ```powershell
   npm.cmd run build
   ```
   **Expected Outcome**:
   - Exit code: `0`.
   - Zero TypeScript compilation errors.
   - Zero Turbopack bundling errors.
   - Route summary lists `/api/posts/[id]/like`, `/api/newsletter/subscribe`, and `/api/admin/subscribers` as dynamic routes (`ƒ`).

### 5.2 Invalidation Conditions
- If `POST /api/posts/[id]/like` does not accept `Promise<{ id: string }>` in params, Next.js 15 build will fail with type errors.
- If duplicate subscription returns HTTP 409 or 500 instead of HTTP 200, R2 acceptance criterion #2 is violated.
- If existing 160 Vitest tests drop below 160 or any fails, R3 zero-regression criterion is violated.
- If `PostCard.tsx` breaks due to missing optional check on `post.likes`, home page rendering will throw in production.

---
*End of Report. Ready for implementation orchestrator dispatch.*
