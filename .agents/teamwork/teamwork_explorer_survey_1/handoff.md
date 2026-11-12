# Handoff Report: Media Storage & Backend API Architecture Survey (R1 & R2)

**Author**: teamwork_explorer
**State Directory**: `.agents/teamwork/teamwork_explorer_survey_1/`
**Target Milestone**: Media Library CMS & Image Upload (Requirements R1 & R2)

---

## 1. Observation

### 1.1 Project Structure & File Storage
- **Public Directory**:
  - Command: `Test-Path D:\c\blog\public` returned `False`.
  - The `public/` directory does not currently exist in the repository root.
  - In Next.js (version `"next": "^16.4.6"` per `package.json:21`), any static file placed under `<project_root>/public/` is served at root path `/` (e.g. `public/uploads/<filename>` is served at `/uploads/<filename>`).
  - Target absolute directory path for media files: `path.join(process.cwd(), "public", "uploads")`.
  - `.gitignore` (`.gitignore:1-35`): Currently ends at `/prisma/*.db-journal`. It does not contain `/public/uploads/`.
  - Directory creation: Must be dynamically ensured using `await fs.mkdir(UPLOAD_DIR, { recursive: true })` before writing or listing.

### 1.2 Authentication & Middleware Protection
- **Middleware Guard** (`src/middleware.ts:25-33`):
  ```typescript
  // Proteksi rute API Admin (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }
  }
  ```
  `matcher` configuration (`src/middleware.ts:39`): `["/admin/:path*", "/api/admin/:path*"]`.
  All requests starting with `/api/admin/` (except `/api/admin/auth/`) are intercepted and authenticated before reaching Route Handlers in production/development.
- **Session Helper** (`src/lib/auth.ts:3, 54-79`):
  - Cookie name: `ADMIN_COOKIE_NAME = "admin_session"`.
  - `verifySessionToken(token?: string | null): Promise<boolean>` verifies HMAC-SHA256 signature and 7-day expiration.
  - `isAuthenticatedAdmin(): Promise<boolean>` reads `cookies()` from `next/headers` and invokes `verifySessionToken()`.
- **Route Handler Session Checking (Defense-in-Depth)**:
  - Unit tests in Vitest that import Route Handlers directly (e.g. `tests/admin-posts-api.test.ts`) bypass `middleware.ts` unless mocked or invoked explicitly.
  - To guarantee that API unit tests can verify 401 unauthenticated access on media endpoints, the Route Handlers should check credentials either via a helper verifying `req.headers.get("cookie")` / `await isAuthenticatedAdmin()`, or test files should test both middleware and route level.

### 1.3 Route Conventions & Response Formats
- Surveyed routes: `src/app/api/admin/posts/route.ts`, `src/app/api/admin/posts/[id]/route.ts`, `src/app/api/admin/comments/route.ts`, `src/app/api/admin/subscribers/route.ts`.
- **Response Shape**:
  - Success: `NextResponse.json({ success: true, ...data }, { status: 200 | 201 })`
  - Client Error: `NextResponse.json({ success: false, error: "Pesan error" }, { status: 400 | 401 | 403 | 404 | 409 })`
  - Server Error: `NextResponse.json({ success: false, error: errorMsg }, { status: 500 })`
- **Dynamic Route Handlers**:
  - Next.js 15+ convention: `params` is a Promise:
    `{ params }: { params: Promise<{ id: string }> }` -> `const { id } = await params;` (as seen in `src/app/api/admin/posts/[id]/route.ts:7-13`).

### 1.4 Existing Zod Validations & Critical Discovery for Post Cover Image
- `src/lib/validations.ts:43-62`:
  ```typescript
  export const PostAdminSchema = z.object({
    ...
    coverImage: z
      .string()
      .trim()
      .url("URL gambar tidak valid")
      .optional()
      .nullable()
      .or(z.literal("")),
  ```
- `src/components/admin/PostEditor.tsx:205-211`:
  ```typescript
  if (coverImage && coverImage.trim()) {
    try {
      new URL(coverImage.trim());
    } catch {
      errors.coverImage = "Format URL gambar sampul tidak valid (harus diawali http:// atau https://)";
    }
  }
  ```
- **Critical Finding**: Both `PostAdminSchema` and `PostEditor.tsx` require `coverImage` to be a valid absolute URL via `new URL()` / `z.string().url()`. If an uploaded media file with relative path `/uploads/example.png` is assigned as cover image (Requirement R3), both client and backend validation will reject it unless updated to accept paths starting with `/uploads/` or `/`.
- In `tests/admin-validations.test.ts:243-246`:
  `const invalidUrl = PostAdminSchema.safeParse({ ...base, coverImage: "bukan-url-valid" }); expect(invalidUrl.success).toBe(false);`
  The string `"bukan-url-valid"` must continue to fail, but `/uploads/...` should be supported.

### 1.5 Baseline Test Status
- Test Suite Execution:
  - Command: `npm.cmd test` (Vitest run)
  - Result: 14 test files, 236 tests, 100% passed (`Duration: ~74s`).
  - Baseline is completely green.

---

## 2. Logic Chain

1. **Static Serving Feasibility (R1)**:
   - Next.js automatically maps `<project_root>/public/*` to the HTTP root `/`.
   - Creating directory `public/uploads` guarantees that any file written there (e.g. `public/uploads/sample.webp`) is immediately reachable at URL `/uploads/sample.webp`.
   - No external file server, CDN, or cloud storage dependency is required.
   - Because `public` does not yet exist, initialization code must use `{ recursive: true }` when creating the directory.

2. **Upload Processing in Next.js App Router (R2)**:
   - Next.js App Router runs on Node.js 22 runtime and standard Web Fetch API (`Request`).
   - `const formData = await req.formData();` parses `multipart/form-data` without third-party libraries (no `multer`, `formidable`, or `busboy`).
   - `const file = formData.get("file");` provides a `File` / `Blob` instance.
   - File size validation: `file.size <= 5 * 1024 * 1024` (5MB limit).
   - MIME validation: Allowed MIME types `['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']`.
   - Extension validation: Allowed extensions `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`.
   - Magic bytes validation: First bytes buffer check (PNG: `89 50 4E 47`, JPEG: `FF D8 FF`, GIF: `47 49 46 38`, WEBP: `RIFF...WEBP`, SVG: text containing `<svg` or `<?xml`).

3. **Defensive Path Traversal & Collision Prevention**:
   - Attack vectors: Filenames such as `../../../etc/passwd`, `..\\..\\secret.txt`, `image.png\0.exe`, or duplicate names overwriting existing files.
   - Defense:
     a. Extract extension and sanitize base name: keep only `[a-z0-9-]`.
     b. Generate unique filename: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${slugBase}${ext}`.
     c. Resolve target absolute path using `path.resolve(UPLOAD_DIR, safeFilename)`.
     d. Traversal guard: Verify `resolvedPath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)`.

4. **List & Delete Architecture**:
   - `GET /api/admin/media`:
     - Reads directory with `fs.readdir(UPLOAD_DIR, { withFileTypes: true })`.
     - Ignores directories, hidden files, and `.gitkeep`.
     - Reads metadata with `fs.stat(filePath)`: `size`, `createdAt` (mtime/birthtime), `name`, and constructed `url: /uploads/${name}`.
     - Sorts descending by `createdAt`.
   - `DELETE /api/admin/media/[id]`:
     - Dynamic route handler: `const { id } = await params; const filename = decodeURIComponent(id);`.
     - Path traversal check: `const safe = path.basename(filename);` if `safe !== filename` or contains `..` or separator, reject with 400.
     - File existence check: `fs.access(targetPath)`. If not found, return 404.
     - Deletion: `await fs.unlink(targetPath)`.
     - Also supporting `DELETE /api/admin/media` with query parameter `?filename=...` ensures maximum client flexibility.

5. **Authentication Verification**:
   - `src/middleware.ts` intercepts all HTTP calls to `/api/admin/*` and returns 401 if unauthenticated.
   - Route handlers should additionally implement a session check helper (reading cookie from `req.headers.get("cookie")` and `await isAuthenticatedAdmin()`) so both integrated requests and direct unit test calls are securely verified.

---

## 3. Caveats

1. **PostAdminSchema & PostEditor Cover Image Compatibility**:
   - `src/lib/validations.ts` line 56 uses `z.string().url()`, and `src/components/admin/PostEditor.tsx` line 207 uses `new URL(coverImage)`.
   - Both reject relative paths like `/uploads/...`.
   - The implementer for R1/R2/R3 must update `PostAdminSchema` and `PostEditor.tsx` to allow `/uploads/...` relative paths while preserving rejection of invalid strings like `"bukan-url-valid"` to prevent breaking existing tests (`tests/admin-validations.test.ts:244`).

2. **Git Tracking of Uploaded Media**:
   - `public/uploads/` will store binary user uploads.
   - To keep git repository clean, `.gitignore` should include `/public/uploads/*` with an exception for `/public/uploads/.gitkeep` (`!/public/uploads/.gitkeep`).

3. **Node vs Browser Polyfills in Tests**:
   - Vitest runs in `node` environment (`vitest.config.ts:6`).
   - Node 22 natively provides `File`, `FormData`, `Blob`, `Request`, `Response`, and `crypto`. No polyfill packages are needed for unit tests.

---

## 4. Conclusion

1. **Storage Location**:
   Use `path.join(process.cwd(), "public", "uploads")`. Directory creation must use `await fs.mkdir(UPLOAD_DIR, { recursive: true })`.
2. **Endpoints to Implement**:
   - `POST /api/admin/media/upload`: processes `req.formData()`, validates file size (<=5MB), MIME type, extension, and buffer signature, generates unique safe filename, saves to disk, returns `{ success: true, url, file: { name, url, size, createdAt } }`.
   - `GET /api/admin/media`: lists uploaded files with metadata (name, url, size, createdAt) sorted by newest first.
   - `DELETE /api/admin/media/[id]` (and optional query param `?filename=` on `/api/admin/media`): validates filename against path traversal, verifies existence, unlinks file, returns 200 or 404.
3. **Zod Schemas**:
   - Add `MediaUploadSchema` and `MediaDeleteSchema` in `src/lib/validations.ts`.
   - Refine `PostAdminSchema.coverImage` in `src/lib/validations.ts` to accept `/uploads/...` paths as well as full URLs.
4. **Auth Enforcement**:
   - Enforce session checking via `src/lib/auth.ts` helper and `src/middleware.ts`.
5. **No External Packages Needed**:
   - Zero new npm dependencies required. Standard Node.js `fs/promises`, `path`, `crypto`, and standard Web `FormData`/`File` + `zod` are 100% sufficient.

---

## 5. Verification Method

1. **Baseline Test Regression Check**:
   ```powershell
   npm.cmd test
   ```
   *Expected*: All 236 existing tests pass (14 test files).

2. **Production Build Check**:
   ```powershell
   npm.cmd run build
   ```
   *Expected*: Next.js build completes with exit code 0.

3. **Media Upload & Validation Unit Tests (to be implemented in R4)**:
   - Test invalid MIME types (e.g. `application/pdf`, `text/html`, `image/x-icon`) -> status 400.
   - Test file size exceeding 5MB -> status 400.
   - Test empty file (0 bytes) -> status 400.
   - Test path traversal attempts in filename (e.g. `../../../malicious.png`) -> safely sanitized and confined to `public/uploads/`.
   - Test delete non-existent file -> status 404.
   - Test delete with path traversal attempt -> status 400 / 403.
   - Test delete valid file -> status 200 and file unlinked from disk.
   - Test unauthenticated access without valid admin session -> status 401.

4. **Files to Inspect**:
   - `src/app/api/admin/media/upload/route.ts`
   - `src/app/api/admin/media/route.ts`
   - `src/app/api/admin/media/[id]/route.ts`
   - `src/lib/validations.ts`
