# Testing and Build Setup Survey Report: SEO & Content Distribution

**Explorer**: Explorer 2 (Testing & Build Setup Explorer)  
**Date**: 2026-11-11  
**Target Project**: `d:\c\blog` (Antigravity Multi-Agent Blog)  
**Working Directory**: `d:\c\blog\.agents\teamwork\explorer_survey_2\`  
**Context**: Investigating test runner, build system, Vitest configuration, Prisma mocking patterns, route handler testing, and Next.js metadata verification in preparation for implementing SEO and Content Distribution features (Sitemap XML, RSS 2.0 Feed, Robots.txt, OpenGraph/Twitter Cards, dynamic Social Preview Image generation).

---

## 1. Executive Summary

1. **Test Runner & Environment**:
   - The project uses **Vitest** (`vitest: ^5.1.0` in `package.json`, configured via `vitest.config.ts`).
   - The test environment is configured as **`node`** (not `jsdom` or `happy-dom`), with **`globals: true`** and path alias **`@` -> `./src`**.
   - There are **no setupFiles** configured.
   - There are **no UI testing libraries** installed (no `@testing-library/react`, no `@testing-library/jest-dom`, no `msw`).
   - All tests run directly as pure Node.js processes, which makes testing Route Handlers and utility modules fast, lightweight, and robust.

2. **Existing Test Layout**:
   - Tests are located in a centralized root folder: `tests/`.
   - Existing test files:
     - `tests/validations.test.ts` (81 lines, 6 tests verifying Zod schemas `CommentSchema` and `PostCreateSchema`).
     - `tests/markdown.test.ts` (31 lines, 3 tests verifying `calculateReadingTime`, `generateSlug`, `parseMarkdownToHtml`).
   - File naming convention is `*.test.ts`. There are currently no tests inside `src/`.

3. **Build Pipeline & Platform Nuances**:
   - Production build command: `npm.cmd run build` (`next build`).
   - Test command: `npm.cmd test` (`vitest run`).
   - **Windows Execution Note**: Because of PowerShell execution policies regarding `.ps1` scripts, all CLI executions must invoke `npm.cmd` or `npx.cmd`.

4. **Prisma & Database Access in Tests**:
   - Database is SQLite at `prisma/dev.db` with `DATABASE_URL="file:./dev.db"`.
   - Current unit tests do not touch the database.
   - For route handler and metadata testing (Sitemap, RSS, Post Metadata), the recommended and safest pattern is **Vitest module mocking**: `vi.mock("@/lib/db", () => ({ db: { post: { findMany: vi.fn(), findUnique: vi.fn() } } }))`. This ensures fast, zero-side-effect, deterministic test runs that don't depend on or mutate `prisma/dev.db`.

5. **Critical Next.js Architecture Trap (Sitemap / Robots Route Conflict)**:
   - In Next.js App Router, creating both a metadata route file (e.g. `src/app/sitemap.ts`) AND a route handler (e.g. `src/app/sitemap.xml/route.ts`) causes a fatal build failure: `Conflicting app/sitemap.xml and app/sitemap.ts`.
   - To satisfy the acceptance criteria requiring automated verification of **HTTP status 200, Content-Type headers (`application/xml`), and raw XML body contents**, the recommended architectural pattern is:
     - **Route Handlers**: `src/app/sitemap.xml/route.ts`, `src/app/feed.xml/route.ts`, and `src/app/robots.txt/route.ts`.
     - **Core Business Logic**: `src/lib/seo.ts` (pure functions for XML serialization, CDATA escaping, RFC 822 date formatting, and site URL resolution).

---

## 2. Package Scripts & Dependencies Analysis

### 2.1 Package Scripts (`package.json`)
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "db:push": "prisma db push",
  "db:generate": "prisma generate",
  "db:seed": "tsx prisma/seed.ts",
  "agent:content": "tsx scripts/daily-content.ts",
  "agent:comments": "tsx scripts/reply-comments.ts"
}
```

- **`test`**: Runs `vitest run`. Executes single-pass test run (non-watch mode). Suitable for CI and automated validation.
- **`build`**: Runs `next build`. Compiles TypeScript, analyzes App Router pages and route handlers, and verifies metadata exports.
- **`db:seed`**: Uses `tsx` to run TypeScript seed script.

### 2.2 Dependencies Overview
| Package | Version | Role & Testing Implications |
|---|---|---|
| `next` | `^16.4.6` (Next.js 15.1+) | App Router with Server Components, Metadata API, Route Handlers, and `next/og` (`ImageResponse`). |
| `react` / `react-dom` | `^19.0.0` | React 19 core library. |
| `@prisma/client` / `prisma` | `^6.4.1` | ORM client for SQLite. Singleton exported from `src/lib/db.ts`. |
| `vitest` | `^5.1.0` | Fast ESM-native test runner with built-in mocking (`vi`), assertions (`expect`), and test suites (`describe`, `it`). |
| `zod` | `^4.6.7` (Zod v3.24/v4) | Schema validation for API payloads. |
| `marked` | `^15.0.7` | Markdown compiler. |
| `lucide-react` | `^1.16.0` | Icons for UI components. |
| `clsx` / `tailwind-merge` | `^2.1.1` / `^3.0.2` | CSS class utilities. |

### 2.3 Dependency Gaps & Observations
- **No `@testing-library/react`**: Component DOM testing is not currently set up.
- **No `jsdom` or `happy-dom`**: The test environment is strictly `node`.
- **Implication**: All route handlers and metadata generators must be tested as backend functions (invoking `GET(request)` or `generateMetadata({ params })`) rather than attempting to render React DOM trees. This is faster and directly tests the exact HTTP payloads.

---

## 3. Vitest Configuration Inspection (`vitest.config.ts`)

File location: `d:\c\blog\vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Analysis of Settings:
1. **`test.environment: "node"`**:
   - Runs tests in standard Node.js without browser globals (`window`, `document`).
   - Web standard APIs like `Request`, `Response`, `Headers`, and `URL` are available natively in Node 18+ and Node 22 (`@types/node: ^22.13.5`).
   - `NextResponse` from `next/server` subclasses Web `Response` and works seamlessly in this environment.
2. **`test.globals: true`**:
   - `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` can be used directly or imported from `"vitest"`.
3. **`resolve.alias: { "@": path.resolve(__dirname, "./src") }`**:
   - Ensures that `@/lib/db`, `@/lib/seo`, `@/app/...` resolve identically in tests and source code.
4. **`setupFiles`**:
   - Not configured. No global lifecycle hooks or polyfills currently run.
   - Individual test files manage their own mocks using `vi.mock(...)`.

---

## 4. Existing Test Suite Anatomy & Patterns

### 4.1 Layout
```
tests/
├── markdown.test.ts      # 31 lines, 3 unit tests
└── validations.test.ts   # 81 lines, 6 unit tests
```

### 4.2 Inspection of Existing Tests
1. **`tests/validations.test.ts`**:
   - Tests Zod schemas: `CommentSchema` and `PostCreateSchema`.
   - Tests valid inputs, field length restrictions, email format, and XSS attack rejection (`<script>` tag detection).
   - Pattern: Pure unit testing with `Schema.safeParse()`.
2. **`tests/markdown.test.ts`**:
   - Tests utility functions in `src/lib/markdown.ts`: `calculateReadingTime`, `generateSlug`, `parseMarkdownToHtml`.
   - Tests string parsing and async HTML generation.

---

## 5. Prisma & Database Mocking Strategy

In `src/lib/db.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### 5.1 How to Mock Prisma in Vitest
Because every route handler imports `{ db } from "@/lib/db"`, Vitest can intercept this import cleanly at the module level using `vi.mock("@/lib/db")`:

```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { GET } from "@/app/sitemap.xml/route";

// Mock the Prisma client singleton
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query only published posts and return valid sitemap XML", async () => {
    // Arrange: Define mock database records
    vi.mocked(db.post.findMany).mockResolvedValue([
      {
        id: "post-1",
        title: "Panduan Arsitektur Multi-Agent",
        slug: "panduan-arsitektur-multi-agent",
        excerpt: "Ringkasan artikel pengantar sistem multi-agent di Antigravity.",
        published: true,
        updatedAt: new Date("2026-11-10T12:00:00Z"),
        publishedAt: new Date("2026-11-10T12:00:00Z"),
      } as any,
    ]);

    // Act: Invoke route handler
    const response = await GET();

    // Assert: Verify database query filters
    expect(db.post.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: expect.objectContaining({
        slug: true,
        updatedAt: true,
        publishedAt: true,
      }),
    });

    // Assert: HTTP Status & Headers
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");

    // Assert: XML Content
    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>http://localhost:3000/</loc>');
    expect(xml).toContain('<loc>http://localhost:3000/posts/panduan-arsitektur-multi-agent</loc>');
  });
});
```

### 5.2 Why Module Mocking is Superior to SQLite Dev Database in CI/Tests
1. **Speed & Idempotency**: Running tests against real SQLite files involves file I/O locks and state leaks across test runs. Mocking runs in memory in milliseconds.
2. **Deterministic Edge Case Coverage**: Easily tests 0 posts, 10,000 posts, unicode characters, posts with special XML characters (`&`, `<`, `>`, `"`, `'`), posts with missing coverImage, etc.
3. **Draft Exclusion Verification**: By mocking `findMany`, the test explicitly asserts `expect(db.post.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { published: true } }))`.

---

## 6. Route Handler & Metadata Testing Architecture

### 6.1 Route Handlers vs Next.js Metadata Route Files
Next.js App Router provides two mechanisms for sitemaps and robots:

| Feature | Option A: Next.js Metadata Route | Option B: App Router Route Handler (`route.ts`) | Recommendation for this Project |
|---|---|---|---|
| **Sitemap** | `src/app/sitemap.ts` (returns `MetadataRoute.Sitemap` array) | `src/app/sitemap.xml/route.ts` (returns `Response` with XML body) | **Option B** (Route Handler): Direct verification of XML headers, formatting, and HTTP status code. |
| **Robots** | `src/app/robots.ts` (returns `MetadataRoute.Robots` object) | `src/app/robots.txt/route.ts` (returns `Response` with text body) | **Option B** (Route Handler): Direct verification of `text/plain` header and crawler directives. |
| **RSS Feed** | Not supported by Next.js metadata routes | `src/app/feed.xml/route.ts` (returns `Response` with RSS 2.0 XML) | **Option B** (Route Handler): Required for RSS 2.0. |

> **⚠️ WARNING**: Do NOT define both `src/app/sitemap.ts` and `src/app/sitemap.xml/route.ts`! Next.js will fail during `next build` with a conflict error. Choose the Route Handler approach.

### 6.2 Recommended Utility Module: `src/lib/seo.ts`
To achieve clean separation of concerns and maximum testability, encapsulate SEO logic in `src/lib/seo.ts`:

1. **`getSiteUrl(): string`**:
   - Resolves `process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000"`.
   - Strips trailing slashes to prevent double slashes (e.g. `https://example.com/` -> `https://example.com`).
2. **`escapeXml(unsafe: string): string`**:
   - Escapes `&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, `'` to `&apos;`.
3. **`generateSitemapXml(posts, baseUrl): string`**:
   - Generates standard `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`.
   - Includes homepage (`/`) with priority 1.0 and changefreq `daily`.
   - Includes each published post with priority 0.8 and changefreq `weekly`.
   - Uses `<lastmod>` in `YYYY-MM-DD` or ISO 8601 format.
4. **`generateRssXml(posts, baseUrl): string`**:
   - Generates `<rss version="2.0">` with `<channel>`.
   - Channel tags: `<title>`, `<link>`, `<description>`, `<language>id</language>`, `<lastBuildDate>`.
   - Item tags: `<title>`, `<link>`, `<guid isPermaLink="true">`, `<description>`, `<pubDate>` (RFC 822 format via `new Date(d).toUTCString()`).
   - Uses `<![CDATA[...]]>` for title and description to protect formatting and special characters.
5. **`generateRobotsTxt(baseUrl): string`**:
   - Outputs:
     ```
     User-agent: *
     Allow: /
     Disallow: /admin
     Disallow: /api/admin/

     Sitemap: ${baseUrl}/sitemap.xml
     ```

### 6.3 Testing Next.js Metadata (`generateMetadata`)
In `src/app/posts/[slug]/page.tsx`, dynamic metadata is exported via:
```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata>
```

Testing pattern in `tests/metadata.test.ts`:
```typescript
import { vi, describe, it, expect, beforeEach } from "vitest";
import { generateMetadata } from "@/app/posts/[slug]/page";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findUnique: vi.fn(),
    },
  },
}));

describe("generateMetadata in /posts/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate full OpenGraph and Twitter tags for post", async () => {
    vi.mocked(db.post.findUnique).mockResolvedValue({
      id: "post-1",
      title: "Uji Coba Sistem Multi-Agent",
      slug: "uji-coba-sistem-multi-agent",
      excerpt: "Panduan pengujian otomatis untuk agen AI.",
      coverImage: "https://images.unsplash.com/photo-1?w=1200",
      published: true,
      publishedAt: new Date("2026-11-11T00:00:00Z"),
    } as any);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "uji-coba-sistem-multi-agent" }),
    });

    expect(metadata.title).toContain("Uji Coba Sistem Multi-Agent");
    expect(metadata.description).toBe("Panduan pengujian otomatis untuk agen AI.");
    expect(metadata.openGraph?.title).toContain("Uji Coba Sistem Multi-Agent");
    expect(metadata.openGraph?.description).toBe("Panduan pengujian otomatis untuk agen AI.");
    expect(metadata.openGraph?.url).toContain("/posts/uji-coba-sistem-multi-agent");
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("should return fallback metadata when post is not found or draft", async () => {
    vi.mocked(db.post.findUnique).mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "tidak-ditemukan" }),
    });

    expect(metadata.title).toContain("Artikel Tidak Ditemukan");
  });
});
```

### 6.4 Dynamic Open Graph Social Cards (`opengraph-image.tsx`)
- Located at:
  - `src/app/opengraph-image.tsx` (Default homepage/global social card)
  - `src/app/posts/[slug]/opengraph-image.tsx` (Dynamic post-specific card)
- Technical requirement from `ORIGINAL_REQUEST.md`:
  - Uses `ImageResponse` from `next/og`.
  - Supports post `coverImage` when available.
  - Configures `size = { width: 1200, height: 630 }` and `contentType = "image/png"`.
- **Runtime Constraint**:
  - Because `src/app/posts/[slug]/opengraph-image.tsx` queries Prisma database (`db.post.findUnique`), it **MUST RUN ON NODE.JS RUNTIME** (the default Next.js App Router runtime), NOT `runtime = "edge"`. SQLite native bindings fail in edge runtimes.
- **Testing Approach**:
  - `ImageResponse` in Node environment can have WebAssembly canvas dependencies.
  - The recommended testing verification is:
    1. Verify module exports: `size`, `contentType`, `alt`, and `default function Image`.
    2. Verify `next build` compiles `opengraph-image.tsx` without type or runtime errors.

---

## 7. Recommended Test Suite Structure for SEO Milestone

Create the following test files in `tests/`:

1. **`tests/seo-utils.test.ts`**:
   - `getSiteUrl`: tests environment variable resolution (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`) and `http://localhost:3000` fallback, plus trailing slash normalization.
   - `escapeXml`: tests escaping of `&`, `<`, `>`, `"`, `'`.
   - `generateSitemapXml`: tests valid XML structure, `<urlset>`, `<loc>`, `<lastmod>`, `<priority>`.
   - `generateRssXml`: tests RSS 2.0 structure, `<rss>`, `<channel>`, `<item>`, CDATA tags, and RFC 822 `pubDate`.
   - `generateRobotsTxt`: tests crawler directives and sitemap reference.

2. **`tests/sitemap.test.ts`**:
   - Tests `GET` in `src/app/sitemap.xml/route.ts`.
   - Status 200 and `Content-Type: application/xml`.
   - Includes homepage (`/`) and published posts.
   - Excludes draft posts (`where: { published: true }`).
   - Resolves correct domain names.

3. **`tests/feed.test.ts`**:
   - Tests `GET` in `src/app/feed.xml/route.ts`.
   - Status 200 and `Content-Type: application/xml` (or `application/rss+xml`).
   - Valid RSS 2.0 channel and item structure.
   - Only published posts ordered descending by `publishedAt`.
   - Includes `<title>`, `<link>`, `<description>`, `<pubDate>`, and `<guid>`.

4. **`tests/robots.test.ts`**:
   - Tests `GET` in `src/app/robots.txt/route.ts`.
   - Status 200 and `Content-Type: text/plain`.
   - Directives: `User-agent: *`, `Allow: /`, `Disallow: /admin`.
   - Contains absolute `Sitemap: <baseUrl>/sitemap.xml`.

5. **`tests/metadata.test.ts`**:
   - Tests `generateMetadata` in `src/app/posts/[slug]/page.tsx`.
   - Verifies Open Graph and Twitter Card tags.
   - Tests coverImage presence vs fallback dynamic image URL.

---

## 8. Verification Commands

| Step | Command (Windows PowerShell) | Target & Verification Criteria |
|---|---|---|
| **Run All Tests** | `npm.cmd test` | All existing (9) and new SEO tests pass in single execution. |
| **Run Specific Test** | `npx.cmd vitest run tests/sitemap.test.ts` | Target test file passes with 0 failures. |
| **Run Production Build** | `npm.cmd run build` | Next.js production build succeeds with exit code 0; all routes compile cleanly. |
