import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { POST as uploadMedia } from "@/app/api/admin/media/upload/route";
import { GET as getMediaList, DELETE as deleteMediaByQuery } from "@/app/api/admin/media/route";
import { DELETE as deleteMediaById, GET as getMediaById } from "@/app/api/admin/media/[id]/route";
import {
  UPLOAD_DIR,
  ensureUploadDir,
  validateImageBuffer,
  validateUploadFile,
  sanitizeFilename,
  getSafeFilePath,
  MAX_FILE_SIZE,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, generateSessionToken } from "@/lib/auth";

describe("Adversarial Challenger Test Suite: Media Storage & Security", () => {
  let adminCookie: string;
  const createdTestFiles: string[] = [];

  // Minimal valid headers
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const validGifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const validWebpHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46,
    0x20, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ]);
  const validSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>';

  beforeAll(async () => {
    await ensureUploadDir();
    const token = await generateSessionToken("admin");
    adminCookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`;
  });

  afterAll(async () => {
    for (const filename of createdTestFiles) {
      try {
        const filePath = path.join(UPLOAD_DIR, filename);
        await fs.unlink(filePath);
      } catch {
        // file may have already been deleted
      }
    }
  });

  function makeUploadReq(file: File | Blob | null, cookieHeader: string = adminCookie): Request {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    return new Request("http://localhost:3000/api/admin/media/upload", {
      method: "POST",
      headers: { Cookie: cookieHeader },
      body: formData,
    });
  }

  // =========================================================================
  // SECTION 1: Pure Unit Adversarial Validation
  // =========================================================================
  describe("Unit Adversarial: Buffer Validation & Magic Byte Spoofing", () => {
    it("rejects 0-byte buffer with explicit error", () => {
      const res = validateImageBuffer(Buffer.alloc(0), "image/png");
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/tidak boleh kosong/i);
    });

    it("rejects PNG buffer with truncated or corrupted header", () => {
      // 7 bytes (truncated)
      const truncated = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]);
      expect(validateImageBuffer(truncated, "image/png").valid).toBe(false);

      // Wrong 1st byte
      const wrongFirst = Buffer.from([0x88, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateImageBuffer(wrongFirst, "image/png").valid).toBe(false);

      // Random text
      const fake = Buffer.from("Hello world not a PNG");
      expect(validateImageBuffer(fake, "image/png").valid).toBe(false);
    });

    it("rejects JPEG buffer with invalid SOI marker", () => {
      // FF D8 00 instead of FF D8 FF
      const corrupted = Buffer.from([0xff, 0xd8, 0x00, 0xe0]);
      expect(validateImageBuffer(corrupted, "image/jpeg").valid).toBe(false);

      // Truncated to 2 bytes
      const short = Buffer.from([0xff, 0xd8]);
      expect(validateImageBuffer(short, "image/jpeg").valid).toBe(false);

      // PHP masquerading as JPEG
      const phpPayload = Buffer.from("<?php system($_GET['cmd']); ?>");
      expect(validateImageBuffer(phpPayload, "image/jpeg").valid).toBe(false);
    });

    it("rejects GIF buffer with non-GIF8 magic bytes", () => {
      const fakeGif = Buffer.from("GIF79a");
      expect(validateImageBuffer(fakeGif, "image/gif").valid).toBe(false);

      const corrupted = Buffer.from([0x47, 0x49, 0x46, 0x30]);
      expect(validateImageBuffer(corrupted, "image/gif").valid).toBe(false);
    });

    it("rejects WebP buffer without RIFF or WEBP sub-header", () => {
      // Missing WEBP at offset 8
      const notWebp = Buffer.from("RIFF1234NOTW");
      expect(validateImageBuffer(notWebp, "image/webp").valid).toBe(false);

      // Missing RIFF at offset 0
      const notRiff = Buffer.from("RAFF1234WEBP");
      expect(validateImageBuffer(notRiff, "image/webp").valid).toBe(false);

      // Less than 12 bytes
      const short = Buffer.from("RIFFWEBP");
      expect(validateImageBuffer(short, "image/webp").valid).toBe(false);
    });

    it("detects SVG XSS payloads (script tags, event handlers, javascript URIs)", () => {
      // Missing <svg tag
      expect(validateImageBuffer(Buffer.from("<p>Just text</p>"), "image/svg+xml").valid).toBe(false);

      // Lowercase <script>
      const svgScript = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      expect(validateImageBuffer(svgScript, "image/svg+xml").valid).toBe(false);

      // Uppercase <SCRIPT>
      const svgScriptUpper = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT src="evil.js"></SCRIPT></svg>');
      expect(validateImageBuffer(svgScriptUpper, "image/svg+xml").valid).toBe(false);

      // onload event handler
      const svgOnload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
      expect(validateImageBuffer(svgOnload, "image/svg+xml").valid).toBe(false);

      // onerror event handler
      const svgOnerror = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image onerror="alert(1)"/></svg>');
      expect(validateImageBuffer(svgOnerror, "image/svg+xml").valid).toBe(false);

      // javascript: URI
      const svgJsUri = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><circle r="1"/></a></svg>');
      expect(validateImageBuffer(svgJsUri, "image/svg+xml").valid).toBe(false);
    });

    it("rejects unsupported MIME types in validateImageBuffer", () => {
      const res = validateImageBuffer(Buffer.from("some buffer"), "application/x-php");
      expect(res.valid).toBe(false);
    });
  });

  describe("Unit Adversarial: Filename Sanitization & Traversal Prevention", () => {
    it("strips path traversal tokens from filenames", () => {
      expect(sanitizeFilename("../../../etc/passwd.png")).toBe("passwd.png");
      expect(sanitizeFilename("..\\..\\windows\\system32\\cmd.exe.jpg")).toBe("cmd-exe.jpg");
      expect(sanitizeFilename("foo/bar/baz.webp")).toBe("baz.webp");
    });

    it("strips null bytes and neutralizes double extensions from filenames", () => {
      expect(sanitizeFilename("shell\0.php.png")).toBe("shell-php.png");
      expect(sanitizeFilename("malicious\0\0.gif")).toBe("malicious.gif");
    });

    it("replaces dangerous non-alphanumeric characters with hyphens", () => {
      expect(sanitizeFilename("my special & dangerous @ file!.png")).toBe("my-special-dangerous-file.png");
    });

    it("handles null, empty, or undefined filename gracefully", () => {
      expect(sanitizeFilename("")).toBe("media");
      expect(sanitizeFilename(null as unknown as string)).toBe("media");
      expect(sanitizeFilename(undefined as unknown as string)).toBe("media");
    });

    it("getSafeFilePath strictly blocks path traversal vectors", () => {
      expect(getSafeFilePath("../package.json")).toBeNull();
      expect(getSafeFilePath("..\\package.json")).toBeNull();
      expect(getSafeFilePath("../../.env")).toBeNull();
      expect(getSafeFilePath("..%2Fpackage.json")).toBeNull();
      expect(getSafeFilePath("%2e%2e%2fpackage.json")).toBeNull();
      expect(getSafeFilePath("foo/bar.png")).toBeNull();
      expect(getSafeFilePath("foo\\bar.png")).toBeNull();
      expect(getSafeFilePath("shell\0.png")).toBeNull();
      expect(getSafeFilePath(".")).toBeNull();
      expect(getSafeFilePath("..")).toBeNull();
      expect(getSafeFilePath("")).toBeNull();
    });

    it("getSafeFilePath allows valid filenames resolved strictly inside UPLOAD_DIR", () => {
      const safe = getSafeFilePath("12345-abc-photo.png");
      expect(safe).not.toBeNull();
      expect(safe!.safeName).toBe("12345-abc-photo.png");
      expect(safe!.safePath).toBe(path.join(UPLOAD_DIR, "12345-abc-photo.png"));
    });
  });

  // =========================================================================
  // SECTION 2: Boundary Size Tests (POST /api/admin/media/upload)
  // =========================================================================
  describe("API Adversarial: Boundary Size Conditions", () => {
    it("accepts file at the exact 5MB limit (5,242,880 bytes)", async () => {
      const buffer5MB = Buffer.alloc(MAX_FILE_SIZE);
      validPngHeader.copy(buffer5MB, 0);

      const file = new File([buffer5MB], "boundary-5mb.png", { type: "image/png" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.size).toBe(5242880);
      createdTestFiles.push(data.media.name);
    });

    it("rejects file exceeding 5MB limit by exactly 1 byte (5,242,881 bytes)", async () => {
      const buffer5MBPlus1 = Buffer.alloc(MAX_FILE_SIZE + 1);
      validPngHeader.copy(buffer5MBPlus1, 0);

      const file = new File([buffer5MBPlus1], "boundary-5mb-plus-1.png", { type: "image/png" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("melebihi batas 5MB");
    });

    it("rejects 0-byte empty file", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const file = new File([emptyBuffer], "zero-byte.png", { type: "image/png" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak boleh kosong");
    });

    it("validates metadata with validateUploadFile helper directly", () => {
      expect(validateUploadFile({ size: 0, type: "image/png" }).valid).toBe(false);
      expect(validateUploadFile({ size: MAX_FILE_SIZE, type: "image/png" }).valid).toBe(true);
      expect(validateUploadFile({ size: MAX_FILE_SIZE + 1, type: "image/png" }).valid).toBe(false);
      expect(validateUploadFile({ size: 100, type: "text/plain" }).valid).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: MIME Spoofing & Malicious Content
  // =========================================================================
  describe("API Adversarial: MIME Spoofing & Malicious Content", () => {
    it("rejects executable disguised as PNG with image/png MIME", async () => {
      // Windows PE MZ executable header
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);
      const file = new File([exeBuffer], "trojan.png", { type: "image/png" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("magic bytes tidak valid");
    });

    it("rejects PHP script disguised as JPEG with image/jpeg MIME", async () => {
      const phpScript = Buffer.from("<?php echo 'Hacked!'; passthru($_GET['c']); ?>");
      const file = new File([phpScript], "backdoor.jpg", { type: "image/jpeg" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("magic bytes tidak valid");
    });

    it("rejects HTML/JS payload disguised as SVG with image/svg+xml MIME", async () => {
      const htmlPayload = Buffer.from('<html><head><script>alert("XSS")</script></head><body>evil</body></html>');
      const file = new File([htmlPayload], "evil.svg", { type: "image/svg+xml" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("elemen <svg> tidak ditemukan");
    });

    it("rejects SVG containing nested javascript: URIs", async () => {
      const xssSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(document.cookie)"><circle r="10"/></a></svg>'
      );
      const file = new File([xssSvg], "stealer.svg", { type: "image/svg+xml" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("javascript: terlarang");
    });

    it("rejects disallowed MIME types (e.g. text/html, application/pdf)", async () => {
      const file = new File([Buffer.from("hello world")], "test.txt", { type: "text/plain" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak diizinkan");
    });
  });

  // =========================================================================
  // SECTION 4: Path Traversal & Delete Security
  // =========================================================================
  describe("API Adversarial: Path Traversal & Delete Security", () => {
    it("neutralizes traversal sequence in filename on upload and confines file to UPLOAD_DIR", async () => {
      const file = new File([validPngHeader], "../../../../../evil-path.png", { type: "image/png" });
      const req = makeUploadReq(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.name).not.toContain("..");
      expect(data.media.name).not.toContain("/");
      expect(data.media.name).not.toContain("\\");
      createdTestFiles.push(data.media.name);

      // Verify physical disk path is strictly in UPLOAD_DIR
      const fullPath = path.join(UPLOAD_DIR, data.media.name);
      const stat = await fs.stat(fullPath);
      expect(stat.isFile()).toBe(true);
    });

    it("blocks DELETE with relative path traversal targeting package.json", async () => {
      const traversalTarget = "..%2F..%2Fpackage.json";
      const req = new Request(`http://localhost:3000/api/admin/media/${traversalTarget}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: traversalTarget }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak valid");

      // Verify package.json still exists and was not deleted!
      const pkgStat = await fs.stat(path.join(process.cwd(), "package.json"));
      expect(pkgStat.isFile()).toBe(true);
    });

    it("blocks DELETE with backslash path traversal targeting .env", async () => {
      const traversalTarget = "..%5C..%5C.env";
      const req = new Request(`http://localhost:3000/api/admin/media/${traversalTarget}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: traversalTarget }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("blocks DELETE targeting system files like .gitkeep", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/.gitkeep", {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: ".gitkeep" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Berkas sistem tidak boleh dihapus");
    });

    it("returns 404 for deletion of non-existent safe filename", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/safe-but-missing-file.png", {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: "safe-but-missing-file.png" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak ditemukan");
    });

    it("blocks DELETE by query parameter with path traversal", async () => {
      const req = new Request("http://localhost:3000/api/admin/media?filename=../../package.json", {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaByQuery(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak valid");
    });

    it("blocks DELETE of .gitkeep via query parameter", async () => {
      const req = new Request("http://localhost:3000/api/admin/media?filename=.gitkeep", {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaByQuery(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Berkas sistem tidak boleh dihapus");
    });

    it("blocks DELETE with varied URL-encoded and mixed traversal tokens", async () => {
      const attacks = [
        "%2e%2e%2fpackage.json",
        "%2E%2E%2Fpackage.json",
        "..%2Fpackage.json",
        "..%5Cpackage.json",
        "..%2f..%2fprisma%2fschema.prisma",
        "..\\..\\node_modules",
      ];

      for (const attack of attacks) {
        const req = new Request(`http://localhost:3000/api/admin/media/${attack}`, {
          method: "DELETE",
          headers: { Cookie: adminCookie },
        });
        const res = await deleteMediaById(req, {
          params: Promise.resolve({ id: attack }),
        });
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
      }
    });
  });

  // =========================================================================
  // SECTION 5: Authentication Barriers
  // =========================================================================
  describe("API Adversarial: Authentication Boundaries", () => {
    it("blocks unauthenticated POST /api/admin/media/upload with 401", async () => {
      const file = new File([validPngHeader], "unauth.png", { type: "image/png" });
      const req = makeUploadReq(file, ""); // No cookie
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Autentikasi admin diperlukan");
    });

    it("blocks unauthenticated GET /api/admin/media with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/media");
      const res = await getMediaList(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("blocks unauthenticated GET /api/admin/media/[id] with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/some-image.png");
      const res = await getMediaById(req, {
        params: Promise.resolve({ id: "some-image.png" }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("blocks unauthenticated DELETE /api/admin/media/[id] with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/some-image.png", {
        method: "DELETE",
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: "some-image.png" }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("blocks forged / invalid admin cookie with 401", async () => {
      const fakeCookie = `${ADMIN_COOKIE_NAME}=forged-token-value-12345`;
      const file = new File([validPngHeader], "forged.png", { type: "image/png" });
      const req = makeUploadReq(file, fakeCookie);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 6: High Concurrency & Collision Resistance
  // =========================================================================
  describe("API Adversarial: Concurrency & Collision Resistance", () => {
    it("handles 10 concurrent uploads with identical filenames and guarantees unique non-colliding names", async () => {
      const uploadPromises = Array.from({ length: 10 }, async (_, i) => {
        const file = new File([validPngHeader], "same-name-avatar.png", { type: "image/png" });
        const req = makeUploadReq(file);
        const res = await uploadMedia(req);
        const data = await res.json();
        return { status: res.status, data };
      });

      const results = await Promise.all(uploadPromises);

      // Verify all 10 succeeded with 201
      for (const r of results) {
        expect(r.status).toBe(201);
        expect(r.data.success).toBe(true);
        expect(r.data.media).toBeDefined();
        createdTestFiles.push(r.data.media.name);
      }

      // Verify all 10 filenames are completely unique (no collisions)
      const names = results.map((r) => r.data.media.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);

      // Verify all 10 files exist concurrently on disk
      for (const name of names) {
        const filePath = path.join(UPLOAD_DIR, name);
        const stat = await fs.stat(filePath);
        expect(stat.isFile()).toBe(true);
      }
    });
  });
});
