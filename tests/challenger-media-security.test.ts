import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { POST as uploadMedia } from "@/app/api/admin/media/upload/route";
import { GET as getMediaList } from "@/app/api/admin/media/route";
import { UPLOAD_DIR, ensureUploadDir, validateImageBuffer } from "@/lib/media";
import { ADMIN_COOKIE_NAME, generateSessionToken } from "@/lib/auth";
import { PostAdminSchema, PostCreateSchema } from "@/lib/validations";

describe("Challenger 2 — Adversarial Stress Test Harness", () => {
  let adminCookie: string;
  const tempFilesToClean: string[] = [];

  beforeAll(async () => {
    await ensureUploadDir();
    const token = await generateSessionToken("admin");
    adminCookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`;
  });

  afterAll(async () => {
    // Clean up any files created in UPLOAD_DIR during testing
    for (const file of tempFilesToClean) {
      try {
        const fullPath = path.join(UPLOAD_DIR, file);
        if (fsSync.existsSync(fullPath)) {
          await fs.unlink(fullPath);
        }
      } catch {
        // ignore
      }
    }
  });

  function createUploadRequest(file: File | Blob): Request {
    const formData = new FormData();
    formData.append("file", file);
    return new Request("http://localhost:3000/api/admin/media/upload", {
      method: "POST",
      headers: {
        Cookie: adminCookie,
      },
      body: formData,
    });
  }

  // =========================================================================
  // Section 1: SVG XSS Injection Stress Tests
  // =========================================================================
  describe("1. SVG XSS Injection Stress Tests", () => {
    it("1.1: should reject <svg><script>alert(1)</script></svg> with 400", async () => {
      const payload = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      const file = new File([payload], "xss-script.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tag <script>");

      // Direct buffer check
      const bufferCheck = validateImageBuffer(Buffer.from(payload), "image/svg+xml");
      expect(bufferCheck.valid).toBe(false);
      expect(bufferCheck.error).toContain("tag <script>");
    });

    it("1.2: should reject <svg><circle onload=\"alert(1)\" /></svg> with 400", async () => {
      const payload = '<svg xmlns="http://www.w3.org/2000/svg"><circle onload="alert(1)" /></svg>';
      const file = new File([payload], "xss-onload.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("onload=");

      const bufferCheck = validateImageBuffer(Buffer.from(payload), "image/svg+xml");
      expect(bufferCheck.valid).toBe(false);
      expect(bufferCheck.error).toContain("onload=");
    });

    it("1.3: should reject <svg><image href=\"javascript:alert(1)\" /></svg> with 400", async () => {
      const payload = '<svg xmlns="http://www.w3.org/2000/svg"><image href="javascript:alert(1)" /></svg>';
      const file = new File([payload], "xss-js-uri.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("javascript:");

      const bufferCheck = validateImageBuffer(Buffer.from(payload), "image/svg+xml");
      expect(bufferCheck.valid).toBe(false);
      expect(bufferCheck.error).toContain("javascript:");
    });

    it("1.4: should reject SVG with onerror= with 400", async () => {
      const payload = '<svg xmlns="http://www.w3.org/2000/svg"><image onerror="alert(1)" /></svg>';
      const file = new File([payload], "xss-onerror.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("onerror=");

      const bufferCheck = validateImageBuffer(Buffer.from(payload), "image/svg+xml");
      expect(bufferCheck.valid).toBe(false);
      expect(bufferCheck.error).toContain("onerror=");
    });

    it("1.5: should reject obfuscated/whitespace event handlers (e.g. onload = \"...\")", async () => {
      const payload = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" onload   =   "alert(1)" /></svg>';
      const file = new File([payload], "xss-space-onload.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("onload=");
    });

    it("1.6: should reject uppercase/mixed-case XSS tags (e.g. <SCRIPT>, JAVASCRIPT:)", async () => {
      const scriptPayload = '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>alert(1)</SCRIPT></svg>';
      const scriptFile = new File([scriptPayload], "xss-upper.svg", { type: "image/svg+xml" });
      const scriptRes = await uploadMedia(createUploadRequest(scriptFile));
      expect(scriptRes.status).toBe(400);

      const jsPayload = '<svg xmlns="http://www.w3.org/2000/svg"><a href="JAVASCRIPT:alert(1)"><text>link</text></a></svg>';
      const jsFile = new File([jsPayload], "xss-upper-js.svg", { type: "image/svg+xml" });
      const jsRes = await uploadMedia(createUploadRequest(jsFile));
      expect(jsRes.status).toBe(400);
    });

    it("1.7: should accept clean valid SVGs with complex paths, nested groups, viewBox", async () => {
      const cleanSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
    </linearGradient>
  </defs>
  <g id="layer-group">
    <rect width="400" height="400" fill="url(#grad1)" rx="20" ry="20" />
    <path d="M 100,100 L 200,200 L 300,100 Z" fill="#ffffff" stroke="#000000" stroke-width="2" />
    <text x="250" y="250" font-size="24" text-anchor="middle" fill="#333333">Valid Complex SVG</text>
  </g>
</svg>`;
      const file = new File([cleanSvg], "clean-vector.svg", { type: "image/svg+xml" });
      const res = await uploadMedia(createUploadRequest(file));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.type).toBe("image/svg+xml");
      expect(data.url).toMatch(/^\/uploads\/\d+-[a-f0-9]+-clean-vector\.svg$/);

      tempFilesToClean.push(data.media.name);
    });
  });

  // =========================================================================
  // Section 2: Cover Image Schema Stress Tests
  // =========================================================================
  describe("2. Cover Image Schema Stress Tests (PostAdminSchema & PostCreateSchema)", () => {
    const validBasePostCreate = {
      title: "Judul Artikel Uji Coba",
      slug: "judul-artikel-uji-coba",
      excerpt: "Ini adalah ringkasan artikel pengujian yang valid dan memadai.",
      content: "Ini adalah konten artikel uji coba yang memiliki panjang lebih dari lima puluh karakter untuk lolos validasi.",
      tags: ["tech", "testing"],
    };

    const validBasePostAdmin = {
      title: "Judul Admin Uji Coba",
      slug: "judul-admin-uji-coba",
      excerpt: "Ini adalah ringkasan admin pengujian yang valid dan memadai.",
      content: "Ini adalah konten artikel admin lebih dari dua puluh karakter.",
      published: true,
      tags: ["admin", "test"],
    };

    it("2.1: Local uploads (/uploads/photo.jpg, /uploads/1731427200000-banner.png) must pass validation", () => {
      const localPaths = [
        "/uploads/photo.jpg",
        "/uploads/1731427200000-banner.png",
        "/uploads/2026/banner-sample.webp",
      ];

      for (const p of localPaths) {
        // Test PostCreateSchema
        const createResult = PostCreateSchema.safeParse({
          ...validBasePostCreate,
          coverImage: p,
        });
        expect(createResult.success).toBe(true);
        if (createResult.success) {
          expect(createResult.data.coverImage).toBe(p);
        }

        // Test PostAdminSchema
        const adminResult = PostAdminSchema.safeParse({
          ...validBasePostAdmin,
          coverImage: p,
        });
        expect(adminResult.success).toBe(true);
        if (adminResult.success) {
          expect(adminResult.data.coverImage).toBe(p);
        }
      }
    });

    it("2.2: External URLs (https://example.com/banner.png, http://cdn.org/img.webp) must pass validation", () => {
      const externalUrls = [
        "https://example.com/banner.png",
        "http://cdn.org/img.webp",
        "HTTPS://SECURE.CDN.COM/IMG/BANNER.JPEG",
        "http://localhost:3000/assets/hero.jpg",
      ];

      for (const url of externalUrls) {
        const createResult = PostCreateSchema.safeParse({
          ...validBasePostCreate,
          coverImage: url,
        });
        expect(createResult.success).toBe(true);

        const adminResult = PostAdminSchema.safeParse({
          ...validBasePostAdmin,
          coverImage: url,
        });
        expect(adminResult.success).toBe(true);
      }
    });

    it("2.3: Empty values (null, '', undefined, whitespace) must pass validation", () => {
      const emptyValues = [null, "", undefined, "   "];

      for (const emptyVal of emptyValues) {
        const createResult = PostCreateSchema.safeParse({
          ...validBasePostCreate,
          coverImage: emptyVal,
        });
        expect(createResult.success).toBe(true);

        const adminResult = PostAdminSchema.safeParse({
          ...validBasePostAdmin,
          coverImage: emptyVal,
        });
        expect(adminResult.success).toBe(true);
      }
    });

    it("2.4: Invalid values must be rejected with 'URL gambar tidak valid'", () => {
      const invalidValues = [
        "bukan-url-valid",
        "ftp://secret-server.com/image.png",
        "javascript:alert(1)",
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
        "file:///etc/passwd",
        "//cdn.example.com/banner.png",
        "/images/outside-uploads.jpg",
      ];

      for (const invalidVal of invalidValues) {
        // PostCreateSchema
        const createResult = PostCreateSchema.safeParse({
          ...validBasePostCreate,
          coverImage: invalidVal,
        });
        expect(createResult.success).toBe(false);
        if (!createResult.success) {
          const coverError = createResult.error.flatten().fieldErrors.coverImage;
          expect(coverError).toBeDefined();
          expect(coverError![0]).toBe("URL gambar tidak valid");
        }

        // PostAdminSchema
        const adminResult = PostAdminSchema.safeParse({
          ...validBasePostAdmin,
          coverImage: invalidVal,
        });
        expect(adminResult.success).toBe(false);
        if (!adminResult.success) {
          const coverError = adminResult.error.flatten().fieldErrors.coverImage;
          expect(coverError).toBeDefined();
          expect(coverError![0]).toBe("URL gambar tidak valid");
        }
      }
    });
  });

  // =========================================================================
  // Section 3: Media Listing & Missing Directory Stress Tests
  // =========================================================================
  describe("3. Media Listing & Missing Directory Stress Tests", () => {
    it("3.1: should return status 200 with { success: true, media: [] } when public/uploads does not exist", async () => {
      const backupDir = `${UPLOAD_DIR}_backup_challenger_temp`;

      // Temporarily rename upload dir if it exists
      let dirExisted = false;
      if (fsSync.existsSync(UPLOAD_DIR)) {
        dirExisted = true;
        await fs.rename(UPLOAD_DIR, backupDir);
      }

      try {
        expect(fsSync.existsSync(UPLOAD_DIR)).toBe(false);

        const req = new Request("http://localhost:3000/api/admin/media", {
          headers: { Cookie: adminCookie },
        });
        const res = await getMediaList(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.media).toEqual([]);
      } finally {
        // Restore directory
        if (dirExisted && fsSync.existsSync(backupDir)) {
          if (fsSync.existsSync(UPLOAD_DIR)) {
            await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
          }
          await fs.rename(backupDir, UPLOAD_DIR);
        } else if (!fsSync.existsSync(UPLOAD_DIR)) {
          await ensureUploadDir();
        }
      }
    });

    it("3.2: should filter out hidden files (.gitkeep, .DS_Store, .hidden) from media listing", async () => {
      // Create hidden files
      const hidden1 = path.join(UPLOAD_DIR, ".DS_Store");
      const hidden2 = path.join(UPLOAD_DIR, ".hidden_photo.png");
      await fs.writeFile(hidden1, "dummy-mac-file");
      await fs.writeFile(hidden2, "dummy-hidden");

      try {
        const req = new Request("http://localhost:3000/api/admin/media", {
          headers: { Cookie: adminCookie },
        });
        const res = await getMediaList(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        const names: string[] = data.media.map((m: { name: string }) => m.name);
        expect(names).not.toContain(".gitkeep");
        expect(names).not.toContain(".DS_Store");
        expect(names).not.toContain(".hidden_photo.png");
        expect(names.some((name) => name.startsWith("."))).toBe(false);
      } finally {
        if (fsSync.existsSync(hidden1)) await fs.unlink(hidden1);
        if (fsSync.existsSync(hidden2)) await fs.unlink(hidden2);
      }
    });

    it("3.3: should filter out subdirectories and files with disallowed extensions", async () => {
      const subDir = path.join(UPLOAD_DIR, "temp_subfolder_dir");
      const txtFile = path.join(UPLOAD_DIR, "readme.txt");
      const exeFile = path.join(UPLOAD_DIR, "setup.exe");

      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(txtFile, "just plain text");
      await fs.writeFile(exeFile, "not an image");

      try {
        const req = new Request("http://localhost:3000/api/admin/media", {
          headers: { Cookie: adminCookie },
        });
        const res = await getMediaList(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        const names: string[] = data.media.map((m: { name: string }) => m.name);
        expect(names).not.toContain("temp_subfolder_dir");
        expect(names).not.toContain("readme.txt");
        expect(names).not.toContain("setup.exe");
      } finally {
        if (fsSync.existsSync(subDir)) await fs.rm(subDir, { recursive: true, force: true });
        if (fsSync.existsSync(txtFile)) await fs.unlink(txtFile);
        if (fsSync.existsSync(exeFile)) await fs.unlink(exeFile);
      }
    });

    it("3.4: should return files strictly ordered newest-first", async () => {
      // Create three valid PNG files with distinct modification timestamps
      const fileOlderName = "1000-challenger-older.png";
      const fileNewerName = "2000-challenger-newer.png";
      const fileNewestName = "3000-challenger-newest.png";

      const validPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const olderPath = path.join(UPLOAD_DIR, fileOlderName);
      const newerPath = path.join(UPLOAD_DIR, fileNewerName);
      const newestPath = path.join(UPLOAD_DIR, fileNewestName);

      await fs.writeFile(olderPath, validPng);
      await fs.writeFile(newerPath, validPng);
      await fs.writeFile(newestPath, validPng);

      // Explicitly adjust mtime: older = 1000s ago, newer = 500s ago, newest = now
      const now = Date.now() / 1000;
      await fs.utimes(olderPath, now - 1000, now - 1000);
      await fs.utimes(newerPath, now - 500, now - 500);
      await fs.utimes(newestPath, now, now);

      try {
        const req = new Request("http://localhost:3000/api/admin/media", {
          headers: { Cookie: adminCookie },
        });
        const res = await getMediaList(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        const list: { name: string; createdAt: string }[] = data.media;
        const olderIdx = list.findIndex((m) => m.name === fileOlderName);
        const newerIdx = list.findIndex((m) => m.name === fileNewerName);
        const newestIdx = list.findIndex((m) => m.name === fileNewestName);

        expect(olderIdx).toBeGreaterThan(-1);
        expect(newerIdx).toBeGreaterThan(-1);
        expect(newestIdx).toBeGreaterThan(-1);

        // Newest must come before newer, newer before older
        expect(newestIdx).toBeLessThan(newerIdx);
        expect(newerIdx).toBeLessThan(olderIdx);

        // Verify entire list is non-increasing in createdAt
        for (let i = 0; i < list.length - 1; i++) {
          const tA = new Date(list[i].createdAt).getTime();
          const tB = new Date(list[i + 1].createdAt).getTime();
          expect(tA).toBeGreaterThanOrEqual(tB);
        }
      } finally {
        if (fsSync.existsSync(olderPath)) await fs.unlink(olderPath);
        if (fsSync.existsSync(newerPath)) await fs.unlink(newerPath);
        if (fsSync.existsSync(newestPath)) await fs.unlink(newestPath);
      }
    });
  });
});
