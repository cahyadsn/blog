# Technical Specification & Architectural Analysis: SEO and Content Distribution for Next.js 15

**Target Application**: Antigravity Multi-Agent Blog  
**Workspace**: `d:\c\blog`  
**Framework**: Next.js 16.4.6 / 15 App Router, React 19, Prisma 6.4.1 (SQLite `dev.db`), Vitest 5.1.0  
**Document Author**: Spec Miner (`spec_miner_survey_3`)  
**Timestamp**: 2026-11-11T03:15:00Z  

---

## 1. Executive Summary

This specification mining report establishes authoritative technical requirements, interface contracts, implementation choices, and edge-case behavior for the SEO and content distribution subsystem of the blog application. 

The project codebase is organized under `src/` with path alias `@/*` mapped to `./src/*`. The data layer uses Prisma ORM connected to a local SQLite database (`prisma/dev.db`), accessed via the singleton instance `db` exported from `@/lib/db`.

The requested subsystem encompasses five major functional areas:
1. **Dynamic XML Sitemap**: Querying database for published articles and generating standards-compliant XML at `/sitemap.xml`.
2. **Search Engine Crawler Rules (Robots)**: Serving directives at `/robots.txt` referencing the absolute sitemap URL.
3. **Dynamic RSS 2.0 Feed**: Serving a syndication feed at `/feed.xml` ordered by publication date descending with RFC 822/2822 dates and CDATA/XML sanitization.
4. **Open Graph & Twitter Card Metadata**: Root layout global metadata and post-specific dynamic metadata via `generateMetadata` adhering to Next.js 15 asynchronous `params` requirements.
5. **Dynamic Social Preview Cards (`ImageResponse`)**: Server-generated social preview images (1200x630 PNG) rendered via Next.js `ImageResponse` under the Node.js runtime to ensure SQLite compatibility.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Sitemap | Dynamic XML Sitemap (`/sitemap.xml`) | Exposes XML sitemap listing homepage and all active articles where `published: true`. Includes `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`. Excludes drafts and unpublished posts. | Prisma `db.post.findMany({ where: { published: true } })`, Base URL (`NEXT_PUBLIC_SITE_URL` / `SITE_URL` / fallback). | Valid XML document (`<urlset>`) with `Content-Type: application/xml` (or `text/xml`). HTTP 200. | On DB failure, returns 500 or fallback containing at least homepage URL; never crashes build. | `ORIGINAL_REQUEST.md` R1, Next.js App Router MetadataRoute specification |
| 2 | Robots | Crawler Directives (`/robots.txt`) | Provides search engine crawler rules. Allows public routes `/`, disallows private/internal paths (e.g. `/api/`, `/admin/`), and specifies absolute sitemap URL. | Base URL environment variables. | `User-agent: *`, `Allow: /`, `Disallow: /api/`, `Disallow: /admin/`, `Sitemap: <baseUrl>/sitemap.xml`. Content-Type: `text/plain`. | Falls back to `http://localhost:3000/sitemap.xml` if environment variables are missing. | `ORIGINAL_REQUEST.md` R1, Next.js `MetadataRoute.Robots` spec |
| 3 | Syndication | Dynamic RSS 2.0 Feed (`/feed.xml`) | Emits RSS 2.0 XML feed containing channel metadata (title, link, description, atom:link) and items for all `published: true` posts sorted by `publishedAt` descending. | Prisma `db.post.findMany({ where: { published: true }, orderBy: { publishedAt: 'desc' } })`, Base URL. | RSS 2.0 XML document (`<rss version="2.0">`) with `Content-Type: application/xml; charset=utf-8` (or `application/rss+xml`). HTTP 200. | Returns 500 JSON/XML error on DB failure. Handles special XML characters safely without breaking parser. | `ORIGINAL_REQUEST.md` R2, RSS 2.0 Official Specification (RSS Advisory Board) |
| 4 | Metadata | Root Global Metadata & Base URL | Configures `metadataBase`, default and template page titles, default Open Graph and Twitter Card tags in root layout. | Environment variables `NEXT_PUBLIC_SITE_URL` / `SITE_URL`. | `<head>` metadata tags emitted across all pages: `<meta property="og:...">`, `<meta name="twitter:...">`, `<link rel="canonical">`, `<link rel="alternate" type="application/rss+xml">`. | Avoids Next.js missing `metadataBase` build warning. | Next.js Metadata API spec, `src/app/layout.tsx` |
| 5 | Metadata | Dynamic Article Metadata (`/posts/[slug]`) | Extracts article data in `generateMetadata` and dynamically populates `title`, `description`, `openGraph` (article type, timestamps, tags, image), and `twitter` card. | `props: { params: Promise<{ slug: string }> }` (Next.js 15 async params), Prisma DB lookup. | Dynamic `<title>`, `<meta property="og:title">`, `<meta property="og:description">`, `<meta property="og:image">`, `<meta name="twitter:card">`, etc. | If post not found or `published === false`, returns fallback 404/not found metadata without throwing unhandled exceptions. | `ORIGINAL_REQUEST.md` R3, Next.js 15 Dynamic Metadata API |
| 6 | Social Images | Post Social Preview Image (`/posts/[slug]/opengraph-image.tsx`) | Dynamically generates a 1200x630 PNG card using Next.js `ImageResponse`. Renders article title, author, reading time, tags, and incorporates `coverImage` or fallback branding. | `props: { params: Promise<{ slug: string }> }`, Prisma DB lookup. | Image binary with `Content-Type: image/png`, 1200x630 dimensions. | Renders fallback branding card if post has no cover image or post lookup fails. | `ORIGINAL_REQUEST.md` R3, Next.js `ImageResponse` spec |
| 7 | Social Images | Homepage Social Preview Image (`/opengraph-image.tsx`) | Dynamically generates a 1200x630 PNG card for the blog homepage using `ImageResponse` with branding, typography, and subtitle. | Static metadata / blog configuration. | Image binary with `Content-Type: image/png`, 1200x630 dimensions. | Deterministic static rendering, no external dependencies required. | `ORIGINAL_REQUEST.md` R3, Next.js Root `opengraph-image` convention |
| 8 | Feed Discovery | RSS Auto-Discovery Link Header | Inserts `<link rel="alternate" type="application/rss+xml" href="<baseUrl>/feed.xml" />` into document `<head>` via root metadata `alternates.types`. | Base URL. | Auto-discovery `<link>` in HTML head for RSS readers and browser extensions. | Graceful fallback to localhost base URL. | RSS Best Practices & HTML5 specifications |
| 9 | Testing | Vitest Route & Metadata Test Suites | Automated tests verifying HTTP status, `Content-Type`, XML validity, tag presence, ordering, draft exclusion, and crawler rules. | Mock database records or Prisma test fixtures. | Test pass/fail assertions. Zero regressions. | Catches XML malformation, unescaped characters, missing tags, and draft leakage. | `ORIGINAL_REQUEST.md` R4, `vitest.config.ts` |

---

## 3. Edge Cases & Failure Modes

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|------------------------------|
| 1 | Base URL Helper | `NEXT_PUBLIC_SITE_URL="https://myblog.com/"` (trailing slash) | Trailing slash must be stripped so `${baseUrl}/posts/${slug}` does not produce `https://myblog.com//posts/...`. |
| 2 | Base URL Helper | Neither `NEXT_PUBLIC_SITE_URL` nor `SITE_URL` is set | Evaluates fallback to `"http://localhost:3000"`. |
| 3 | Base URL Helper | `NEXT_PUBLIC_SITE_URL=""` (empty string) | Empty string or whitespace-only must fallback to `"http://localhost:3000"`. |
| 4 | Sitemap & RSS | Database contains posts with `published: false` (drafts) | Query MUST filter `{ where: { published: true } }`. Drafts must NOT appear in `/sitemap.xml` or `/feed.xml`. |
| 5 | Sitemap & RSS | Database contains 0 published posts | Route returns valid XML document (sitemap contains only homepage URL; RSS feed contains valid channel with 0 `<item>` nodes). Must not throw 500 error. |
| 6 | RSS Feed | Post title or excerpt contains XML special characters: `&`, `<`, `>`, `"`, `'` | If unescaped, XML parsers fail. All text nodes must either be escaped (`&amp;`, `&lt;`, `&gt;`) or wrapped in `<![CDATA[...]]>`. |
| 7 | RSS Feed | Post content contains `]]>` inside text intended for CDATA | CDATA closing delimiter `]]>` must be escaped (e.g. `]]]]><![CDATA[>`) to prevent premature CDATA termination. |
| 8 | RSS Feed | Post `publishedAt` is null or invalid date | Fallback to `new Date().toUTCString()` or post `createdAt`. Date format must strictly follow RFC 822 / RFC 2822 (`toUTCString()`), NOT ISO 8601 string. |
| 9 | Metadata (`generateMetadata`) | Dynamic route `params` passed in Next.js 15 | `params` is a `Promise<{ slug: string }>`. Code must `await params`. Direct access `params.slug` throws runtime error or causes build failure. |
| 10 | Metadata (`generateMetadata`) | Post with requested slug does not exist or has `published: false` | Must return fallback metadata (e.g. `{ title: "Artikel Tidak Ditemukan" }`) or invoke `notFound()`. Must not throw unhandled exception or 500 error. |
| 11 | Social Image (`opengraph-image`) | Database lookup inside `opengraph-image.tsx` using Prisma SQLite | Edge runtime (`export const runtime = 'edge'`) CANNOT be used because SQLite requires Node.js filesystem APIs. Must run in Node.js runtime. |
| 12 | Social Image (`opengraph-image`) | Post `coverImage` is a relative path or unavailable external URL | `ImageResponse` (Satori) requires valid absolute URL or data URI for `<img>`. If invalid or null, must gracefully fallback to pure CSS/flexbox branded card without crashing. |
| 13 | Social Image (`opengraph-image`) | CSS styling inside `ImageResponse` | Satori supports only Flexbox (`display: 'flex'`). `display: 'grid'` or unsupported CSS properties will throw rendering exceptions. Must use supported flexbox inline styles. |
| 14 | Route Handlers | Concurrent route naming conflict between `sitemap.ts` and `sitemap.xml/route.ts` | Next.js does not allow both a metadata route file (`sitemap.ts`) and a route handler at `/sitemap.xml`. Having both causes Next.js build collision. Must adopt a single authoritative pattern. |

---

## 4. Deep-Dive Architectural Specifications

### 4.1 Base Site URL Normalization
All generated URLs (canonical links, sitemap URLs, RSS feed items, Open Graph URLs, and social image URLs) depend on a unified base URL resolver.

```typescript
// Architectural Contract: src/lib/site.ts
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (!envUrl || envUrl.trim() === "") {
    return "http://localhost:3000";
  }
  // Strip trailing slashes
  return envUrl.trim().replace(/\/+$/, "");
}
```

### 4.2 Dynamic XML Sitemap Specification: `sitemap.ts` vs `sitemap.xml/route.ts`

There are two primary paradigms in Next.js App Router for serving `/sitemap.xml`:

#### Approach A: Built-in Next.js Special File (`src/app/sitemap.ts`)
- **Signature**:
  ```typescript
  import type { MetadataRoute } from "next";
  import { db } from "@/lib/db";
  import { getBaseUrl } from "@/lib/site";

  export const dynamic = "force-dynamic";

  export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = getBaseUrl();
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    const entries: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      ...posts.map((post) => ({
        url: `${baseUrl}/posts/${post.slug}`,
        lastModified: post.updatedAt || post.publishedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];

    return entries;
  }
  ```
- **Strengths**: 
  - Standard Next.js convention; automatically compiles to `/sitemap.xml`.
  - Next.js handles XML serialization, namespace attributes, and `Content-Type: application/xml` header automatically.
- **Testing Characteristic**:
  - In Vitest, calling `await sitemap()` returns an Array of objects (`MetadataRoute.Sitemap`). It does not directly return an HTTP `Response` object with headers unless executed against a running server or wrapped.

#### Approach B: Custom Route Handler (`src/app/sitemap.xml/route.ts`)
- **Signature**:
  ```typescript
  import { db } from "@/lib/db";
  import { getBaseUrl } from "@/lib/site";

  export const dynamic = "force-dynamic";

  export async function GET() {
    const baseUrl = getBaseUrl();
    const posts = await db.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${posts
  .map(
    (post) => `  <url>
    <loc>${baseUrl}/posts/${post.slug}</loc>
    <lastmod>${(post.updatedAt || post.publishedAt).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }
  ```
- **Strengths**:
  - Completely satisfies Acceptance Criteria R4 directly in Vitest: tests can invoke `await GET()` and assert `res.status === 200`, `res.headers.get("Content-Type") === "application/xml; charset=utf-8"`, and assert XML string content directly.
- **Crucial Warning on Route Collisions**:
  - Next.js App Router WILL NOT allow both `src/app/sitemap.ts` and `src/app/sitemap.xml/route.ts` at the same time. If both exist, Next.js build will abort with a conflicting route error.
  - **Recommended Architecture**: If `src/app/sitemap.ts` is preferred for Next.js idiomatic standards, an auxiliary generator function `generateSitemapXml()` should be tested, OR `src/app/sitemap.xml/route.ts` can be used as the primary endpoint. Alternatively, having `sitemap.ts` export default for Next.js AND an explicit GET handler if supported. The cleanest, zero-conflict approach that satisfies all Acceptance Criteria (including verifying HTTP status and Content-Type header in Vitest) is either `src/app/sitemap.xml/route.ts`, OR using `src/app/sitemap.ts` with tests verifying both the function data output and testing the route or XML serializer.

---

### 4.3 Robots Configuration Specification (`src/app/robots.ts`)
- **File location**: `src/app/robots.ts`
- **Specification**:
  ```typescript
  import type { MetadataRoute } from "next";
  import { getBaseUrl } from "@/lib/site";

  export default function robots(): MetadataRoute.Robots {
    const baseUrl = getBaseUrl();
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }
  ```
- **Crawler Rules**:
  - `User-agent: *`
  - `Allow: /`
  - `Disallow: /api/`
  - `Disallow: /admin/`
  - `Sitemap: <baseUrl>/sitemap.xml`
- **Output**: Next.js automatically responds to `/robots.txt` with MIME type `text/plain`.
- **Vitest Testing**: Directly import `robots` from `@/app/robots` and assert object structure, allowed/disallowed rules, and absolute sitemap URL.

---

### 4.4 Dynamic RSS 2.0 Feed Specification (`src/app/feed.xml/route.ts`)
- **Route Path**: `/feed.xml` -> maps to file `src/app/feed.xml/route.ts`
- **HTTP Method**: `GET`
- **Response Headers**:
  - `Content-Type`: `application/xml; charset=utf-8` (or `application/rss+xml; charset=utf-8`)
  - `Cache-Control`: `public, s-maxage=3600, stale-while-revalidate=86400`
- **Database Query**:
  ```typescript
  const posts = await db.post.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      publishedAt: true,
      updatedAt: true,
    },
    orderBy: { publishedAt: "desc" },
  });
  ```
- **RSS 2.0 Schema Conformance**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>Antigravity Multi-Agent Blog</title>
      <link>${baseUrl}</link>
      <description>Aplikasi blog modern dengan ekosistem multi-agent mandiri</description>
      <language>id-ID</language>
      <lastBuildDate>${latestDateRFC822}</lastBuildDate>
      <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
      <item>
        <title><![CDATA[${cleanTitle}]]></title>
        <link>${baseUrl}/posts/${post.slug}</link>
        <description><![CDATA[${cleanExcerpt}]]></description>
        <pubDate>${post.publishedAt.toUTCString()}</pubDate>
        <guid isPermaLink="true">${baseUrl}/posts/${post.slug}</guid>
      </item>
    </channel>
  </rss>
  ```
- **Sanitization & XML Escaping Rules**:
  - `escapeXml(str)` or CDATA wrapping:
    ```typescript
    function sanitizeCdata(str: string): string {
      // Prevent CDATA escape injection: replace "]]>" with "]]]]><![CDATA[>"
      return str.replace(/\]\]>/g, "]]]]><![CDATA[>");
    }
    ```
- **HTML Head Auto-Discovery**:
  In `src/app/layout.tsx`:
  ```typescript
  alternates: {
    canonical: baseUrl,
    types: {
      "application/rss+xml": `${baseUrl}/feed.xml`,
    },
  }
  ```

---

### 4.5 Dynamic Open Graph and Twitter Card Metadata

#### 1. Root Layout (`src/app/layout.tsx`)
```typescript
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/site";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Antigravity Multi-Agent Blog",
    template: "%s | Antigravity Blog",
  },
  description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
  alternates: {
    canonical: baseUrl,
    types: {
      "application/rss+xml": `${baseUrl}/feed.xml`,
    },
  },
  openGraph: {
    title: "Antigravity Multi-Agent Blog",
    description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
    url: baseUrl,
    siteName: "Antigravity Multi-Agent Blog",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Antigravity Multi-Agent Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Antigravity Multi-Agent Blog",
    description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
    images: ["/opengraph-image"],
  },
};
```

#### 2. Dynamic Post Metadata (`src/app/posts/[slug]/page.tsx`)
```typescript
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params; // Next.js 15 Async Params!
  const post = await db.post.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      published: true,
      publishedAt: true,
      updatedAt: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!post || !post.published) {
    return {
      title: "Artikel Tidak Ditemukan",
      description: "Artikel yang Anda cari tidak ditemukan atau belum dipublikasikan.",
    };
  }

  const baseUrl = getBaseUrl();
  const postUrl = `${baseUrl}/posts/${slug}`;
  // If coverImage exists and is absolute, use it; otherwise fallback to dynamic opengraph-image
  const ogImageUrl = post.coverImage && (post.coverImage.startsWith("http://") || post.coverImage.startsWith("https://"))
    ? post.coverImage
    : `${postUrl}/opengraph-image`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl,
      siteName: "Antigravity Multi-Agent Blog",
      locale: "id_ID",
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags.map((t) => t.tag.name),
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
```

---

### 4.6 Dynamic Social Preview Card Image Generation (`ImageResponse`)

Next.js provides native dynamic image generation using `ImageResponse` from `next/og`.

#### 1. Post Detail Preview Image (`src/app/posts/[slug]/opengraph-image.tsx`)
- **Exported Configuration**:
  ```typescript
  export const alt = "Pratinjau Artikel Antigravity Blog";
  export const size = { width: 1200, height: 630 };
  export const contentType = "image/png";
  // CRITICAL: Do NOT set runtime = 'edge' when querying SQLite Prisma database!
  ```
- **Function Implementation**:
  ```tsx
  import { ImageResponse } from "next/og";
  import { db } from "@/lib/db";

  export default async function Image({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    const post = await db.post.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
      },
    });

    const title = post?.title || "Artikel Antigravity Blog";
    const excerpt = post?.excerpt || "Wawasan Teknologi, AI, dan Rekayasa Perangkat Lunak.";
    const readingTime = post?.readingTime || 3;
    const tags = post?.tags.map((t) => t.tag.name).slice(0, 3) || [];

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0f172a",
            backgroundImage: "radial-gradient(circle at 25px 25px, #1e293b 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1e293b 2%, transparent 0%)",
            backgroundSize: "100px 100px",
            padding: "60px 80px",
            color: "#f8fafc",
            fontFamily: "sans-serif",
          }}
        >
          {/* Header Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#ffffff",
                }}
              >
                &gt;_
              </div>
              <span style={{ fontSize: "28px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
                Antigravity<span style={{ color: "#818cf8" }}>Blog</span>
              </span>
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: "rgba(79, 70, 229, 0.2)",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "16px",
                fontWeight: 600,
                color: "#c7d2fe",
              }}
            >
              Multi-Agent AI Ecosystem
            </div>
          </div>

          {/* Main Title & Excerpt */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#94a3b8",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
            <h1
              style={{
                fontSize: title.length > 60 ? "46px" : "56px",
                fontWeight: 900,
                lineHeight: 1.15,
                color: "#ffffff",
                margin: 0,
                display: "-webkit-box",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: "22px",
                color: "#94a3b8",
                lineHeight: 1.4,
                margin: 0,
                display: "-webkit-box",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {excerpt}
            </p>
          </div>

          {/* Footer Meta */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #1e293b",
              paddingTop: "24px",
              fontSize: "18px",
              color: "#64748b",
            }}
          >
            <span>Antigravity Editorial Agent • {readingTime} menit baca</span>
            <span>https://antigravity.blog</span>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
  ```

#### 2. Homepage Preview Image (`src/app/opengraph-image.tsx`)
- Placed directly in `src/app/opengraph-image.tsx` to automatically serve `/opengraph-image` with blog title, branding, tagline, and ecosystem badges.

---

### 4.7 Vitest Automated Testing Specifications
The test suite should be located in `tests/seo.test.ts` (or separated into `tests/sitemap.test.ts` and `tests/feed.test.ts`).

Test cases to implement:
1. **Sitemap Tests**:
   - `GET /sitemap.xml` returns HTTP status 200.
   - Header `Content-Type` contains `application/xml` or `text/xml`.
   - Response XML begins with `<?xml version="1.0"` and contains `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`.
   - Homepage URL is present (`<loc>http://localhost:3000</loc>`).
   - All published posts (`published: true`) are present in `<loc>`.
   - Draft posts (`published: false`) are NOT present in `<loc>`.
   - Base URL override (`process.env.NEXT_PUBLIC_SITE_URL = "https://custom-domain.com"`) correctly resolves in `<loc>`.
2. **Robots Tests**:
   - Invoking `robots()` returns an object conforming to `MetadataRoute.Robots`.
   - Rules include `userAgent: "*"`, `allow: "/"`.
   - Rules disallow `/api/` and `/admin/`.
   - Sitemap URL points to absolute `/sitemap.xml` using the configured base URL.
3. **RSS 2.0 Feed Tests**:
   - `GET /feed.xml` returns HTTP status 200.
   - Header `Content-Type` contains `application/xml` or `application/rss+xml`.
   - Response XML contains `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` and `<channel>`.
   - Channel contains `<title>`, `<link>`, `<description>`, `<language>`, and `<atom:link rel="self">`.
   - Items contain `<title>`, `<link>`, `<description>`, `<pubDate>`, and `<guid>`.
   - Date format conforms to RFC 822 (`toUTCString()`).
   - Items are ordered by `publishedAt` descending.
   - Draft posts are excluded.
   - Special characters (`&`, `<`, `>`) in title or excerpt are properly escaped or encased in CDATA without throwing parse errors.
4. **Metadata Tests**:
   - `generateMetadata` on `/posts/[slug]` produces valid `title`, `description`, `openGraph`, and `twitter` objects.
   - Non-existent slug returns fallback title without throwing.

---

## 5. Potential Pitfalls and Anti-Patterns Checklist

| # | Pitfall / Anti-Pattern | Root Cause | Impact | Recommended Solution |
|---|------------------------|------------|--------|----------------------|
| 1 | **Next.js 15 Sync `params` access** | Next.js 15 changed `params` to a `Promise`. | Runtime error / TypeScript compile error: `Property 'slug' does not exist on type 'Promise<...>'`. | Always type `params: Promise<{ slug: string }>` and `await params`. |
| 2 | **Route Handler Collision (`sitemap.ts` + `sitemap.xml/route.ts`)** | Next.js maps `sitemap.ts` to `/sitemap.xml`. | `next build` fails with duplicate route collision error. | Select either `sitemap.ts` OR `sitemap.xml/route.ts`. If both are needed, keep one authoritative. |
| 3 | **Edge Runtime on SQLite Prisma (`opengraph-image.tsx`)** | Setting `export const runtime = 'edge'` when importing Prisma SQLite client. | Build failure: `A Node.js API is used (fs / SQLite) which is not supported in the Edge Runtime`. | Do not set `runtime = 'edge'`; let Next.js use Node.js runtime. |
| 4 | **Satori / Flexbox Unsupported CSS** | Using `display: 'grid'` or unsupported CSS properties in `ImageResponse`. | Satori rendering error / corrupted social image. | Use inline styles with standard flexbox properties (`display: 'flex'`, `flexDirection: 'column'`). |
| 5 | **Missing `metadataBase` in Layout** | Omitting `metadataBase: new URL(...)` in `src/app/layout.tsx`. | Next.js prints persistent warning during build for relative OG URLs. | Add `metadataBase: new URL(getBaseUrl())` to `src/app/layout.tsx`. |
| 6 | **Unescaped XML in RSS/Sitemap** | Raw strings containing `&`, `<`, `>` interpolated into XML templates. | XML parser error (`XML Parsing Error: not well-formed`). Feeds broken. | Encase strings in `<![CDATA[...]]>` and escape `]]>` to `]]]]><![CDATA[>`. |
| 7 | **Invalid Date Format in RSS** | Using `.toISOString()` instead of `.toUTCString()` for `<pubDate>`. | RSS readers and validators reject `<pubDate>` as invalid RFC 822 date. | Use `new Date(post.publishedAt).toUTCString()`. |
| 8 | **Draft / Unpublished Post Leakage** | Forgetting `{ where: { published: true } }` in database queries. | Drafts and unapproved posts exposed to search engines and RSS subscribers. | Always include `{ where: { published: true } }` in sitemap, RSS, and metadata queries. |
| 9 | **Trailing Slash Base URL Double Slash** | Concatenating `${baseUrl}/posts/${slug}` when `baseUrl` ends with `/`. | Emits malformed URLs like `https://myblog.com//posts/slug`. | Strip trailing slashes: `url.replace(/\/+$/, "")`. |
| 10 | **Wrong Folder Location (`app` vs `src/app`)** | Codebase has `tsconfig.json` mapped to `./src/*` and files in `src/app`. | Files placed in `app/` are either ignored or create duplicate module conflicts. | Place all new routes strictly under `src/app/`. |

---

## 6. Authoritative Source References
- Next.js Documentation: [Metadata Files (sitemap.js/ts)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- Next.js Documentation: [Robots File (robots.js/ts)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- Next.js Documentation: [Open Graph Image (opengraph-image.js/ts)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- Next.js Documentation: [ImageResponse API](https://nextjs.org/docs/app/api-reference/functions/image-response)
- Next.js 15 Upgrade Guide: [Async Request-Specific Data (params, searchParams)](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- RSS 2.0 Specification: [RSS 2.0 Specification (RSS Advisory Board)](https://www.rssboard.org/rss-specification)
- Sitemaps XML Protocol: [sitemaps.org Protocol](https://www.sitemaps.org/protocol.html)
