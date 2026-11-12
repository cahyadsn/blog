## 2026-11-11T03:16:35Z
You are a Spec Miner designing the implementation strategy for Milestone 1: Open Graph & Twitter Card Metadata and Dynamic Social Preview Card Image Generation.

Working Directory: d:\c\blog\.agents\teamwork\spec_miner_m1_3
Original Request Path: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document Path: d:\c\blog\PROJECT.md

Your Mission:
1. Read d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md and d:\c\blog\PROJECT.md.
2. Formulate the concrete implementation specifications and code designs for:
   - Root layout metadata in `src/app/layout.tsx`:
     - Configure `metadataBase: new URL(getBaseUrl())`.
     - Configure default `openGraph` (title, description, url, siteName, locale: "id_ID", type: "website").
     - Configure `twitter` (card: "summary_large_image", title, description).
     - Add RSS alternate link in `alternates: { types: { "application/rss+xml": `${getBaseUrl()}/feed.xml` } }`.
   - Post detail dynamic metadata in `src/app/posts/[slug]/page.tsx`:
     - Export `generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata>`.
     - Handle Next.js 15 async `params`.
     - Query `db.post.findUnique({ where: { slug } })`.
     - If not found or `!post.published`, return fallback `{ title: "Artikel Tidak Ditemukan" }`.
     - Return Open Graph (`type: "article"`, `publishedTime`, `authors`, `images`) and Twitter Card (`card: "summary_large_image"`) metadata.
   - Dynamic Social Preview Card Images via `ImageResponse` from `next/og`:
     - `src/app/opengraph-image.tsx`: 1200x630 PNG for homepage with blog branding and description.
     - `src/app/posts/[slug]/opengraph-image.tsx`: 1200x630 PNG for posts with post title, reading time, branding, and supporting `coverImage` when available.
     - Explicitly avoid `export const runtime = 'edge'` because SQLite is accessed via Prisma.
3. Provide exact code structures, edge cases (e.g. missing coverImage fallback, very long titles), and testing considerations for the Worker.
4. Do NOT modify any code or files outside your working directory.
5. Write your comprehensive report to d:\c\blog\.agents\teamwork\spec_miner_m1_3\analysis.md and d:\c\blog\.agents\teamwork\spec_miner_m1_3\handoff.md.
6. Send a brief message back to orchestrator when finished.


## 2026-11-12T02:25:43Z
[Message] timestamp=2026-11-12T02:25:43Z sender=b89343ec-d337-44ce-94cc-38ecb7f139fb priority=MESSAGE_PRIORITY_HIGH content=You are a Spec Miner agent for Milestone 1 Step a in the Next.js 15 blog project.

## Authoritative Documentation & Scope
- Authoritative user request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Scope & Architecture: d:\c\blog\PROJECT.md

## Your State Folder
Write your heartbeat/progress to:
d:\c\blog\.agents\teamwork\spec_miner_m1_3\progress.md
Write your final test suite blueprint and handoff report to:
d:\c\blog\.agents\teamwork\spec_miner_m1_3\handoff.md

## Mission & Scope
Formulate an exact, production-ready testing blueprint for Requirement R3 (Automated Testing and Build Verification):
1. Read `d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md` and `d:\c\blog\PROJECT.md`.
2. Design complete, runnable Vitest test suites:
   - `tests/likes-api.test.ts`:
     - POST increment by ID increments count and returns 200
     - POST increment by slug increments count and returns 200
     - GET retrieves current count without mutating
     - 404 on non-existent post ID/slug
     - 400 on invalid/empty ID
     - 429 Too Many Requests when rate limit threshold is exceeded
     - Reset rate limiter functionality
   - `tests/newsletter.test.ts`:
     - Zod schema validates valid emails, rejects invalid formats, rejects missing/empty/oversized strings
     - POST subscription registers new email and returns 201
     - POST duplicate submission returns 200 with informative alreadySubscribed message and does NOT throw error or duplicate rows
     - Inactive subscriber reactivation returns 200
     - Normalization to lowercase and trimmed string
   - `tests/admin-subscribers.test.ts`:
     - GET /api/admin/subscribers returns list and summary metrics
     - Summary metrics calculation updates subscriber counts without touching post/comment metrics
3. Detail exact mock setups, request fixtures, async params handling (`params: Promise.resolve({ id: "..." })`), and assertions.
4. Provide verification commands for running tests (`npm.cmd test`) and production build (`npm.cmd run build`).
5. Write your report to `d:\c\blog\.agents\teamwork\spec_miner_m1_3\handoff.md`.
6. Send a completion message to the orchestrator.
