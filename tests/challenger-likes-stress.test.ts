import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET, POST } from "@/app/api/posts/[id]/like/route";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

// Mock @/lib/db for controlled stress & boundary testing
vi.mock("@/lib/db", () => ({
  db: {
    post: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Challenger 1: Adversarial Stress Test Suite for Like/Clap Counter", () => {
  const TARGET_POST = {
    id: "clpost_challenger_target_01",
    slug: "post-stress-challenge-target",
    likes: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  afterEach(() => {
    resetRateLimit();
  });

  // =========================================================================
  // Challenge 1: Rapid Flooding / Spam Attack from a Single Client IP
  // =========================================================================
  describe("Challenge 1: Rapid Flooding & Rate Limiting Enforcement", () => {
    it("strictly allows requests up to limit=10 and blocks request 11+ with HTTP 429 and Retry-After", async () => {
      let currentLikes = 100;
      (vi.mocked(db.post.findFirst) as any).mockImplementation(async () => ({
        id: TARGET_POST.id,
        slug: TARGET_POST.slug,
        likes: currentLikes,
      } as any));

      (vi.mocked(db.post.update) as any).mockImplementation(async (args: any) => {
        const inc = args.data.likes.increment;
        currentLikes += inc;
        return { likes: currentLikes } as any;
      });

      const clientIp = "198.51.100.1";

      // 1. Send 10 rapid requests (the threshold)
      for (let i = 1; i <= 10; i++) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.slug}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": clientIp,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: 1 }),
        });

        const res = await POST(req, {
          params: Promise.resolve({ id: TARGET_POST.slug }),
        });

        expect(res.status, `Request ${i} should succeed with 200`).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.likes).toBe(100 + i);
      }

      // 2. Burst 5 additional spam requests (requests 11 through 15)
      for (let j = 11; j <= 15; j++) {
        const spamReq = new Request(`http://localhost:3000/api/posts/${TARGET_POST.slug}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": clientIp,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: 1 }),
        });

        const spamRes = await POST(spamReq, {
          params: Promise.resolve({ id: TARGET_POST.slug }),
        });

        expect(spamRes.status, `Flooding request ${j} must return HTTP 429`).toBe(429);
        
        // Verify Retry-After header
        const retryAfter = spamRes.headers.get("Retry-After");
        expect(retryAfter, "Retry-After header must be present on HTTP 429").not.toBeNull();
        expect(Number(retryAfter)).toBeGreaterThanOrEqual(1);
        expect(Number(retryAfter)).toBeLessThanOrEqual(10);

        const spamData = await spamRes.json();
        expect(spamData.success).toBe(false);
        expect(spamData.error).toMatch(/terlalu banyak permintaan/i);
        expect(spamData.retryAfter).toBe(Number(retryAfter));
      }

      // Ensure DB was not mutated by the blocked spam requests
      expect(currentLikes).toBe(110);
      expect(db.post.update).toHaveBeenCalledTimes(10);
    });

    it("verifies rate-limiting correctly applies when x-real-ip is provided instead of x-forwarded-for", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      vi.mocked(db.post.update).mockResolvedValue({ likes: 101 } as any);

      const clientIp = "198.51.100.99";

      for (let i = 0; i < 10; i++) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: { "x-real-ip": clientIp },
        });
        const res = await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
        expect(res.status).toBe(200);
      }

      // 11th request with x-real-ip
      const blockedReq = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: { "x-real-ip": clientIp },
      });
      const blockedRes = await POST(blockedReq, { params: Promise.resolve({ id: TARGET_POST.id }) });
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    });
  });

  // =========================================================================
  // Challenge 2: Multi-Client IP Isolation
  // =========================================================================
  describe("Challenge 2: Multi-Client IP Isolation & Header Edge Cases", () => {
    it("ensures Client A's exhausted rate limit does not degrade or block Client B, C, or D", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      vi.mocked(db.post.update).mockResolvedValue({ likes: 101 } as any);

      const ipAttacker = "203.0.113.10";
      const ipInnocentB = "203.0.113.20";
      const ipInnocentC = "192.0.2.77";
      const ipInnocentD = "2001:db8:85a3::8a2e:370:7334"; // IPv6 address

      // Attacker exhausts their 10 quota
      for (let i = 0; i < 10; i++) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: { "x-forwarded-for": ipAttacker },
        });
        await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
      }

      // Attacker gets 429
      const attackerReq = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: { "x-forwarded-for": ipAttacker },
      });
      const attackerRes = await POST(attackerReq, { params: Promise.resolve({ id: TARGET_POST.id }) });
      expect(attackerRes.status).toBe(429);

      // Innocent clients B, C, and D must succeed
      for (const innocentIp of [ipInnocentB, ipInnocentC, ipInnocentD]) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: { "x-forwarded-for": innocentIp },
        });
        const res = await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
        expect(res.status, `Innocent IP ${innocentIp} must NOT be blocked`).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    it("correctly extracts client IP from multi-hop proxy chains in x-forwarded-for", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      vi.mocked(db.post.update).mockResolvedValue({ likes: 101 } as any);

      // Shared corporate proxy downstream: 10.0.0.1
      // Client 1: 172.16.0.5 via 10.0.0.1
      // Client 2: 172.16.0.6 via 10.0.0.1
      const headerClient1 = "172.16.0.5, 10.0.0.1, 10.0.0.2";
      const headerClient2 = "172.16.0.6, 10.0.0.1, 10.0.0.2";

      // Exhaust client 1
      for (let i = 0; i < 10; i++) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: { "x-forwarded-for": headerClient1 },
        });
        await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
      }

      // Client 1 is blocked
      const reqBlocked = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: { "x-forwarded-for": headerClient1 },
      });
      const resBlocked = await POST(reqBlocked, { params: Promise.resolve({ id: TARGET_POST.id }) });
      expect(resBlocked.status).toBe(429);

      // Client 2 must NOT be blocked even though they share proxy 10.0.0.1
      const reqClient2 = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: { "x-forwarded-for": headerClient2 },
      });
      const resClient2 = await POST(reqClient2, { params: Promise.resolve({ id: TARGET_POST.id }) });
      expect(resClient2.status).toBe(200);
    });
  });

  // =========================================================================
  // Challenge 3: Concurrent Like Requests (Simulated Race Condition)
  // =========================================================================
  describe("Challenge 3: High Concurrency & Atomic Increment Integrity", () => {
    it("handles 20 concurrent requests simultaneously without dropping increments or corrupting state", async () => {
      let persistentLikes = 50;
      const updateCalls: number[] = [];

      (vi.mocked(db.post.findFirst) as any).mockImplementation(async () => ({
        id: TARGET_POST.id,
        slug: TARGET_POST.slug,
        likes: persistentLikes,
      } as any));

      (vi.mocked(db.post.update) as any).mockImplementation(async (args: any) => {
        const inc = args.data.likes.increment;
        updateCalls.push(inc);
        persistentLikes += inc;
        return { likes: persistentLikes } as any;
      });

      // Dispatch 20 concurrent requests from 20 distinct client IPs
      const concurrentRequests = Array.from({ length: 20 }, (_, idx) => {
        const clientIp = `198.18.0.${idx + 1}`;
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.slug}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": clientIp,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: 1 }),
        });
        return POST(req, { params: Promise.resolve({ id: TARGET_POST.slug }) });
      });

      const responses = await Promise.all(concurrentRequests);

      // All 20 requests must complete with HTTP 200
      for (const res of responses) {
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      }

      // Exactly 20 updates must have been dispatched
      expect(updateCalls.length).toBe(20);
      expect(updateCalls.every((inc) => inc === 1)).toBe(true);
      expect(persistentLikes).toBe(70);
    });

    it("handles concurrent batch increments with variable amounts correctly", async () => {
      let persistentLikes = 0;
      const amounts = [1, 5, 10, 2, 7, 3, 20, 4, 15, 8];
      const expectedTotal = amounts.reduce((sum, n) => sum + n, 0); // 75

      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      (vi.mocked(db.post.update) as any).mockImplementation(async (args: any) => {
        const inc = args.data.likes.increment;
        persistentLikes += inc;
        return { likes: persistentLikes } as any;
      });

      const batchRequests = amounts.map((amount, idx) => {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": `192.168.100.${idx + 1}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        });
        return POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
      });

      const responses = await Promise.all(batchRequests);
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      expect(persistentLikes).toBe(expectedTotal);
    });
  });

  // =========================================================================
  // Challenge 4: Dual-Lookup Parity (CUID vs Slug)
  // =========================================================================
  describe("Challenge 4: Dual-Lookup Parity (CUID ID vs Slug)", () => {
    it("guarantees identical post resolution and state mutation regardless of lookup type", async () => {
      let currentLikes = 42;
      const updatedPostIds: string[] = [];

      (vi.mocked(db.post.findFirst) as any).mockImplementation(async (args: any) => {
        const orConditions = args.where.OR;
        const lookupVal = orConditions[0].id; // orConditions[1].slug is same identifier

        if (lookupVal === TARGET_POST.id || lookupVal === TARGET_POST.slug) {
          return { id: TARGET_POST.id, slug: TARGET_POST.slug, likes: currentLikes } as any;
        }
        return null;
      });

      (vi.mocked(db.post.update) as any).mockImplementation(async (args: any) => {
        updatedPostIds.push(args.where.id);
        currentLikes += args.data.likes.increment;
        return { likes: currentLikes } as any;
      });

      // 1. Like via Slug
      const reqSlug = new Request(`http://localhost:3000/api/posts/${TARGET_POST.slug}/like`, {
        method: "POST",
        headers: { "x-forwarded-for": "10.10.1.1" },
      });
      const resSlug = await POST(reqSlug, { params: Promise.resolve({ id: TARGET_POST.slug }) });
      const dataSlug = await resSlug.json();

      expect(resSlug.status).toBe(200);
      expect(dataSlug.likes).toBe(43);

      // 2. Like via CUID
      const reqCuid = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: { "x-forwarded-for": "10.10.1.2" },
      });
      const resCuid = await POST(reqCuid, { params: Promise.resolve({ id: TARGET_POST.id }) });
      const dataCuid = await resCuid.json();

      expect(resCuid.status).toBe(200);
      expect(dataCuid.likes).toBe(44);

      // Both must have updated the underlying target post ID
      expect(updatedPostIds).toEqual([TARGET_POST.id, TARGET_POST.id]);

      // 3. GET parity: GET via CUID vs GET via Slug
      const getCuid = await GET(
        new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`),
        { params: Promise.resolve({ id: TARGET_POST.id }) }
      );
      const getSlug = await GET(
        new Request(`http://localhost:3000/api/posts/${TARGET_POST.slug}/like`),
        { params: Promise.resolve({ id: TARGET_POST.slug }) }
      );

      const jsonCuid = await getCuid.json();
      const jsonSlug = await getSlug.json();

      expect(jsonCuid.likes).toBe(44);
      expect(jsonSlug.likes).toBe(44);
      expect(jsonCuid.likes).toBe(jsonSlug.likes);
    });
  });

  // =========================================================================
  // Challenge 5: Hostile Input Handling & Injection Vectors
  // =========================================================================
  describe("Challenge 5: Hostile Inputs, Edge Cases & Injection Attacks", () => {
    it("handles empty strings, pure whitespace, and missing identifiers with HTTP 400", async () => {
      const hostileIdentifiers = ["", "   ", "\t\t", "\n\r", "   \n   "];

      for (const badId of hostileIdentifiers) {
        // POST test
        const postReq = new Request("http://localhost:3000/api/posts/bad/like", {
          method: "POST",
          headers: { "x-forwarded-for": `10.20.${Math.random()}` },
        });
        const postRes = await POST(postReq, { params: Promise.resolve({ id: badId }) });
        expect(postRes.status, `Identifier '${badId}' must return 400 on POST`).toBe(400);

        // GET test
        const getReq = new Request("http://localhost:3000/api/posts/bad/like");
        const getRes = await GET(getReq, { params: Promise.resolve({ id: badId }) });
        expect(getRes.status, `Identifier '${badId}' must return 400 on GET`).toBe(400);
      }

      expect(db.post.findFirst).not.toHaveBeenCalled();
      expect(db.post.update).not.toHaveBeenCalled();
    });

    it("safely handles SQL injection attempts in identifier without 500 error", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(null);

      const sqlInjections = [
        "' OR '1'='1",
        "post-1'; DROP TABLE Post; --",
        "slug' UNION SELECT * FROM User --",
        "1; WAITFOR DELAY '0:0:5'",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      for (const payload of sqlInjections) {
        const req = new Request("http://localhost:3000/api/posts/payload/like", {
          method: "POST",
          headers: { "x-forwarded-for": `10.30.${Math.random()}` },
        });

        const res = await POST(req, { params: Promise.resolve({ id: payload }) });
        // Must safely return 404 Not Found without SQL crash
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain("tidak ditemukan");
      }
    });

    it("safely handles XSS and Path Traversal payloads in identifier", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(null);

      const hostilePayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert(1)",
        "../../../../etc/passwd",
        "..\\..\\windows\\win.ini",
        "%00%2e%2e%2f",
      ];

      for (const payload of hostilePayloads) {
        const req = new Request("http://localhost:3000/api/posts/payload/like", {
          method: "POST",
          headers: { "x-forwarded-for": `10.40.${Math.random()}` },
        });

        const res = await POST(req, { params: Promise.resolve({ id: payload }) });
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    it("rejects malicious or out-of-range batch amounts and falls back safely to 1", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      
      const capturedIncrements: number[] = [];
      (vi.mocked(db.post.update) as any).mockImplementation(async (args: any) => {
        capturedIncrements.push(args.data.likes.increment);
        return { likes: 101 } as any;
      });

      const adversarialBodies = [
        { amount: -50 },           // Negative integer (must NOT decrement)
        { amount: -0.001 },        // Negative float
        { amount: 0 },             // Zero
        { amount: 9999999 },       // Excessively large amount (DDoS counter inflation)
        { amount: 21 },            // Over max threshold of 20
        { amount: "10" },          // String instead of number
        { amount: null },          // Null
        { amount: NaN },           // NaN
        { amount: Infinity },      // Infinity
        { amount: [5] },           // Array
        { amount: { nested: 5 } }, // Object
      ];

      for (let i = 0; i < adversarialBodies.length; i++) {
        const body = adversarialBodies[i];
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": `10.50.0.${i + 1}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const res = await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
        expect(res.status).toBe(200);
      }

      // Every single adversarial body must have been clamped or fallen back strictly to 1
      expect(capturedIncrements.length).toBe(adversarialBodies.length);
      expect(capturedIncrements.every((inc) => inc === 1)).toBe(true);
    });

    it("handles invalid or non-JSON request bodies gracefully", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      vi.mocked(db.post.update).mockResolvedValue({ likes: 101 } as any);

      const invalidBodies = [
        "not a json at all",
        "{malformed json: true,",
        "",
      ];

      for (let i = 0; i < invalidBodies.length; i++) {
        const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
          method: "POST",
          headers: {
            "x-forwarded-for": `10.60.0.${i + 1}`,
            "Content-Type": "application/json",
          },
          body: invalidBodies[i],
        });

        const res = await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(db.post.update).toHaveBeenLastCalledWith(
          expect.objectContaining({
            data: { likes: { increment: 1 } },
          })
        );
      }
    });

    it("handles prototype pollution payloads safely without polluting Object.prototype", async () => {
      vi.mocked(db.post.findFirst).mockResolvedValue(TARGET_POST as any);
      vi.mocked(db.post.update).mockResolvedValue({ likes: 101 } as any);

      const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "amount": 2}');

      const req = new Request(`http://localhost:3000/api/posts/${TARGET_POST.id}/like`, {
        method: "POST",
        headers: {
          "x-forwarded-for": "10.70.0.1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(maliciousPayload),
      });

      const res = await POST(req, { params: Promise.resolve({ id: TARGET_POST.id }) });
      expect(res.status).toBe(200);

      // Verify Object.prototype is unpolluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });
});
