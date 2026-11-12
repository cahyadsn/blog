# Handoff Report: Backend Media API Route Handlers Blueprint (Milestone 1, Agent 2)

**Author**: teamwork_explorer (Milestone 1, Agent 2)  
**State Folder**: `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2`  
**Date**: 2026-11-12T17:08:00Z  
**Target Files**:
1. `src/app/api/admin/media/upload/route.ts`
2. `src/app/api/admin/media/route.ts`
3. `src/app/api/admin/media/[id]/route.ts`

---

## 1. Observation

### 1.1 Next.js 16 Runtime & Route Handler Conventions
- **Framework & Runtime**: Next.js 16.4.6 (`package.json:21`), React 19 (`package.json:22`), Node.js 22 runtime, TypeScript 5.7.3 in strict mode (`tsconfig.json:11`).
- **Standard Web APIs**: Next.js App Router natively supports Web Fetch `Request`, `Response`, `FormData`, `File`, and `Blob`.
- **Dynamic Route Async Params**: In Next.js 15 and 16, dynamic route parameters in route handlers are typed as a Promise:
  ```typescript
  // Observasi dari src/app/api/admin/posts/[id]/route.ts:7-10
  export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    ...
  ```
  Attempting to read `context.params.id` synchronously triggers Next.js compilation errors. `await context.params` is strictly required.

### 1.2 Authentication Infrastructure
- **Cookie Name**: `ADMIN_COOKIE_NAME = "admin_session"` (`src/lib/auth.ts:3`).
- **Session Verification**: `verifySessionToken(token?: string | null): Promise<boolean>` validates HMAC-SHA256 signature and 7-day expiration (`src/lib/auth.ts:54-70`).
- **Next.js Server Session Check**: `isAuthenticatedAdmin(): Promise<boolean>` inspects cookies via `const cookieStore = await cookies()` from `next/headers` (`src/lib/auth.ts:75-79`).
- **Middleware Guard**: `src/middleware.ts:25-33` intercepts `/api/admin/*` and returns status 401:
  `{ success: false, error: "Akses ditolak: Autentikasi admin diperlukan." }`.
- **Defense-in-Depth for Route Handlers**: When unit tests in Vitest test Route Handlers directly (e.g. `tests/admin-posts-api.test.ts`), `middleware.ts` is bypassed. Implementing session checks directly inside each Route Handler ensures tests can assert 401 responses directly on route functions.

### 1.3 Media Storage & Static Serving Architecture
- **Directory Path**: `path.join(process.cwd(), "public", "uploads")`.
- **Static URL Mapping**: Next.js maps `public/uploads/<filename>` directly to HTTP root `/uploads/<filename>`.
- **Directory Existence**: `public/uploads` may not exist on initial clone or clean environment. Handlers must gracefully handle missing directories (GET returns `[]`, POST ensures directory recursively via `fs.promises.mkdir(UPLOAD_DIR, { recursive: true })`).

### 1.4 Interface Contracts & Specifications (`PROJECT.md` & `ORIGINAL_REQUEST.md`)
- **`POST /api/admin/media/upload`**:
  - Input: `multipart/form-data` with field `file`.
  - Max Size: 5MB (`5 * 1024 * 1024` bytes).
  - Whitelist MIME: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`.
  - Content check: buffer magic bytes inspection + SVG script injection check (`<script>`, `javascript:`, `onload=`, `onerror=`).
  - Output Status 201:
    ```json
    {
      "success": true,
      "url": "/uploads/1731427200000-abcd-banner.png",
      "media": {
        "name": "1731427200000-abcd-banner.png",
        "url": "/uploads/1731427200000-abcd-banner.png",
        "size": 102400,
        "type": "image/png",
        "createdAt": "2026-11-12T17:00:00.000Z"
      }
    }
    ```
  - Error Statuses: 400 (Bad Request validation errors), 401 (Unauthorized), 500 (Internal Server Error).
- **`GET /api/admin/media`**:
  - Output Status 200: `{ success: true, media: [...] }` sorted newest first.
  - Missing directory handling: Returns `{ success: true, media: [] }` without error.
  - Filters: Disregards hidden files (`.gitkeep`, `.DS_Store`), subdirectories, and non-image files.
- **`DELETE /api/admin/media/[id]`**:
  - Param: `id` (filename, e.g. `1731427200000-abcd-banner.png`).
  - Path traversal defense: Disallow `..`, `/`, `\`, null bytes, or paths escaping `public/uploads/`.
  - Disallow deletion of protected files like `.gitkeep`.
  - Output Status 200: `{ success: true, message: "Berkas berhasil dihapus" }`.
  - Error Statuses: 400 (Invalid filename / traversal attempt), 401 (Unauthorized), 404 (File not found), 500 (File unlink error).

---

## 2. Logic Chain

1. **Authentication Resilience (Observation 1.2)**:
   - In Next.js runtime, `isAuthenticatedAdmin()` calls `cookies()` from `next/headers`.
   - In Vitest test runners, calling Route Handlers directly without `next/headers` context or without mocks could throw an unhandled invariant.
   - *Logic*: Create a unified helper `verifyAdmin(req: Request): Promise<boolean>` that:
     1. Attempts `await isAuthenticatedAdmin()`.
     2. Falls back to inspecting `req.headers.get("cookie")` for `ADMIN_COOKIE_NAME` and validating via `verifySessionToken()`.
     3. Returns `false` if neither is valid, returning 401:
        `{ success: false, error: "Akses ditolak: Autentikasi admin diperlukan." }`.
   - This provides bulletproof defense-in-depth across both production server requests and isolated Vitest tests.

2. **Upload Processing Pipeline (Observations 1.1, 1.4)**:
   - Step 1: Admin session check -> return 401 if unauthorized.
   - Step 2: `await req.formData()` -> return 400 if malformed or non-multipart.
   - Step 3: Extract `formData.get("file")` -> return 400 if missing or not an instance of `Blob`.
   - Step 4: Size boundary check:
     - `file.size === 0` -> return 400 with `"Berkas gambar tidak boleh kosong"`.
     - `file.size > 5 * 1024 * 1024` -> return 400 with `"Ukuran berkas melebihi batas 5MB"`.
   - Step 5: MIME whitelist validation (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`) -> return 400 with `"Tipe berkas tidak diizinkan. Hanya PNG, JPEG, WebP, GIF, dan SVG yang didukung."`.
   - Step 6: Convert to `Buffer` via `Buffer.from(await file.arrayBuffer())` and execute `validateImageBuffer(buffer, file.type)`:
     - Validates actual byte signatures (PNG: `89 50 4E 47`, JPEG: `FF D8 FF`, GIF: `47 49 46 38`, WebP: `RIFF...WEBP`).
     - SVG XML inspection verifies `<svg` and rejects embedded `<script>`, `javascript:`, or inline handlers `on*=` (XSS protection).
     - Returns 400 with validation error if spoofed or malicious.
   - Step 7: Unique safe filename generation via `generateUniqueFilename(file.name)`.
   - Step 8: Ensure `public/uploads/` exists via `ensureUploadDir()`.
   - Step 9: Save to disk via `fs.promises.writeFile(targetPath, buffer)`.
   - Step 10: Return 201 Created with `{ success: true, url, media: { name, url, size, type, createdAt } }`.

3. **Media Listing Pipeline (Observations 1.3, 1.4)**:
   - Step 1: Admin session check -> return 401 if unauthorized.
   - Step 2: Graceful directory check via `fs.promises.access(UPLOAD_DIR)`. If missing, return status 200 with `{ success: true, media: [] }`.
   - Step 3: Read directory with `withFileTypes: true`.
   - Step 4: Filter entries:
     - `entry.isFile()` is `true`.
     - `!entry.name.startsWith(".")` (excludes `.gitkeep`, `.DS_Store`).
     - Extension matches allowed list (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`).
   - Step 5: Fetch `fs.promises.stat` for each entry: retrieve `size`, determine MIME type from extension, retrieve `mtime` as `createdAt`.
   - Step 6: Sort entries descending by `createdAt` (newest first).
   - Step 7: Return status 200 with `{ success: true, media: [...] }`.
   - Step 8 (Spec Harmonization): Also export `DELETE` handler in `/api/admin/media/route.ts` supporting query parameter `?filename=...` as alternative interface specified in R2.

4. **Media Deletion Pipeline (Observations 1.1, 1.4)**:
   - Step 1: Admin session check -> return 401 if unauthorized.
   - Step 2: Await Next.js dynamic params: `const { id } = await context.params;`.
   - Step 3: Decode filename: `const rawFilename = decodeURIComponent(id);`.
   - Step 4: Path traversal defense:
     - Reject if contains null bytes (`\0`), directory separators (`/`, `\`), or `..`.
     - Validate `getSafeFilePath(rawFilename)` resolves strictly within `public/uploads/`.
     - Protect system files: disallow deleting `.gitkeep` or files starting with `.`.
     - Return 400 with `"Nama berkas tidak valid"` if traversal or invalid name detected.
   - Step 5: File existence check via `fs.promises.access(safePath)`. If not found, return 404 with `"Berkas tidak ditemukan"`.
   - Step 6: Unlink file via `fs.promises.unlink(safePath)`.
   - Step 7: Return status 200 with `{ success: true, message: "Berkas berhasil dihapus" }`.

---

## 3. Caveats

1. **Next.js 15/16 Dynamic Route Signature**:
   - `context.params` must always be typed as `Promise<{ id: string }>` and awaited. Calling `context.params.id` without `await` will fail Next.js production build (`npm.cmd run build`).
2. **Cross-Platform Path Handling**:
   - On Windows environments (like the user host machine), path separators are backslashes `\`. All traversal containment checks must compare resolved paths using `path.resolve` and `path.sep` or regex.
3. **Empty Directory State**:
   - In automated test setups or clean checkouts, `public/uploads` may not exist initially. The GET route must never throw a 500 when the directory is absent.
4. **Inter-Module Contract with `src/lib/media.ts`**:
   - The route handlers depend on `src/lib/media.ts` (being developed in tandem). We specify the exact function signatures below to ensure 100% plug-and-play alignment.

---

## 4. Conclusion & Production Blueprint

### 4.1 Dependency Contract: `src/lib/media.ts`
The route handlers import the following from `@/lib/media`:
```typescript
export const UPLOAD_DIR: string; // path.join(process.cwd(), "public", "uploads")
export const ALLOWED_MIME_TYPES: readonly string[]; // ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
export const ALLOWED_EXTENSIONS: readonly string[]; // [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]
export const MAX_FILE_SIZE: number; // 5 * 1024 * 1024 (5MB)
export function validateImageBuffer(buffer: Buffer, mimeType: string): { valid: boolean; error?: string };
export function generateUniqueFilename(originalName: string): string;
export function ensureUploadDir(): Promise<string>;
export function getSafeFilePath(filename: string): { safePath: string; safeName: string } | null;
export function getMimeTypeFromExtension(ext: string): string;
export function formatFileSize(bytes: number): string;
```

---

### 4.2 Blueprint 1: `src/app/api/admin/media/upload/route.ts`

```typescript
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  validateImageBuffer,
  generateUniqueFilename,
  ensureUploadDir,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, verifySessionToken, isAuthenticatedAdmin } from "@/lib/auth";

/**
 * Verifikasi sesi admin secara defensif (defense-in-depth).
 * Memeriksa melalui isAuthenticatedAdmin() (next/headers) dan fallback ke header Cookie request.
 */
async function verifyAdmin(req: Request): Promise<boolean> {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (isAuth) return true;
  } catch {
    // Menangani pemanggilan di luar request context Next.js (misal unit test)
  }

  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        return await verifySessionToken(decodeURIComponent(match[1]));
      }
    }
  } catch {
    // Abaikan error parsing cookie
  }

  return false;
}

export async function POST(req: Request): Promise<Response> {
  try {
    // 1. Pemeriksaan autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Parsing multipart/form-data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format request tidak valid, multipart/form-data diperlukan" },
        { status: 400 }
      );
    }

    // 3. Ekstraksi berkas dari form data
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Berkas gambar tidak ditemukan" },
        { status: 400 }
      );
    }

    // 4. Validasi berkas kosong (0 bytes)
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "Berkas gambar tidak boleh kosong" },
        { status: 400 }
      );
    }

    // 5. Validasi ukuran maksimum berkas (5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas 5MB" },
        { status: 400 }
      );
    }

    // 6. Validasi tipe MIME terhadap whitelist yang diizinkan
    const fileType = file.type;
    if (!fileType || !(ALLOWED_MIME_TYPES as readonly string[]).includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipe berkas tidak diizinkan. Hanya PNG, JPEG, WebP, GIF, dan SVG yang didukung.",
        },
        { status: 400 }
      );
    }

    // 7. Konversi file ke buffer dan validasi magic bytes / inspeksi keamanan SVG
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateImageBuffer(buffer, fileType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Isi berkas tidak cocok dengan format gambar yang valid",
        },
        { status: 400 }
      );
    }

    // 8. Pembuatan nama berkas unik dan aman dari path traversal
    const originalName = file instanceof File && file.name ? file.name : "image.png";
    const uniqueFilename = generateUniqueFilename(originalName);

    // 9. Pastikan direktori penyimpanan tersedia secara rekursif
    await ensureUploadDir();

    // 10. Tulis berkas ke disk
    const targetPath = path.join(UPLOAD_DIR, uniqueFilename);
    await fs.writeFile(targetPath, buffer);

    // 11. Susun metadata dan kirim respon 201 Created
    const publicUrl = `/uploads/${uniqueFilename}`;
    const mediaItem = {
      name: uniqueFilename,
      url: publicUrl,
      size: file.size,
      type: fileType,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        media: mediaItem,
        file: mediaItem, // Alias untuk kompatibilitas frontend & testing
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menyimpan berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal menyimpan berkas" },
      { status: 500 }
    );
  }
}
```

---

### 4.3 Blueprint 2: `src/app/api/admin/media/route.ts`

```typescript
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  getMimeTypeFromExtension,
  getSafeFilePath,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, verifySessionToken, isAuthenticatedAdmin } from "@/lib/auth";

async function verifyAdmin(req: Request): Promise<boolean> {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (isAuth) return true;
  } catch {
    // Menangani pemanggilan di luar request context
  }

  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        return await verifySessionToken(decodeURIComponent(match[1]));
      }
    }
  } catch {
    // Abaikan error parsing cookie
  }

  return false;
}

export async function GET(req: Request): Promise<Response> {
  try {
    // 1. Verifikasi autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Periksa keberadaan direktori upload secara anggun (graceful)
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      // Jika direktori belum ada, kembalikan array kosong dengan status 200 (bukan error 500)
      return NextResponse.json({
        success: true,
        media: [],
      });
    }

    // 3. Baca entri berkas dalam direktori
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });

    // 4. Filter berkas: abaikan folder, berkas tersembunyi (.gitkeep, dsb), dan ekstensi tidak diizinkan
    const fileEntries = entries.filter((entry) => {
      if (!entry.isFile()) return false;
      if (entry.name.startsWith(".")) return false;
      const ext = path.extname(entry.name).toLowerCase();
      return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
    });

    // 5. Ambil metadata setiap berkas (ukuran, tanggal pembuatan/modifikasi, MIME type)
    const mediaList = await Promise.all(
      fileEntries.map(async (entry) => {
        const filePath = path.join(UPLOAD_DIR, entry.name);
        const stats = await fs.stat(filePath);
        const ext = path.extname(entry.name).toLowerCase();
        const mimeType = getMimeTypeFromExtension(ext);

        return {
          name: entry.name,
          url: `/uploads/${entry.name}`,
          size: stats.size,
          type: mimeType,
          createdAt: stats.mtime.toISOString(),
        };
      })
    );

    // 6. Urutkan berdasarkan tanggal terbaru terlebih dahulu (newest first)
    mediaList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      media: mediaList,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil daftar media";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal mengambil daftar media" },
      { status: 500 }
    );
  }
}

/**
 * Dukungan DELETE alternatif melalui query parameter (?filename=...) sesuai spesifikasi R2
 */
export async function DELETE(req: Request): Promise<Response> {
  try {
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || searchParams.get("id");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Parameter nama berkas diperlukan" },
        { status: 400 }
      );
    }

    const safeFile = getSafeFilePath(filename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    if (safeFile.safeName === ".gitkeep" || safeFile.safeName.startsWith(".")) {
      return NextResponse.json(
        { success: false, error: "Berkas sistem tidak boleh dihapus" },
        { status: 400 }
      );
    }

    try {
      await fs.access(safeFile.safePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }

    await fs.unlink(safeFile.safePath);

    return NextResponse.json({
      success: true,
      message: "Berkas berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal menghapus berkas" },
      { status: 500 }
    );
  }
}
```

---

### 4.4 Blueprint 3: `src/app/api/admin/media/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  getSafeFilePath,
  getMimeTypeFromExtension,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, verifySessionToken, isAuthenticatedAdmin } from "@/lib/auth";

async function verifyAdmin(req: Request): Promise<boolean> {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (isAuth) return true;
  } catch {
    // Menangani pemanggilan di luar request context
  }

  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        return await verifySessionToken(decodeURIComponent(match[1]));
      }
    }
  } catch {
    // Abaikan error parsing cookie
  }

  return false;
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // 1. Verifikasi autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Next.js 15/16 async params handling
    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter ID berkas tidak valid" },
        { status: 400 }
      );
    }

    const rawFilename = decodeURIComponent(id);

    // 3. Pertahanan Path Traversal & Validasi Keamanan Nama Berkas
    const safeFile = getSafeFilePath(rawFilename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    // Larang penghapusan berkas sistem seperti .gitkeep
    if (safeFile.safeName === ".gitkeep" || safeFile.safeName.startsWith(".")) {
      return NextResponse.json(
        { success: false, error: "Berkas sistem tidak boleh dihapus" },
        { status: 400 }
      );
    }

    // 4. Pemeriksaan keberadaan berkas (File existence check)
    try {
      await fs.access(safeFile.safePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }

    // 5. Hapus berkas dari disk
    await fs.unlink(safeFile.safePath);

    // 6. Respon sukses 200 OK
    return NextResponse.json({
      success: true,
      message: "Berkas berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal menghapus berkas" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const rawFilename = decodeURIComponent(id);

    const safeFile = getSafeFilePath(rawFilename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    try {
      const stats = await fs.stat(safeFile.safePath);
      const ext = path.extname(safeFile.safeName).toLowerCase();
      const mimeType = getMimeTypeFromExtension(ext);

      return NextResponse.json({
        success: true,
        media: {
          name: safeFile.safeName,
          url: `/uploads/${safeFile.safeName}`,
          size: stats.size,
          type: mimeType,
          createdAt: stats.mtime.toISOString(),
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil data berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal mengambil data berkas" },
      { status: 500 }
    );
  }
}
```

---

## 5. Verification Method

To independently verify the implementation once coded:

1. **Unit Test Suite Verification**:
   Execute the dedicated media API test suite with Vitest:
   ```powershell
   npx vitest run tests/admin-media-api.test.ts
   ```
   **Expected Test Scenarios**:
   - `POST /api/admin/media/upload`:
     - Returns 201 with public URL `/uploads/...` and media metadata for valid PNG, JPEG, WebP, GIF, SVG.
     - Returns 400 for empty files (0 bytes) with error message containing `"tidak boleh kosong"`.
     - Returns 400 for oversized files (>5MB) with error message containing `"melebihi batas 5MB"`.
     - Returns 400 for unauthorized MIME types (e.g. `text/plain`, `application/pdf`).
     - Returns 400 for MIME spoofing (e.g. file claimed as `image/png` but containing HTML/text).
     - Returns 400 for SVG with malicious `<script>` or `onload=` payload.
     - Returns 401 for requests without valid admin session token.
   - `GET /api/admin/media`:
     - Returns 200 with `{ success: true, media: [] }` when `public/uploads` directory does not exist.
     - Returns 200 with media array sorted newest first when files are present.
     - Omits hidden files (`.gitkeep`) and directory entries.
     - Returns 401 for unauthenticated requests.
   - `DELETE /api/admin/media/[id]`:
     - Returns 200 with `"Berkas berhasil dihapus"` and unlinks file for existing uploaded file.
     - Returns 404 with `"Berkas tidak ditemukan"` for non-existent file.
     - Returns 400 with `"Nama berkas tidak valid"` for path traversal attempts (`../../secret.txt`, `..%2F..%2Fevil.png`).
     - Returns 400 for protected system file deletion (`.gitkeep`).
     - Returns 401 for unauthenticated requests.

2. **Full Regression Test Suite**:
   ```powershell
   npm.cmd test
   ```
   *Expected*: All 236 existing tests + new media tests pass 100%.

3. **Production Next.js Build**:
   ```powershell
   npm.cmd run build
   ```
   *Expected*: Next.js App Router compilation completes with exit code 0 and zero TypeScript errors (confirming async dynamic params `await context.params` and type compatibility).

4. **Invalidation Conditions**:
   - If `context.params` is accessed synchronously without `await`, `npm run build` will fail.
   - If `verifyAdmin` does not fall back to `req.headers.get("cookie")`, direct Route Handler invocations in unit tests will fail auth checks unless `cookies()` is mocked.
