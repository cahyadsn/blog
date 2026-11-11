import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "admin_session";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "antigravity-admin-session-secret-key";

/**
 * Membuat tanda tangan HMAC-SHA256 menggunakan standar Web Crypto API
 * (kompatibel penuh dengan Edge Runtime dan Node.js).
 */
async function createSignature(data: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(SESSION_SECRET);
  const msgData = enc.encode(data);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifikasi kredensial username dan password admin
 */
export function validateAdminCredentials(username?: string, password?: string): boolean {
  if (!username || !password) return false;
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Membuat session token yang ditandatangani HMAC
 */
export async function generateSessionToken(username: string): Promise<string> {
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const sig = await createSignature(payload);
  const raw = `${payload}:${sig}`;
  if (typeof btoa !== "undefined") {
    return btoa(raw);
  }
  return Buffer.from(raw).toString("base64");
}

/**
 * Memverifikasi validitas session token (kadaluarsa setelah 7 hari)
 */
export async function verifySessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = typeof atob !== "undefined" ? atob(token) : Buffer.from(token, "base64").toString("utf-8");
    const [username, timestampStr, sig] = decoded.split(":");
    if (!username || !timestampStr || !sig) return false;

    const timestamp = parseInt(timestampStr, 10);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 hari
    if (Date.now() - timestamp > maxAge) return false;

    const expectedSig = await createSignature(`${username}:${timestampStr}`);
    return sig === expectedSig;
  } catch {
    return false;
  }
}

/**
 * Memeriksa apakah session admin saat ini valid dari cookies (Server Component / Action)
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);
  return verifySessionToken(sessionCookie?.value);
}
