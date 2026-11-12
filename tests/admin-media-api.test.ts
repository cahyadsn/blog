import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import path from "path";
import { POST as uploadMedia } from "@/app/api/admin/media/upload/route";
import { GET as getMediaList, DELETE as deleteMediaByQuery } from "@/app/api/admin/media/route";
import { DELETE as deleteMediaById, GET as getMediaById } from "@/app/api/admin/media/[id]/route";
import { UPLOAD_DIR, ensureUploadDir, getSafeFilePath } from "@/lib/media";
import { ADMIN_COOKIE_NAME, generateSessionToken } from "@/lib/auth";

describe("Admin Media API Test Suite (Tiers 1-4)", () => {
  let adminCookie: string;
  const createdTestFiles: string[] = [];

  // Sample valid image buffers
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
  ]);
  const validGifBuffer = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  ]);
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46,
    0x24, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20,
  ]);
  const validSvgBuffer = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>'
  );

  beforeAll(async () => {
    await ensureUploadDir();
    const token = await generateSessionToken("admin");
    adminCookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`;
  });

  afterAll(async () => {
    // Clean up all created test files
    for (const filename of createdTestFiles) {
      try {
        const filePath = path.join(UPLOAD_DIR, filename);
        await fs.unlink(filePath);
      } catch {
        // ignore already deleted files
      }
    }
  });

  // Helper to create an authenticated upload request
  function createUploadRequest(file: File | Blob | null, cookie: string = adminCookie): Request {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    return new Request("http://localhost:3000/api/admin/media/upload", {
      method: "POST",
      headers: {
        Cookie: cookie,
      },
      body: formData,
    });
  }

  // --- Tier 1: Core Feature Coverage ---
  describe("Tier 1: Core Feature Coverage", () => {
    it("T1-MEDIA-1: should successfully upload a valid PNG file and return 201 with public URL", async () => {
      const file = new File([validPngBuffer], "test-logo.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.url).toMatch(/^\/uploads\/\d+-[a-f0-9]+-test-logo\.png$/);
      expect(data.media).toBeDefined();
      expect(data.media.type).toBe("image/png");
      expect(data.media.size).toBe(validPngBuffer.length);

      createdTestFiles.push(data.media.name);

      // Verify file exists on disk
      const filePath = path.join(UPLOAD_DIR, data.media.name);
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it("T1-MEDIA-2: should successfully upload a valid JPEG file and return 201", async () => {
      const file = new File([validJpegBuffer], "photo.jpg", { type: "image/jpeg" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.url).toMatch(/^\/uploads\/\d+-[a-f0-9]+-photo\.jpg$/);
      expect(data.media.type).toBe("image/jpeg");

      createdTestFiles.push(data.media.name);
    });

    it("T1-MEDIA-3: should successfully upload a valid WebP file and return 201", async () => {
      const file = new File([validWebpBuffer], "graphic.webp", { type: "image/webp" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.type).toBe("image/webp");

      createdTestFiles.push(data.media.name);
    });

    it("T1-MEDIA-4: should successfully upload a valid GIF file and return 201", async () => {
      const file = new File([validGifBuffer], "anim.gif", { type: "image/gif" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.type).toBe("image/gif");

      createdTestFiles.push(data.media.name);
    });

    it("T1-MEDIA-5: should successfully upload a safe SVG vector and return 201", async () => {
      const file = new File([validSvgBuffer], "icon.svg", { type: "image/svg+xml" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.type).toBe("image/svg+xml");

      createdTestFiles.push(data.media.name);
    });

    it("T1-MEDIA-6: should list media files sorted newest first and exclude hidden files", async () => {
      const req = new Request("http://localhost:3000/api/admin/media", {
        headers: { Cookie: adminCookie },
      });
      const res = await getMediaList(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.media)).toBe(true);
      expect(data.media.length).toBeGreaterThanOrEqual(1);

      // Verify .gitkeep is excluded
      const hasGitKeep = data.media.some((m: { name: string }) => m.name === ".gitkeep");
      expect(hasGitKeep).toBe(false);

      // Verify date ordering (newest first)
      if (data.media.length >= 2) {
        const time0 = new Date(data.media[0].createdAt).getTime();
        const time1 = new Date(data.media[1].createdAt).getTime();
        expect(time0).toBeGreaterThanOrEqual(time1);
      }
    });

    it("T1-MEDIA-7: should delete an existing media file by ID and verify removal from disk", async () => {
      // First upload a file to delete
      const file = new File([validPngBuffer], "to-delete.png", { type: "image/png" });
      const uploadReq = createUploadRequest(file);
      const uploadRes = await uploadMedia(uploadReq);
      const uploadData = await uploadRes.json();
      const filename = uploadData.media.name;

      const deleteReq = new Request(`http://localhost:3000/api/admin/media/${filename}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const deleteRes = await deleteMediaById(deleteReq, {
        params: Promise.resolve({ id: filename }),
      });
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);
      expect(deleteData.message).toContain("berhasil dihapus");

      // Verify file is unlinked from disk
      const filePath = path.join(UPLOAD_DIR, filename);
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it("T1-MEDIA-8: should delete media file via query parameter ?filename=...", async () => {
      const file = new File([validPngBuffer], "query-delete.png", { type: "image/png" });
      const uploadReq = createUploadRequest(file);
      const uploadRes = await uploadMedia(uploadReq);
      const uploadData = await uploadRes.json();
      const filename = uploadData.media.name;

      const deleteReq = new Request(`http://localhost:3000/api/admin/media?filename=${filename}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const deleteRes = await deleteMediaByQuery(deleteReq);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);

      const filePath = path.join(UPLOAD_DIR, filename);
      await expect(fs.stat(filePath)).rejects.toThrow();
    });
  });

  // --- Tier 2: Boundary & Validation Conditions ---
  describe("Tier 2: Boundary & Validation Conditions", () => {
    it("T2-MEDIA-1: should accept a file at the exact 5MB boundary (5,242,880 bytes)", async () => {
      const fiveMbPng = Buffer.alloc(5 * 1024 * 1024);
      fiveMbPng[0] = 0x89;
      fiveMbPng[1] = 0x50;
      fiveMbPng[2] = 0x4e;
      fiveMbPng[3] = 0x47;
      fiveMbPng[4] = 0x0d;
      fiveMbPng[5] = 0x0a;
      fiveMbPng[6] = 0x1a;
      fiveMbPng[7] = 0x0a;

      const file = new File([fiveMbPng], "exact-5mb.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.media.size).toBe(5 * 1024 * 1024);
      createdTestFiles.push(data.media.name);
    });

    it("T2-MEDIA-2: should reject a file exceeding 5MB by 1 byte (5,242,881 bytes)", async () => {
      const oversizedPng = Buffer.alloc(5 * 1024 * 1024 + 1);
      oversizedPng[0] = 0x89;
      oversizedPng[1] = 0x50;
      oversizedPng[2] = 0x4e;
      oversizedPng[3] = 0x47;
      oversizedPng[4] = 0x0d;
      oversizedPng[5] = 0x0a;
      oversizedPng[6] = 0x1a;
      oversizedPng[7] = 0x0a;

      const file = new File([oversizedPng], "oversized.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("melebihi batas 5MB");
    });

    it("T2-MEDIA-3: should reject a 0-byte empty file", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const file = new File([emptyBuffer], "empty.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak boleh kosong");
    });

    it("T2-MEDIA-4: should reject an upload request missing the file parameter", async () => {
      const req = createUploadRequest(null);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak ditemukan");
    });

    it("T2-MEDIA-5: should return 404 when deleting a non-existent media file", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/non-existent-image-12345.png", {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: "non-existent-image-12345.png" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak ditemukan");
    });

    it("T2-MEDIA-6: should retrieve individual media metadata via GET /api/admin/media/[id]", async () => {
      const file = new File([validPngBuffer], "get-single.png", { type: "image/png" });
      const uploadReq = createUploadRequest(file);
      const uploadRes = await uploadMedia(uploadReq);
      const uploadData = await uploadRes.json();
      const filename = uploadData.media.name;
      createdTestFiles.push(filename);

      const getReq = new Request(`http://localhost:3000/api/admin/media/${filename}`, {
        headers: { Cookie: adminCookie },
      });
      const getRes = await getMediaById(getReq, {
        params: Promise.resolve({ id: filename }),
      });
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.success).toBe(true);
      expect(getData.media.name).toBe(filename);
      expect(getData.media.type).toBe("image/png");
    });
  });

  // --- Tier 3: Security & Anti-Tampering Defenses ---
  describe("Tier 3: Security & Anti-Tampering Defenses", () => {
    it("T3-MEDIA-1: should detect MIME spoofing (plain text with image/png MIME)", async () => {
      const fakePngBuffer = Buffer.from("echo 'this is plain text pretending to be png'");
      const file = new File([fakePngBuffer], "fake.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("magic bytes tidak valid");
    });

    it("T3-MEDIA-2: should detect MIME spoofing (executable binary with image/jpeg MIME)", async () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
      const file = new File([exeBuffer], "malware.jpg", { type: "image/jpeg" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("magic bytes tidak valid");
    });

    it("T3-MEDIA-3: should reject disallowed MIME types (PDF, executable, text)", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 sample content");
      const file = new File([pdfBuffer], "document.pdf", { type: "application/pdf" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak diizinkan");
    });

    it("T3-MEDIA-4: should reject SVG with embedded <script> tag (XSS defense)", async () => {
      const xssSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script><rect width="10" height="10"/></svg>'
      );
      const file = new File([xssSvg], "xss.svg", { type: "image/svg+xml" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tag <script>");
    });

    it("T3-MEDIA-5: should reject SVG with embedded onload= or javascript: attributes (XSS defense)", async () => {
      const onloadSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>'
      );
      const file = new File([onloadSvg], "onload.svg", { type: "image/svg+xml" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("onload=");
    });

    it("T3-MEDIA-6: should sanitize path traversal sequences in uploaded filename", async () => {
      const file = new File([validPngBuffer], "../../../evil-traversal.png", { type: "image/png" });
      const req = createUploadRequest(file);
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      // Verify saved filename does not contain ../ and stays inside UPLOAD_DIR
      expect(data.media.name).not.toContain("..");
      expect(data.media.name).not.toContain("/");
      expect(data.media.name).not.toContain("\\");
      createdTestFiles.push(data.media.name);

      const safeCheck = getSafeFilePath(data.media.name);
      expect(safeCheck).not.toBeNull();
      expect(safeCheck!.safePath.startsWith(path.resolve(UPLOAD_DIR))).toBe(true);
    });

    it("T3-MEDIA-7: should reject DELETE requests attempting directory traversal", async () => {
      const traversalId = "..%2F..%2Fpackage.json";
      const req = new Request(`http://localhost:3000/api/admin/media/${traversalId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: traversalId }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("tidak valid");
    });

    it("T3-MEDIA-8: should protect system files (.gitkeep) from deletion", async () => {
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
      expect(data.error).toContain("tidak boleh dihapus");
    });
  });

  // --- Tier 4: Authentication & End-to-End Lifecycle ---
  describe("Tier 4: Authentication & End-to-End Lifecycle", () => {
    it("T4-MEDIA-1: should reject unauthenticated upload with 401", async () => {
      const file = new File([validPngBuffer], "unauth.png", { type: "image/png" });
      const req = createUploadRequest(file, ""); // empty cookie
      const res = await uploadMedia(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Autentikasi admin diperlukan");
    });

    it("T4-MEDIA-2: should reject unauthenticated media list with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/media");
      const res = await getMediaList(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("T4-MEDIA-3: should reject unauthenticated media delete with 401", async () => {
      const req = new Request("http://localhost:3000/api/admin/media/some-file.png", {
        method: "DELETE",
      });
      const res = await deleteMediaById(req, {
        params: Promise.resolve({ id: "some-file.png" }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("T4-MEDIA-4: should execute full upload -> verify in list -> get single -> delete lifecycle", async () => {
      // 1. Upload
      const file = new File([validWebpBuffer], "lifecycle-banner.webp", { type: "image/webp" });
      const uploadReq = createUploadRequest(file);
      const uploadRes = await uploadMedia(uploadReq);
      const uploadData = await uploadRes.json();

      expect(uploadRes.status).toBe(201);
      const filename = uploadData.media.name;
      const publicUrl = uploadData.media.url;

      // 2. Verify in list
      const listReq = new Request("http://localhost:3000/api/admin/media", {
        headers: { Cookie: adminCookie },
      });
      const listRes = await getMediaList(listReq);
      const listData = await listRes.json();
      expect(listRes.status).toBe(200);
      const foundInList = listData.media.some((m: { name: string }) => m.name === filename);
      expect(foundInList).toBe(true);

      // 3. Get single
      const getReq = new Request(`http://localhost:3000/api/admin/media/${filename}`, {
        headers: { Cookie: adminCookie },
      });
      const getRes = await getMediaById(getReq, {
        params: Promise.resolve({ id: filename }),
      });
      const getData = await getRes.json();
      expect(getRes.status).toBe(200);
      expect(getData.media.url).toBe(publicUrl);

      // 4. Delete
      const deleteReq = new Request(`http://localhost:3000/api/admin/media/${filename}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      const deleteRes = await deleteMediaById(deleteReq, {
        params: Promise.resolve({ id: filename }),
      });
      expect(deleteRes.status).toBe(200);

      // 5. Verify gone from list
      const finalListRes = await getMediaList(listReq);
      const finalListData = await finalListRes.json();
      const stillInList = finalListData.media.some((m: { name: string }) => m.name === filename);
      expect(stillInList).toBe(false);
    });
  });
});
