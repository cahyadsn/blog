import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBaseUrl, getAbsoluteUrl } from "@/lib/site";
import robots from "@/app/robots";
import { GET as getSitemap } from "@/app/sitemap.xml/route";
import { GET as getFeed } from "@/app/feed.xml/route";
import { metadata as rootMetadata } from "@/app/layout";
import { generateMetadata as generatePostMetadata } from "@/app/posts/[slug]/page";
import RootOgImage, {
  size as rootOgSize,
  contentType as rootOgContentType,
  alt as rootOgAlt,
} from "@/app/opengraph-image";
import PostOgImage, {
  size as postOgSize,
  contentType as postOgContentType,
} from "@/app/posts/[slug]/opengraph-image";
import { PATCH as togglePublish } from "@/app/api/admin/posts/[id]/publish/route";
import { db } from "@/lib/db";

// Mock @/lib/db for isolated Route Handler and Component testing
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Milestone 1: SEO, Content Distribution & Social Cards Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // 1. Base Site URL Resolver (src/lib/site.ts)
  // =========================================================================
  describe("1. Base Site URL Resolution (src/lib/site.ts)", () => {
    it("should return default http://localhost:3000 when no env variables are set", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.SITE_URL;
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should resolve NEXT_PUBLIC_SITE_URL and strip single trailing slash", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com/";
      expect(getBaseUrl()).toBe("https://myblog.com");
    });

    it("should strip multiple trailing slashes from NEXT_PUBLIC_SITE_URL", () => {
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

    it("should handle empty or whitespace-only strings by falling back", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "   ";
      process.env.SITE_URL = "";
      expect(getBaseUrl()).toBe("http://localhost:3000");
    });

    it("should construct absolute URLs cleanly with getAbsoluteUrl", () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com/";
      expect(getAbsoluteUrl("/posts/my-slug")).toBe("https://myblog.com/posts/my-slug");
      expect(getAbsoluteUrl("posts/my-slug")).toBe("https://myblog.com/posts/my-slug");
      expect(getAbsoluteUrl("sitemap.xml")).toBe("https://myblog.com/sitemap.xml");
      expect(getAbsoluteUrl("")).toBe("https://myblog.com");
      expect(getAbsoluteUrl()).toBe("https://myblog.com");
    });
  });

  // =========================================================================
  // 2. Robots Configuration (src/app/robots.ts)
  // =========================================================================
  describe("2. Robots Configuration (src/app/robots.ts)", () => {
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

  // =========================================================================
  // 3. Dynamic XML Sitemap (src/app/sitemap.xml/route.ts)
  // =========================================================================
  describe("3. Dynamic XML Sitemap Route Handler (src/app/sitemap.xml/route.ts)", () => {
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
      expect(xml).toContain("<loc>https://myblog.com</loc>");
      expect(xml).toContain("<changefreq>daily</changefreq>");
      expect(xml).toContain("<priority>1.0</priority>");
      expect(xml).toContain("<loc>https://myblog.com/posts/artikel-satu</loc>");
      expect(xml).toContain("<lastmod>2026-11-01T10:00:00.000Z</lastmod>");
      expect(xml).toContain("<changefreq>weekly</changefreq>");
      expect(xml).toContain("<priority>0.7</priority>");
      expect(xml).toContain("<loc>https://myblog.com/posts/artikel-dua</loc>");
      expect(xml).toContain("<lastmod>2026-11-05T12:00:00.000Z</lastmod>");
    });

    it("should strictly query published posts (where published: true)", async () => {
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

  // =========================================================================
  // 4. Dynamic RSS 2.0 Feed (src/app/feed.xml/route.ts)
  // =========================================================================
  describe("4. Dynamic RSS 2.0 Feed Route Handler (src/app/feed.xml/route.ts)", () => {
    it("should return valid RSS 2.0 with status 200 and Content-Type application/xml", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://myblog.com";
      const mockPosts = [
        {
          title: "Artikel Pertama",
          slug: "artikel-pertama",
          excerpt: "Ringkasan artikel pertama yang menarik.",
          publishedAt: new Date("2026-11-08T09:00:00.000Z"),
        },
        {
          title: "Artikel Kedua",
          slug: "artikel-kedua",
          excerpt: "Ringkasan artikel kedua tentang Next.js 15.",
          publishedAt: new Date("2026-11-05T08:00:00.000Z"),
        },
      ];

      vi.mocked(db.post.findMany).mockResolvedValueOnce(mockPosts as any);

      const res = await getFeed();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("application/xml");

      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
      expect(xml).toContain("<title>Antigravity Multi-Agent Blog</title>");
      expect(xml).toContain("<link>https://myblog.com</link>");
      expect(xml).toContain("<language>id-ID</language>");
      expect(xml).toContain('<atom:link href="https://myblog.com/feed.xml" rel="self" type="application/rss+xml" />');
      expect(xml).toContain("<title>Artikel Pertama</title>");
      expect(xml).toContain("<link>https://myblog.com/posts/artikel-pertama</link>");
      expect(xml).toContain("<description>Ringkasan artikel pertama yang menarik.</description>");
      expect(xml).toContain("<guid isPermaLink=\"true\">https://myblog.com/posts/artikel-pertama</guid>");
      expect(xml).toContain(new Date("2026-11-08T09:00:00.000Z").toUTCString());
    });

    it("should query published posts ordered by publishedAt desc", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      await getFeed();
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          orderBy: { publishedAt: "desc" },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            publishedAt: true,
          },
        })
      );
    });

    it("should handle empty database gracefully without item entries", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const res = await getFeed();
      expect(res.status).toBe(200);
      const xml = await res.text();
      expect(xml).toContain("<channel>");
      expect(xml).toContain("</channel>");
      expect(xml).not.toContain("<item>");
    });

    it("should escape special characters in RSS titles and excerpts", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
      const mockPosts = [
        {
          title: "Tips & Tricks: <Next.js> \"15\" & 'React'",
          slug: "tips-and-tricks",
          excerpt: "Belajar & menguasai <framework> modern \"2026\"",
          publishedAt: new Date("2026-11-10T10:00:00.000Z"),
        },
      ];

      vi.mocked(db.post.findMany).mockResolvedValueOnce(mockPosts as any);

      const res = await getFeed();
      const xml = await res.text();
      expect(xml).toContain("<title>Tips &amp; Tricks: &lt;Next.js&gt; &quot;15&quot; &amp; &apos;React&apos;</title>");
      expect(xml).toContain("<description>Belajar &amp; menguasai &lt;framework&gt; modern &quot;2026&quot;</description>");
    });

    it("should return 500 when database throws an error during feed generation", async () => {
      vi.mocked(db.post.findMany).mockRejectedValueOnce(new Error("DB failure"));

      const res = await getFeed();
      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toContain("Failed to generate RSS feed");
    });
  });

  // =========================================================================
  // 5. Root Layout Metadata (src/app/layout.tsx)
  // =========================================================================
  describe("5. Root Layout Metadata (src/app/layout.tsx)", () => {
    it("should define valid metadataBase matching getBaseUrl()", () => {
      expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
      expect((rootMetadata.metadataBase as URL)?.origin).toBe(new URL(getBaseUrl()).origin);
    });

    it("should configure default openGraph metadata", () => {
      const og = rootMetadata.openGraph as Record<string, any>;
      expect(og).toBeDefined();
      expect(og?.siteName).toBe("Antigravity Multi-Agent Blog");
      expect(og?.locale).toBe("id_ID");
      expect(og?.type).toBe("website");
    });

    it("should configure twitter summary_large_image card", () => {
      const twitter = rootMetadata.twitter as Record<string, any>;
      expect(twitter).toBeDefined();
      expect(twitter?.card).toBe("summary_large_image");
    });

    it("should declare RSS feed alternate link", () => {
      expect(rootMetadata.alternates).toBeDefined();
      expect(rootMetadata.alternates?.types?.["application/rss+xml"]).toBe(
        `${getBaseUrl()}/feed.xml`
      );
    });
  });

  // =========================================================================
  // 6. Dynamic Post Metadata (src/app/posts/[slug]/page.tsx)
  // =========================================================================
  describe("6. Dynamic Post Metadata (src/app/posts/[slug]/page.tsx)", () => {
    it("should generate full article Open Graph & Twitter metadata for published post", async () => {
      const mockPost = {
        title: "Panduan Arsitektur Multi-Agent",
        slug: "panduan-arsitektur-multi-agent",
        excerpt: "Panduan lengkap merancang sistem multi-agent otonom.",
        coverImage: "https://example.com/cover.jpg",
        published: true,
        publishedAt: new Date("2026-11-09T08:00:00.000Z"),
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(mockPost as any);

      const meta = await generatePostMetadata({
        params: Promise.resolve({ slug: "panduan-arsitektur-multi-agent" }),
      });

      const og = meta.openGraph as Record<string, any>;
      const twitter = meta.twitter as Record<string, any>;

      expect(meta.title).toBe("Panduan Arsitektur Multi-Agent");
      expect(meta.description).toBe("Panduan lengkap merancang sistem multi-agent otonom.");
      expect(og?.type).toBe("article");
      expect(og?.publishedTime).toBe(mockPost.publishedAt.toISOString());
      expect(og?.authors).toContain("Antigravity Editorial Agent");
      expect(og?.images).toEqual([
        expect.objectContaining({
          url: "https://example.com/cover.jpg",
          width: 1200,
          height: 630,
          alt: "Panduan Arsitektur Multi-Agent",
        }),
      ]);
      expect(twitter?.card).toBe("summary_large_image");
      expect(twitter?.images).toEqual(["https://example.com/cover.jpg"]);
    });

    it("should fall back to dynamic opengraph-image when post has no coverImage", async () => {
      const mockPost = {
        title: "Artikel Tanpa Cover",
        slug: "artikel-tanpa-cover",
        excerpt: "Artikel tanpa gambar sampul.",
        coverImage: null,
        published: true,
        publishedAt: new Date("2026-11-09T08:00:00.000Z"),
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(mockPost as any);

      const meta = await generatePostMetadata({
        params: Promise.resolve({ slug: "artikel-tanpa-cover" }),
      });

      expect(meta.openGraph?.images).toEqual([
        expect.objectContaining({
          url: "/posts/artikel-tanpa-cover/opengraph-image",
          width: 1200,
          height: 630,
        }),
      ]);
      expect(meta.twitter?.images).toEqual(["/posts/artikel-tanpa-cover/opengraph-image"]);
    });

    it("should return fallback title for non-existent post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const meta = await generatePostMetadata({
        params: Promise.resolve({ slug: "slug-tidak-ada" }),
      });

      expect(meta.title).toBe("Artikel Tidak Ditemukan");
      expect(meta.openGraph).toBeUndefined();
    });

    it("should return fallback title for unpublished draft post", async () => {
      const draftPost = {
        title: "Draft Rahasia",
        slug: "draft-rahasia",
        excerpt: "Draft artikel yang belum dipublikasikan.",
        coverImage: null,
        published: false,
        publishedAt: new Date(),
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(draftPost as any);

      const meta = await generatePostMetadata({
        params: Promise.resolve({ slug: "draft-rahasia" }),
      });

      expect(meta.title).toBe("Artikel Tidak Ditemukan");
      expect(meta.openGraph).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. Dynamic Open Graph Preview Images (opengraph-image.tsx)
  // =========================================================================
  describe("7. Dynamic Open Graph Preview Images", () => {
    it("should export correct size, contentType, and alt for root OG image", () => {
      expect(rootOgSize).toEqual({ width: 1200, height: 630 });
      expect(rootOgContentType).toBe("image/png");
      expect(rootOgAlt).toBe("Antigravity Multi-Agent Blog");
    });

    it("should render root OG image as a Response with image/png content type", async () => {
      const response = await RootOgImage();
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should export correct size and contentType for post OG image", () => {
      expect(postOgSize).toEqual({ width: 1200, height: 630 });
      expect(postOgContentType).toBe("image/png");
    });

    it("should render post OG image for published post", async () => {
      const mockPost = {
        title: "Membangun Aplikasi Blog Modern dengan Arsitektur Multi-Agent",
        slug: "membangun-blog-modern-multi-agent",
        excerpt: "Artikel lengkap mengenai arsitektur Next.js dan Prisma.",
        coverImage: null,
        published: true,
        publishedAt: new Date("2026-11-01T10:00:00.000Z"),
        readingTime: 5,
        tags: [{ tag: { name: "Next.js" } }, { tag: { name: "Architecture" } }],
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(mockPost as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "membangun-blog-modern-multi-agent" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should render post OG image incorporating coverImage when present", async () => {
      const mockPost = {
        title: "Post with Cover",
        slug: "post-with-cover",
        excerpt: "Excerpt with cover image.",
        coverImage: "https://images.unsplash.com/photo-1",
        published: true,
        publishedAt: new Date("2026-11-01T10:00:00.000Z"),
        readingTime: 3,
        tags: [],
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(mockPost as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "post-with-cover" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should render fallback post OG image for non-existent or unpublished post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "non-existent-article-slug" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("content-type")).toContain("image/png");
    });
  });

  // =========================================================================
  // 8. Publish Toggle Zod v4 Fix (src/app/api/admin/posts/[id]/publish/route.ts)
  // =========================================================================
  describe("8. Publish Toggle API (Zod v4 compatibility)", () => {
    it("should toggle publish state successfully with valid boolean", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-1", published: false } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({
        id: "post-1",
        published: true,
        tags: [],
        _count: { comments: 0 },
      } as any);

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
        body: JSON.stringify({ published: "not_a_boolean" }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-1" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });
  });
});
