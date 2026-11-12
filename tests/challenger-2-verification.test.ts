import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { metadata as rootMetadata } from "@/app/layout";
import { generateMetadata } from "@/app/posts/[slug]/page";
import RootOgImage, {
  size as rootSize,
  contentType as rootContentType,
} from "@/app/opengraph-image";
import PostOgImage, {
  size as postSize,
  contentType as postContentType,
} from "@/app/posts/[slug]/opengraph-image";
import { getBaseUrl } from "@/lib/site";
import { db } from "@/lib/db";
import * as rootOgModule from "@/app/opengraph-image";
import * as postOgModule from "@/app/posts/[slug]/opengraph-image";

vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Challenger 2 Empirical Verification Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. Root Layout Metadata (src/app/layout.tsx)", () => {
    it("should have metadataBase as a valid URL matching getBaseUrl()", () => {
      expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
      const expectedOrigin = new URL(getBaseUrl()).origin;
      expect((rootMetadata.metadataBase as URL).origin).toBe(expectedOrigin);
    });

    it("should verify openGraph properties", () => {
      const og = rootMetadata.openGraph as Record<string, any>;
      expect(og).toBeDefined();
      expect(og.title).toBe("Antigravity Multi-Agent Blog");
      expect(og.description).toContain("multi-agent");
      expect(og.url).toBe(getBaseUrl());
      expect(og.siteName).toBe("Antigravity Multi-Agent Blog");
      expect(og.locale).toBe("id_ID");
      expect(og.type).toBe("website");
    });

    it("should verify twitter card properties", () => {
      const twitter = rootMetadata.twitter as Record<string, any>;
      expect(twitter).toBeDefined();
      expect(twitter.card).toBe("summary_large_image");
      expect(twitter.title).toBe("Antigravity Multi-Agent Blog");
      expect(twitter.description).toContain("multi-agent");
    });

    it("should verify RSS alternates link", () => {
      expect(rootMetadata.alternates).toBeDefined();
      expect(rootMetadata.alternates?.types?.["application/rss+xml"]).toBe(
        `${getBaseUrl()}/feed.xml`
      );
    });
  });

  describe("2. Dynamic Post Metadata (src/app/posts/[slug]/page.tsx)", () => {
    const publishedPost = {
      id: "post-123",
      title: "Membangun Sistem Multi-Agent",
      slug: "membangun-sistem-multi-agent",
      excerpt: "Panduan lengkap merancang multi-agent modern.",
      coverImage: "https://example.com/cover.webp",
      published: true,
      publishedAt: new Date("2026-11-10T12:00:00.000Z"),
    };

    it("should generate full article metadata for valid published post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(publishedPost as any);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "membangun-sistem-multi-agent" }),
      });

      expect(metadata.title).toBe("Membangun Sistem Multi-Agent");
      expect(metadata.description).toBe(publishedPost.excerpt);

      const og = metadata.openGraph as Record<string, any>;
      expect(og).toBeDefined();
      expect(og.title).toBe("Membangun Sistem Multi-Agent");
      expect(og.description).toBe(publishedPost.excerpt);
      expect(og.type).toBe("article");
      expect(og.publishedTime).toBe(publishedPost.publishedAt.toISOString());
      expect(og.authors).toContain("Antigravity Editorial Agent");
      expect(og.url).toBe("/posts/membangun-sistem-multi-agent");
      expect(og.images).toEqual([
        expect.objectContaining({
          url: "https://example.com/cover.webp",
          width: 1200,
          height: 630,
          alt: "Membangun Sistem Multi-Agent",
        }),
      ]);

      const twitter = metadata.twitter as Record<string, any>;
      expect(twitter).toBeDefined();
      expect(twitter.card).toBe("summary_large_image");
      expect(twitter.title).toBe("Membangun Sistem Multi-Agent");
      expect(twitter.description).toBe(publishedPost.excerpt);
      expect(twitter.images).toEqual(["https://example.com/cover.webp"]);
    });

    it("should fall back to dynamic OG preview image when coverImage is null", async () => {
      const postWithoutCover = {
        ...publishedPost,
        slug: "post-tanpa-cover",
        coverImage: null,
      };
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(postWithoutCover as any);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "post-tanpa-cover" }),
      });

      const og = metadata.openGraph as Record<string, any>;
      expect(og.images).toEqual([
        expect.objectContaining({
          url: "/posts/post-tanpa-cover/opengraph-image",
          width: 1200,
          height: 630,
        }),
      ]);
      expect(metadata.twitter?.images).toEqual([
        "/posts/post-tanpa-cover/opengraph-image",
      ]);
    });

    it("should return fallback title when post does not exist", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "nonexistent-slug" }),
      });

      expect(metadata).toEqual({
        title: "Artikel Tidak Ditemukan",
      });
      expect(metadata.openGraph).toBeUndefined();
      expect(metadata.twitter).toBeUndefined();
    });

    it("should return fallback title when post is unpublished draft", async () => {
      const draftPost = {
        ...publishedPost,
        slug: "draft-secret-slug",
        published: false,
      };
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(draftPost as any);

      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: "draft-secret-slug" }),
      });

      expect(metadata).toEqual({
        title: "Artikel Tidak Ditemukan",
      });
      expect(metadata.openGraph).toBeUndefined();
      expect(metadata.twitter).toBeUndefined();
    });
  });

  describe("3. Dynamic OG Preview Images (opengraph-image.tsx)", () => {
    it("should verify root OG image exports size (1200x630) and contentType (image/png)", () => {
      expect(rootSize).toEqual({ width: 1200, height: 630 });
      expect(rootContentType).toBe("image/png");
    });

    it("should verify post OG image exports size (1200x630) and contentType (image/png)", () => {
      expect(postSize).toEqual({ width: 1200, height: 630 });
      expect(postContentType).toBe("image/png");
    });

    it("should verify default Node.js runtime (no edge runtime crash)", () => {
      // Check that neither module exports runtime = 'edge'
      expect((rootOgModule as any).runtime).toBeUndefined();
      expect((postOgModule as any).runtime).toBeUndefined();
    });

    it("should execute root OG image generation and return Response with status 200", async () => {
      const response = await RootOgImage();
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should execute post OG image generation for published post and return Response with status 200", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({
        id: "p1",
        title: "Panduan Antigravity Multi-Agent Blog",
        slug: "panduan-antigravity",
        excerpt: "Belajar arsitektur modern.",
        published: true,
        publishedAt: new Date("2026-11-10T00:00:00.000Z"),
        readingTime: 4,
        coverImage: null,
        tags: [{ tag: { name: "Agent" } }],
      } as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "panduan-antigravity" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should handle post OG image with custom coverImage without error", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({
        id: "p2",
        title: "Post with Image",
        slug: "post-with-img",
        excerpt: "Excerpt here.",
        published: true,
        publishedAt: new Date("2026-11-10T00:00:00.000Z"),
        readingTime: 2,
        coverImage: "https://images.unsplash.com/photo-test",
        tags: [],
      } as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "post-with-img" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should handle post OG image dynamic title scaling for long titles", async () => {
      const longTitle = "A".repeat(80);
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({
        id: "p3",
        title: longTitle,
        slug: "long-title-post",
        excerpt: "B".repeat(200),
        published: true,
        publishedAt: new Date("2026-11-10T00:00:00.000Z"),
        readingTime: 10,
        coverImage: null,
        tags: [],
      } as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "long-title-post" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
    });

    it("should return fallback OG image with status 200 for nonexistent post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "not-found-slug" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    });

    it("should return fallback OG image with status 200 for unpublished draft post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({
        id: "p4",
        title: "Draft Title",
        slug: "draft-slug",
        published: false,
        publishedAt: new Date(),
        tags: [],
      } as any);

      const response = await PostOgImage({
        params: Promise.resolve({ slug: "draft-slug" }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
    });
  });
});
