import { describe, it, expect } from "vitest";
import {
  validateAdminCredentials,
  generateSessionToken,
  verifySessionToken,
  verifyAdminRequest,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";

describe("Admin Authentication Unit Tests", () => {
  it("harus meloloskan kredensial admin default yang benar", () => {
    expect(validateAdminCredentials("admin", "admin123")).toBe(true);
  });

  it("harus menolak kredensial dengan password atau username yang salah", () => {
    expect(validateAdminCredentials("admin", "wrongpassword")).toBe(false);
    expect(validateAdminCredentials("unknown", "admin123")).toBe(false);
    expect(validateAdminCredentials("", "")).toBe(false);
    expect(validateAdminCredentials(undefined, undefined)).toBe(false);
  });

  it("harus membuat token session dan memverifikasinya secara akurat", async () => {
    const token = await generateSessionToken("admin");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const isValid = await verifySessionToken(token);
    expect(isValid).toBe(true);
  });

  it("harus menolak token yang dipalsukan atau diubah", async () => {
    const validToken = await generateSessionToken("admin");
    const tamperedToken = validToken.slice(0, -4) + "AAAA";
    expect(await verifySessionToken(tamperedToken)).toBe(false);
    expect(await verifySessionToken("bukan-token-valid")).toBe(false);
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
  });

  it("harus memvalidasi request dengan cookie admin_session yang sah via verifyAdminRequest", async () => {
    const token = await generateSessionToken("admin");
    const req = new Request("http://localhost:3000/api/admin/series", {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });

    const isAuth = await verifyAdminRequest(req);
    expect(isAuth).toBe(true);
  });

  it("harus menolak request tanpa cookie admin_session via verifyAdminRequest", async () => {
    const req = new Request("http://localhost:3000/api/admin/series");
    const isAuth = await verifyAdminRequest(req);
    expect(isAuth).toBe(false);
  });

  it("harus menolak request dengan cookie admin_session palsu via verifyAdminRequest", async () => {
    const req = new Request("http://localhost:3000/api/admin/series", {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=invalid-session-token`,
      },
    });
    const isAuth = await verifyAdminRequest(req);
    expect(isAuth).toBe(false);
  });
});
