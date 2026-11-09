import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getComments } from "@/app/api/admin/comments/route";
import {
  PATCH as updateCommentStatus,
  DELETE as deleteComment,
} from "@/app/api/admin/comments/[id]/route";
import { POST as replyToComment } from "@/app/api/admin/comments/[id]/reply/route";
import { db } from "@/lib/db";

// Mock database module for isolated Comment API testing
vi.mock("@/lib/db", () => {
  return {
    db: {
      comment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe("Admin Comments API Suite (R3: Comment Moderation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/comments (List & Filter)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-C1: should return all comments with status 200 when status is omitted or ALL", async () => {
      const mockComments = [
        {
          id: "comment-1",
          postId: "post-1",
          authorName: "Budi Santoso",
          authorEmail: "budi@example.com",
          content: "Artikel yang sangat informatif dan mudah dipahami!",
          status: "APPROVED",
          isAuthorReply: false,
          parentId: null,
          createdAt: new Date().toISOString(),
          post: { id: "post-1", title: "Artikel Utama", slug: "artikel-utama" },
          parent: null,
        },
        {
          id: "comment-2",
          postId: "post-1",
          authorName: "Spammer 99",
          authorEmail: "spam@promosi.com",
          content: "Kunjungi situs kami untuk bonus deposit!",
          status: "SPAM",
          isAuthorReply: false,
          parentId: null,
          createdAt: new Date().toISOString(),
          post: { id: "post-1", title: "Artikel Utama", slug: "artikel-utama" },
          parent: null,
        },
      ];

      vi.mocked(db.comment.findMany).mockResolvedValueOnce(mockComments as any);

      const req = new Request("http://localhost:3000/api/admin/comments");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.comments).toHaveLength(2);
      expect(db.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("T1-API-C2: should filter comments by status=PENDING", async () => {
      vi.mocked(db.comment.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/comments?status=PENDING");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PENDING" },
        })
      );
    });

    it("T1-API-C3: should filter comments by status=APPROVED", async () => {
      vi.mocked(db.comment.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/comments?status=APPROVED");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "APPROVED" },
        })
      );
    });

    it("T1-API-C4: should filter comments by status=SPAM", async () => {
      vi.mocked(db.comment.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/comments?status=SPAM");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "SPAM" },
        })
      );
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-C1: should return empty list when no comments match status filter", async () => {
      vi.mocked(db.comment.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/comments?status=SPAM");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.comments).toEqual([]);
    });

    it("T2-API-C2: should return 500 when database findMany throws an error", async () => {
      vi.mocked(db.comment.findMany).mockRejectedValueOnce(new Error("Database connection closed"));

      const req = new Request("http://localhost:3000/api/admin/comments");
      const res = await getComments(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Database connection closed");
    });
  });

  describe("PATCH /api/admin/comments/[id] (Status Update)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-C5: should approve comment (PENDING -> APPROVED) and return status 200", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({
        id: "comment-pending-1",
        status: "PENDING",
      } as any);

      vi.mocked(db.comment.update).mockResolvedValueOnce({
        id: "comment-pending-1",
        status: "APPROVED",
        post: { id: "post-1", title: "Artikel Utama", slug: "artikel-utama" },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/comment-pending-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "comment-pending-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.comment.status).toBe("APPROVED");
      expect(db.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comment-pending-1" },
          data: { status: "APPROVED" },
        })
      );
    });

    it("T1-API-C6: should mark comment as SPAM and return status 200", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({
        id: "comment-pending-2",
        status: "PENDING",
      } as any);

      vi.mocked(db.comment.update).mockResolvedValueOnce({
        id: "comment-pending-2",
        status: "SPAM",
        post: { id: "post-1", title: "Artikel Utama", slug: "artikel-utama" },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/comment-pending-2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SPAM" }),
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "comment-pending-2" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.comment.status).toBe("SPAM");
    });

    it("T1-API-C7: should reset comment status to PENDING", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({
        id: "comment-spam-1",
        status: "SPAM",
      } as any);

      vi.mocked(db.comment.update).mockResolvedValueOnce({
        id: "comment-spam-1",
        status: "PENDING",
        post: { id: "post-1", title: "Artikel Utama", slug: "artikel-utama" },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/comment-spam-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "comment-spam-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.comment.status).toBe("PENDING");
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-C3: should return 404 when comment ID does not exist", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/comments/missing-comment-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "missing-comment-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Komentar tidak ditemukan");
    });

    it("T2-API-C4: should return 400 when status is invalid string or lowercase", async () => {
      const req = new Request("http://localhost:3000/api/admin/comments/comment-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }), // Lowercase should fail enum
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("T2-API-C5: should return 500 when database update throws an unexpected error", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({ id: "comment-1" } as any);
      vi.mocked(db.comment.update).mockRejectedValueOnce(new Error("Database write locked"));

      const req = new Request("http://localhost:3000/api/admin/comments/comment-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const res = await updateCommentStatus(req, {
        params: Promise.resolve({ id: "comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/admin/comments/[id] (Delete Comment)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-API-C8: should delete comment and return status 200 with success message", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({ id: "comment-10" } as any);
      vi.mocked(db.comment.delete).mockResolvedValueOnce({ id: "comment-10" } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/comment-10", {
        method: "DELETE",
      });

      const res = await deleteComment(req, {
        params: Promise.resolve({ id: "comment-10" }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("berhasil dihapus");
      expect(db.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-10" } });
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-C6: should return 404 when deleting non-existent comment ID", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/comments/missing-id", {
        method: "DELETE",
      });

      const res = await deleteComment(req, {
        params: Promise.resolve({ id: "missing-id" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(db.comment.delete).not.toHaveBeenCalled();
    });

    it("T2-API-C7: should return 500 when database delete fails", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce({ id: "comment-10" } as any);
      vi.mocked(db.comment.delete).mockRejectedValueOnce(new Error("Disk error"));

      const req = new Request("http://localhost:3000/api/admin/comments/comment-10", {
        method: "DELETE",
      });

      const res = await deleteComment(req, {
        params: Promise.resolve({ id: "comment-10" }),
      });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/admin/comments/[id]/reply (Author Reply)", () => {
    const parentComment = {
      id: "parent-comment-1",
      postId: "post-target-1",
      authorName: "Pembaca Blog",
      authorEmail: "reader@example.com",
      content: "Apakah Next.js 15 mendukung React 19 Compiler?",
      status: "APPROVED",
      isAuthorReply: false,
    };

    // --- Tier 1: Feature Coverage ---
    it("T1-API-C9: should create author reply with default author info, isAuthorReply: true, and status 201", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(parentComment as any);
      vi.mocked(db.comment.create).mockResolvedValueOnce({
        id: "reply-1",
        postId: parentComment.postId,
        parentId: parentComment.id,
        authorName: "Admin",
        authorEmail: "admin@blog.local",
        content: "Ya, Next.js 15 sepenuhnya kompatibel dengan React 19!",
        status: "APPROVED",
        isAuthorReply: true,
        post: { id: "post-target-1", title: "Target Post", slug: "target-post" },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/parent-comment-1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Ya, Next.js 15 sepenuhnya kompatibel dengan React 19!",
        }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "parent-comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.comment.isAuthorReply).toBe(true);
      expect(json.comment.parentId).toBe(parentComment.id);
      expect(json.comment.authorName).toBe("Admin");
      expect(db.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId: parentComment.postId,
            parentId: parentComment.id,
            isAuthorReply: true,
            status: "APPROVED",
          }),
        })
      );
    });

    it("T1-API-C10: should allow specifying custom authorName and authorEmail for reply", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(parentComment as any);
      vi.mocked(db.comment.create).mockResolvedValueOnce({
        id: "reply-2",
        postId: parentComment.postId,
        parentId: parentComment.id,
        authorName: "Satria Admin",
        authorEmail: "satria@blog.internal",
        content: "Penjelasan tambahan dari penulis utama.",
        status: "APPROVED",
        isAuthorReply: true,
        post: { id: "post-target-1", title: "Target Post", slug: "target-post" },
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/parent-comment-1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Penjelasan tambahan dari penulis utama.",
          authorName: "Satria Admin",
          authorEmail: "satria@blog.internal",
        }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "parent-comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.comment.authorName).toBe("Satria Admin");
      expect(json.comment.authorEmail).toBe("satria@blog.internal");
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-API-C8: should return 404 when parent comment does not exist", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/comments/missing-parent/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Balasan untuk komentar yang tidak ada.",
        }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "missing-parent" }),
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Komentar induk tidak ditemukan");
    });

    it("T2-API-C9: should return 400 when reply content is too short (< 2 chars)", async () => {
      const req = new Request("http://localhost:3000/api/admin/comments/parent-comment-1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "A" }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "parent-comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("T2-API-C10: should return 400 when reply content contains XSS script tags", async () => {
      const req = new Request("http://localhost:3000/api/admin/comments/parent-comment-1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: 'Balasan dengan skrip jahat <script>alert("hack")</script>',
        }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "parent-comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("XSS");
    });

    // --- Tier 3: Combinations ---
    it("T3-API-C1: should guarantee thread association linking reply.postId to parent.postId and reply.parentId to parent.id", async () => {
      vi.mocked(db.comment.findUnique).mockResolvedValueOnce(parentComment as any);
      vi.mocked(db.comment.create).mockResolvedValueOnce({
        id: "child-reply-99",
        postId: parentComment.postId,
        parentId: parentComment.id,
        authorName: "Admin",
        authorEmail: "admin@blog.local",
        content: "Threading verification passed.",
        status: "APPROVED",
        isAuthorReply: true,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/comments/parent-comment-1/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Threading verification passed." }),
      });

      const res = await replyToComment(req, {
        params: Promise.resolve({ id: "parent-comment-1" }),
      });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.comment.postId).toBe(parentComment.postId);
      expect(json.comment.parentId).toBe(parentComment.id);
    });
  });
});
