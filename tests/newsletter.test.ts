import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/newsletter/subscribe/route";
import { SubscriberSchema } from "@/lib/validations";
import { db } from "@/lib/db";

// Mock @/lib/db for isolated Route Handler testing
vi.mock("@/lib/db", () => ({
  db: {
    subscriber: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Newsletter Subscription Test Suite (tests/newsletter.test.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Zod Validation Schema Unit Tests
  // ---------------------------------------------------------------------------
  describe("SubscriberSchema (src/lib/validations.ts)", () => {
    it("harus meloloskan format email yang valid", () => {
      const validCases = [
        "user@example.com",
        "john.doe@company.co.id",
        "tech+newsletter@domain.org",
        "developer_123@sub.domain.net",
      ];

      for (const email of validCases) {
        const result = SubscriberSchema.safeParse({ email });
        expect(result.success).toBe(true);
      }
    });

    it("harus menormalkan email menjadi huruf kecil dan membuang spasi di awal/akhir", () => {
      const result = SubscriberSchema.safeParse({
        email: "   Ahmad.Fauzi@Example.COM   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("ahmad.fauzi@example.com");
      }
    });

    it("harus menolak format email yang tidak valid", () => {
      const invalidCases = [
        "bukan-email",
        "user@",
        "@domain.com",
        "user@domain",
        "user @domain.com",
        "user..name@domain.com",
      ];

      for (const email of invalidCases) {
        const result = SubscriberSchema.safeParse({ email });
        expect(result.success).toBe(false);
      }
    });

    it("harus menolak string kosong, spasi, atau undefined", () => {
      expect(SubscriberSchema.safeParse({ email: "" }).success).toBe(false);
      expect(SubscriberSchema.safeParse({ email: "   " }).success).toBe(false);
      expect(SubscriberSchema.safeParse({}).success).toBe(false);
      expect(SubscriberSchema.safeParse(null).success).toBe(false);
    });

    it("harus menolak email yang melebihi 100 karakter", () => {
      const longEmail = "a".repeat(95) + "@domain.com"; // > 100 chars
      const result = SubscriberSchema.safeParse({ email: longEmail });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("terlalu panjang");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Subscription Route Handler Tests (POST /api/newsletter/subscribe)
  // ---------------------------------------------------------------------------
  describe("POST /api/newsletter/subscribe", () => {
    it("harus mendaftarkan email baru dan mengembalikan status 201 Created", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);
      const mockCreated = {
        id: "sub-123",
        email: "pembaca@example.com",
        active: true,
        createdAt: new Date(),
      };
      vi.mocked(db.subscriber.create).mockResolvedValueOnce(mockCreated as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "pembaca@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Terima kasih");
      expect(data.subscriber.email).toBe("pembaca@example.com");
      expect(db.subscriber.create).toHaveBeenCalledWith({
        data: {
          email: "pembaca@example.com",
          active: true,
        },
      });
    });

    it("harus mengembalikan status 200 dengan pesan informatif jika email sudah terdaftar (tanpa membuat duplikat)", async () => {
      const existingSubscriber = {
        id: "sub-123",
        email: "sudah.ada@example.com",
        active: true,
        createdAt: new Date(),
      };
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(existingSubscriber as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "sudah.ada@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alreadySubscribed).toBe(true);
      expect(data.message).toContain("sudah terdaftar");
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("harus mengaktifkan kembali (reactivate) pelanggan yang sebelumnya non-aktif dengan status 200", async () => {
      const inactiveSubscriber = {
        id: "sub-999",
        email: "reaktivasi@example.com",
        active: false,
        createdAt: new Date(),
      };
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(inactiveSubscriber as any);
      vi.mocked(db.subscriber.update).mockResolvedValueOnce({
        ...inactiveSubscriber,
        active: true,
      } as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reaktivasi@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("diaktifkan kembali");
      expect(db.subscriber.update).toHaveBeenCalledWith({
        where: { email: "reaktivasi@example.com" },
        data: { active: true },
      });
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("harus menormalkan email input menjadi lowercase dan trimmed sebelum kueri database", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.subscriber.create).mockResolvedValueOnce({
        id: "sub-321",
        email: "budi@example.com",
        active: true,
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "   BUDI@EXAMPLE.COM   " }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(db.subscriber.findUnique).toHaveBeenCalledWith({
        where: { email: "budi@example.com" },
      });
      expect(db.subscriber.create).toHaveBeenCalledWith({
        data: {
          email: "budi@example.com",
          active: true,
        },
      });
    });

    it("harus mengembalikan status 400 jika email tidak valid", async () => {
      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "email-salah" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(db.subscriber.findUnique).not.toHaveBeenCalled();
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("harus mengembalikan status 400 jika JSON payload rusak", async () => {
      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bukan-json }",
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("harus menangani race-condition unique violation (P2002) secara idempoten", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);
      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      vi.mocked(db.subscriber.create).mockRejectedValueOnce(p2002Error);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "concurrent@domain.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alreadySubscribed).toBe(true);
      expect(data.message).toContain("sudah terdaftar");
    });

    it("harus mengembalikan status 500 jika operasi database gagal", async () => {
      vi.mocked(db.subscriber.findUnique).mockRejectedValueOnce(new Error("Database crash"));

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});
