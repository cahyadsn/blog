# Handoff Report: Specification Mining for Media Library CMS (Requirements R1, R2, R4)

**Agent Archetype**: teamwork_spec_miner  
**Working Directory**: `d:\c\blog`  
**State Folder**: `d:\c\blog\.agents\teamwork\teamwork_spec_miner_survey_3`  
**Parent Orchestrator ID**: `158bb4e0-a920-499f-a2b8-4e81fb835b57`  
**Date**: 2026-11-12T17:00:00Z  

---

## 1. Observation

Direct empirical observations from inspecting the codebase, running test suites, executing build tools, and reviewing configurations:

1. **Vitest Configuration & Test Framework**:
   - `vitest.config.ts` (lines 1–15):
     ```typescript
     export default defineConfig({
       test: {
         environment: "node",
         globals: true,
         fileParallelism: false,
       },
       resolve: {
         alias: {
           "@": path.resolve(__dirname, "./src"),
         },
       },
     });
     ```
   - Package versions (`package.json` lines 16–39): `vitest: ^5.1.0`, `next: ^16.4.6`, `react: ^19.0.0`, `react-dom: ^19.0.0`, `zod: ^4.6.7`, `@prisma/client: ^6.4.1`, `typescript: ^5.7.3`.
   - Script definitions: `"test": "vitest run"`, `"build": "next build"`.

2. **Existing Test Suite Baseline**:
   - Command `npm.cmd test` execution result:
     - Total test files: 14 test files passed.
     - Total tests: **236 tests passed (0 failures, 0 skipped)** in ~60.86s.
     - Files breakdown:
       * `tests/admin-comments-api.test.ts` (21 tests)
       * `tests/admin-integration.test.ts` (15 tests)
       * `tests/admin-posts-api.test.ts` (26 tests)
       * `tests/admin-subscribers.test.ts` (12 tests)
       * `tests/admin-validations.test.ts` (33 tests)
       * `tests/auth.test.ts` (4 tests)
       * `tests/challenger-2-verification.test.ts` (17 tests)
       * `tests/challenger-likes-stress.test.ts` (13 tests)
       * `tests/challenger-newsletter-stress.test.ts` (22 tests)
       * `tests/likes-api.test.ts` (16 tests)
       * `tests/markdown.test.ts` (3 tests)
       * `tests/newsletter.test.ts` (13 tests)
       * `tests/seo.test.ts` (35 tests)
       * `tests/validations.test.ts` (6 tests)
     - Test isolation: `fileParallelism: false` runs test files sequentially, preventing SQLite concurrent locking issues.

3. **Existing API Route Handler Testing Patterns**:
   - In `tests/admin-posts-api.test.ts` (lines 1–8, 79–83, 331–333):
     - Handlers are imported directly as Web API functions: `import { GET as getPosts, POST as createPost } from "@/app/api/admin/posts/route";`.
     - Direct invocation with standard `Request`:
       `const req = new Request("http://localhost:3000/api/admin/posts");`
       `const res = await getPosts(req);`
       `const json = await res.json();`
     - Dynamic route parameters in Next.js 15/16 App Router are passed as a Promise:
       `const res = await getPost(req, { params: Promise.resolve({ id: "post-100" }) });`
     - Database is mocked via `vi.mock("@/lib/db", () => ({ db: { ... } }))` for unit route handler tests, whereas `tests/admin-integration.test.ts` tests real SQLite database with `beforeAll` and `afterAll` data cleanup queries.

4. **Authentication Architecture**:
   - `src/middleware.ts` (lines 5–40):
     - Matches `["/admin/:path*", "/api/admin/:path*"]`.
     - Automatically rejects unauthenticated `/api/admin/*` calls with:
       ```json
       { "status": 401, "body": { "success": false, "error": "Akses ditolak: Autentikasi admin diperlukan." } }
       ```
     - Exception whitelist: `/admin/login` and `/api/admin/auth/*`.
   - `src/lib/auth.ts` (lines 3–79):
     - `ADMIN_COOKIE_NAME = "admin_session"`.
     - `isAuthenticatedAdmin()` resolves `await cookies()` and checks `verifySessionToken(sessionCookie?.value)`.
     - HMAC-SHA256 signature verification with 7-day token expiration.

5. **Filesystem & Public Assets State**:
   - Directory `d:\c\blog\public` does not exist yet (`Get-ChildItem -Path public` returned NotFound).
   - `.gitignore` (lines 1–35) does NOT include `/public/uploads/`.
   - If tests or upload handlers create files under `public/uploads/` without cleanup or `.gitignore` entries, `git status` becomes dirty with untracked files.

6. **Production Build Baseline**:
   - Command `npm.cmd run build` execution result:
     - Next.js 16.4.6 (Turbopack)
     - TypeScript compilation: 0 errors in 37.5s.
     - Route collection & static generation: 15/15 routes successfully compiled.
     - App Router detects `ƒ Proxy (Middleware)` protecting `/admin/:path*` and `/api/admin/:path*`.

7. **Validation Schema Constraints (`PostAdminSchema`)**:
   - `src/lib/validations.ts` line 53–59:
     ```typescript
     coverImage: z.string().trim().url("URL gambar tidak valid").optional().nullable().or(z.literal("")),
     ```
   - `tests/admin-validations.test.ts` line 244 verifies invalid URLs are rejected (`bukan-url-valid` -> false).
   - Local uploaded images produce paths like `/uploads/1731427200000-banner.png`. Standard `z.string().url()` rejects non-protocol strings (strings lacking `http://` or `https://`). Therefore, `PostAdminSchema` must be harmonized to accept `/uploads/...` relative paths as well as URLs, without breaking the `bukan-url-valid` test.

---

## 2. Logic Chain

1. **Test Runner & Environment**:
   - Vitest runs under `environment: "node"` with Node.js standard Web APIs (`Request`, `Response`, `FormData`, `File`, `Blob`, `crypto`, `Buffer`).
   - Because `vitest.config.ts` specifies `globals: true` and `fileParallelism: false`, new test suites for media upload should be created in `tests/admin-media-api.test.ts` following existing naming and structure conventions.
   - All 236 existing tests run sequentially and pass in ~60 seconds. New media tests must not interfere with SQLite DB or alter global state permanently.

2. **Route Handler Invocation Contract**:
   - Since Next.js 15/16 App Router defines dynamic route context params as `Promise<{ id: string }>`, `DELETE /api/admin/media/[id]/route.ts` must declare `params: Promise<{ id: string }>` and `await params` in implementation.
   - In unit tests, calls to `DELETE` must pass `{ params: Promise.resolve({ id: "filename.png" }) }` to conform with Next.js type signatures.

3. **Upload Security & MIME Verification**:
   - Attackers can easily forge the HTTP multipart header (`Content-Type: image/png`) while transmitting malicious binaries or PHP scripts.
   - Relying solely on `file.type` or `file.name` extension is inadequate.
   - An authoritative security specification requires a two-layer check:
     1. Layer 1 (Header/Extension): `file.type` matches allowed MIME types (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`).
     2. Layer 2 (Buffer Magic Bytes): Inspect the first bytes of `Buffer.from(await file.arrayBuffer())`:
        - PNG: `89 50 4E 47 0D 0A 1A 0A` (8 bytes)
        - JPEG: `FF D8 FF` (3 bytes)
        - GIF: `47 49 46 38` (`GIF8`) (4 bytes)
        - WebP: `52 49 46 46` (`RIFF`) and bytes 8–11 `57 45 42 50` (`WEBP`)
        - SVG: XML text containing `<svg` element, with rigorous check preventing `<script>`, `onload=`, `onerror=`, `javascript:` (Stored XSS defense).
   - Max file size boundary: 5MB = `5 * 1024 * 1024` = `5,242,880` bytes. Exactly `5,242,880` bytes is accepted; `5,242,881` bytes is rejected with 400. Empty file (0 bytes) is rejected with 400.

4. **Path Traversal & Filename Sanitization**:
   - Incoming filenames from user uploads or `DELETE /api/admin/media/[id]` route params may include `../../`, `..\\`, null bytes (`\0`), or invalid characters.
   - Defense:
     1. Strip path components with `path.basename()`.
     2. Remove null bytes and non-printable characters.
     3. Generate unique filename using timestamp or UUID plus sanitized slug: `${Date.now()}-${slug}.${extension}`.
     4. On both write and delete, resolve the absolute path and assert `resolvedPath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)`. Reject with 400 if outside.

5. **Zero Test Git Residue (Hygiene)**:
   - Since `public/uploads` is not ignored in `.gitignore`, writing real test files to `public/uploads` would pollute `git status`.
   - The test suite must either:
     1. Mock `fs/promises` (`writeFile`, `unlink`, `readdir`, `stat`, `mkdir`) for Route Handler unit tests.
     2. In integration tests that touch disk: create a dedicated temporary directory outside git (e.g. `path.join(os.tmpdir(), "blog-media-tests")` or a cleanable folder) and wipe it in `afterAll()`.
     3. Ensure `.gitignore` ignores `public/uploads/*` while preserving `.gitkeep`.

---

## 3. Caveats

1. **Prisma Schema**: The Prisma schema currently does not have a `Media` model. As specified in Requirements R1 and R2, media files are managed directly via filesystem storage under `public/uploads/`. If future milestones require storing media records in SQLite, a Prisma migration will be needed, but R1/R2 specifically specify disk-based storage.
2. **Next.js 16 Proxy / Middleware Notice**: During `next build`, Next.js 16 warns `The "middleware" file convention is deprecated. Please use "proxy" instead.` This is an informational migration hint in Next.js 16, but `middleware.ts` continues to function properly. Route handlers for media should also implement defensive server-side auth checking via `isAuthenticatedAdmin()` so they are secure both in standalone unit test execution and in Next.js runtime.
3. **SVG Sanitization**: SVG is an XML-based vector format. While treated as an image, browsers can execute scripts inside raw SVG if navigated directly. Thus, SVG files must be parsed for `<script>` or event handler attributes during validation.

---

## 4. Conclusion

The existing blog project has a mature, deterministic testing environment (Vitest 5.1, 236 passing tests, sequential execution) and a clean Next.js 16 Turbopack build pipeline. 

To satisfy Requirements R1, R2, and R4 without regression:
1. **Upload Validation Helper (`src/lib/media.ts` or `src/lib/validations.ts`)**:
   - Validates MIME type, buffer magic bytes, 5MB size limit, path traversal defense, and generates unique safe filenames (`${Date.now()}-${slug}.${ext}`).
2. **Admin Media API Route Handlers**:
   - `POST /api/admin/media/upload`: Accepts `multipart/form-data`, validates buffer & headers, writes to `public/uploads/`, returns `{ success: true, media: { name, url, size, type, createdAt } }` (status 201).
   - `GET /api/admin/media`: Reads `public/uploads/`, formats file metadata, sorts newest first, returns `{ success: true, media: [...] }` (status 200).
   - `DELETE /api/admin/media/[id]`: Validates safe filename, verifies containment inside `public/uploads/`, unlinks file, returns `{ success: true, message: ... }` (status 200).
   - All endpoints verify session authentication (`401 Unauthorized` if unauthenticated).
3. **Comprehensive Vitest Suite (`tests/admin-media-api.test.ts`)**:
   - Covers all feature tiers (Tier 1 happy paths, Tier 2 boundary/magic byte/size tests, Tier 3 path traversal/security attacks, Tier 4 auth & lifecycle cleanup).
   - Uses temporary directory or mock filesystem to ensure zero git status pollution.
   - Retains 100% pass rate across all 236 existing tests + new media tests.

---

## 5. Verification Method

To independently verify these findings and validate future implementations:

1. **Verify Baseline Test Execution**:
   ```powershell
   npm.cmd test
   ```
   *Expected outcome*: 14 test files passed, exactly 236 tests passed (0 failures).

2. **Verify Production Build & TypeScript Checking**:
   ```powershell
   npm.cmd run build
   ```
   *Expected outcome*: Compilation completes successfully with 0 TypeScript errors; Turbopack generates static and dynamic routes.

3. **Verify Git Hygiene**:
   ```powershell
   git status --short
   ```
   *Expected outcome*: No untracked files in `public/uploads/` after running tests.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Storage | Local Upload Storage | Target directory for uploaded image assets (`public/uploads/`). Needs automatic directory creation if not present. | Disk path `public/uploads/` | Readable static asset via HTTP `/uploads/{filename}` | Throws if disk permission denied | Codebase inspection & `ORIGINAL_REQUEST.md` R1 |
| 2 | R1: Validation | MIME Type Verification | Whitelist validation restricting uploads to PNG, JPEG, WebP, GIF, SVG. | `file.type` / header | boolean / validated MIME type | 400 Bad Request with descriptive Indonesian error | `ORIGINAL_REQUEST.md` R1 |
| 3 | R1: Security | Buffer Magic Bytes Inspection | Deep buffer inspection to prevent Content-Type spoofing (e.g. PHP/EXE sent as `image/png`). | First 4–12 bytes of file buffer | Detected image format | 400 Bad Request: "Isi berkas tidak cocok dengan format gambar yang valid" | Security specification analysis |
| 4 | R1: Validation | File Size Boundary (5MB) | Strict file size enforcement (max `5,242,880` bytes). | `file.size` / buffer length | Validated size | 400 Bad Request: "Ukuran berkas melebihi batas 5MB" | `ORIGINAL_REQUEST.md` R1 |
| 5 | R1: Security | Empty File Rejection | Rejection of 0-byte uploaded files. | File with 0 bytes | None | 400 Bad Request: "Berkas gambar tidak boleh kosong" | Security specification analysis |
| 6 | R1: Security | Path Traversal Defense | Defense against directory traversal attempts (`../../`, `..\\`, null bytes). | Malicious filename | Sanitized basename or rejection | 400 Bad Request: "Nama berkas tidak valid" | `ORIGINAL_REQUEST.md` R1 |
| 7 | R1: Storage | Unique Safe Naming | Generation of unique names preventing collisions (`${Date.now()}-${slug}.${ext}`). | Original filename | Unique safe filename | Replaces unsafe chars with hyphen | `ORIGINAL_REQUEST.md` R1 |
| 8 | R2: API | `POST /api/admin/media/upload` | Multipart form-data endpoint saving validated file to disk and returning metadata. | `FormData` containing `file` | 201 Created: `{ success: true, media: { name, url, size, type, createdAt } }` | 400 (validation fail), 401 (unauthenticated), 500 (IO fail) | `ORIGINAL_REQUEST.md` R2 |
| 9 | R2: API | `GET /api/admin/media` | Endpoint retrieving all media files from disk sorted newest first. | `GET` request with admin cookie | 200 OK: `{ success: true, media: [...] }` | 401 (unauthenticated), 500 (IO fail) | `ORIGINAL_REQUEST.md` R2 |
| 10 | R2: API | `DELETE /api/admin/media/[id]` | Endpoint deleting specified media file from disk by filename/id. | `DELETE` request with dynamic route param `id` | 200 OK: `{ success: true, message: "Berkas berhasil dihapus" }` | 400 (traversal attempt), 404 (file not found), 401 (unauthenticated) | `ORIGINAL_REQUEST.md` R2 |
| 11 | R2: Security | Admin Session Authentication | All media endpoints require authenticated admin cookie (`admin_session`). | Cookie `admin_session` | Continues to handler | 401 Unauthorized: `{ success: false, error: "Akses ditolak: Autentikasi admin diperlukan." }` | `src/middleware.ts` & `src/lib/auth.ts` |
| 12 | R3: CMS | PostEditor Image Upload & Insertion | PostEditor button & drag-drop to upload image and insert `![alt](/uploads/...)` at cursor. | Selected image file | Inserted Markdown tag in textarea | Error banner displayed on failure | `src/components/admin/PostEditor.tsx` & R3 |
| 13 | R3: CMS | Cover Image Selection | Support selecting uploaded media URL (`/uploads/...`) as article coverImage. | Media URL string | Set `coverImage` form field | Validation error if not valid path/URL | `src/components/admin/PostEditor.tsx` & R3 |
| 14 | Validation | `PostAdminSchema` Cover Image | Schema currently requires `z.string().url()`, which rejects `/uploads/...`. Must be expanded to support `/uploads/` root-relative paths while rejecting `bukan-url-valid`. | URL or `/uploads/...` string | Validated string | Zod issue if invalid | `src/lib/validations.ts` & `tests/admin-validations.test.ts` |
| 15 | Testing | Vitest Sequential Execution | Vitest runs test suites sequentially (`fileParallelism: false`) in Node environment. | `npm test` | Test suite results | Exit code 1 on failure | `vitest.config.ts` |
| 16 | Testing | Test Workspace Isolation | Test suites must clean up all generated files to prevent git status pollution. | `beforeAll` / `afterAll` hooks | Clean repository | Dirty git working tree if omitted | Project hygiene specification |

---

## Edge Cases

| # | Feature | Input / Scenario | Observed / Required Behavior |
|---|---------|------------------|------------------------------|
| 1 | Size Validation | File size is exactly 5,242,880 bytes (5MB boundary) | ACCEPT: Validation passes, file is saved to disk with status 201. |
| 2 | Size Validation | File size is 5,242,881 bytes (5MB + 1 byte) | REJECT: Status 400 Bad Request (`Ukuran berkas melebihi batas 5MB`). |
| 3 | Size Validation | File size is 0 bytes (Empty file) | REJECT: Status 400 Bad Request (`Berkas gambar tidak boleh kosong`). |
| 4 | MIME Spoofing | Header `Content-Type: image/png` but buffer is ASCII text (`hello world`) | REJECT: Status 400 Bad Request. Magic bytes mismatch (expected `89 50 4E 47 0D 0A 1A 0A`). |
| 5 | MIME Spoofing | Header `Content-Type: image/jpeg` but buffer is PHP script (`<?php ...`) | REJECT: Status 400 Bad Request. Magic bytes mismatch (expected `FF D8 FF`). |
| 6 | MIME Spoofing | Header `Content-Type: image/png` but buffer is an executable (`MZ` header) | REJECT: Status 400 Bad Request. Magic bytes mismatch. |
| 7 | MIME Validation | File format is `.pdf`, `.mp4`, `.exe`, `.zip`, `.js` | REJECT: Status 400 Bad Request (`Tipe berkas tidak diizinkan. Hanya PNG, JPEG, WebP, GIF, dan SVG yang didukung`). |
| 8 | SVG Security | SVG file containing `<script>alert('xss')</script>` or `onload=` | REJECT: Status 400 Bad Request. Malicious script content detected in SVG vector asset. |
| 9 | Path Traversal | Filename is `../../etc/passwd` or `..\\..\\Windows\\win.ini` | DEFEND: `path.basename` strips directory prefix; path resolution checks containment inside `public/uploads/`. Path outside upload root rejected with 400. |
| 10 | Path Traversal | Filename contains null byte: `malicious.png\0.php` | DEFEND: Null byte stripped or rejected with 400. |
| 11 | Filename Sanitation | Filename with spaces and special chars: `My Gambar #1 (Draft)!.PNG` | SANITIZE: Slugified to `1731427200000-my-gambar-1-draft.png`. |
| 12 | Name Collision | Two concurrent uploads with identical original filename `photo.jpg` | NO COLLISION: Unique timestamp/UUID prefix ensures unique filenames (e.g. `1731427200001-photo.jpg` and `1731427200002-photo.jpg`). |
| 13 | Delete Non-existent | `DELETE /api/admin/media/not-found-image.png` | REJECT: Status 404 Not Found (`Berkas tidak ditemukan`). |
| 14 | Delete Traversal | `DELETE /api/admin/media/..%2F..%2Fpackage.json` | DEFEND: Status 400 Bad Request (`Nama berkas tidak valid`). Never deletes outside `public/uploads/`. |
| 15 | Unauthenticated Upload | `POST /api/admin/media/upload` without admin cookie | REJECT: Status 401 Unauthorized (`Akses ditolak: Autentikasi admin diperlukan.`). |
| 16 | Unauthenticated List | `GET /api/admin/media` without admin cookie | REJECT: Status 401 Unauthorized. |
| 17 | Unauthenticated Delete | `DELETE /api/admin/media/image.png` without admin cookie | REJECT: Status 401 Unauthorized. |
| 18 | Directory Missing | `GET /api/admin/media` when `public/uploads/` does not yet exist | GRACEFUL: Automatically creates directory or returns `{ success: true, media: [] }` with status 200 without throwing 500 error. |
| 19 | Hidden Files in Media | `.gitkeep`, `.DS_Store`, or `.gitignore` inside `public/uploads/` | FILTER: Ignored from media gallery list; only image extensions returned. |
| 20 | Editor Cover Image | Editor sets coverImage to local uploaded URL `/uploads/1731427200000-test.png` | PASS: `PostAdminSchema` accepts `/uploads/...` relative paths as valid cover image. |
| 21 | Editor Cover Image | Editor enters `bukan-url-valid` | REJECT: `PostAdminSchema` rejects invalid non-URL, non-path string (preserves existing test `T2-P8`). |

---

## Detailed Technical Specifications

### A. Upload Magic Bytes Definition Table
```typescript
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export interface MagicByteCheck {
  mime: string;
  ext: string;
  validate: (buffer: Buffer) => boolean;
}

export const MAGIC_BYTE_VALIDATORS: MagicByteCheck[] = [
  {
    mime: "image/png",
    ext: "png",
    // 89 50 4E 47 0D 0A 1A 0A
    validate: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    ext: "jpg",
    // FF D8 FF
    validate: (buf) =>
      buf.length >= 3 &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf[2] === 0xff,
  },
  {
    mime: "image/gif",
    ext: "gif",
    // GIF87a or GIF89a: 47 49 46 38 (37|39) 61
    validate: (buf) =>
      buf.length >= 6 &&
      buf[0] === 0x47 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x38 &&
      (buf[4] === 0x37 || buf[4] === 0x39) &&
      buf[5] === 0x61,
  },
  {
    mime: "image/webp",
    ext: "webp",
    // RIFF .... WEBP
    validate: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50,
  },
  {
    mime: "image/svg+xml",
    ext: "svg",
    // Text-based: must contain <svg and must NOT contain <script or javascript:
    validate: (buf) => {
      const text = buf.toString("utf-8", 0, Math.min(buf.length, 4096)).toLowerCase();
      const hasSvg = text.includes("<svg");
      const hasMaliciousScript =
        text.includes("<script") ||
        text.includes("javascript:") ||
        text.includes("onload=") ||
        text.includes("onerror=");
      return hasSvg && !hasMaliciousScript;
    },
  },
];
```

### B. Media API Route Handler Architecture
1. **`POST /api/admin/media/upload/route.ts`**:
   - `export async function POST(req: Request): Promise<Response>`
   - Authenticates admin (`isAuthenticatedAdmin()`).
   - Parses `await req.formData()`.
   - Extracts `const file = formData.get("file") as File | null`.
   - Validates existence, size (<= 5 * 1024 * 1024), MIME, and magic bytes.
   - Computes unique sanitized filename: `${Date.now()}-${slug}.${ext}`.
   - Ensures target directory exists: `fs.mkdirSync(uploadDir, { recursive: true })`.
   - Writes buffer to disk via `fs.promises.writeFile(targetPath, buffer)`.
   - Returns status 201:
     ```json
     {
       "success": true,
       "media": {
         "name": "1731427200000-banner.png",
         "url": "/uploads/1731427200000-banner.png",
         "size": 102400,
         "type": "image/png",
         "createdAt": "2026-11-12T16:50:00.000Z"
       }
     }
     ```

2. **`GET /api/admin/media/route.ts`**:
   - `export async function GET(req: Request): Promise<Response>`
   - Authenticates admin.
   - If `public/uploads` does not exist, returns `{ success: true, media: [] }`.
   - Reads entries with `fs.promises.readdir(uploadDir, { withFileTypes: true })`.
   - Filters out non-image or hidden files (`.gitkeep`, `.DS_Store`).
   - Retrieves stats with `fs.promises.stat(filePath)`.
   - Sorts newest first by `mtime`.
   - Returns status 200 with `{ success: true, media: [...] }`.

3. **`DELETE /api/admin/media/[id]/route.ts`**:
   - `export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }): Promise<Response>`
   - Authenticates admin.
   - `const { id } = await context.params;`
   - Validates `id` against path traversal: `if (id.includes("..") || id.includes("/") || id.includes("\\")) return NextResponse.json({ success: false, error: "Nama berkas tidak valid" }, { status: 400 });`
   - Resolves target path and checks containment: `if (!resolved.startsWith(path.resolve(uploadDir))) return 400;`
   - Checks file existence: if not found, returns status 404 (`{ success: false, error: "Berkas tidak ditemukan" }`).
   - Unlinks file: `await fs.promises.unlink(resolvedPath)`.
   - Returns status 200: `{ success: true, message: "Berkas berhasil dihapus" }`.

### C. Vitest Media Test Suite Matrix (`tests/admin-media-api.test.ts`)
The new test suite should be structured in four tiers matching existing conventions:
- **Tier 1: Core Feature Coverage**:
  - `T1-MEDIA-1`: Upload valid PNG file (status 201, returns url and metadata).
  - `T1-MEDIA-2`: Upload valid JPEG file (status 201).
  - `T1-MEDIA-3`: Upload valid WebP file (status 201).
  - `T1-MEDIA-4`: Upload valid GIF file (status 201).
  - `T1-MEDIA-5`: Upload valid safe SVG file (status 201).
  - `T1-MEDIA-6`: List media files returning array sorted newest first (status 200).
  - `T1-MEDIA-7`: Delete existing media file and verify removal from disk (status 200).
- **Tier 2: Boundary & Validation Conditions**:
  - `T2-MEDIA-1`: Upload file exactly 5,242,880 bytes (5MB boundary pass).
  - `T2-MEDIA-2`: Upload file 5,242,881 bytes (5MB + 1 byte rejected with 400).
  - `T2-MEDIA-3`: Upload 0-byte file (rejected with 400).
  - `T2-MEDIA-4`: Upload request missing `file` in FormData (rejected with 400).
  - `T2-MEDIA-5`: Delete non-existent media file (returns 404).
  - `T2-MEDIA-6`: GET media when directory is empty or does not exist (returns empty array, status 200).
- **Tier 3: Security & Anti-Tampering Defenses**:
  - `T3-MEDIA-1`: Content-Type spoofing test: `image/png` header with plain text/PHP buffer (rejected with 400).
  - `T3-MEDIA-2`: Content-Type spoofing test: `image/jpeg` header with Windows executable buffer (rejected with 400).
  - `T3-MEDIA-3`: Disallowed MIME type (PDF/TXT/EXE) rejected with 400.
  - `T3-MEDIA-4`: SVG with embedded `<script>` tag rejected with 400.
  - `T3-MEDIA-5`: SVG with embedded `onload=` or `javascript:` handler rejected with 400.
  - `T3-MEDIA-6`: Filename with directory traversal `../../evil.png` sanitized or contained within upload root.
  - `T3-MEDIA-7`: DELETE route with path traversal `..%2Fpackage.json` rejected with 400 without unlinking.
- **Tier 4: Authentication & End-to-End Lifecycle**:
  - `T4-MEDIA-1`: Unauthenticated `POST /api/admin/media/upload` rejected with 401.
  - `T4-MEDIA-2`: Unauthenticated `GET /api/admin/media` rejected with 401.
  - `T4-MEDIA-3`: Unauthenticated `DELETE /api/admin/media/[id]` rejected with 401.
  - `T4-MEDIA-4`: Full upload-list-delete lifecycle verification with complete temporary cleanup.

---
*Report produced by Teamwork Specification Miner.*
