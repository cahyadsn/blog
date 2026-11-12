import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getSubscribers } from "@/app/api/admin/subscribers/route";
import {
  PATCH as updateSubscriber,
  DELETE as deleteSubscriber,
} from "@/app/api/admin/subscribers/[id]/route";
import { db } from "@/lib/db";

// Mock @/lib/db for isolated Admin Subscribers Route Handler testing
vi.mock("@/lib/db", () => ({
  db: {
    subscriber: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Admin Subscribers API & Dashboard Suite (tests/admin-subscribers.test.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. GET /api/admin/subscribers
  // ---------------------------------------------------------------------------
  describe("GET /api/admin/subscribers", () => {
    it("harus mengembalikan daftar subscriber beserta ringkasan metrik (totalCount & activeCount)", async () => {
      const mockSubscribers = [
        {
          id: "sub-1",
          email: "andi@example.com",
          active: true,
          createdAt: new Date("2026-11-01T10:00:00Z"),
        },
        {
          id: "sub-2",
          email: "budi@example.com",
          active: false,
          createdAt: new Date("2026-11-02T10:00:00Z"),
        },
        {
          id: "sub-3",
          email: "citra@example.com",
          active: true,
          createdAt: new Date("2026-11-03T10:00:00Z"),
        },
      ];

      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce(mockSubscribers as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscribers).toHaveLength(3);
      expect(data.totalCount).toBe(3);
      expect(data.activeCount).toBe(2);
      expect(db.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("harus mengembalikan status 200 dengan daftar kosong jika belum ada pelanggan", async () => {
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscribers).toEqual([]);
      expect(data.totalCount).toBe(0);
      expect(data.activeCount).toBe(0);
    });

    it("harus mendukung filter berdasarkan status=active", async () => {
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/subscribers?status=active");
      await getSubscribers(req);

      expect(db.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        })
      );
    });

    it("harus mendukung pencarian berdasarkan email", async () => {
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/subscribers?search=google");
      await getSubscribers(req);

      expect(db.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: "google" },
          }),
        })
      );
    });

    it("harus mengembalikan status 500 jika terjadi kegagalan kueri database", async () => {
      vi.mocked(db.subscriber.findMany).mockRejectedValueOnce(
        new Error("Database connection closed")
      );

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PATCH /api/admin/subscribers/[id]
  // ---------------------------------------------------------------------------
  describe("PATCH /api/admin/subscribers/[id]", () => {
    it("harus mengubah status keaktifan pelanggan", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
        active: true,
      } as any);
      vi.mocked(db.subscriber.update).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
        active: false,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.subscriber.active).toBe(false);
    });

    it("harus mengembalikan status 404 jika pelanggan tidak ditemukan", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/not-found", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "not-found" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("harus mengembalikan status 400 jika payload aktif bukan boolean", async () => {
      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: "invalid" }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. DELETE /api/admin/subscribers/[id]
  // ---------------------------------------------------------------------------
  describe("DELETE /api/admin/subscribers/[id]", () => {
    it("harus menghapus pelanggan dengan sukses", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
      } as any);
      vi.mocked(db.subscriber.delete).mockResolvedValueOnce({ id: "sub-1" } as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.subscriber.delete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
    });

    it("harus mengembalikan 404 jika pelanggan yang ingin dihapus tidak ada", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/ghost", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "ghost" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Summary Metrics Calculation Isolation
  // ---------------------------------------------------------------------------
  describe("Admin Dashboard Summary Metrics Calculation Isolation", () => {
    interface AdminMetrics {
      totalPosts: number;
      publishedPosts: number;
      draftPosts: number;
      totalComments: number;
      pendingComments: number;
      approvedComments: number;
      spamComments: number;
      totalSubscribers?: number;
      activeSubscribers?: number;
    }

    // Pure helper function simulating admin page state updater
    function updateMetricsWithSubscribers(
      currentMetrics: AdminMetrics,
      subscriberData: { totalCount: number; activeCount: number }
    ): AdminMetrics {
      return {
        ...currentMetrics,
        totalSubscribers: subscriberData.totalCount,
        activeSubscribers: subscriberData.activeCount,
      };
    }

    it("harus memperbarui metrik subscriber tanpa mengubah metrik artikel dan komentar", () => {
      const initialMetrics: AdminMetrics = {
        totalPosts: 12,
        publishedPosts: 10,
        draftPosts: 2,
        totalComments: 35,
        pendingComments: 4,
        approvedComments: 28,
        spamComments: 3,
      };

      const subscriberPayload = {
        totalCount: 150,
        activeCount: 142,
      };

      const updated = updateMetricsWithSubscribers(initialMetrics, subscriberPayload);

      // Verifikasi metrik subscriber terpasang akurat
      expect(updated.totalSubscribers).toBe(150);
      expect(updated.activeSubscribers).toBe(142);

      // Verifikasi seluruh metrik post tetap utuh dan identik (zero regression)
      expect(updated.totalPosts).toBe(initialMetrics.totalPosts);
      expect(updated.publishedPosts).toBe(initialMetrics.publishedPosts);
      expect(updated.draftPosts).toBe(initialMetrics.draftPosts);

      // Verifikasi seluruh metrik komentar tetap utuh dan identik (zero regression)
      expect(updated.totalComments).toBe(initialMetrics.totalComments);
      expect(updated.pendingComments).toBe(initialMetrics.pendingComments);
      expect(updated.approvedComments).toBe(initialMetrics.approvedComments);
      expect(updated.spamComments).toBe(initialMetrics.spamComments);
    });

    it("harus menangani kasus ketika subscriber bertambah 0 tanpa merusak nilai awal", () => {
      const initialMetrics: AdminMetrics = {
        totalPosts: 5,
        publishedPosts: 5,
        draftPosts: 0,
        totalComments: 1,
        pendingComments: 0,
        approvedComments: 1,
        spamComments: 0,
      };

      const updated = updateMetricsWithSubscribers(initialMetrics, {
        totalCount: 0,
        activeCount: 0,
      });

      expect(updated.totalSubscribers).toBe(0);
      expect(updated.activeSubscribers).toBe(0);
      expect(updated.totalPosts).toBe(5);
    });
  });
});
