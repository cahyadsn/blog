# Handoff Report: Storage & Media Validation Blueprint (Milestone 1, Agent 1)

**Agent**: `teamwork_explorer_m1_1`  
**Mission**: Media Storage Layer & Validation Helper Architecture & Blueprint  
**Timestamp**: 2026-11-12T17:15:00Z  

---

## 1. Observation

### 1.1 Existing Validation & Schema State
- File `src/lib/validations.ts`:
  - Lines 53-59 define `PostAdminSchema.coverImage` as:
    ```typescript
    coverImage: z
      .string()
      .trim()
      .url("URL gambar tidak valid")
      .optional()
      .nullable()
      .or(z.literal("")),
    ```
  - Under this definition, any relative path such as `"/uploads/1731427200000-banner.png"` fails validation with `"URL gambar tidak valid"` because `z.string().url()` strictly requires a URI scheme/protocol (e.g., `https://` or `http://`).
  - In `tests/admin-validations.test.ts` (lines 234–246), tests explicitly assert:
    - `coverImage: null` -> `success === true`
    - `coverImage: ""` -> `success === true`
    - `coverImage: undefined` -> `success === true`
    - `coverImage: "bukan-url-valid"` -> `success === false`

### 1.2 Directory & Storage State
- Directory `public/` and `public/uploads/` currently do not exist in the repository (`Get-ChildItem -Path public` returns `Cannot find path 'D:\c\blog\public' because it does not exist`).
- File `.gitignore` does not currently contain rules for `/public/uploads/*`.
- Next.js 16 statically serves any file placed in `<project_root>/public/` from root `/`. Thus, any file written to `public/uploads/<filename>` is directly accessible via HTTP GET at `/uploads/<filename>`.

### 1.3 Test Baseline Verification
- Running `npm.cmd test` passes 100%:
  - 14 test files passed
  - 236 tests passed (0 failed)
  - Time: ~43.6s

---

## 2. Logic Chain

1. **Storage Location & Static Asset Serving (Ref: Obs 1.2)**:
   - Next.js serves files in the `public` directory as root static assets.
   - Storing uploaded media in `path.join(process.cwd(), "public", "uploads")` allows direct client access via `/uploads/<filename>` with zero overhead and without needing dynamic route streaming for asset retrieval.
   - Because `public/uploads` does not exist on a fresh clone or CI runner, a defensive recursive directory creation mechanism (`fs.mkdir(uploadDir, { recursive: true })`) is necessary before writing files or listing directories.
   - To keep Git repositories clean while ensuring `public/uploads` can be tracked as a folder structure, `/public/uploads/*` must be ignored in `.gitignore` while exempting `/public/uploads/.gitkeep`.

2. **File Validation & Boundary Enforcement (Ref: Obs 1.1, Obs 1.3, PROJECT.md R1)**:
   - File uploads present two distinct validation phases:
     a. **Metadata validation (`validateUploadFile`)**: Rapidly rejects files based on reported MIME type and file size before or during streaming. Rejects files larger than `5 * 1024 * 1024` bytes (5MB) and empty files (`size === 0`).
     b. **Content buffer validation (`validateImageBuffer`)**: Defensive deep inspection against MIME spoofing attacks (e.g. an executable renamed to `.png`).
   - Magic bytes verification:
     - PNG: 8 bytes `89 50 4E 47 0D 0A 1A 0A`
     - JPEG: 3 bytes `FF D8 FF`
     - GIF: 4 bytes `47 49 46 38` ("GIF8")
     - WebP: RIFF container with bytes 0-3 `RIFF` and bytes 8-11 `WEBP`
     - SVG (`image/svg+xml`): Textual XML verification requiring `<svg` tag and strictly blocking cross-site scripting (XSS) vectors: `<script>`, `javascript:`, `onload=`, and `onerror=`.

3. **Path Traversal Defense & Filename Sanitization (Ref: Obs 1.2, PROJECT.md R1)**:
   - User-supplied filenames in upload requests or delete requests (`/api/admin/media/[id]`) can contain path traversal sequences (`../`, `..\`, absolute paths, null bytes `\0`, or URL-encoded equivalents `%2e%2e%2f`).
   - Sanitization must apply:
     1. Null byte removal (`\0`).
     2. URL decoding check to catch nested traversal attempts.
     3. Extraction of base name via `path.basename`.
     4. Alphanumeric and safe hyphen/underscore slugification for file names.
     5. Generating unique filenames prefixed with timestamp and cryptographically secure random hex: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${slug}.${ext}` to prevent collision.
   - For file deletion and retrieval, `getSafeFilePath(filename)` must strictly resolve the path, compute `path.relative(UPLOAD_DIR, resolvedPath)`, and reject any path that points outside `UPLOAD_DIR`.

4. **Schema Harmonization in `validations.ts` (Ref: Obs 1.1)**:
   - Replacing `z.string().trim().url()` with a `.refine()` condition in `PostAdminSchema.coverImage`:
     `!val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val)`
   - This ensures:
     - Relative URLs starting with `/uploads/` pass.
     - Full HTTP/HTTPS URLs (`http://...`, `https://...`) pass.
     - `null`, `""`, and `undefined` continue to pass without regression.
     - Invalid strings (such as `"bukan-url-valid"`, `"ftp://..."`, `"javascript:..."`) fail.

---

## 3. Caveats

- **Caveat 1**: Local disk storage (`public/uploads`) works for single-instance Node.js deployments and Next.js standalone servers. For ephemeral container environments (e.g., multi-replica Kubernetes without Persistent Volume Claims or serverless Vercel), files written to disk are ephemeral. However, per project specifications (`ORIGINAL_REQUEST.md` and `PROJECT.md`), local disk storage in `public/uploads/` is the authoritative requirement.
- **Caveat 2**: SVG is an XML format capable of CSS and animation. While blocking `<script>`, `javascript:`, `onload=`, and `onerror=` mitigates standard XSS, full sanitization of arbitrary SVGs in untrusted public environments typically requires DOMPurify. In our CMS, only authenticated admins are allowed to upload media, making this regex-based defensive inspection appropriate and performant without extra heavy dependencies.
- **Caveat 3**: On Windows, path separators are backslashes (`\`). `path.resolve` and `path.relative` handle Windows backslashes automatically, but relative URLs returned to the client must always use forward slashes (`/uploads/...`).

---

## 4. Conclusion & Production-Ready Blueprint

Below are the exact, production-ready blueprints and code implementations for Milestone 1.

### 4.1 Production Implementation: `src/lib/media.ts`

```typescript
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";

/**
 * Daftar MIME type gambar yang diizinkan untuk diunggah.
 */
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Batas ukuran berkas maksimum: 5MB (5 * 1024 * 1024 bytes).
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

/**
 * Lokasi penyimpanan lokal berkas media di folder public/uploads.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Memastikan direktori public/uploads sudah ada.
 * Dibuat secara rekursif jika belum tersedia (Async).
 */
export async function ensureUploadDir(): Promise<string> {
  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/**
 * Memastikan direktori public/uploads sudah ada (Sync).
 */
export function ensureUploadDirSync(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

/**
 * Format ukuran berkas ke representasi yang mudah dibaca (B, KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  if (i === 0) return `${bytes} B`;
  const size = bytes / Math.pow(1024, i);
  const formatted = size % 1 === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[i]}`;
}

/**
 * Validasi awal terhadap metadata berkas unggahan (ukuran & MIME type).
 */
export function validateUploadFile(file: { size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "Berkas gambar tidak ditemukan" };
  }

  if (file.size === 0) {
    return { valid: false, error: "Berkas gambar tidak boleh kosong" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Ukuran berkas melebihi batas 5MB" };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `Tipe berkas ${file.type || "tidak diketahui"} tidak diizinkan. Hanya format PNG, JPEG, WebP, GIF, dan SVG yang didukung.`,
    };
  }

  return { valid: true };
}

/**
 * Validasi buffer gambar berdasarkan magic bytes biner dan inspeksi konten XML SVG.
 */
export function validateImageBuffer(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Berkas gambar tidak boleh kosong" };
  }

  // 1. PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    if (!isPng) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format PNG (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 2. JPEG Magic Bytes: FF D8 FF
  if (mimeType === "image/jpeg") {
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    if (!isJpeg) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format JPEG (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 3. GIF Magic Bytes: 47 49 46 38 ("GIF8")
  if (mimeType === "image/gif") {
    const isGif =
      buffer.length >= 4 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38;

    if (!isGif) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format GIF (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 4. WebP: RIFF Container dengan sub-header WEBP
  // Offset 0-3: 'RIFF' (0x52 0x49 0x46 0x46)
  // Offset 8-11: 'WEBP' (0x57 0x45 0x42 0x50)
  if (mimeType === "image/webp") {
    const isWebP =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isWebP) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format WebP (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 5. SVG: Inspeksi teks XML, memastikan keberadaan tag <svg dan memblokir XSS vectors
  if (mimeType === "image/svg+xml") {
    const text = buffer.toString("utf-8");

    if (!/<svg\b/i.test(text)) {
      return {
        valid: false,
        error: "Isi berkas tidak valid sebagai format SVG (elemen <svg> tidak ditemukan)",
      };
    }

    // Blokir skrip dan event handler terlarang (XSS prevention)
    if (/<\s*script\b/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung tag <script> terlarang (XSS)",
      };
    }

    if (/javascript\s*:/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung URI javascript: terlarang (XSS)",
      };
    }

    if (/onload\s*=/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung atribut event onload= terlarang (XSS)",
      };
    }

    if (/onerror\s*=/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung atribut event onerror= terlarang (XSS)",
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    error: "Tipe MIME tidak didukung untuk validasi gambar",
  };
}

/**
 * Membersihkan nama berkas dari karakter berbahaya, null bytes, dan path traversal.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== "string") {
    return "media";
  }

  // Hapus null byte dan spasi berlebih
  const clean = originalName.replace(/\0/g, "").trim();

  // Ambil hanya nama berkas tanpa direktori
  const base = path.basename(clean);

  // Pisahkan ekstensi dan nama dasar
  const ext = path.extname(base).toLowerCase();
  const nameWithoutExt = path.basename(base, ext);

  // Ubah nama menjadi slug aman (hanya a-z, 0-9, -, _)
  const slug = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Bersihkan ekstensi dari karakter ilegal
  const cleanExt = ext.replace(/[^a-z0-9.]/g, "").toLowerCase();

  const safeSlug = slug || "media";
  return `${safeSlug}${cleanExt}`;
}

/**
 * Menghasilkan nama berkas unik untuk mencegah tabrakan nama berkas di disk:
 * Format: {timestamp}-{randomHex}-{sanitizedName}.{ext}
 */
export function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString("hex");

  return `${timestamp}-${randomHex}-${base}${ext}`;
}

/**
 * Validasi dan resolusi path berkas secara defensif terhadap path traversal.
 * Memastikan berkas strictly berada di dalam direktori UPLOAD_DIR.
 * Mengembalikan null jika ada indikasi manipulasi direktori traversal.
 */
export function getSafeFilePath(
  filename: string
): { safePath: string; safeName: string } | null {
  if (!filename || typeof filename !== "string") {
    return null;
  }

  // 1. Tolak jika mengandung null bytes
  if (filename.includes("\0")) {
    return null;
  }

  // 2. Decode URL jika ada karakter encoded traversal
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    return null;
  }

  // 3. Tolak jika terdapat token traversal direktori eksplisit
  if (
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    return null;
  }

  // 4. Ambil basename murni
  const safeName = path.basename(decoded);
  if (!safeName || safeName === "." || safeName === "..") {
    return null;
  }

  // 5. Resolusi path absolut dan periksa pembatasan direktori (containment check)
  const resolvedPath = path.resolve(UPLOAD_DIR, safeName);
  const normalizedUploadDir = path.resolve(UPLOAD_DIR);
  const relative = path.relative(normalizedUploadDir, resolvedPath);

  // Jika hasil relative keluar dari direktori atau absolut, tolak
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    return null;
  }

  return {
    safePath: resolvedPath,
    safeName,
  };
}

/**
 * Menghasilkan URL publik untuk berkas media (selalu berformat forward slash).
 */
export function getPublicMediaUrl(filename: string): string {
  return `/uploads/${filename}`;
}
```

---

### 4.2 Production Implementation: `src/lib/validations.ts`

Update `PostAdminSchema` (and optionally harmonize `PostCreateSchema`):

```typescript
// Di src/lib/validations.ts:

export const PostAdminSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter").max(200, "Judul maksimal 200 karakter"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug minimal 3 karakter")
    .max(120, "Slug maksimal 120 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip"),
  excerpt: z.string().trim().min(10, "Ringkasan minimal 10 karakter").max(300, "Ringkasan maksimal 300 karakter"),
  content: z.string().trim().min(20, "Konten artikel minimal 20 karakter"),
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
      { message: "URL gambar sampul harus diawali /uploads/ atau http:// atau https://" }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});
```

Harmonize `PostCreateSchema` similarly:
```typescript
export const PostCreateSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter").max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip"),
  excerpt: z.string().trim().min(10).max(300),
  content: z.string().trim().min(50, "Konten artikel minimal 50 karakter"),
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
      { message: "URL gambar sampul harus diawali /uploads/ atau http:// atau https://" }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  tags: z.array(z.string()).default([]),
});
```

---

### 4.3 Production Implementation: `.gitignore` and `public/uploads/.gitkeep`

Append to `.gitignore`:
```gitignore
# uploaded media assets
/public/uploads/*
!/public/uploads/.gitkeep
```

Create file `public/uploads/.gitkeep`:
```
# Placeholder to ensure public/uploads folder is tracked in git while uploaded binaries are ignored.
```

---

## 5. Verification Method

To independently verify the implementation once applied by the implementer agent:

### 5.1 Unit & Functional Testing Command
Run Vitest with test filtering or full suite:
```powershell
# Run the existing test suite to ensure 0 regression:
npm.cmd test

# Run tests specifically covering validations:
npx.cmd vitest run tests/admin-validations.test.ts tests/validations.test.ts
```

### 5.2 Specific Test Cases for Verification
1. **Magic Bytes Verification**:
   - Create a dummy buffer with PNG header `Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])`: `validateImageBuffer(buf, "image/png").valid === true`.
   - Create text buffer `Buffer.from("malicious executable")` with MIME `image/png`: `validateImageBuffer(buf, "image/png").valid === false`.
   - SVG with `<svg><script>alert(1)</script></svg>`: `valid === false` and error message contains `tag <script>`.
   - SVG with `<svg><circle onload="alert(1)" /></svg>`: `valid === false` and error message contains `onload=`.
   - Clean SVG `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`: `valid === true`.
2. **Path Traversal Defense**:
   - `getSafeFilePath("../../../etc/passwd") === null`
   - `getSafeFilePath("..\\..\\windows\\system32") === null`
   - `getSafeFilePath("image%00.png") === null`
   - `getSafeFilePath("valid-image.png") !== null` and `safePath === path.resolve(UPLOAD_DIR, "valid-image.png")`
3. **Cover Image Validation**:
   - `PostAdminSchema.safeParse({ ..., coverImage: "/uploads/my-photo.jpg" }).success === true`
   - `PostAdminSchema.safeParse({ ..., coverImage: "https://example.com/banner.png" }).success === true`
   - `PostAdminSchema.safeParse({ ..., coverImage: "bukan-url-valid" }).success === false`
   - `PostAdminSchema.safeParse({ ..., coverImage: null }).success === true`
   - `PostAdminSchema.safeParse({ ..., coverImage: "" }).success === true`
   - `PostAdminSchema.safeParse({ ..., coverImage: undefined }).success === true`
4. **Production Build Verification**:
   ```powershell
   npm.cmd run build
   ```
   Must exit with code 0 and zero TypeScript compilation errors.
