import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getPosts, POST as createPost } from "@/app/api/admin/posts/route";
import {
  GET as getPost,
  PUT as updatePost,
  DELETE as deletePost,
} from "@/app/api/admin/posts/[id]/route";
import { PATCH as togglePublish } from "@/app/api/admin/posts/[id]/publish/route";
import { db } from "@/lib/db";

// Mock database module for isolated Route Handler contract testing
vi.mock("@/lib/db", () => {
  const mockTx = {
    postTag: {
      deleteMany: vi.fn(),
    },
    post: {
      update: vi.fn(),
    },
  };

  return {
    db: {
      post: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      postTag: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      }),
      __mockTx: mockTx,
    },
  };
});

// Helper to access mock transaction inside db mock
const getMockTx = () => (db as unknown as { __mockTx: { postTag: { deleteMany: ReturnType<typeof vi.fn> }; post: { update: ReturnType<typeof vi.fn> } } }).__mockTx;

describe("Admin Posts API Suite (R2: Post Management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/posts (List & Search)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-P1: should return all posts with status 200 when no filters applied", async () => {
      const mockPosts = [
        {
          id: "post-1",
          title: "Artikel Pertama",
          slug: "artikel-pertama",
          excerpt: "Ringkasan artikel pertama untuk pengujian",
          content: "Konten lengkap artikel pertama dalam database.",
          published: true,
          tags: [{ tag: { id: "tag-1", name: "nextjs", slug: "nextjs" } }],
          _count: { comments: 2 },
        },
        {
          id: "post-2",
          title: "Draf Artikel Kedua",
          slug: "draf-artikel-kedua",
          excerpt: "Ringkasan draf artikel kedua",
          content: "Konten draf artikel yang belum dipublikasikan.",
          published: false,
          tags: [],
          _count: { comments: 0 },
        },
      ];

      vi.mocked(db.post.findMany).mockResolvedValueOnce(mockPosts as any);

      const req = new Request("http://localhost:3000/api/admin/posts");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.posts).toHaveLength(2);
      expect(json.posts[0].id).toBe("post-1");
      expect(json.posts[1].published).toBe(false);
      expect(db.post.findMany).toHaveBeenCalledTimes(1);
    });

    it("T1-API-P2: should filter posts by published status when status=published", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/posts?status=published");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ published: true }),
        })
      );
    });

    it("T1-API-P3: should filter posts by draft status when status=draft", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/posts?status=draft");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ published: false }),
        })
      );
    });

    it("T1-API-P4: should filter posts by search keyword across title, slug, and excerpt", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/posts?search=prisma");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: "prisma" } },
              { slug: { contains: "prisma" } },
              { excerpt: { contains: "prisma" } },
            ],
          }),
        })
      );
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P1: should return empty list when no posts match criteria", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/posts?search=nonexistent-keyword");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.posts).toEqual([]);
    });

    it("T2-API-P2: should default to 'all' filter when unrecognized status parameter provided", async () => {
      vi.mocked(db.post.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/posts?status=invalid_status");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it("T2-API-P3: should return 500 when database findMany throws an error", async () => {
      vi.mocked(db.post.findMany).mockRejectedValueOnce(new Error("Database connection failure"));

      const req = new Request("http://localhost:3000/api/admin/posts");
      const res = await getPosts(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Database connection failure");
    });
  });

  describe("POST /api/admin/posts (Create Post)", () => {
    const validPostPayload = {
      title: "Membangun API Cepat dengan Next.js",
      slug: "membangun-api-cepat-nextjs",
      excerpt: "Panduan praktis membangun API performa tinggi menggunakan Route Handlers.",
      content: "Route Handlers di Next.js 15 mendukung standard Web Request and Response objects secara native.",
      coverImage: "https://example.com/images/api-banner.jpg",
      published: true,
      tags: ["nextjs", "api"],
    };

    // --- Tier 1: Feature Coverage ---
    it("T1-API-P5: should create new published post and return status 201", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null); // No slug conflict
      vi.mocked(db.post.create).mockResolvedValueOnce({
        id: "new-post-1",
        ...validPostPayload,
        readingTime: 1,
        tags: [{ tag: { id: "tag-1", name: "nextjs", slug: "nextjs" } }],
        _count: { comments: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPostPayload),
      });

      const res = await createPost(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.post.id).toBe("new-post-1");
      expect(json.post.slug).toBe(validPostPayload.slug);
      expect(db.post.create).toHaveBeenCalledTimes(1);
    });

    it("T1-API-P6: should create draft post with published: false", async () => {
      const draftPayload = {
        ...validPostPayload,
        slug: "draft-api-cepat-nextjs",
        published: false,
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.post.create).mockResolvedValueOnce({
        id: "draft-post-1",
        ...draftPayload,
        readingTime: 1,
        tags: [],
        _count: { comments: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      });

      const res = await createPost(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.post.published).toBe(false);
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P4: should return 400 when title is missing or too short", async () => {
      const invalidPayload = {
        ...validPostPayload,
        title: "Hai", // < 5 chars
      };

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const res = await createPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Judul minimal 5 karakter");
    });

    it("T2-API-P5: should return 409 when slug is already in use by another post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({
        id: "existing-post-99",
        slug: validPostPayload.slug,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPostPayload),
      });

      const res = await createPost(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Slug sudah digunakan");
      expect(db.post.create).not.toHaveBeenCalled();
    });

    it("T2-API-P6: should return 500 when database create throws an unexpected error", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.post.create).mockRejectedValueOnce(new Error("SQLITE_CONSTRAINT"));

      const req = new Request("http://localhost:3000/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPostPayload),
      });

      const res = await createPost(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });

  describe("GET /api/admin/posts/[id] (Get Single Post)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-P7: should return post details for existing ID with status 200", async () => {
      const mockPost = {
        id: "post-100",
        title: "Artikel Ditemukan",
        slug: "artikel-ditemukan",
        excerpt: "Ringkasan artikel ditemukan untuk pengujian GET by ID.",
        content: "Konten lengkap artikel ditemukan dalam database SQLite.",
        published: true,
        tags: [{ tag: { id: "tag-1", name: "react", slug: "react" } }],
        _count: { comments: 5 },
      };

      vi.mocked(db.post.findUnique).mockResolvedValueOnce(mockPost as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-100");
      const res = await getPost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.id).toBe("post-100");
      expect(json.post._count.comments).toBe(5);
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P7: should return 404 when post with given ID does not exist", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/posts/non-existent-id");
      const res = await getPost(req, { params: Promise.resolve({ id: "non-existent-id" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Artikel tidak ditemukan");
    });
  });

  describe("PUT /api/admin/posts/[id] (Update Post)", () => {
    const updatePayload = {
      title: "Judul Artikel yang Diperbarui",
      slug: "judul-artikel-diperbarui",
      excerpt: "Ringkasan artikel yang diperbarui dengan konten yang lebih komprehensif.",
      content: "Konten artikel yang baru saja diperbarui melalui form CMS Admin.",
      coverImage: "https://example.com/new-cover.jpg",
      published: true,
      tags: ["typescript", "fullstack"],
    };

    // --- Tier 1: Feature Coverage ---
    it("T1-API-P8: should update post successfully and return status 200", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null); // No conflict

      const mockTx = getMockTx();
      mockTx.post.update.mockResolvedValueOnce({
        id: "post-100",
        ...updatePayload,
        readingTime: 1,
        tags: [{ tag: { id: "tag-ts", name: "typescript", slug: "typescript" } }],
        _count: { comments: 3 },
      });

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const res = await updatePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.title).toBe(updatePayload.title);
      expect(db.$transaction).toHaveBeenCalledTimes(1);
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P8: should return 404 when updating non-existent post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/posts/missing-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const res = await updatePost(req, { params: Promise.resolve({ id: "missing-id" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Artikel tidak ditemukan");
    });

    it("T2-API-P9: should return 409 when updated slug conflicts with another post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      vi.mocked(db.post.findFirst).mockResolvedValueOnce({ id: "post-200", slug: updatePayload.slug } as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const res = await updatePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Slug sudah digunakan oleh artikel lain");
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it("T2-API-P10: should return 400 when update payload fails validation", async () => {
      const invalidPayload = { ...updatePayload, content: "Short" }; // < 20 chars

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidPayload),
      });

      const res = await updatePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    // --- Tier 3: Combinations ---
    it("T3-API-P1: should allow updating post without error when keeping its own existing slug", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      // findFirst with NOT: { id: "post-100" } returns null because no OTHER post has this slug
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const mockTx = getMockTx();
      mockTx.post.update.mockResolvedValueOnce({
        id: "post-100",
        ...updatePayload,
        tags: [],
        _count: { comments: 0 },
      });

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const res = await updatePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.post.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            slug: updatePayload.slug,
            NOT: { id: "post-100" },
          },
        })
      );
    });
  });

  describe("PATCH /api/admin/posts/[id]/publish (Publish Toggle)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-P9: should toggle post status to published: true and return status 200", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100", published: false } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({
        id: "post-100",
        published: true,
        tags: [],
        _count: { comments: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-100/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.published).toBe(true);
      expect(db.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "post-100" },
          data: { published: true },
        })
      );
    });

    it("T1-API-P10: should toggle post status to published: false (draft)", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100", published: true } as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({
        id: "post-100",
        published: false,
        tags: [],
        _count: { comments: 0 },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-100/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.post.published).toBe(false);
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P11: should return 404 when toggling non-existent post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/posts/missing-id/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "missing-id" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("T2-API-P12: should return 400 when published field is missing or non-boolean", async () => {
      const req = new Request("http://localhost:3000/api/admin/posts/post-100/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: "not-a-boolean" }),
      });

      const res = await togglePublish(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/admin/posts/[id] (Delete Post)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-P11: should delete existing post and return status 200 with success message", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      vi.mocked(db.post.delete).mockResolvedValueOnce({ id: "post-100" } as any);

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "DELETE",
      });

      const res = await deletePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("berhasil dihapus");
      expect(db.post.delete).toHaveBeenCalledWith({ where: { id: "post-100" } });
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-P13: should return 404 when attempting to delete non-existent post", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/posts/missing-id", {
        method: "DELETE",
      });

      const res = await deletePost(req, { params: Promise.resolve({ id: "missing-id" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(db.post.delete).not.toHaveBeenCalled();
    });

    it("T2-API-P14: should return 500 when database delete operation throws an error", async () => {
      vi.mocked(db.post.findUnique).mockResolvedValueOnce({ id: "post-100" } as any);
      vi.mocked(db.post.delete).mockRejectedValueOnce(new Error("Disk I/O error"));

      const req = new Request("http://localhost:3000/api/admin/posts/post-100", {
        method: "DELETE",
      });

      const res = await deletePost(req, { params: Promise.resolve({ id: "post-100" }) });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });
});
