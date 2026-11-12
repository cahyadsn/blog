# Project: Interaction and Community Features (Like Counter & Newsletter System)

## Architecture
- Framework: Next.js 16.4.6 (App Router with Turbopack), React 19, TypeScript 5.7.3
- Database & ORM: SQLite (`prisma/dev.db`) accessed via Prisma Client singleton (`@/lib/db`)
  - Schema migration workflow: `npm.cmd run db:push && npm.cmd run db:generate`
- Core Models in `prisma/schema.prisma`:
  - `Post`: Includes `likes Int @default(0)` (indexed by slug and publishedAt)
  - `Subscriber`: New model with `id String @id @default(cuid())`, `email String @unique`, `active Boolean @default(true)`, `createdAt DateTime @default(now())`
- API Route Handlers:
  - `src/app/api/posts/[id]/like/route.ts`: Dual-identifier (`id` CUID or `slug`), async params (`await params`), atomic increment (`likes: { increment: 1 }`), `GET` count, `POST` increment, rate limiting
  - `src/app/api/newsletter/subscribe/route.ts`: Public subscription route, Zod email validation, lowercase normalization, idempotent duplicate handling returning HTTP 200 with `alreadySubscribed: true` without server errors or duplicate records
  - `src/app/api/admin/subscribers/route.ts`: Protected admin route handler returning subscriber list, total count, and active count
- Validation & Utility Layer:
  - `src/lib/validations.ts`: `SubscriberSchema` using Zod 4.6.7 (`trim()`, `toLowerCase()`, `email()`, `max(100)`)
  - `src/lib/rate-limit.ts`: In-memory sliding-window rate limiter tracking client IP, returning 429 Too Many Requests with `Retry-After` header and `resetRateLimit()` for test isolation
- UI Components:
  - `src/components/blog/LikeButton.tsx`: Client component with instant visual feedback, scale pulse animation, optimistic updates, and debounced API submission
  - `src/components/blog/PostCard.tsx`: Displays total likes badge alongside calendar date and reading time
  - `src/app/posts/[slug]/page.tsx`: Displays total likes count in header metadata bar and interactive `<LikeButton />` in engagement section before comments
  - `src/components/blog/NewsletterForm.tsx`: Responsive newsletter form component with inline validation, loading states, and Indonesian success/duplicate/error alerts
  - `src/components/blog/Footer.tsx`: Embeds newsletter subscription form above copyright
  - `src/app/admin/page.tsx`: Displays "Pelanggan Newsletter" summary metric card and a "Pelanggan" management tab
- Testing & Build:
  - Vitest v5.1.0 in `node` environment, testing route handlers, schemas, rate limiter, and SQLite constraints
  - Production build: `npm.cmd run build` completing with exit code 0 and zero TypeScript/lint errors

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Prisma Schema Update (Likes & Subscriber) | Add `likes Int @default(0)` to `Post` and add `Subscriber` model to `prisma/schema.prisma` | M1 | survey | DONE |
| 2 | SQLite Database Migration | Push schema changes to `prisma/dev.db` and regenerate Prisma client via `npm.cmd run db:push && npm.cmd run db:generate` | M1 | survey | DONE |
| 3 | Subscriber Zod Validation Schema | Add `SubscriberSchema` to `src/lib/validations.ts` with strict email validation and sanitization | M1 | survey | DONE |
| 4 | Rate Limiter Utility | Create sliding-window rate limiter in `src/lib/rate-limit.ts` with `checkRateLimit` and `resetRateLimit` | M1 | survey | DONE |
| 5 | Like/Clap API Route Handler | Implement `GET` and `POST` in `src/app/api/posts/[id]/like/route.ts` with dual lookup (ID/slug), atomic increment, and 429 rate limiting | M1 | survey | DONE |
| 6 | Newsletter Subscription API Route Handler | Implement `POST /api/newsletter/subscribe` with Zod validation and idempotent duplicate response (HTTP 200 `alreadySubscribed`) | M1 | survey | DONE |
| 7 | Admin Subscribers API Route Handler | Implement `GET /api/admin/subscribers` returning subscriber list and summary metrics | M1 | survey | DONE |
| 8 | Interactive Like/Clap Button Component | Create `src/components/blog/LikeButton.tsx` with animation feedback, optimistic UI, and debounce | M1 | survey | DONE |
| 9 | Post Detail Page Integration | Add like count in header meta bar and embed `<LikeButton />` before comments in `src/app/posts/[slug]/page.tsx` | M1 | survey | DONE |
| 10 | Post Card Like Metric Display | Update `src/components/blog/PostCard.tsx` to render total likes badge in post card footer | M1 | survey | DONE |
| 11 | Newsletter Form UI Component | Create `src/components/blog/NewsletterForm.tsx` with responsive design and inline alerts | M1 | survey | DONE |
| 12 | Global Footer Newsletter Integration | Embed `<NewsletterForm />` in `src/components/blog/Footer.tsx` and optionally bottom of article pages | M1 | survey | DONE |
| 13 | Admin Dashboard Subscriber Metrics & Tab | Add subscriber stat card and management tab in `src/app/admin/page.tsx` without breaking existing metrics | M1 | survey | DONE |
| 14 | Automated Vitest Test Suites | Comprehensive test suites for Like API, rate limiting, newsletter validation, deduplication, and admin metrics | M1 | survey | DONE |
| 15 | Zero Regressions & Build Verification | Verify all 160+ tests pass and `npm.cmd run build` succeeds with zero errors | M1 | survey | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status | Key Outputs |
|---|------|-------|-------------|--------|-------------|
| 1 | Interaction & Community Features | All features (1-15) in Feature Inventory (R1, R2, R3) | none | DONE | Prisma Post.likes and Subscriber models; Like API with 429 rate limiting; Newsletter API with idempotent deduplication; Admin metrics and Subscriber management; LikeButton, NewsletterForm, and PostCard UI components; 41 unit/route tests + 31 adversarial stress tests (100% pass); Next.js 16 production build exit 0 |

## Interface Contracts
### Like / Clap API (`src/app/api/posts/[id]/like/route.ts`)
- `export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response>`
  - Param: `const { id: identifier } = await params;`
  - Lookup: Finds post by `id` or `slug`.
  - Not found: Returns HTTP 404 `{ success: false, error: "Artikel tidak ditemukan" }`.
  - Success: Returns HTTP 200 `{ success: true, likes: post.likes }`.
- `export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response>`
  - Rate limit check: Checks client IP. If exceeded (>10 requests/10s), returns HTTP 429 `{ success: false, error: "Terlalu banyak permintaan suka...", retryAfter: 10 }` with `Retry-After: 10` header.
  - Parameter validation: Returns HTTP 400 if identifier is empty or whitespace.
  - Lookup: Finds post by `id` or `slug`. If not found, returns HTTP 404 `{ success: false, error: "Artikel tidak ditemukan" }`.
  - Atomic increment: `db.post.update({ where: { id: post.id }, data: { likes: { increment: 1 } } })`.
  - Success: Returns HTTP 200 `{ success: true, likes: updatedPost.likes }`.

### Newsletter Subscription API (`src/app/api/newsletter/subscribe/route.ts`)
- `export async function POST(req: Request): Promise<Response>`
  - Request body: `{ email: string }`
  - Validation: `SubscriberSchema.safeParse(body)`
    - Invalid: Returns HTTP 400 `{ success: false, error: issue.message }`.
  - Normalization: `const email = data.email.toLowerCase().trim();`
  - Duplicate check: `db.subscriber.findUnique({ where: { email } })`
    - Already subscribed: Returns HTTP 200 `{ success: true, message: "Email Anda sudah terdaftar dalam newsletter kami.", alreadySubscribed: true }`. (Does not throw 409 or 500, does not create duplicate row).
    - Inactive / previously unsubscribed: Reactivates record (`active: true`), returns HTTP 200 `{ success: true, message: "Langganan newsletter Anda telah diaktifkan kembali!", subscriber }`.
    - New subscriber: Creates row `db.subscriber.create({ data: { email, active: true } })`, returns HTTP 201 `{ success: true, message: "Terima kasih telah berlangganan newsletter kami!", subscriber }`.

### Admin Subscribers API (`src/app/api/admin/subscribers/route.ts`)
- `export async function GET(req: Request): Promise<Response>`
  - Protected by `src/middleware.ts`
  - Returns HTTP 200 `{ success: true, subscribers, totalCount, activeCount }`.

### Rate Limiter (`src/lib/rate-limit.ts`)
- `export function checkRateLimit(identifier: string, limit?: number, windowMs?: number): { success: boolean; retryAfter?: number }`
- `export function resetRateLimit(): void`

## Code Layout
- `prisma/schema.prisma`: Post model likes field, Subscriber model.
- `src/lib/validations.ts`: Subscriber Zod schema.
- `src/lib/rate-limit.ts`: In-memory sliding window rate limiter.
- `src/app/api/posts/[id]/like/route.ts`: Dual lookup like route handler (GET & POST).
- `src/app/api/newsletter/subscribe/route.ts`: Newsletter subscription route handler.
- `src/app/api/admin/subscribers/route.ts`: Admin subscribers route handler.
- `src/components/blog/LikeButton.tsx`: Interactive animated like button client component.
- `src/components/blog/NewsletterForm.tsx`: Responsive newsletter form component.
- `src/components/blog/PostCard.tsx`: Post card like count display.
- `src/components/blog/Footer.tsx`: Global footer newsletter form integration.
- `src/app/posts/[slug]/page.tsx`: Post detail like counter and button integration.
- `src/app/admin/page.tsx`: Admin dashboard subscriber metric card and tab integration.
- `tests/likes-api.test.ts`: Vitest test suite for like counter & rate limiting.
- `tests/newsletter.test.ts`: Vitest test suite for newsletter validation & deduplication.
- `tests/admin-subscribers.test.ts`: Vitest test suite for admin subscribers API.
