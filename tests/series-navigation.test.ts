import { describe, it, expect } from "vitest";
import {
  calculateSeriesNavigation,
  type SeriesNavigationInput,
} from "@/lib/series-nav";

describe("Series Navigation Logic Suite (Milestone 3)", () => {
  const sampleSeries: SeriesNavigationInput = {
    id: "series-nextjs-15",
    title: "Mastering Next.js 15",
    slug: "mastering-nextjs-15",
    description: "Panduan lengkap Next.js 15 dari arsitektur hingga deployment.",
    posts: [
      {
        id: "post-1",
        title: "Part 1: App Router & Server Components",
        slug: "part-1-app-router",
        orderInSeries: 1,
        published: true,
      },
      {
        id: "post-2",
        title: "Part 2: Server Actions & Mutasi Data",
        slug: "part-2-server-actions",
        orderInSeries: 2,
        published: true,
      },
      {
        id: "post-3",
        title: "Part 3: Streaming, Suspense, & Caching",
        slug: "part-3-streaming-caching",
        orderInSeries: 3,
        published: true,
      },
      {
        id: "post-4",
        title: "Part 4: Deployment & Observability",
        slug: "part-4-deployment-observability",
        orderInSeries: 4,
        published: true,
      },
    ],
  };

  // ==========================================
  // Core Position Tests (Middle, First, Last, Single)
  // ==========================================
  it("should correctly resolve previous and next posts for a middle post", () => {
    // Current post is Part 2
    const result = calculateSeriesNavigation(sampleSeries, { id: "post-2" });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.series.id).toBe("series-nextjs-15");
      expect(result.series.slug).toBe("mastering-nextjs-15");
      expect(result.totalParts).toBe(4);
      expect(result.currentOrder).toBe(2);

      // Previous post must be Part 1
      expect(result.previousPost).toEqual({
        id: "post-1",
        title: "Part 1: App Router & Server Components",
        slug: "part-1-app-router",
      });

      // Next post must be Part 3
      expect(result.nextPost).toEqual({
        id: "post-3",
        title: "Part 3: Streaming, Suspense, & Caching",
        slug: "part-3-streaming-caching",
      });

      // Active state verification
      expect(result.parts[1].isActive).toBe(true);
      expect(result.parts[0].isActive).toBe(false);
      expect(result.parts[2].isActive).toBe(false);
      expect(result.parts[3].isActive).toBe(false);
    }
  });

  it("should return previous as null and valid next post for the first post in series", () => {
    // Current post is Part 1
    const result = calculateSeriesNavigation(sampleSeries, { slug: "part-1-app-router" });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.currentOrder).toBe(1);
      expect(result.previousPost).toBeNull();
      expect(result.nextPost).toEqual({
        id: "post-2",
        title: "Part 2: Server Actions & Mutasi Data",
        slug: "part-2-server-actions",
      });
      expect(result.parts[0].isActive).toBe(true);
    }
  });

  it("should return valid previous post and next as null for the last post in series", () => {
    // Current post is Part 4
    const result = calculateSeriesNavigation(sampleSeries, { id: "post-4" });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.currentOrder).toBe(4);
      expect(result.previousPost).toEqual({
        id: "post-3",
        title: "Part 3: Streaming, Suspense, & Caching",
        slug: "part-3-streaming-caching",
      });
      expect(result.nextPost).toBeNull();
      expect(result.parts[3].isActive).toBe(true);
    }
  });

  it("should return both previous and next as null for a single-post series", () => {
    const singleSeries: SeriesNavigationInput = {
      id: "series-single",
      title: "Seri Tunggal",
      slug: "seri-tunggal",
      posts: [
        {
          id: "post-single-1",
          title: "Satu-satunya Artikel Seri",
          slug: "satu-satunya-artikel",
          orderInSeries: 1,
          published: true,
        },
      ],
    };

    const result = calculateSeriesNavigation(singleSeries, { id: "post-single-1" });

    expect(result).not.toBeNull();
    if (result) {
      expect(result.totalParts).toBe(1);
      expect(result.currentOrder).toBe(1);
      expect(result.previousPost).toBeNull();
      expect(result.nextPost).toBeNull();
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0].isActive).toBe(true);
    }
  });

  // ==========================================
  // Drafts & Unpublished Filtering
  // ==========================================
  it("should skip draft/unpublished sibling posts and link strictly between published posts", () => {
    const seriesWithDrafts: SeriesNavigationInput = {
      id: "series-with-drafts",
      title: "Seri Dengan Draf",
      slug: "seri-dengan-draf",
      posts: [
        {
          id: "post-pub-1",
          title: "Artikel Terbit 1",
          slug: "artikel-terbit-1",
          orderInSeries: 1,
          published: true,
        },
        {
          id: "post-draft-2",
          title: "Artikel Draf Belum Terbit (2)",
          slug: "artikel-draft-2",
          orderInSeries: 2,
          published: false, // DRAFT
        },
        {
          id: "post-draft-3",
          title: "Artikel Draf Belum Terbit (3)",
          slug: "artikel-draft-3",
          orderInSeries: 3,
          published: false, // DRAFT
        },
        {
          id: "post-pub-4",
          title: "Artikel Terbit 4",
          slug: "artikel-terbit-4",
          orderInSeries: 4,
          published: true,
        },
      ],
    };

    // Navigating from Part 1: next should skip draft 2 and 3, jumping straight to Part 4
    const navFromPart1 = calculateSeriesNavigation(seriesWithDrafts, { id: "post-pub-1" });
    expect(navFromPart1).not.toBeNull();
    if (navFromPart1) {
      expect(navFromPart1.totalParts).toBe(2); // Only 2 published
      expect(navFromPart1.previousPost).toBeNull();
      expect(navFromPart1.nextPost).toEqual({
        id: "post-pub-4",
        title: "Artikel Terbit 4",
        slug: "artikel-terbit-4",
      });
    }

    // Navigating from Part 4: previous should skip draft 3 and 2, jumping back to Part 1
    const navFromPart4 = calculateSeriesNavigation(seriesWithDrafts, { id: "post-pub-4" });
    expect(navFromPart4).not.toBeNull();
    if (navFromPart4) {
      expect(navFromPart4.previousPost).toEqual({
        id: "post-pub-1",
        title: "Artikel Terbit 1",
        slug: "artikel-terbit-1",
      });
      expect(navFromPart4.nextPost).toBeNull();
    }
  });

  // ==========================================
  // Non-consecutive orderInSeries numbers
  // ==========================================
  it("should handle non-consecutive orderInSeries numbers correctly by sequence order", () => {
    const nonConsecutiveSeries: SeriesNavigationInput = {
      id: "series-sparse",
      title: "Seri Nomor Sparse",
      slug: "seri-nomor-sparse",
      posts: [
        {
          id: "post-10",
          title: "Modul Dasar (Urutan 10)",
          slug: "modul-dasar",
          orderInSeries: 10,
          published: true,
        },
        {
          id: "post-25",
          title: "Modul Menengah (Urutan 25)",
          slug: "modul-menengah",
          orderInSeries: 25,
          published: true,
        },
        {
          id: "post-40",
          title: "Modul Mahir (Urutan 40)",
          slug: "modul-mahir",
          orderInSeries: 40,
          published: true,
        },
      ],
    };

    // Query for middle item (order 25)
    const result = calculateSeriesNavigation(nonConsecutiveSeries, { id: "post-25" });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.currentOrder).toBe(25);
      expect(result.previousPost).toEqual({
        id: "post-10",
        title: "Modul Dasar (Urutan 10)",
        slug: "modul-dasar",
      });
      expect(result.nextPost).toEqual({
        id: "post-40",
        title: "Modul Mahir (Urutan 40)",
        slug: "modul-mahir",
      });
    }
  });

  it("should sort posts by orderInSeries ascending even if provided out of order", () => {
    const unorderedSeries: SeriesNavigationInput = {
      id: "series-unordered",
      title: "Seri Acak",
      slug: "seri-acak",
      posts: [
        {
          id: "post-c",
          title: "Bagian Tiga",
          slug: "bagian-tiga",
          orderInSeries: 3,
          published: true,
        },
        {
          id: "post-a",
          title: "Bagian Satu",
          slug: "bagian-satu",
          orderInSeries: 1,
          published: true,
        },
        {
          id: "post-b",
          title: "Bagian Dua",
          slug: "bagian-dua",
          orderInSeries: 2,
          published: true,
        },
      ],
    };

    const result = calculateSeriesNavigation(unorderedSeries, { slug: "bagian-dua" });
    expect(result).not.toBeNull();
    if (result) {
      expect(result.previousPost?.slug).toBe("bagian-satu");
      expect(result.nextPost?.slug).toBe("bagian-tiga");
      expect(result.parts.map((p) => p.slug)).toEqual([
        "bagian-satu",
        "bagian-dua",
        "bagian-tiga",
      ]);
    }
  });

  // ==========================================
  // Null & Edge Case Defenses
  // ==========================================
  it("should return null when series is null, undefined, or empty", () => {
    expect(calculateSeriesNavigation(null, { id: "post-1" })).toBeNull();
    expect(calculateSeriesNavigation(undefined, { id: "post-1" })).toBeNull();
    expect(
      calculateSeriesNavigation(
        { id: "ser-empty", title: "Empty", slug: "empty", posts: [] },
        { id: "post-1" }
      )
    ).toBeNull();
  });

  it("should return null when currentPost is null, undefined, or not in the series", () => {
    expect(calculateSeriesNavigation(sampleSeries, null)).toBeNull();
    expect(calculateSeriesNavigation(sampleSeries, undefined)).toBeNull();
    expect(calculateSeriesNavigation(sampleSeries, { id: "non-existent-id" })).toBeNull();
    expect(calculateSeriesNavigation(sampleSeries, { slug: "unknown-slug" })).toBeNull();
  });

  it("should return null when all posts in series are drafts", () => {
    const allDraftsSeries: SeriesNavigationInput = {
      id: "series-all-drafts",
      title: "Seri Semua Draf",
      slug: "seri-semua-draf",
      posts: [
        {
          id: "draft-1",
          title: "Draf 1",
          slug: "draf-1",
          orderInSeries: 1,
          published: false,
        },
        {
          id: "draft-2",
          title: "Draf 2",
          slug: "draf-2",
          orderInSeries: 2,
          published: false,
        },
      ],
    };

    expect(calculateSeriesNavigation(allDraftsSeries, { id: "draft-1" })).toBeNull();
  });

  it("should accept targetPost as a plain string identifier matching id or slug", () => {
    const byId = calculateSeriesNavigation(sampleSeries, "post-2");
    expect(byId).not.toBeNull();
    expect(byId?.currentOrder).toBe(2);

    const bySlug = calculateSeriesNavigation(sampleSeries, "part-3-streaming-caching");
    expect(bySlug).not.toBeNull();
    expect(bySlug?.currentOrder).toBe(3);
  });

  it("should fallback gracefully when orderInSeries is missing or null", () => {
    const unnumberedSeries: SeriesNavigationInput = {
      id: "series-unnumbered",
      title: "Seri Tanpa Nomor Urut",
      slug: "seri-tanpa-nomor-urut",
      posts: [
        {
          id: "post-alpha",
          title: "Artikel Alpha",
          slug: "artikel-alpha",
          orderInSeries: null,
          published: true,
          publishedAt: new Date("2026-01-01"),
        },
        {
          id: "post-beta",
          title: "Artikel Beta",
          slug: "artikel-beta",
          orderInSeries: null,
          published: true,
          publishedAt: new Date("2026-01-02"),
        },
      ],
    };

    const result = calculateSeriesNavigation(unnumberedSeries, "post-alpha");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.parts[0].orderInSeries).toBe(1);
      expect(result.parts[1].orderInSeries).toBe(2);
      expect(result.nextPost?.id).toBe("post-beta");
    }
  });
});
