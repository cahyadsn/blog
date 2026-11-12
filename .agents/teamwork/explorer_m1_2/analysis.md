# Technical Analysis & Implementation Design: Dynamic RSS 2.0 Feed

**Target Component**: `src/app/feed.xml/route.ts`  
**Milestone**: Milestone 1 (SEO & Content Distribution Features)  
**Author**: Explorer Agent (`explorer_m1_2`)  
**Date**: 2026-11-11  

---

## 1. Executive Summary

This document specifies the concrete implementation strategy, code designs, XML sanitization algorithms, edge case handling, and automated test suite specifications for the **Dynamic RSS 2.0 Feed** (`src/app/feed.xml/route.ts`) of the Antigravity Multi-Agent Blog.

The RSS feed provides automated syndication for external feed aggregators (Feedly, Inoreader, Apple News, etc.) and search engine discovery bots. It adheres strictly to the official **RSS 2.0 Specification** (Harvard Berkman Klein Center) combined with **Atom 1.0 syndication extensions** (`xmlns:atom="http://www.w3.org/2005/Atom"` and `<atom:link rel="self" />`) as recommended by the W3C Feed Validation Service.

---

## 2. Architecture & Standards Alignment

### 2.1 RSS 2.0 Specification Requirements
An RSS 2.0 document must be valid XML 1.0 with UTF-8 encoding. The root element is `<rss version="2.0">`, containing a single `<channel>` element.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Antigravity Multi-Agent Blog</title>
    <link>http://localhost:3000</link>
    <description>Aplikasi blog modern dengan ekosistem multi-agent mandiri</description>
    <language>id-ID</language>
    <lastBuildDate>Wed, 11 Nov 2026 03:00:00 GMT</lastBuildDate>
    <atom:link href="http://localhost:3000/feed.xml" rel="self" type="application/rss+xml" />
    
    <!-- One item per published post -->
    <item>
      <title>...</title>
      <link>...</link>
      <description>...</description>
      <pubDate>...</pubDate>
      <guid isPermaLink="true">...</guid>
    </item>
  </channel>
</rss>
```

### 2.2 Date Formatting Standards (RFC 822 / RFC 2822)
RSS 2.0 mandates RFC 822 / 2822 date timestamps for `<pubDate>` and `<lastBuildDate>`.
- In JavaScript, `date.toUTCString()` outputs: `"Wed, 11 Nov 2026 03:00:00 GMT"`.
- This strictly complies with RFC 822 requirements: `Day, DD Mon YYYY HH:MM:SS GMT`.

### 2.3 Next.js 15 App Router Route Handler Protocol
- **Route Path**: `src/app/feed.xml/route.ts`
- **HTTP Method**: `export async function GET(): Promise<Response>`
- **Dynamic Configuration**: `export const dynamic = "force-dynamic";`
  - Ensures each request queries fresh data from SQLite via Prisma without stale build-time static caching.
- **Content-Type**: `application/xml; charset=utf-8` (or `application/rss+xml; charset=utf-8`).
- **Cache-Control**: `public, s-maxage=3600, stale-while-revalidate=86400`
  - Allows CDN and edge caching while guaranteeing fast background revalidation.

---

## 3. Database Query Specification

### 3.1 Schema Context (`prisma/schema.prisma`)
The `Post` model has:
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
}
```

### 3.2 Exact Query Formulation
To optimize database throughput, avoid memory pressure from large markdown contents, and enforce strict draft isolation:

```typescript
const posts = await db.post.findMany({
  where: { published: true },
  orderBy: { publishedAt: "desc" },
  select: {
    title: true,
    slug: true,
    excerpt: true,
    publishedAt: true,
  },
});
```

**Key Invariants:**
1. `where: { published: true }`: Hard guarantee that draft posts (`published: false`) are never leaked to the RSS feed.
2. `orderBy: { publishedAt: "desc" }`: Chronological descending order so the newest published articles appear at the top.
3. `select`: Only retrieve `title`, `slug`, `excerpt`, and `publishedAt`. Omitting `content` prevents fetching multi-megabyte markdown strings into memory.

---

## 4. Base Site URL Integration

The route relies on `getBaseUrl()` from `@/lib/site.ts`:

```typescript
// src/lib/site.ts
export function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
```

### URL Construction Rules:
| Element | Formula | Example |
|---|---|---|
| `<channel><link>` | `${baseUrl}` | `https://antigravity-blog.com` |
| `<atom:link href="...">` | `${baseUrl}/feed.xml` | `https://antigravity-blog.com/feed.xml` |
| `<item><link>` | `${baseUrl}/posts/${post.slug}` | `https://antigravity-blog.com/posts/membangun-blog-modern` |
| `<item><guid isPermaLink="true">` | `${baseUrl}/posts/${post.slug}` | `https://antigravity-blog.com/posts/membangun-blog-modern` |

---

## 5. XML Sanitization & Escaping Engine

### 5.1 Special Character Handling
XML 1.0 forbids raw ampersands (`&`), less-than (`<`), greater-than (`>`), and double/single quotes in unquoted text/attributes.
Blog titles and excerpts frequently include symbols (e.g. `"Next.js & React 19: <New Features>"`).

We provide a dedicated utility function:

```typescript
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

*Note on Escaping Order*: Replacing `&` FIRST is mandatory. If `<` is replaced with `&lt;` before `&` is replaced, the resulting string would become `&amp;lt;`, corrupting the XML.

### 5.2 Comparison: XML Entity Escaping vs CDATA Blocks
- **Entity Escaping (`escapeXml`)**:
  - *Pros*: Universally supported by 100% of XML parsers; enables simple regex and string equality testing (`.toContain('<title>My Title</title>')`); completely safe from delimiter injection.
  - *Cons*: Slightly longer string representation for dense symbols.
- **CDATA Blocks (`<![CDATA[...]]>`)**:
  - *Pros*: Preserves raw markup strings.
  - *Cons*: If an author uses `]]>` in a code snippet or title, it breaks the CDATA boundary unless split into `]]]]><![CDATA[>`; makes string-matching tests brittle because tests must match `<title><![CDATA[...]]></title>`.

**Recommendation**: Use standard `escapeXml` for both `<title>` and `<description>`, or optionally wrap descriptions in `<![CDATA[${post.excerpt.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`. Using `escapeXml` for both is the cleanest, most robust, and easiest to test across all test suites.

---

## 6. Concrete Code Implementation

### Complete File Design: `src/app/feed.xml/route.ts`

```typescript
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Escapes reserved XML characters to ensure standard XML 1.0 validity.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
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

    // 1. Fetch published posts ordered by publishedAt descending
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
      },
    });

    // 2. Compute lastBuildDate (latest published post date or current timestamp if empty)
    const lastBuildDate =
      posts.length > 0 && posts[0].publishedAt
        ? new Date(posts[0].publishedAt).toUTCString()
        : new Date().toUTCString();

    // 3. Generate item tags
    const itemsXml = posts
      .map((post) => {
        const itemUrl = `${baseUrl}/posts/${post.slug}`;
        const pubDate = post.publishedAt
          ? new Date(post.publishedAt).toUTCString()
          : new Date().toUTCString();

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${itemUrl}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${itemUrl}</guid>
    </item>`;
      })
      .join("\n");

    // 4. Construct complete RSS 2.0 XML document
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Antigravity Multi-Agent Blog</title>
    <link>${baseUrl}</link>
    <description>Aplikasi blog modern dengan ekosistem multi-agent mandiri</description>
    <language>id-ID</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml ? `${itemsXml}\n` : ""}  </channel>
</rss>`;

    return new Response(xml.trim(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate RSS feed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

---

## 7. Edge Cases & Resilience Matrix

| Edge Case | Potential Defect | Architectural Mitigation |
|---|---|---|
| **Empty Database** (0 published posts) | Feed crashes or generates invalid XML without `<channel>` closure | Default `lastBuildDate` to `new Date().toUTCString()`, `itemsXml` resolves to empty string, channel still renders complete valid XML document with 0 items. |
| **Draft / Unpublished Posts** | Private or unreviewed drafts appear publicly | Enforced database filter `where: { published: true }`. |
| **Special Characters in Titles/Excerpts** | XML parsing error (`&`, `<`, `>`, `"`, `'`) | All text fields passed through `escapeXml()`. |
| **Missing Excerpt or Title** | `null` or `undefined` converted to string `"null"` | `escapeXml(unsafe)` checks `if (!unsafe) return ""` safely. |
| **Base URL with Trailing Slash** | Double slashes in links (e.g. `http://example.com//posts/...`) | `getBaseUrl()` cleanses trailing slashes via `.replace(/\/+$/, "")`. |
| **Database Connection Failure** | Uncaught exception results in hanging request | `try/catch` block returns 500 response with logged error. |
| **Non-GMT or ISO Date Formats** | Feed reader rejects timestamps not adhering to RFC 822 | `new Date(post.publishedAt).toUTCString()` strictly enforces standard RFC 822 format (`Wed, 11 Nov 2026 03:00:00 GMT`). |

---

## 8. Vitest Automated Testing Specifications

The test suite must be co-located or integrated into `tests/seo.test.ts`.

### 8.1 Test Fixtures & Mocking Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getFeed } from "@/app/feed.xml/route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
    },
  },
}));
```

### 8.2 Specific Test Cases to Implement

#### TC-FEED-1: Status & Header Contract
- **Given**: Standard GET request to `/feed.xml`.
- **When**: `getFeed()` is executed.
- **Then**:
  - `res.status` must equal `200`.
  - `res.headers.get("content-type")` must contain `application/xml` or `application/rss+xml`.

#### TC-FEED-2: Channel Metadata Verification
- **Given**: Valid database response.
- **When**: RSS XML body is extracted.
- **Then**:
  - Document starts with `<?xml version="1.0" encoding="UTF-8"?>`.
  - Root element contains `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`.
  - `<title>` matches `"Antigravity Multi-Agent Blog"`.
  - `<language>` equals `"id-ID"`.
  - `<link>` matches base URL.
  - `<atom:link>` references `${baseUrl}/feed.xml` with `rel="self"` and `type="application/rss+xml"`.

#### TC-FEED-3: Strict Draft Filtering & Query Invariants
- **Given**: Database query is executed.
- **When**: `getFeed()` is called.
- **Then**:
  - `db.post.findMany` is invoked with `where: { published: true }`.
  - `orderBy: { publishedAt: "desc" }`.
  - `select: { title: true, slug: true, excerpt: true, publishedAt: true }`.

#### TC-FEED-4: Feed Item Element Validation
- **Given**: Mock posts:
  ```typescript
  [
    {
      title: "Membangun Blog AI",
      slug: "membangun-blog-ai",
      excerpt: "Panduan arsitektur multi-agent",
      publishedAt: new Date("2026-11-10T10:00:00Z"),
    }
  ]
  ```
- **When**: RSS feed is rendered.
- **Then**:
  - XML contains `<item>`.
  - `<title>Membangun Blog AI</title>`.
  - `<link>http://localhost:3000/posts/membangun-blog-ai</link>`.
  - `<description>Panduan arsitektur multi-agent</description>`.
  - `<pubDate>Tue, 10 Nov 2026 10:00:00 GMT</pubDate>`.
  - `<guid isPermaLink="true">http://localhost:3000/posts/membangun-blog-ai</guid>`.

#### TC-FEED-5: XML Escaping of Special Characters
- **Given**: Post with title `"Next.js & React 19: <Modern & Fast>"` and excerpt `'Quotes' & "Double Quotes"`.
- **When**: Feed is rendered.
- **Then**:
  - Output contains `Next.js &amp; React 19: &lt;Modern &amp; Fast&gt;`.
  - Output contains `&apos;Quotes&apos; &amp; &quot;Double Quotes&quot;`.
  - Unescaped raw `&` or `<` do not appear inside title or description.

#### TC-FEED-6: Empty Feed Resilience
- **Given**: `db.post.findMany` resolves to `[]`.
- **When**: `getFeed()` is invoked.
- **Then**:
  - Status is 200.
  - Channel metadata is present.
  - Document contains 0 `<item>` tags.

---

## 9. Implementation Checklist for Worker

1. [ ] Check if `src/lib/site.ts` exists. If not, implement `getBaseUrl()` with fallback to `http://localhost:3000` and trailing slash removal.
2. [ ] Create directory `src/app/feed.xml/` and file `src/app/feed.xml/route.ts`.
3. [ ] Implement `GET` route handler according to Section 6.
4. [ ] Write Vitest test suite in `tests/seo.test.ts` (or test file) covering TC-FEED-1 through TC-FEED-6.
5. [ ] Run `npm run test` to verify 100% test pass.
6. [ ] Verify production build `npm run build` succeeds without TypeScript or bundling errors.
