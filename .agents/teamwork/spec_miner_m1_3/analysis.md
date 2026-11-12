# Specification & Implementation Design: Open Graph, Twitter Card Metadata & Dynamic Social Preview Cards

**Working Directory**: `d:\c\blog\.agents\teamwork\spec_miner_m1_3`  
**Target Milestone**: Milestone 1 (SEO & Content Distribution)  
**Specification Author**: Spec Miner (Archetype: Specification Miner)  
**Reference Sources**: Next.js 15 App Router Metadata API, `PROJECT.md`, `ORIGINAL_REQUEST.md`, `prisma/schema.prisma`, `src/app/layout.tsx`, `src/app/posts/[slug]/page.tsx`

---

## 1. Executive Summary & Architecture Overview

In a modern Next.js 15 App Router web application, social discoverability and search engine optimization require three complementary layers:
1. **Global Root Metadata** (`src/app/layout.tsx`): Establishes `metadataBase` to resolve all relative URLs canonicalized against `getBaseUrl()`, defines default Open Graph (`website`) and Twitter (`summary_large_image`) cards, and advertises the dynamic RSS feed via `<link rel="alternate" type="application/rss+xml">`.
2. **Dynamic Route Metadata** (`src/app/posts/[slug]/page.tsx` via `generateMetadata`): Asynchronously resolves route parameters (`params: Promise<{ slug: string }>`), queries post details from SQLite via Prisma, handles missing/draft articles with fallback titles, and generates article-specific Open Graph tags (`type: "article"`, `publishedTime`, `authors`, `images`) and Twitter Cards.
3. **Dynamic Social Preview Cards** (`opengraph-image.tsx`): Utilizes Next.js `ImageResponse` from `next/og` (powered by Satori) to synthesize on-demand 1200x630 PNG preview images:
   - **Root Social Card** (`src/app/opengraph-image.tsx`): Renders high-impact blog branding, tagline, and tech stack chips.
   - **Post Detail Social Card** (`src/app/posts/[slug]/opengraph-image.tsx`): Renders article title, dynamic font scaling for long titles, reading time, author, date, and incorporates `coverImage` when available.
   - **Critical Runtime Constraint**: Explicitly avoid `export const runtime = 'edge'` because SQLite is accessed via Prisma Client, which requires Node.js filesystem APIs.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Metadata | Root Layout MetadataBase | Sets canonical base URL using `getBaseUrl()` for all relative URL resolution | `getBaseUrl()` from `@/lib/site` | `<base href="...">` & absolute URL resolution in OG/Twitter tags | Falls back to `http://localhost:3000` | `layout.tsx` spec & `PROJECT.md` |
| 2 | Metadata | Root Open Graph Website Card | Configures default OG tags (`og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:type`) | Static metadata object in `layout.tsx` | Standard `<meta property="og:*">` tags | N/A (Static default) | `PROJECT.md` & Next.js docs |
| 3 | Metadata | Root Twitter Card Summary Large Image | Configures global Twitter card (`summary_large_image`) for rich social embeds | `twitter: { card: "summary_large_image", ... }` | `<meta name="twitter:card" content="summary_large_image">` | N/A (Static default) | `ORIGINAL_REQUEST.md` R3 |
| 4 | Metadata | RSS Alternate Link Discovery | Exposes `/feed.xml` link in HTML `<head>` for automated feed readers | `alternates: { types: { "application/rss+xml": ... } }` | `<link rel="alternate" type="application/rss+xml" href="...">` | Valid string URL required | `PROJECT.md` & Dispatch Prompt |
| 5 | Metadata | Dynamic Post Metadata (`generateMetadata`) | Generates post-specific SEO metadata for `/posts/[slug]` | `{ params: Promise<{ slug: string }> }` | `Metadata` object with post title, excerpt, article OG, twitter | Returns `{ title: "Artikel Tidak Ditemukan" }` if post not found or unpublished | Next.js 15 App Router spec |
| 6 | Metadata | Article Open Graph Attributes | Injects `type: "article"`, `publishedTime`, `authors`, `images` into post page | Post record from `db.post.findUnique` | `<meta property="article:published_time">`, `<meta property="article:author">`, `og:image` | Fallback to dynamic OG image if `coverImage` is null | Dispatch Prompt & `PROJECT.md` |
| 7 | Dynamic Image | Root Social Preview Card (`app/opengraph-image.tsx`) | 1200x630 PNG card for homepage branding | Request to `/opengraph-image` | `ImageResponse` (PNG, 1200x630) | Deterministic static rendering, no external network needed | Next.js file-based metadata |
| 8 | Dynamic Image | Post Detail Social Preview Card (`posts/[slug]/opengraph-image.tsx`) | Dynamic 1200x630 PNG card with post title, reading time, author, and optional `coverImage` | `{ params: Promise<{ slug: string }> }` | `ImageResponse` (PNG, 1200x630) | Renders fallback "Artikel Tidak Ditemukan" card if post missing/unpublished | Next.js file-based metadata |
| 9 | Runtime | Node.js Runtime for SQLite Prisma | Omission of `runtime = 'edge'` in OG image routes to ensure compatibility with SQLite Prisma client | Node.js process environment | Proper DB access without Edge sandbox memory errors | Edge runtime triggers Prisma Client initialization failure | `PROJECT.md` & Prisma SQLite architecture |

---

## 3. Edge Cases & Handling Strategies

| # | Feature | Input / Scenario | Observed / Required Behavior | Mitigation / Implementation Strategy |
|---|---------|------------------|------------------------------|--------------------------------------|
| 1 | Post Dynamic Metadata | Slug does not exist in SQLite DB | Post query returns `null` | Return fallback `{ title: "Artikel Tidak Ditemukan" }` |
| 2 | Post Dynamic Metadata | Post exists but `published: false` (Draft) | Draft post accessed via URL | Return fallback `{ title: "Artikel Tidak Ditemukan" }` to prevent SEO indexing of drafts |
| 3 | Post Dynamic Metadata | Post has no `coverImage` (`null` or `""`) | `post.coverImage` is `null` (default in seed) | Fallback `images` to `[{ url: "/posts/" + slug + "/opengraph-image", width: 1200, height: 630, alt: post.title }]` |
| 4 | Post Dynamic Metadata | Next.js 15 async `params` | `params` passed as `Promise<{ slug: string }>` | Use `const { slug } = await params;` with defensive decoding `decodeURIComponent(slug)` |
| 5 | Post OG Image | Very long post title (e.g. > 70 characters) | Long title can overflow 630px height canvas | Apply dynamic font sizing: `post.title.length > 70 ? 38 : post.title.length > 40 ? 46 : 54` with line clamp |
| 6 | Post OG Image | Very long post excerpt (e.g. > 140 characters) | Excerpt crowds layout | Truncate excerpt: `post.excerpt.slice(0, 137) + "..."` |
| 7 | Post OG Image | Post has `coverImage` vs missing `coverImage` | `coverImage: null` vs `coverImage: "https://..."` | If present, render 340px right column card; if null, expand typography to full width |
| 8 | Post OG Image | Post not found or unpublished | Slug query yields `null` or `!post.published` | Return clean 1200x630 fallback card displaying "Artikel Tidak Ditemukan" |
| 9 | Dynamic OG Images | Edge runtime incompatibility | `export const runtime = 'edge'` | Strictly DO NOT export `runtime = 'edge'`; use default Node.js runtime for Prisma SQLite |
| 10 | Root Layout MetadataBase | `NEXT_PUBLIC_SITE_URL` has trailing slash | e.g. `"https://myblog.com/"` | `getBaseUrl()` strips trailing slash; `new URL(siteUrl)` constructs valid base |

---

## 4. Concrete Code Designs & Implementations

### 4.1. Root Layout Metadata: `src/app/layout.tsx`

#### Responsibilities:
- Import `getBaseUrl` from `@/lib/site`.
- Set `metadataBase: new URL(getBaseUrl())`.
- Configure `title` with default and template (`"%s | Antigravity Multi-Agent Blog"`).
- Configure default `openGraph` object (`title`, `description`, `url`, `siteName`, `locale: "id_ID"`, `type: "website"`).
- Configure `twitter` object (`card: "summary_large_image"`, `title`, `description`).
- Configure `alternates` with RSS XML link (`types: { "application/rss+xml": `${getBaseUrl()}/feed.xml` }`).

#### Code Implementation:
```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/blog/Navbar";
import { Footer } from "@/components/blog/Footer";
import { getBaseUrl } from "@/lib/site";

const siteUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Antigravity Multi-Agent Blog",
    template: "%s | Antigravity Multi-Agent Blog",
  },
  description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
  openGraph: {
    title: "Antigravity Multi-Agent Blog",
    description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
    url: siteUrl,
    siteName: "Antigravity Multi-Agent Blog",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Antigravity Multi-Agent Blog",
    description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
  },
  alternates: {
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 w-full py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

---

### 4.2. Dynamic Post Metadata: `src/app/posts/[slug]/page.tsx`

#### Responsibilities:
- Export `generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata>`.
- Await `params` in compliance with Next.js 15.
- Query post via `db.post.findUnique({ where: { slug } })` selecting only metadata fields.
- Fallback to `{ title: "Artikel Tidak Ditemukan" }` if not found or `!post.published`.
- Build Open Graph metadata with `type: "article"`, `publishedTime`, `authors`, and `images`.
- Build Twitter metadata with `card: "summary_large_image"` and `images`.
- Support `coverImage` when available, falling back to `/posts/${post.slug}/opengraph-image`.

#### Code Implementation:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "@/components/blog/CommentSection";
import { Calendar, Clock, ChevronLeft, User } from "lucide-react";

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
        </div>
      </header>

      {/* Konten Artikel Prose */}
      <div
        className="prose prose-indigo dark:prose-invert max-w-none text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Kolom Komentar */}
      <CommentSection postId={post.id} initialComments={post.comments} />
    </article>
  );
}
```

---

### 4.3. Homepage Dynamic Preview Card: `src/app/opengraph-image.tsx`

#### Responsibilities:
- Export `size = { width: 1200, height: 630 }`.
- Export `contentType = "image/png"`.
- Export `alt = "Antigravity Multi-Agent Blog"`.
- Uses `ImageResponse` from `next/og`.
- Does NOT export `runtime = 'edge'` (default Node.js runtime).
- Modern gradient visual presentation with brand badges and architecture chips.

#### Code Implementation:
```tsx
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = "Antigravity Multi-Agent Blog";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Top Header / Brand Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "9999px",
              padding: "8px 20px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🤖</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#a5b4fc",
                textTransform: "uppercase",
              }}
            >
              Antigravity Multi-Agent System
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "16px",
              color: "#94a3b8",
            }}
          >
            <span>v0.1.0 • Autonomous Architecture</span>
          </div>
        </div>

        {/* Center Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "960px",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Antigravity Multi-Agent Blog
          </h1>
          <p
            style={{
              fontSize: "26px",
              lineHeight: 1.4,
              color: "#cbd5e1",
              margin: 0,
              fontWeight: 400,
            }}
          >
            Aplikasi blog modern dengan ekosistem multi-agent mandiri: Desain, Basis Data, Backend, Frontend, Pengujian, dan DevOps.
          </p>
        </div>

        {/* Footer badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderTop: "1px solid rgba(148, 163, 184, 0.15)",
            paddingTop: "24px",
          }}
        >
          {["Next.js 15", "React 19", "Prisma SQLite", "Tailwind CSS", "Automated Agents"].map(
            (tech) => (
              <div
                key={tech}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "15px",
                  color: "#e2e8f0",
                }}
              >
                {tech}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
```

---

### 4.4. Post Detail Dynamic Preview Card: `src/app/posts/[slug]/opengraph-image.tsx`

#### Responsibilities:
- Export `size = { width: 1200, height: 630 }`.
- Export `contentType = "image/png"`.
- Default export `Image({ params }: { params: Promise<{ slug: string }> })`.
- Await `params` for Next.js 15.
- Query `db.post.findUnique({ where: { slug } })` with tags.
- Fallback card for missing or unpublished posts.
- Dynamic title font sizing for long titles (`> 70` chars vs `> 40` chars).
- Excerpt truncation to prevent vertical layout overflow.
- Incorporate `coverImage` when available in a stylish 340px right card column; expand typography to full width when `coverImage` is null/empty.
- Node.js runtime (no `export const runtime = 'edge'`).

#### Code Implementation:
```tsx
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
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
    },
  });

  if (!post || !post.published) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
            color: "#ffffff",
            fontFamily: "sans-serif",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "20px",
              color: "#a5b4fc",
              marginBottom: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Antigravity Multi-Agent Blog
          </div>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#f87171",
              margin: "0 0 16px 0",
            }}
          >
            Artikel Tidak Ditemukan
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              maxWidth: "600px",
              margin: 0,
            }}
          >
            Artikel yang Anda cari tidak tersedia atau belum dipublikasikan.
          </p>
        </div>
      ),
      { ...size }
    );
  }

  // Format date
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate dynamic font size for title
  const titleFontSize = post.title.length > 70 ? 38 : post.title.length > 40 ? 46 : 54;

  const primaryTag = post.tags[0]?.tag.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: "linear-gradient(135deg, #090d16 0%, #131b2e 50%, #1e1b4b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "50px 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left Column: Post Content & Metadata */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            height: "100%",
          }}
        >
          {/* Header row: Branding & Primary Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#a5b4fc",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <span>🤖</span>
              <span>Antigravity Blog</span>
            </div>

            {primaryTag ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "9999px",
                  padding: "6px 14px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#e2e8f0",
                }}
              >
                #{primaryTag}
              </div>
            ) : null}
          </div>

          {/* Title and Excerpt */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <h1
              style={{
                fontSize: `${titleFontSize}px`,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {post.title}
            </h1>

            {post.excerpt ? (
              <p
                style={{
                  fontSize: "20px",
                  lineHeight: 1.4,
                  color: "#94a3b8",
                  margin: 0,
                  maxWidth: post.coverImage ? "680px" : "960px",
                }}
              >
                {post.excerpt.length > 140
                  ? post.excerpt.slice(0, 137) + "..."
                  : post.excerpt}
              </p>
            ) : null}
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: "15px",
              color: "#94a3b8",
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              paddingTop: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
              <span>✍️</span>
              <span style={{ fontWeight: 600 }}>Antigravity Editorial</span>
            </div>
            <span>•</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📅</span>
              <span>{formattedDate}</span>
            </div>
            <span>•</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⏱</span>
              <span>{post.readingTime} menit baca</span>
            </div>
          </div>
        </div>

        {/* Right Column: Cover Image (if available) */}
        {post.coverImage ? (
          <div
            style={{
              display: "flex",
              width: "340px",
              height: "100%",
              marginLeft: "40px",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
    }
  );
}
```

---

## 5. Vitest Testing Strategy & Test Assertions

To satisfy Acceptance Criteria R3 & R4, the test suite (in `tests/seo.test.ts` or `tests/metadata.test.ts`) should include concrete unit and integration assertions:

### 5.1. Root Layout Metadata Tests
```ts
import { describe, it, expect } from "vitest";
import { metadata } from "@/app/layout";
import { getBaseUrl } from "@/lib/site";

describe("Root Layout Metadata", () => {
  it("should define valid metadataBase matching getBaseUrl()", () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(metadata.metadataBase?.origin).toBe(new URL(getBaseUrl()).origin);
  });

  it("should configure default openGraph metadata", () => {
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.siteName).toBe("Antigravity Multi-Agent Blog");
    expect(metadata.openGraph?.locale).toBe("id_ID");
    expect(metadata.openGraph?.type).toBe("website");
  });

  it("should configure twitter summary_large_image card", () => {
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("should declare RSS feed alternate link", () => {
    expect(metadata.alternates).toBeDefined();
    expect(metadata.alternates?.types?.["application/rss+xml"]).toBe(
      `${getBaseUrl()}/feed.xml`
    );
  });
});
```

### 5.2. Post Dynamic Metadata Tests
```ts
import { describe, it, expect } from "vitest";
import { generateMetadata } from "@/app/posts/[slug]/page";

describe("Post Dynamic generateMetadata", () => {
  it("should generate full article Open Graph & Twitter metadata for published post", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "membangun-blog-modern-multi-agent" }),
    });

    expect(meta.title).toBe(
      "Membangun Aplikasi Blog Modern dengan Arsitektur Multi-Agent"
    );
    expect(meta.description).toBeDefined();
    expect(meta.openGraph?.type).toBe("article");
    expect(meta.openGraph?.publishedTime).toBeDefined();
    expect(meta.openGraph?.authors).toContain("Antigravity Editorial Agent");
    expect(meta.openGraph?.images).toBeDefined();
    expect(meta.twitter?.card).toBe("summary_large_image");
  });

  it("should return fallback title for non-existent post", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "non-existent-article-slug" }),
    });

    expect(meta.title).toBe("Artikel Tidak Ditemukan");
  });
});
```

### 5.3. Dynamic OG Preview Cards Tests
```ts
import { describe, it, expect } from "vitest";
import RootOgImage, { size as rootSize, contentType as rootContentType } from "@/app/opengraph-image";
import PostOgImage, { size as postSize, contentType as postContentType } from "@/app/posts/[slug]/opengraph-image";

describe("Open Graph Dynamic Preview Images", () => {
  it("should export correct size and contentType for root OG image", () => {
    expect(rootSize).toEqual({ width: 1200, height: 630 });
    expect(rootContentType).toBe("image/png");
  });

  it("should render root OG image as ImageResponse", async () => {
    const response = await RootOgImage();
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toContain("image/png");
  });

  it("should export correct size and contentType for post OG image", () => {
    expect(postSize).toEqual({ width: 1200, height: 630 });
    expect(postContentType).toBe("image/png");
  });

  it("should render post OG image for existing published post", async () => {
    const response = await PostOgImage({
      params: Promise.resolve({ slug: "membangun-blog-modern-multi-agent" }),
    });
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toContain("image/png");
  });

  it("should render fallback post OG image for non-existent post", async () => {
    const response = await PostOgImage({
      params: Promise.resolve({ slug: "non-existent-article-slug" }),
    });
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toContain("image/png");
  });
});
```

---

## 6. Implementation Checklist for Worker Agent

- [ ] Ensure `src/lib/site.ts` with `getBaseUrl()` is implemented or referenced.
- [ ] Update `src/app/layout.tsx` with `metadataBase`, default `openGraph`, `twitter`, and `alternates`.
- [ ] Update `src/app/posts/[slug]/page.tsx` with exported `generateMetadata` function.
- [ ] Create `src/app/opengraph-image.tsx` with 1200x630 `ImageResponse` (no edge runtime).
- [ ] Create `src/app/posts/[slug]/opengraph-image.tsx` with dynamic `ImageResponse`, fallback handling, dynamic title scaling, and optional `coverImage` support (no edge runtime).
- [ ] Verify test suite passes via `npm run test`.
- [ ] Verify production build compiles without errors via `npm run build`.
