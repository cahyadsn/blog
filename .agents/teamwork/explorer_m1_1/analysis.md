# Architectural Analysis & Implementation Design: Milestone 1

**Milestone Focus**: Sitemap, Robots, Base Site URL Resolution, and Production Build Unblocker  
**Target Environment**: Next.js 16.4.6 (App Router), React 19, TypeScript 5.7.3, Prisma 6.4.1 (SQLite `prisma/dev.db`), Zod 4.6.7, Vitest 5.1.0  
**Working Directory**: `d:\c\blog\.agents\teamwork\explorer_m1_1`  
**Date**: 2026-11-11  

---

## 1. Executive Summary

Milestone 1 establishes the technical SEO baseline for the multi-agent blog and eliminates the build blocker in Next.js 16 production build.
Currently:
1. `npm run build` fails at the TypeScript compilation phase due to an invalid Zod 4 schema definition in `src/app/api/admin/posts/[id]/publish/route.ts`:
   `error TS2353: Object literal may only specify known properties, and 'required_error' does not exist in type '{ error?: string | ...; message?: string | ...; }'`.
2. There is no centralized base URL resolver, causing inconsistent URL construction across metadata, sitemaps, and feeds.
3. No XML sitemap route exists to map public published content for search engines.
4. No `robots.ts` configuration exists to guide search engine crawlers and point to the sitemap.

All 108 existing Vitest unit and integration tests are currently passing, but production build (`npm run build`) is completely blocked by the Zod v4 error. Resolving this and delivering the SEO foundation will unblock Milestone 1 with 100% test pass rate and clean production builds.

---

## 2. Technical Investigation & Problem Analysis

### 2.1. Zod v4 Syntax Error in Publish Route (`src/app/api/admin/posts/[id]/publish/route.ts`)
- **Direct Observation**:
  Running `npx tsc --noEmit` and `npm run build` outputs:
  ```text
  src/app/api/admin/posts/[id]/publish/route.ts(7,5): error TS2353: Object literal may only specify known properties, and 'required_error' does not exist in type '{ error?: string | $ZodErrorMap<$ZodIssueInvalidType<unknown>> | undefined; message?: string | undefined; }'.
  ```
- **Root Cause**:
  The project uses `zod: ^4.6.7` (confirmed from `package.json`). In Zod v3, `z.boolean({ required_error: "...", invalid_type_error: "..." })` was valid. In Zod v4, custom error options have been simplified to `{ message?: string, error?: string | ... }`. Passing `required_error` or `invalid_type_error` directly causes a TypeScript compiler failure (TS2353), which prevents `next build` from completing.
- **Verification of Existing Tests**:
  `tests/admin-posts-api.test.ts` (lines 555-568) tests:
  ```ts
  it("T2-API-P12: should return 400 when published field is missing or non-boolean", async () => { ... });
  ```
  Fixing the schema to `z.boolean({ message: "Status publikasi harus bernilai boolean" })` or `z.boolean()` preserves 100% test compatibility while fixing TS2353 immediately.

---

### 2.2. Base Site URL Resolution (`src/lib/site.ts`)
- **Direct Observation**:
  The file `src/lib/site.ts` does not exist. Components that construct absolute URLs need a single source of truth.
- **Requirements**:
  - Precedence: `process.env.NEXT_PUBLIC_SITE_URL` -> `process.env.SITE_URL` -> `"http://localhost:3000"`.
  - Whitespace handling: Must trim leading/trailing whitespace (`.trim()`).
  - Trailing slash sanitization: Must strip all trailing slashes using `replace(/\/+$/, "")`.
  - Empty string handling: An empty or blank environment variable (e.g. `""` or `"   "`) must fall back to the next candidate in the hierarchy.
  - Helper functions: `getBaseUrl(): string` and `getAbsoluteUrl(path: string): string` to prevent double slashes when concatenating paths.

---

### 2.3. Dynamic XML Sitemap Route Handler (`src/app/sitemap.xml/route.ts`)
- **Direct Observation**:
  `src/app/sitemap.xml/route.ts` does not exist.
- **Next.js Routing Mechanism**:
  In Next.js App Router, creating `src/app/sitemap.xml/route.ts` creates a Route Handler serving `GET /sitemap.xml`.
- **Database Query**:
  Must query Prisma SQLite database using `@/lib/db`:
  ```ts
  db.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  ```
- **Requirements & XML Schema Compliance**:
  - Namespace: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
  - Homepage `<url>` entry:
    - `<loc>${baseUrl}</loc>`
    - `<lastmod>`: ISO 8601 string of the most recently updated post, or current timestamp if empty.
    - `<changefreq>daily</changefreq>`
    - `<priority>1.0</priority>`
  - Post `<url>` entries:
    - `<loc>${baseUrl}/posts/${post.slug}</loc>`
    - `<lastmod>${post.updatedAt.toISOString()}</lastmod>`
    - `<changefreq>weekly</changefreq>`
    - `<priority>0.7</priority>`
  - Content-Type: `application/xml; charset=utf-8`
  - Status: 200 (or 500 on unexpected exception)
  - Exclusion: Drafts (`published: false`) must never appear in the sitemap.
  - Dynamic execution: `export const dynamic = "force-dynamic";` and `export const revalidate = 0;` ensures live SQLite querying without stale static generation caching.

---

### 2.4. Robots Configuration (`src/app/robots.ts`)
- **Direct Observation**:
  `src/app/robots.ts` does not exist.
- **Next.js Metadata Route Convention**:
  Exporting `default function robots(): MetadataRoute.Robots` from `src/app/robots.ts` generates `/robots.txt`.
- **Crawler Directives**:
  - `userAgent: "*"`
  - `allow: "/"`
  - `disallow: ["/admin/", "/api/admin/"]`
  - `sitemap: `${getBaseUrl()}/sitemap.xml``

---

## 3. Concrete Code Specifications for Worker

### 3.1. Build Fix: `src/app/api/admin/posts/[id]/publish/route.ts`

**File Location**: `src/app/api/admin/posts/[id]/publish/route.ts`  
**Target Lines**: 5–10  

#### Proposed Diff:
```diff
<<<<
const PublishToggleSchema = z.object({
  published: z.boolean({
    required_error: "Status publikasi diperlukan",
    invalid_type_error: "Status publikasi harus bernilai boolean",
  }),
});
====
const PublishToggleSchema = z.object({
  published: z.boolean({
    message: "Status publikasi harus bernilai boolean",
  }),
});
>>>>
```

**Rationale**:
- Replaces Zod v3 deprecated options with Zod v4 compatible `{ message: "..." }`.
- When an invalid non-boolean is provided, `z.boolean({ message: "Status publikasi harus bernilai boolean" })` throws a `ZodError` with that message, matching existing API error formats.
- Resolves TS2353 error with zero regressions on existing test suites.

---

### 3.2. Base Site URL Helper: `src/lib/site.ts`

**File Location**: `src/lib/site.ts`  
**Purpose**: Centralized URL resolution and string sanitization.

#### Proposed Full Code:
```typescript
/**
 * Resolves the canonical base site URL for sitemaps, RSS feeds, robots, and metadata.
 * 
 * Resolution order:
 * 1. process.env.NEXT_PUBLIC_SITE_URL
 * 2. process.env.SITE_URL
 * 3. Fallback: "http://localhost:3000"
 * 
 * Guarantees:
 * - Trims whitespace
 * - Strips any trailing slashes (e.g., "https://example.com///" -> "https://example.com")
 * - Safe fallback if environment variable is empty or blank
 */
export function getBaseUrl(): string {
  const envUrl =
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
    (process.env.SITE_URL && process.env.SITE_URL.trim()) ||
    "http://localhost:3000";

  return envUrl.replace(/\/+$/, "");
}

/**
 * Constructs an absolute canonical URL given a relative pathname.
 * Automatically sanitizes leading slashes to prevent double slashes.
 * 
 * Example:
 * getAbsoluteUrl("/posts/my-post") -> "http://localhost:3000/posts/my-post"
 * getAbsoluteUrl("sitemap.xml")     -> "http://localhost:3000/sitemap.xml"
 */
export function getAbsoluteUrl(path: string = ""): string {
  const base = getBaseUrl();
  if (!path) return base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
```

---

### 3.3. Dynamic XML Sitemap Route Handler: `src/app/sitemap.xml/route.ts`

**File Location**: `src/app/sitemap.xml/route.ts`  
**Purpose**: Generates dynamic XML sitemap conforming to sitemaps.org 0.9 schema.

#### Proposed Full Code:
```typescript
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Escapes characters that are reserved in XML.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  try {
    const baseUrl = getBaseUrl();

    // Query all published posts from Prisma SQLite
    const posts = await db.post.findMany({
      where: { published: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Homepage lastmod derives from the most recently updated post, or current time
    const homepageLastMod =
      posts.length > 0 && posts[0].updatedAt
        ? new Date(posts[0].updatedAt).toISOString()
        : new Date().toISOString();

    const postUrlsXml = posts
      .map((post) => {
        const postUrl = `${baseUrl}/posts/${post.slug}`;
        const lastMod = new Date(post.updatedAt).toISOString();
        return `  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(baseUrl)}</loc>
    <lastmod>${homepageLastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${postUrlsXml ? postUrlsXml + "\n" : ""}</urlset>`.trim();

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Sitemap Route Handler Error]:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
}
```

---

### 3.4. Robots Configuration: `src/app/robots.ts`

**File Location**: `src/app/robots.ts`  
**Purpose**: Generates dynamic `/robots.txt` using Next.js Metadata Route.

#### Proposed Full Code:
```typescript
import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/admin/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

---

## 4. Edge Cases & Boundary Handling

| Edge Case | Scenario | Designed Mitigation |
|---|---|---|
| **Multiple trailing slashes** | `NEXT_PUBLIC_SITE_URL="https://myblog.com///"` | `replace(/\/+$/, "")` strips all trailing slashes to `"https://myblog.com"`. |
| **Trailing whitespace** | `NEXT_PUBLIC_SITE_URL="  https://myblog.com/  "` | `.trim()` removes outer whitespace before slash replacement. |
| **Empty or blank env var** | `NEXT_PUBLIC_SITE_URL=""` or `"   "` | Truthy check on `.trim()` falls back cleanly to `SITE_URL` or default `"http://localhost:3000"`. |
| **Zero published posts in DB** | SQLite database has no posts or only drafts | Query returns `[]`. Homepage `<url>` is generated with current timestamp. Valid XML `<urlset>` returned without throwing. |
| **Draft exclusion** | Posts where `published = false` exist in DB | Prisma query specifies `where: { published: true }`. Drafts are strictly excluded. |
| **XML Special Characters in URLs** | Post slug or URL containing `&`, `<`, `>`, `"`, `'` | `escapeXml()` utility encodes characters to XML entities (`&amp;`, `&lt;`, etc.). |
| **Database connection error** | SQLite file locked or Prisma query rejection | Caught in `try...catch` block, returns HTTP 500 with XML error payload rather than crashing the worker or hanging request. |
| **Next.js static caching** | Route handler statically evaluated at build time | `export const dynamic = "force-dynamic"` and `export const revalidate = 0` forces dynamic execution on each request. |

---

## 5. Vitest Test Suite Design (`tests/seo.test.ts`)

The worker should implement a dedicated test suite in `tests/seo.test.ts` to verify Milestone 1 features thoroughly. Below is the exact test design structure:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBaseUrl, getAbsoluteUrl } from "@/lib/site";
import robots from "@/app/robots";
import { GET as getSitemap } from "@/app/sitemap.xml/route";
import { PATCH as togglePublish } from "@/app/api/admin/posts/[id]/publish/route";
import { db } from "@/lib/db";

// Mock @/lib/db
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Milestone 1: Base URL, Robots, Sitemap, and Publish Schema", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================
  // Section 1: Base URL Resolver (src/lib/site.ts)
  // ==========================================
  describe("Base Site URL Resolution (src/lib/site.ts)", () => {
    it("should return default http://localhost:3000 when no env variables are set", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.SITE_URL;
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should resolve NEXT_PUBLIC_SITE_URL and strip trailing slashes", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com///";
      expect(getBaseUrl()).toBe("https://myblog.com");
    });

    it("should fall back to SITE_URL when NEXT_PUBLIC_SITE_URL is not set", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.SITE_URL = "https://internal-site.org/";
      expect(getBaseUrl()).toBe("https://internal-site.org");
    });

    it("should prioritize NEXT_PUBLIC_SITE_URL over SITE_URL", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://public.org/";
      process.env.SITE_URL = "https://internal.org/";
      expect(getBaseUrl()).toBe("https://public.org");
    });

    it("should handle empty or whitespace-only strings gracefully", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "   ";
      process.env.SITE_URL = "";
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should construct absolute URLs cleanly with getAbsoluteUrl", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com/";
      expect(getAbsoluteUrl("/posts/my-slug")).toBe("https://myblog.com/posts/my-slug");
      expect(getAbsoluteUrl("sitemap.xml")).toBe("https://myblog.com/sitemap.xml");
      expect(getAbsoluteUrl("")).toBe("https://myblog.com");
    });
  });

  // ==========================================
  // Section 2: Robots Configuration (src/app/robots.ts)
  // ==========================================
  describe("Robots Configuration (src/app/robots.ts)", () => {
    it("should return compliant MetadataRoute.Robots with default base URL", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.SITE_URL;

      const config = robots();
      expect(config.rules).toEqual({
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      });
      expect(config.sitemap).toBe("http://localhost:3000/sitemap.xml");
    });

    it("should dynamically reflect custom base URL in sitemap directive", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://prod-domain.com";

      const config = robots();
      expect(config.sitemap).toBe("https://prod-domain.com/sitemap.xml");
    });
  });

  // ==========================================
  // Section 3: Dynamic XML Sitemap (src/app/sitemap.xml/route.ts)
  // ==========================================
  describe("Dynamic XML Sitemap Route Handler (src/app/sitemap.xml/route.ts)", () => {
    it("should return valid XML with status 200 and Content-Type application/xml", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com";
      const mockPosts = [
        { slug: "artikel-satu", updatedAt: new Date("2026-11-01T10:00:00.000Z") },
        { slug: "artikel-dua", updatedAt: new Date("2026-11-05T12:00:00.000Z") },
      ];

      vi.mocked(db.post.findMany).mockResolvedValueOnce(mockPosts as any);

      const res = await getSitemap();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/xml");

      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://myblog.com</loc>');
      expect(xml).toContain('<loc>https://myblog.com/posts/artikel-satu</loc>');
      expect(xml).toContain('<lastmod>2026-11-01T10:00:00.000Z</lastmod>');
      expect(xml).toContain('<loc>https://myblog.com/posts/artikel-dua</loc>');
      expect(xml).toContain('<lastmod>2026-11-05T12:00:00.000Z</lastmod>');
    });

    it("should query only published posts (where published: true)", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      await getSitemap();
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          select: { slug: true, updatedAt: true },
        })
      );
    });

    it("should handle empty database gracefully by outputting homepage entry", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const res = await getSitemap();
      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain("<loc>http://localhost:3000</loc>");
      expect(xml).toContain("</urlset>");
      expect(xml).not.toContain("/posts/");
    });

    it("should escape special XML characters in URL slugs", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
      const mockPosts = [
        { slug: "post-with-&-and-<tag>", updatedAt: new Date("2026-11-10T00:00:00.000Z") },
      ];
      vi.mocked(db.post.findMany).mockResolvedValueOnce(mockPosts as any);

      const res = await getSitemap();
      const xml = await res.text();
      expect(xml).toContain("<loc>http://localhost:3000/posts/post-with-&amp;-and-&lt;tag&gt;</loc>");
    });

    it("should return 500 when database query throws an error", async () => {
      vi.mocked(db.post.findMany).mockRejectedValueOnce(new Error("Database connection lost"));

      const res = await getSitemap();
      expect(res.status).toBe(500);
      const body = await res.text();
      expect(body).toContain("Failed to generate sitemap");
    });
  });

  // ==========================================
  // Section 4: Zod v4 Publish Toggle Route Fix
  // ==========================================
  describe("Publish Toggle Route (src/app/api/admin/posts/[id]/publish/route.ts)", () => {
    it("should toggle publish state successfully with valid boolean", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-1", published: false } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({ id: "post-1", published: true, tags: [], _count: { comments: 0 } } as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-1/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.published).toBe(true);
    });

    it("should return 400 when published payload is not a boolean", async () => {
      const req = new Request("http://localhost:3000/api/admin/posts/post-1/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: "string_not_boolean" }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-1" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });
  });
});
```

---

## 6. Implementation Checklist & Verification for Worker

The worker assigned to implement Milestone 1 should execute these steps in order:

1. **Step 1 - Fix Build Blocker**:
   Edit `src/app/api/admin/posts/[id]/publish/route.ts` line 6–9: Replace `{ required_error, invalid_type_error }` with `{ message: "Status publikasi harus bernilai boolean" }`.
2. **Step 2 - Implement Site URL Resolver**:
   Create `src/lib/site.ts` with `getBaseUrl()` and `getAbsoluteUrl()`.
3. **Step 3 - Implement Robots Configuration**:
   Create `src/app/robots.ts` returning `MetadataRoute.Robots`.
4. **Step 4 - Implement Dynamic XML Sitemap**:
   Create `src/app/sitemap.xml/route.ts` with dynamic Route Handler `GET()`.
5. **Step 5 - Implement Automated Tests**:
   Create `tests/seo.test.ts` covering all tier 1, tier 2, and tier 3 test cases.
6. **Step 6 - Verification**:
   - Run `npx tsc --noEmit` to confirm zero TypeScript compilation errors.
   - Run `npm test` to confirm all 108 existing tests + new SEO tests pass.
   - Run `npm run build` to confirm production Next.js build succeeds with zero errors.
