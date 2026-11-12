import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/posts/[id]/like/route";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

// Mock @/lib/db for isolated Route Handler testing
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Like / Clap API Test Suite (tests/likes-api.test.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  afterEach(() => {
    resetRateLimit();
  });

  // =========================================================================
  // 1. Sliding-Window Rate Limiter Unit Tests
  // =========================================================================
  describe("Sliding-Window Rate Limiter Unit Tests (src/lib/rate-limit.ts)", () => {
    it("should allow requests under the limit", () => {
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit("client-1", 5, 10000);
        expect(result.success).toBe(true);
      }
    });

    it("should block requests once the limit is reached and return retryAfter", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("client-spam", 5, 10000);
      }

      const blockedResult = checkRateLimit("client-spam", 5, 10000);
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeGreaterThanOrEqual(1);
    });

    it("should track distinct clients independently", () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("client-a", 3, 10000);
      }

      const blockedA = checkRateLimit("client-a", 3, 10000);
      expect(blockedA.success).toBe(false);

      const allowedB = checkRateLimit("client-b", 3, 10000);
      expect(allowedB.success).toBe(true);
    });

    it("should clear records on resetRateLimit()", () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("client-reset", 3, 10000);
      }
      expect(checkRateLimit("client-reset", 3, 10000).success).toBe(false);

      resetRateLimit();
      expect(checkRateLimit("client-reset", 3, 10000).success).toBe(true);
    });
  });

  // =========================================================================
  // 2. POST /api/posts/[id]/like Route Handler
  // =========================================================================
  describe("POST /api/posts/[id]/like", () => {
    it("harus menambah jumlah like berdasarkan post ID dan mengembalikan status 200", async () => {
      const mockPost = { id: "post-cuid-123", slug: "artikel-keren", likes: 5 };
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({ ...mockPost, likes: 6 } as any);

      const req = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.10" },
      });

      const res = await POST(req, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.likes).toBe(6);
      expect(db.post.update).toHaveBeenCalledWith({
        where: { id: "post-cuid-123" },
        data: { likes: { increment: 1 } },
        select: { likes: true },
      });
    });

    it("harus menambah jumlah like berdasarkan post slug dan mengembalikan status 200", async () => {
      const mockPost = { id: "post-cuid-456", slug: "panduan-nextjs-15", likes: 0 };
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({ ...mockPost, likes: 1 } as any);

      const req = new Request("http://localhost:3000/api/posts/panduan-nextjs-15/like", {
        method: "POST",
        headers: { "x-forwarded-for": "192.168.1.11" },
      });

      const res = await POST(req, {
        params: Promise.resolve({ id: "panduan-nextjs-15" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.likes).toBe(1);
    });

    it("harus mendukung batching amount dari body permintaan", async () => {
      const mockPost = { id: "post-cuid-123", slug: "post-keren", likes: 42 };
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValueOnce({ likes: 47 } as any);

      const req = new Request("http://localhost:3000/api/posts/post-keren/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.1.20",
        },
        body: JSON.stringify({ amount: 5 }),
      });

      const res = await POST(req, { params: Promise.resolve({ id: "post-keren" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.likes).toBe(47);
      expect(db.post.update).toHaveBeenCalledWith({
        where: { id: "post-cuid-123" },
        data: { likes: { increment: 5 } },
        select: { likes: true },
      });
    });

    it("harus mengembalikan status 404 jika post ID atau slug tidak ditemukan di database", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/posts/non-existent/like", {
        method: "POST",
      });

      const res = await POST(req, {
        params: Promise.resolve({ id: "non-existent" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak ditemukan");
      expect(db.post.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan status 400 jika identifier kosong atau spasi", async () => {
      const req = new Request("http://localhost:3000/api/posts/%20%20/like", {
        method: "POST",
      });

      const res = await POST(req, {
        params: Promise.resolve({ id: "   " }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(db.post.findFirst).not.toHaveBeenCalled();
      expect(db.post.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. GET /api/posts/[id]/like Route Handler (Read-Only)
  // =========================================================================
  describe("GET /api/posts/[id]/like", () => {
    it("harus mengambil jumlah like terkini tanpa memutasi database", async () => {
      const mockPost = { id: "post-cuid-123", slug: "artikel-keren", likes: 15 };
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(mockPost as any);

      const req = new Request("http://localhost:3000/api/posts/post-cuid-123/like");
      const res = await GET(req, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.likes).toBe(15);
      expect(db.post.update).not.toHaveBeenCalled();
    });

    it("harus mengembalikan status 404 pada GET jika artikel tidak ditemukan", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/posts/tidak-ada/like");
      const res = await GET(req, {
        params: Promise.resolve({ id: "tidak-ada" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it("harus mengembalikan status 400 pada GET jika identifier kosong", async () => {
      const req = new Request("http://localhost:3000/api/posts/%20/like");
      const res = await GET(req, { params: Promise.resolve({ id: "" }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // 4. Rate Limiting & Spam Protection
  // =========================================================================
  describe("Rate Limiting & Spam Debounce Protection", () => {
    it("harus mengembalikan status 429 Too Many Requests ketika melebihi batas klik", async () => {
      const mockPost = { id: "post-cuid-123", slug: "artikel-keren", likes: 10 };
      vi.mocked(db.post.findFirst).mockResolvedValue(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValue({ ...mockPost, likes: 11 } as any);

      const clientIp = "10.0.0.99";

      // Eksekusi 10 kali berturut-turut (ambang batas)
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
          method: "POST",
          headers: { "x-forwarded-for": clientIp },
        });
        const res = await POST(req, {
          params: Promise.resolve({ id: "post-cuid-123" }),
        });
        expect(res.status).toBe(200);
      }

      // Permintaan ke-11 harus diblokir dengan 429
      const spamReq = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
        method: "POST",
        headers: { "x-forwarded-for": clientIp },
      });
      const spamRes = await POST(spamReq, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      const spamData = await spamRes.json();

      expect(spamRes.status).toBe(429);
      expect(spamData.success).toBe(false);
      expect(spamData.error).toContain("Terlalu banyak permintaan");
      expect(spamRes.headers.get("Retry-After")).toBeDefined();
    });

    it("harus mengizinkan permintaan kembali setelah resetRateLimit dipanggil", async () => {
      const mockPost = { id: "post-cuid-123", slug: "artikel-keren", likes: 20 };
      vi.mocked(db.post.findFirst).mockResolvedValue(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValue({ ...mockPost, likes: 21 } as any);

      const clientIp = "10.0.0.88";

      // Penuhi batas rate limit
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
          method: "POST",
          headers: { "x-forwarded-for": clientIp },
        });
        await POST(req, { params: Promise.resolve({ id: "post-cuid-123" }) });
      }

      // Verifikasi terblokir
      const blockedReq = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
        method: "POST",
        headers: { "x-forwarded-for": clientIp },
      });
      const blockedRes = await POST(blockedReq, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      expect(blockedRes.status).toBe(429);

      // Reset rate limiter
      resetRateLimit();

      // Permintaan baru harus berhasil lagi dengan 200
      const allowedReq = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
        method: "POST",
        headers: { "x-forwarded-for": clientIp },
      });
      const allowedRes = await POST(allowedReq, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      expect(allowedRes.status).toBe(200);
    });

    it("harus membedakan kuota rate limit antar IP klien yang berbeda", async () => {
      const mockPost = { id: "post-cuid-123", slug: "artikel-keren", likes: 5 };
      vi.mocked(db.post.findFirst).mockResolvedValue(mockPost as any);
      vi.mocked(db.post.update).mockResolvedValue({ ...mockPost, likes: 6 } as any);

      // Klien A memenuhi batas kuota
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
          method: "POST",
          headers: { "x-forwarded-for": "1.1.1.1" },
        });
        await POST(req, { params: Promise.resolve({ id: "post-cuid-123" }) });
      }

      // Klien B dari IP berbeda harus tetap diizinkan
      const clientBReq = new Request("http://localhost:3000/api/posts/post-cuid-123/like", {
        method: "POST",
        headers: { "x-forwarded-for": "2.2.2.2" },
      });
      const clientBRes = await POST(clientBReq, {
        params: Promise.resolve({ id: "post-cuid-123" }),
      });
      expect(clientBRes.status).toBe(200);
    });

    it("harus mengembalikan status 500 jika database mengalami kesalahan", async () => {
      vi.mocked(db.post.findFirst).mockRejectedValueOnce(new Error("Database connection timeout"));

      const req = new Request("http://localhost:3000/api/posts/post-1/like", {
        method: "POST",
      });

      const res = await POST(req, {
        params: Promise.resolve({ id: "post-1" }),
      });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
