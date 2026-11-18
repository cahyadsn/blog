import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";

describe("Series & Collections SQLite Integration Suite (Real DB & Cascade)", () => {
  const RUN_ID = Date.now();
  const TEST_PREFIX = `test-series-${RUN_ID}`;

  const makeSlug = (suffix: string) => `${TEST_PREFIX}-${suffix}`;

  beforeAll(async () => {
    // Clean up any test records with test prefix
    await db.post.deleteMany({
      where: { slug: { startsWith: "test-series-" } },
    });
    await db.series.deleteMany({
      where: { slug: { startsWith: "test-series-" } },
    });
  });

  afterAll(async () => {
    // Complete teardown cleanup
    await db.post.deleteMany({
      where: { slug: { startsWith: "test-series-" } },
    });
    await db.series.deleteMany({
      where: { slug: { startsWith: "test-series-" } },
    });
  });

  it("INT-SER-1: should persist Series model in SQLite with all fields and auto-generated timestamps", async () => {
    const slug = makeSlug("prisma-series-foundation");
    const series = await db.series.create({
      data: {
        title: "Koleksi Panduan Sistem Terdistribusi",
        slug,
        description: "Panduan komprehensif konsep dan arsitektur sistem terdistribusi.",
        coverImage: "/uploads/series-cover-test.png",
      },
    });

    expect(series.id).toBeDefined();
    expect(series.slug).toBe(slug);
    expect(series.title).toBe("Koleksi Panduan Sistem Terdistribusi");
    expect(series.description).toBe("Panduan komprehensif konsep dan arsitektur sistem terdistribusi.");
    expect(series.coverImage).toBe("/uploads/series-cover-test.png");
    expect(series.createdAt).toBeInstanceOf(Date);
    expect(series.updatedAt).toBeInstanceOf(Date);

    // Verify direct retrieval from SQLite
    const found = await db.series.findUnique({
      where: { id: series.id },
    });
    expect(found).not.toBeNull();
    expect(found?.slug).toBe(slug);
  });

  it("INT-SER-2: should connect Post to Series with seriesId and orderInSeries", async () => {
    const seriesSlug = makeSlug("series-for-posts");
    const postSlug1 = makeSlug("post-part-1");
    const postSlug2 = makeSlug("post-part-2");

    const series = await db.series.create({
      data: {
        title: "Seri Pemrograman Berorientasi Objek",
        slug: seriesSlug,
      },
    });

    const post1 = await db.post.create({
      data: {
        title: "Part 1: Encapsulation & Abstraction",
        slug: postSlug1,
        excerpt: "Ringkasan konsep enkapsulasi dan abstraksi dalam OOP modern.",
        content: "Konten lengkap artikel OOP part 1 dengan panjang memadai.",
        published: true,
        seriesId: series.id,
        orderInSeries: 1,
      },
    });

    const post2 = await db.post.create({
      data: {
        title: "Part 2: Inheritance & Polymorphism",
        slug: postSlug2,
        excerpt: "Ringkasan konsep pewarisan dan polimorfisme dalam OOP modern.",
        content: "Konten lengkap artikel OOP part 2 dengan panjang memadai.",
        published: true,
        seriesId: series.id,
        orderInSeries: 2,
      },
    });

    expect(post1.seriesId).toBe(series.id);
    expect(post1.orderInSeries).toBe(1);
    expect(post2.seriesId).toBe(series.id);
    expect(post2.orderInSeries).toBe(2);

    // Verify retrieval with series relation
    const foundPost = await db.post.findUnique({
      where: { id: post1.id },
      include: { series: true },
    });
    expect(foundPost?.series).not.toBeNull();
    expect(foundPost?.series?.id).toBe(series.id);
    expect(foundPost?.series?.slug).toBe(seriesSlug);

    // Verify retrieval from series side with ordered posts
    const foundSeries = await db.series.findUnique({
      where: { id: series.id },
      include: {
        posts: {
          orderBy: { orderInSeries: "asc" },
        },
      },
    });
    expect(foundSeries?.posts).toHaveLength(2);
    expect(foundSeries?.posts[0].id).toBe(post1.id);
    expect(foundSeries?.posts[1].id).toBe(post2.id);
  });

  it("INT-SER-3: should enforce onDelete: SetNull cascade detachment (deleting series must NOT delete posts)", async () => {
    const seriesSlug = makeSlug("series-cascade-detach");
    const postSlug = makeSlug("post-preserve-on-delete");

    // 1. Create series
    const series = await db.series.create({
      data: {
        title: "Seri yang Akan Dihapus",
        slug: seriesSlug,
      },
    });

    // 2. Create post attached to series
    const post = await db.post.create({
      data: {
        title: "Artikel Abadi Tetap Ada",
        slug: postSlug,
        excerpt: "Artikel ini tidak boleh terhapus saat serinya dihapus oleh admin.",
        content: "Konten artikel yang membuktikan keandalan cascade SetNull pada relasi series.",
        published: true,
        seriesId: series.id,
        orderInSeries: 1,
      },
    });

    expect(post.seriesId).toBe(series.id);

    // 3. Delete the series
    await db.series.delete({
      where: { id: series.id },
    });

    // 4. Verify series is gone from SQLite
    const checkSeries = await db.series.findUnique({
      where: { id: series.id },
    });
    expect(checkSeries).toBeNull();

    // 5. Verify post STILL EXISTS in SQLite, but its seriesId is set to null
    const checkPost = await db.post.findUnique({
      where: { id: post.id },
    });
    expect(checkPost).not.toBeNull();
    expect(checkPost?.id).toBe(post.id);
    expect(checkPost?.seriesId).toBeNull();
  });

  it("INT-SER-4: should enforce unique slug constraint on Series model in SQLite", async () => {
    const duplicateSlug = makeSlug("unique-series-slug");

    await db.series.create({
      data: {
        title: "Seri Asli",
        slug: duplicateSlug,
      },
    });

    // Attempting to create another series with identical slug must throw Prisma unique constraint violation
    await expect(
      db.series.create({
        data: {
          title: "Seri Duplikat yang Mencuri Slug",
          slug: duplicateSlug,
        },
      })
    ).rejects.toThrow();
  });

  it("INT-SER-5: should exclude draft posts when querying series published posts roadmap", async () => {
    const seriesSlug = makeSlug("series-filter-drafts");
    const pubSlug = makeSlug("post-filter-published");
    const draftSlug = makeSlug("post-filter-draft");

    const series = await db.series.create({
      data: {
        title: "Seri Kurikulum Terbit & Draf",
        slug: seriesSlug,
      },
    });

    await db.post.create({
      data: {
        title: "Artikel Terbit Publik",
        slug: pubSlug,
        excerpt: "Artikel yang sudah dipublikasikan kepada pembaca.",
        content: "Konten artikel terbit dalam seri kurikulum.",
        published: true,
        seriesId: series.id,
        orderInSeries: 1,
      },
    });

    await db.post.create({
      data: {
        title: "Artikel Draf Dalam Penulisan",
        slug: draftSlug,
        excerpt: "Artikel draf yang belum siap untuk konsumsi publik.",
        content: "Konten draf yang belum terpublikasi dalam seri kurikulum.",
        published: false, // DRAFT
        seriesId: series.id,
        orderInSeries: 2,
      },
    });

    // Query series with published posts filter
    const seriesWithPubPosts = await db.series.findUnique({
      where: { id: series.id },
      include: {
        posts: {
          where: { published: true },
          orderBy: { orderInSeries: "asc" },
        },
        _count: {
          select: {
            posts: { where: { published: true } },
          },
        },
      },
    });

    expect(seriesWithPubPosts).not.toBeNull();
    expect(seriesWithPubPosts?.posts).toHaveLength(1);
    expect(seriesWithPubPosts?.posts[0].slug).toBe(pubSlug);
    expect(seriesWithPubPosts?._count.posts).toBe(1);
  });
});
