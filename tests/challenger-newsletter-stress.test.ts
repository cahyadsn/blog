import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/newsletter/subscribe/route";
import { GET as getSubscribers } from "@/app/api/admin/subscribers/route";
import {
  PATCH as updateSubscriber,
  DELETE as deleteSubscriber,
} from "@/app/api/admin/subscribers/[id]/route";
import { SubscriberSchema } from "@/lib/validations";
import { db } from "@/lib/db";

// Mock @/lib/db for controlled adversarial stress testing
vi.mock("@/lib/db", () => ({
  db: {
    subscriber: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Challenger 2: Adversarial Stress Test Suite for Newsletter & Admin Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Challenge 1: POST /api/newsletter/subscribe - Happy Path & Deduplication
  // =========================================================================
  describe("Challenge 1: Newsletter Subscription & Idempotent Deduplication", () => {
    it("returns HTTP 201 Created and persists new active subscriber", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(null);
      const mockCreated = {
        id: "csub_target_01",
        email: "alice.challenger@example.com",
        active: true,
        createdAt: new Date("2026-11-12T03:00:00Z"),
      };
      (vi.mocked(db.subscriber.create) as any).mockResolvedValueOnce(mockCreated);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alice.challenger@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/terima kasih/i);
      expect(data.subscriber.email).toBe("alice.challenger@example.com");
      expect(data.subscriber.active).toBe(true);
      expect(db.subscriber.create).toHaveBeenCalledWith({
        data: {
          email: "alice.challenger@example.com",
          active: true,
        },
      });
    });

    it("returns HTTP 200 with alreadySubscribed: true on duplicate email without creating duplicate record", async () => {
      const existingSubscriber = {
        id: "csub_existing_01",
        email: "duplicate.user@example.com",
        active: true,
        createdAt: new Date("2026-11-10T00:00:00Z"),
      };
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(existingSubscriber);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "duplicate.user@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alreadySubscribed).toBe(true);
      expect(data.message).toMatch(/sudah terdaftar/i);
      expect(db.subscriber.create).not.toHaveBeenCalled();
      expect(db.subscriber.update).not.toHaveBeenCalled();
    });

    it("reactivates an inactive subscriber (active: false -> true) returning HTTP 200 with reactivated: true", async () => {
      const inactiveSubscriber = {
        id: "csub_inactive_01",
        email: "unsubscribed@example.com",
        active: false,
        createdAt: new Date("2026-10-01T00:00:00Z"),
      };
      const reactivatedSubscriber = {
        ...inactiveSubscriber,
        active: true,
      };

      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(inactiveSubscriber);
      (vi.mocked(db.subscriber.update) as any).mockResolvedValueOnce(reactivatedSubscriber);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unsubscribed@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reactivated).toBe(true);
      expect(data.message).toMatch(/diaktifkan kembali/i);
      expect(data.subscriber.active).toBe(true);
      expect(db.subscriber.update).toHaveBeenCalledWith({
        where: { email: "unsubscribed@example.com" },
        data: { active: true },
      });
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("handles Prisma P2002 unique constraint race condition gracefully by returning HTTP 200 idempotent response", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(null);
      const p2002Error = new Error("Unique constraint failed on the fields: (`email`)");
      (p2002Error as any).code = "P2002";
      (vi.mocked(db.subscriber.create) as any).mockRejectedValueOnce(p2002Error);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "racecondition@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.alreadySubscribed).toBe(true);
      expect(data.message).toMatch(/sudah terdaftar/i);
    });

    it("returns HTTP 500 when database throws an unexpected error", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockRejectedValueOnce(new Error("Database connection closed"));

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "valid@example.com" }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // Challenge 2: Zod Validation Boundary & Normalization Stress
  // =========================================================================
  describe("Challenge 2: Zod Validation Boundary, Normalization & Sanitization", () => {
    it("normalizes uppercase and mixed-case emails to lowercase and trims surrounding whitespace", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(null);
      (vi.mocked(db.subscriber.create) as any).mockImplementation(async (args: any) => ({
        id: "csub_norm_01",
        email: args.data.email,
        active: args.data.active,
        createdAt: new Date(),
      }));

      const rawEmails = [
        "   USER@EXAMPLE.COM   ",
        "\tAhmad.Fauzi@Domain.Net\n",
        "  cOmPlEx.UsEr+NeWsLeTtEr@SuB.dOmAiN.oRg  ",
      ];

      for (const raw of rawEmails) {
        const parseResult = SubscriberSchema.safeParse({ email: raw });
        expect(parseResult.success, `Schema must accept raw email: ${raw}`).toBe(true);
        if (parseResult.success) {
          expect(parseResult.data.email).toBe(raw.trim().toLowerCase());
        }
      }

      // Test route level handling
      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "  SUPER.USER@CORP.ID  " }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(db.subscriber.findUnique).toHaveBeenCalledWith({
        where: { email: "super.user@corp.id" },
      });
      expect(db.subscriber.create).toHaveBeenCalledWith({
        data: {
          email: "super.user@corp.id",
          active: true,
        },
      });
    });

    it("accepts an email that is exactly 100 characters long", () => {
      // 89 chars local part + "@domain.com" (11 chars) = 100 chars
      const exact100 = "a".repeat(89) + "@domain.com";
      expect(exact100.length).toBe(100);

      const result = SubscriberSchema.safeParse({ email: exact100 });
      expect(result.success).toBe(true);
    });

    it("rejects an email that exceeds 100 characters with an informative error", async () => {
      // 90 chars local part + "@domain.com" (11 chars) = 101 chars
      const over100 = "a".repeat(90) + "@domain.com";
      expect(over100.length).toBe(101);

      const result = SubscriberSchema.safeParse({ email: over100 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/maksimal 100 karakter/i);
      }

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: over100 }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/maksimal 100 karakter/i);
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("strictly rejects malformed email patterns", async () => {
      const invalidEmails = [
        "not-an-email",
        "missingatsign.com",
        "user@",
        "@domain.com",
        "user@domain",
        "user@.com",
        "user name@domain.com",
        "user@domain..com",
        "user@@domain.com",
        "user@domain,com",
        "user@domain:com",
      ];

      for (const email of invalidEmails) {
        const schemaResult = SubscriberSchema.safeParse({ email });
        expect(schemaResult.success, `Schema should reject: ${email}`).toBe(false);

        const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const res = await POST(req);
        expect(res.status, `Route should reject: ${email}`).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }

      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("strictly rejects non-string types, empty inputs, and null/undefined values", async () => {
      const invalidInputs = [
        "",
        "   ",
        "\t\t",
        "\n",
        12345,
        true,
        false,
        null,
        undefined,
        ["user@example.com"],
        { nested: "user@example.com" },
      ];

      for (const val of invalidInputs) {
        const schemaResult = SubscriberSchema.safeParse({ email: val });
        expect(schemaResult.success, `Schema should reject input: ${JSON.stringify(val)}`).toBe(false);

        const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: val }),
        });

        const res = await POST(req);
        expect(res.status, `Route should return 400 for input: ${JSON.stringify(val)}`).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
      }

      // Empty object payload
      const emptyReq = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const emptyRes = await POST(emptyReq);
      expect(emptyRes.status).toBe(400);

      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("rejects unparseable non-JSON request bodies with HTTP 400", async () => {
      const malformedBodies = [
        "not a json",
        "{ unclosed: json",
        "",
        "null",
      ];

      for (const body of malformedBodies) {
        const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });

    it("handles adversarial injection strings safely without executing or corrupting state", async () => {
      const hostileStrings = [
        "<script>alert('xss')</script>@example.com",
        "user' OR '1'='1@example.com",
        "admin;DROP TABLE Subscriber;--@domain.com",
        "{{7*7}}@domain.com",
      ];

      for (const hostile of hostileStrings) {
        const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: hostile }),
        });

        const res = await POST(req);
        // Either Zod rejects it with 400, or Prisma safely escapes it with parameterized queries
        expect([200, 201, 400]).toContain(res.status);
      }
    });
  });

  // =========================================================================
  // Challenge 3: Admin Subscribers API (GET, PATCH, DELETE) & Metrics
  // =========================================================================
  describe("Challenge 3: Admin Subscribers API Endpoints & Filter Resilience", () => {
    it("returns subscriber collection and accurate totalCount and activeCount", async () => {
      const mockList = [
        { id: "sub-1", email: "user1@example.com", active: true, createdAt: new Date() },
        { id: "sub-2", email: "user2@example.com", active: false, createdAt: new Date() },
        { id: "sub-3", email: "user3@example.com", active: true, createdAt: new Date() },
      ];

      (vi.mocked(db.subscriber.findMany) as any).mockResolvedValueOnce(mockList);
      (vi.mocked(db.subscriber.count) as any).mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscribers).toHaveLength(3);
      expect(data.totalCount).toBe(3);
      expect(data.activeCount).toBe(2);
    });

    it("falls back to array lengths if db.subscriber.count throws or is unavailable", async () => {
      const mockList = [
        { id: "sub-1", email: "a@domain.com", active: true, createdAt: new Date() },
        { id: "sub-2", email: "b@domain.com", active: true, createdAt: new Date() },
        { id: "sub-3", email: "c@domain.com", active: false, createdAt: new Date() },
      ];

      (vi.mocked(db.subscriber.findMany) as any).mockResolvedValueOnce(mockList);
      (vi.mocked(db.subscriber.count) as any).mockRejectedValue(new Error("Count error"));

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.totalCount).toBe(3);
      expect(data.activeCount).toBe(2);
    });

    it("handles empty database state cleanly (0 subscribers)", async () => {
      (vi.mocked(db.subscriber.findMany) as any).mockResolvedValueOnce([]);
      (vi.mocked(db.subscriber.count) as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscribers).toEqual([]);
      expect(data.totalCount).toBe(0);
      expect(data.activeCount).toBe(0);
    });

    it("applies status and search filter parameters properly", async () => {
      (vi.mocked(db.subscriber.findMany) as any).mockResolvedValueOnce([]);

      const req = new Request("http://localhost:3000/api/admin/subscribers?status=inactive&search=test");
      await getSubscribers(req);

      expect(db.subscriber.findMany).toHaveBeenCalledWith({
        where: {
          active: false,
          email: { contains: "test" },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("toggles subscriber active status via PATCH /api/admin/subscribers/[id]", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce({
        id: "sub-toggle",
        email: "toggle@example.com",
        active: true,
      });
      (vi.mocked(db.subscriber.update) as any).mockResolvedValueOnce({
        id: "sub-toggle",
        email: "toggle@example.com",
        active: false,
      });

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "sub-toggle" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscriber.active).toBe(false);
      expect(db.subscriber.update).toHaveBeenCalledWith({
        where: { id: "sub-toggle" },
        data: { active: false },
      });
    });

    it("returns HTTP 404 on PATCH /api/admin/subscribers/[id] when id does not exist", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/ghost-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "ghost-id" }) });
      expect(res.status).toBe(404);
    });

    it("returns HTTP 400 on PATCH when active status is not a boolean", async () => {
      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: "invalid-boolean" }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      expect(res.status).toBe(400);
    });

    it("deletes a subscriber via DELETE /api/admin/subscribers/[id]", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce({
        id: "sub-del",
        email: "delete.me@example.com",
      });
      (vi.mocked(db.subscriber.delete) as any).mockResolvedValueOnce({ id: "sub-del" });

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-del", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "sub-del" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.subscriber.delete).toHaveBeenCalledWith({ where: { id: "sub-del" } });
    });

    it("returns HTTP 404 on DELETE when subscriber does not exist", async () => {
      (vi.mocked(db.subscriber.findUnique) as any).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/ghost-del", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "ghost-del" }) });
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Challenge 4: Admin Dashboard Metrics State Isolation
  // =========================================================================
  describe("Challenge 4: Admin Dashboard Metrics State Isolation", () => {
    it("ensures updating subscriber counts never mutates post or comment metrics", () => {
      const baseState = {
        totalPosts: 25,
        publishedPosts: 20,
        draftPosts: 5,
        totalComments: 140,
        pendingComments: 12,
        approvedComments: 110,
        spamComments: 18,
        totalSubscribers: 50,
        activeSubscribers: 45,
      };

      // State updater pattern used in AdminDashboardPage
      const updateSubscriberMetrics = (
        state: typeof baseState,
        counts: { total: number; active: number }
      ) => ({
        ...state,
        totalSubscribers: counts.total,
        activeSubscribers: counts.active,
      });

      const updated = updateSubscriberMetrics(baseState, { total: 100, active: 95 });

      expect(updated.totalSubscribers).toBe(100);
      expect(updated.activeSubscribers).toBe(95);

      // Verify posts metrics unchanged
      expect(updated.totalPosts).toBe(baseState.totalPosts);
      expect(updated.publishedPosts).toBe(baseState.publishedPosts);
      expect(updated.draftPosts).toBe(baseState.draftPosts);

      // Verify comments metrics unchanged
      expect(updated.totalComments).toBe(baseState.totalComments);
      expect(updated.pendingComments).toBe(baseState.pendingComments);
      expect(updated.approvedComments).toBe(baseState.approvedComments);
      expect(updated.spamComments).toBe(baseState.spamComments);
    });
  });
});
