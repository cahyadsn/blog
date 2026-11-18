import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { GET as getPublicSeries } from "@/app/api/series/route";
import { GET as getPublicSeriesBySlug } from "@/app/api/series/[slug]/route";
import { GET as getAdminSeries, POST as createAdminSeries } from "@/app/api/admin/series/route";
import { PUT as updateAdminSeries, DELETE as deleteAdminSeries } from "@/app/api/admin/series/[id]/route";
import { POST as createAdminPost } from "@/app/api/admin/posts/route";
import { PUT as updateAdminPost } from "@/app/api/admin/posts/[id]/route";
import { SeriesSchema, PostAdminSchema } from "@/lib/validations";
import { ADMIN_COOKIE_NAME, generateSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

// Mock database module for isolated route handler contract testing
vi.mock("@/lib/db", () => {
  const mockTx = {
    postTag: {
      deleteMany: vi.fn(),
    },
    post: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    series: {
      delete: vi.fn(),
    },
  };

  return {
    db: {
      series: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      post: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      postTag: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === "function") {
          return arg(mockTx);
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg;
      }),
      __mockTx: mockTx,
    },
  };
});

describe("Series & Collections Feature Suite (Milestone 1 & 3)", () => {
  let adminCookie: string;

  beforeAll(async () => {
    const token = await generateSessionToken("admin");
    adminCookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Section 1: Zod Schema Validations
  // ==========================================
  describe("Zod Validation: SeriesSchema", () => {
    it("should validate a complete, valid series payload", () => {
      const payload = {
        title: "Panduan Lengkap Next.js 15",
        slug: "panduan-lengkap-nextjs-15",
        description: "Kumpulan artikel komprehensif mulai dari dasar hingga fitur lanjutan.",
        coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      };

      const result = SeriesSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(payload.title);
        expect(result.data.slug).toBe(payload.slug);
        expect(result.data.description).toBe(payload.description);
      }
    });

    it("should accept valid local upload URL for coverImage", () => {
      const payload = {
        title: "Koleksi TypeScript Pro",
        slug: "koleksi-typescript-pro",
        description: "Panduan tingkat mahir TypeScript.",
        coverImage: "/uploads/series-banner-1234.png",
      };

      const result = SeriesSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should allow optional/nullable/empty description and coverImage", () => {
      const minimalPayload = {
        title: "Seri Minimalis",
        slug: "seri-minimalis",
        description: "",
        coverImage: null,
      };

      const result = SeriesSchema.safeParse(minimalPayload);
      expect(result.success).toBe(true);
    });

    it("should reject invalid slug format (uppercase, spaces, special chars)", () => {
      expect(
        SeriesSchema.safeParse({ title: "Valid Title", slug: "Invalid Slug" }).success
      ).toBe(false);
      expect(
        SeriesSchema.safeParse({ title: "Valid Title", slug: "slug_with_underscore" }).success
      ).toBe(false);
      expect(
        SeriesSchema.safeParse({ title: "Valid Title", slug: "slug@special!" }).success
      ).toBe(false);
    });

    it("should reject title shorter than 3 characters", () => {
      const result = SeriesSchema.safeParse({ title: "AB", slug: "valid-slug" });
      expect(result.success).toBe(false);
    });

    it("should reject title longer than 150 characters", () => {
      const longTitle = "A".repeat(151);
      const result = SeriesSchema.safeParse({ title: longTitle, slug: "valid-slug" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid coverImage protocols (non-http, non-upload)", () => {
      const result = SeriesSchema.safeParse({
        title: "Seri Keamanan",
        slug: "seri-keamanan",
        coverImage: "javascript:alert(1)",
      });
      expect(result.success).toBe(false);

      const resultFtp = SeriesSchema.safeParse({
        title: "Seri Keamanan",
        slug: "seri-keamanan",
        coverImage: "ftp://example.com/image.png",
      });
      expect(resultFtp.success).toBe(false);
    });
  });

  describe("Zod Validation: PostAdminSchema Series Fields", () => {
    it("should accept post with valid seriesId and orderInSeries", () => {
      const payload = {
        title: "Artikel Seri Bagian 1",
        slug: "artikel-seri-bagian-1",
        excerpt: "Ringkasan artikel seri bagian 1 yang memenuhi minimal 10 karakter.",
        content: "Konten lengkap artikel yang memenuhi batas minimal panjang karakter.",
        seriesId: "cuid-series-123",
        orderInSeries: 1,
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.seriesId).toBe("cuid-series-123");
        expect(result.data.orderInSeries).toBe(1);
      }
    });

    it("should accept post without seriesId and orderInSeries (null/empty/omitted)", () => {
      const payload = {
        title: "Artikel Standalone Tanpa Seri",
        slug: "artikel-standalone-tanpa-seri",
        excerpt: "Ringkasan artikel mandiri tanpa mengaitkan ke seri manapun.",
        content: "Konten artikel mandiri yang memenuhi batas minimal panjang karakter.",
        seriesId: "",
        orderInSeries: null,
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject zero or negative orderInSeries", () => {
      expect(
        PostAdminSchema.safeParse({
          title: "Artikel Urutan Nol",
          slug: "artikel-urutan-nol",
          excerpt: "Ringkasan artikel dengan nomor urutan nol.",
          content: "Konten artikel yang memenuhi batas minimal panjang karakter.",
          orderInSeries: 0,
        }).success
      ).toBe(false);

      expect(
        PostAdminSchema.safeParse({
          title: "Artikel Urutan Negatif",
          slug: "artikel-urutan-negatif",
          excerpt: "Ringkasan artikel dengan nomor urutan negatif.",
          content: "Konten artikel yang memenuhi batas minimal panjang karakter.",
          orderInSeries: -5,
        }).success
      ).toBe(false);
    });

    it("should reject non-integer orderInSeries", () => {
      const payload = {
        title: "Artikel Urutan Pecahan",
        slug: "artikel-urutan-pecahan",
        excerpt: "Ringkasan artikel dengan nomor urutan desimal/pecahan.",
        content: "Konten artikel yang memenuhi batas minimal panjang karakter.",
        orderInSeries: 2.5,
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================
  // Section 2: Public Series APIs
  // ==========================================
  describe("GET /api/series (Public Series Catalog)", () => {
    it("should return series list with accurate published post counts", async () => {
      const mockSeriesList = [
        {
          id: "series-1",
          title: "Panduan Next.js 15",
          slug: "panduan-nextjs-15",
          description: "Belajar Next.js dari awal",
          coverImage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { posts: 4 },
        },
      ];

      vi.mocked(db.series.findMany).mockResolvedValueOnce(mockSeriesList as any);

      const res = await getPublicSeries();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.series).toHaveLength(1);
      expect(json.series[0].slug).toBe("panduan-nextjs-15");
      expect(json.series[0]._count.posts).toBe(4);
      expect(db.series.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                posts: { where: { published: true } },
              },
            },
          },
        })
      );
    });

    it("should return empty list when no series exist in database", async () => {
      vi.mocked(db.series.findMany).mockResolvedValueOnce([]);

      const res = await getPublicSeries();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.series).toEqual([]);
    });

    it("should handle server errors gracefully with status 500", async () => {
      vi.mocked(db.series.findMany).mockRejectedValueOnce(new Error("Database connection lost"));

      const res = await getPublicSeries();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Database connection lost");
    });
  });

  describe("GET /api/series/[slug] (Public Series Detail & Roadmap)", () => {
    it("should return series detail and ordered published posts", async () => {
      const mockDetail = {
        id: "series-1",
        title: "Panduan Next.js 15",
        slug: "panduan-nextjs-15",
        description: "Belajar Next.js dari awal",
        coverImage: null,
        posts: [
          {
            id: "post-1",
            title: "Bagian 1: Instalasi",
            slug: "bagian-1-instalasi",
            orderInSeries: 1,
            published: true,
          },
          {
            id: "post-2",
            title: "Bagian 2: Routing",
            slug: "bagian-2-routing",
            orderInSeries: 2,
            published: true,
          },
        ],
        _count: { posts: 2 },
      };

      vi.mocked(db.series.findUnique).mockResolvedValueOnce(mockDetail as any);

      const req = new Request("http://localhost:3000/api/series/panduan-nextjs-15");
      const res = await getPublicSeriesBySlug(req, {
        params: Promise.resolve({ slug: "panduan-nextjs-15" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.series.title).toBe("Panduan Next.js 15");
      expect(json.series.posts).toHaveLength(2);
      expect(json.series.posts[0].orderInSeries).toBe(1);
      expect(json.series.posts[1].orderInSeries).toBe(2);
    });

    it("should return 404 when series is not found", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/series/non-existent-series");
      const res = await getPublicSeriesBySlug(req, {
        params: Promise.resolve({ slug: "non-existent-series" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Seri artikel tidak ditemukan");
    });
  });

  // ==========================================
  // Section 3: Admin Series Management APIs
  // ==========================================
  describe("GET /api/admin/series (Admin Series List)", () => {
    it("should return 401 when request is unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/admin/series");
      const res = await getAdminSeries(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("should return all series for admin when authenticated", async () => {
      const mockAdminSeries = [
        {
          id: "series-1",
          title: "Panduan Next.js 15",
          slug: "panduan-nextjs-15",
          _count: { posts: 5 },
          posts: [],
        },
      ];

      vi.mocked(db.series.findMany).mockResolvedValueOnce(mockAdminSeries as any);

      const req = new Request("http://localhost:3000/api/admin/series", {
        headers: { cookie: adminCookie },
      });
      const res = await getAdminSeries(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.series).toHaveLength(1);
    });
  });

  describe("POST /api/admin/series (Create Series)", () => {
    const validSeriesPayload = {
      title: "Seri Desain UI",
      slug: "seri-desain-ui",
      description: "Panduan desain antarmuka modern",
      coverImage: "https://example.com/cover.png",
    };

    it("should return 401 when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/admin/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validSeriesPayload),
      });

      const res = await createAdminSeries(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 when payload is invalid", async () => {
      const req = new Request("http://localhost:3000/api/admin/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify({ title: "Hi", slug: "INVALID SLUG" }),
      });

      const res = await createAdminSeries(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("should return 409 when slug already exists", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({
        id: "existing-id",
        slug: validSeriesPayload.slug,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify(validSeriesPayload),
      });

      const res = await createAdminSeries(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Slug sudah digunakan");
    });

    it("should create new series and return 201 on success", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.series.create).mockResolvedValueOnce({
        id: "new-series-1",
        ...validSeriesPayload,
        _count: { posts: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify(validSeriesPayload),
      });

      const res = await createAdminSeries(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.series.id).toBe("new-series-1");
      expect(json.series.slug).toBe(validSeriesPayload.slug);
    });
  });

  describe("PUT /api/admin/series/[id] (Update Series)", () => {
    const updatePayload = {
      title: "Judul Seri Terupdate",
      slug: "judul-seri-terupdate",
      description: "Deskripsi yang diperbarui",
      coverImage: null,
    };

    it("should return 401 when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/admin/series/series-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const res = await updateAdminSeries(req, {
        params: Promise.resolve({ id: "series-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 404 when series does not exist", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/series/series-missing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify(updatePayload),
      });

      const res = await updateAdminSeries(req, {
        params: Promise.resolve({ id: "series-missing" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("should return 409 when updated slug conflicts with another series", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({ id: "series-1" } as any);
      vi.mocked(db.series.findFirst).mockResolvedValueOnce({
        id: "series-2",
        slug: updatePayload.slug,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/series/series-1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify(updatePayload),
      });

      const res = await updateAdminSeries(req, {
        params: Promise.resolve({ id: "series-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Slug sudah digunakan");
    });

    it("should update series and return 200 on success", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({ id: "series-1" } as any);
      vi.mocked(db.series.findFirst).mockResolvedValueOnce(null); // No conflict
      vi.mocked(db.series.update).mockResolvedValueOnce({
        id: "series-1",
        ...updatePayload,
        _count: { posts: 2 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/series/series-1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: adminCookie,
        },
        body: JSON.stringify(updatePayload),
      });

      const res = await updateAdminSeries(req, {
        params: Promise.resolve({ id: "series-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.series.title).toBe(updatePayload.title);
    });
  });

  describe("DELETE /api/admin/series/[id] (Safe Deletion & Post Detach)", () => {
    it("should return 401 when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/admin/series/series-1", {
        method: "DELETE",
      });

      const res = await deleteAdminSeries(req, {
        params: Promise.resolve({ id: "series-1" }),
      });
      expect(res.status).toBe(401);
    });

    it("should return 404 when deleting non-existent series", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/series/missing-series", {
        method: "DELETE",
        headers: { cookie: adminCookie },
      });

      const res = await deleteAdminSeries(req, {
        params: Promise.resolve({ id: "missing-series" }),
      });
      expect(res.status).toBe(404);
    });

    it("should safely detach posts and delete series record in transaction", async () => {
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({
        id: "series-to-delete",
        title: "Seri Mau Dihapus",
      } as any);

      const req = new Request("http://localhost:3000/api/admin/series/series-to-delete", {
        method: "DELETE",
        headers: { cookie: adminCookie },
      });

      const res = await deleteAdminSeries(req, {
        params: Promise.resolve({ id: "series-to-delete" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("berhasil dihapus dan artikel telah dipisahkan");
      expect(db.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // Section 4: Admin Post Series Integration
  // ==========================================
  describe("Admin Post Series Integration", () => {
    const postWithSeriesPayload = {
      title: "Artikel Bagian dari Seri",
      slug: "artikel-bagian-dari-seri",
      excerpt: "Ringkasan artikel yang memiliki keterkaitan dengan seri.",
      content: "Konten lengkap artikel dalam seri yang memenuhi batas minimal.",
      seriesId: "existing-series-id",
      orderInSeries: 2,
    };

    it("POST /api/admin/posts should return 400 when seriesId does not exist", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null); // No slug conflict
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null); // Series not found

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postWithSeriesPayload),
      });

      const res = await createAdminPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Seri artikel yang dipilih tidak ditemukan");
    });

    it("POST /api/admin/posts should save seriesId and orderInSeries when series exists", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null); // No slug conflict
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({
        id: "existing-series-id",
        title: "Seri Induk",
      } as any);

      vi.mocked(db.post.create).mockResolvedValueOnce({
        id: "new-post-id",
        ...postWithSeriesPayload,
        readingTime: 2,
        series: {
          id: "existing-series-id",
          title: "Seri Induk",
          slug: "seri-induk",
        },
        tags: [],
        _count: { comments: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postWithSeriesPayload),
      });

      const res = await createAdminPost(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.post.series.id).toBe("existing-series-id");
      expect(db.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            seriesId: "existing-series-id",
            orderInSeries: 2,
          }),
        })
      );
    });

    it("PUT /api/admin/posts/[id] should return 400 when updating with non-existent seriesId", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.series.findUnique).mockResolvedValueOnce(null); // Series missing

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postWithSeriesPayload),
      });

      const res = await updateAdminPost(req, {
        params: Promise.resolve({ id: "post-100" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Seri artikel yang dipilih tidak ditemukan");
    });

    it("PUT /api/admin/posts/[id] should update seriesId and orderInSeries when series exists", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100", slug: "artikel-bagian-dari-seri" } as any);
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.series.findUnique).mockResolvedValueOnce({
        id: "existing-series-id",
        title: "Seri Induk",
      } as any);

      const updatedPostData = {
        id: "post-100",
        ...postWithSeriesPayload,
        readingTime: 2,
        series: {
          id: "existing-series-id",
          title: "Seri Induk",
          slug: "seri-induk",
        },
        tags: [],
        _count: { comments: 0 },
      };

      // Mock transaction return
      vi.mocked(db.$transaction).mockImplementationOnce(async (callback: any) => {
        return callback({
          postTag: { deleteMany: vi.fn() },
          post: { update: vi.fn().mockResolvedValue(updatedPostData) },
        });
      });

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postWithSeriesPayload),
      });

      const res = await updateAdminPost(req, {
        params: Promise.resolve({ id: "post-100" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.series.id).toBe("existing-series-id");
    });

    it("PUT /api/admin/posts/[id] should allow detaching a post from its series by setting seriesId to null", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100", slug: "artikel-dilepas" } as any);
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const detachPayload = {
        title: "Artikel Dilepas dari Seri",
        slug: "artikel-dilepas",
        excerpt: "Ringkasan artikel yang kini dilepas dari seri lamanya.",
        content: "Konten lengkap artikel mandiri yang telah dipisahkan.",
        seriesId: null,
        orderInSeries: null,
      };

      const detachedPostData = {
        id: "post-100",
        ...detachPayload,
        readingTime: 2,
        series: null,
        tags: [],
        _count: { comments: 0 },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback: any) => {
        return callback({
          postTag: { deleteMany: vi.fn() },
          post: { update: vi.fn().mockResolvedValue(detachedPostData) },
        });
      });

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detachPayload),
      });

      const res = await updateAdminPost(req, {
        params: Promise.resolve({ id: "post-100" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.series).toBeNull();
    });
  });
});
