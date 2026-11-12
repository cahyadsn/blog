# Project: Media Library CMS & Image Upload (Pustaka Media & Unggah Gambar)

## Architecture
- **Framework**: Next.js 16.4.6 (App Router with Turbopack), React 19, TypeScript 5.7.3 (`strict: true`)
- **Runtime & APIs**: Node.js 22 runtime, Web Fetch API (`Request`, `Response`, `FormData`, `File`, `Blob`)
- **Asset Storage & Public Serving**:
  - Local disk storage: `path.join(process.cwd(), "public", "uploads")`
  - Served automatically by Next.js static asset server at root URL `/uploads/<filename>`
  - Automatic recursive directory initialization on demand: `fs.mkdir(uploadDir, { recursive: true })`
  - `.gitignore`: Ignore `/public/uploads/*` except `/public/uploads/.gitkeep` to prevent repository pollution
- **Media Validation & Security Helper (`src/lib/media.ts`)**:
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`
  - Buffer magic bytes verification:
    - PNG: `89 50 4E 47 0D 0A 1A 0A`
    - JPEG: `FF D8 FF`
    - GIF: `47 49 46 38`
    - WebP: `RIFF` ... `WEBP`
    - SVG: Text inspection requiring `<svg` element and strictly blocking `<script>`, `javascript:`, `onload=`, `onerror=`
  - Size validation: Max 5MB (`5 * 1024 * 1024 = 5,242,880` bytes); empty file (0 bytes) rejected
  - Path traversal defense: `path.basename` extraction, null byte removal, path resolution containment check inside `public/uploads/`
  - Unique filename generation: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${slug}.${ext}`
- **Admin Media API Route Handlers**:
  - `POST /api/admin/media/upload`: Multipart FormData parser, buffer & MIME validator, saves file to disk, returns status 201 with public URL and metadata
  - `GET /api/admin/media`: Reads `public/uploads/`, formats size/date metadata, returns status 200 with media array sorted newest first (returns empty array if directory missing)
  - `DELETE /api/admin/media/[id]`: Awaits `context.params` (`params: Promise<{ id: string }>`), sanitizes filename, unlinks file, returns status 200 (or 404 if missing, 400 if traversal detected)
  - All routes protected by session authentication (`src/middleware.ts` and `isAuthenticatedAdmin()`)
- **Admin CMS UI & Editor Integration**:
  - `src/app/admin/page.tsx`: Extended `activeTab` type union (`"posts" | "comments" | "subscribers" | "media"`), tab button with `ImageIcon`, renders `<MediaLibrary />`
  - `src/components/admin/MediaLibrary.tsx`: Media gallery with upload dropzone, search, refresh, responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), thumbnail preview, file size/date formatting, copy public URL button, copy Markdown snippet button (`![alt](/uploads/...)`), and delete button
  - `src/components/admin/MediaDeleteModal.tsx`: Accessible modal confirmation dialog for file deletion
  - `src/components/admin/MediaSelectModal.tsx`: Reusable image picker modal for selecting media from the library inside editor
  - `src/components/admin/PostEditor.tsx`:
    - Textarea ref (`textareaRef = useRef<HTMLTextAreaElement>(null)`)
    - Helper `insertMarkdownAtCursor(snippet)` inserting at cursor position and refocusing
    - Editor toolbar with "Unggah Gambar" and "Pilih dari Pustaka" buttons
    - Drag-and-drop file upload on editor area with automatic markdown insertion
    - Cover image support with "Pilih dari Pustaka" modal picker, direct "Unggah Sampul" button, 16:9 thumbnail preview, and "Hapus Sampul"
    - Form validation update allowing `/uploads/...` relative paths for `coverImage`
- **Validation Harmonization**:
  - `src/lib/validations.ts`: Update `PostAdminSchema.coverImage` refinement to accept `/uploads/...` paths as well as valid URLs, while continuing to reject invalid strings (`bukan-url-valid`)
- **Testing & Verification**:
  - Vitest suite `tests/admin-media-api.test.ts` covering Tiers 1-4 (upload validation, magic bytes, boundary sizes, path traversal defense, delete operations, auth checks, test workspace cleanup)
  - Preserves 100% pass rate across all 236 existing Vitest tests + 26 media tests + 51 challenger tests (total 313 tests)
  - Production build `npm.cmd run build` completes with exit code 0 and zero TypeScript or Next.js compiler errors

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Directory & Storage Setup | Create `public/uploads/` storage path with recursive initialization; configure `.gitignore` for uploaded assets | M1 | survey | DONE |
| 2 | Media Validation Helper (`src/lib/media.ts`) | Strict MIME validation, magic byte buffer inspection, SVG XSS sanitization, 5MB boundary check, unique name generation | M1 | survey | DONE |
| 3 | Safe Filename & Traversal Guard | Defensive path traversal prevention (`path.basename`, null byte stripping, directory boundary containment) | M1 | survey | DONE |
| 4 | Cover Image Schema Harmonization (`src/lib/validations.ts`) | Refine `PostAdminSchema.coverImage` to accept `/uploads/...` relative paths while rejecting invalid non-URL strings | M1 | survey | DONE |
| 5 | Upload Route Handler (`POST /api/admin/media/upload`) | Multipart FormData upload endpoint, file buffer validation, disk persistence, returns 201 with public URL and metadata | M1 | survey | DONE |
| 6 | Media List Route Handler (`GET /api/admin/media`) | Endpoint returning all uploaded media files sorted newest first with metadata (name, url, size, createdAt); handles missing dir gracefully | M1 | survey | DONE |
| 7 | Media Delete Route Handler (`DELETE /api/admin/media/[id]`) | Endpoint unlinking file by safe filename id, with path traversal rejection (400) and 404 for missing files | M1 | survey | DONE |
| 8 | Media API Auth Protection | Verify admin session on all media routes returning 401 Unauthorized for unauthenticated requests | M1 | survey | DONE |
| 9 | Admin Dashboard Tab Integration (`src/app/admin/page.tsx`) | Add "Pustaka Media" tab with `ImageIcon`, badge count, and seamless switching | M1 | survey | DONE |
| 10 | Media Library Component (`src/components/admin/MediaLibrary.tsx`) | Gallery grid UI, upload zone, search filter, formatted size & date, copy public URL button, copy Markdown snippet button | M1 | survey | DONE |
| 11 | Media Delete Modal (`src/components/admin/MediaDeleteModal.tsx`) | Accessible confirmation modal preventing accidental file deletion | M1 | survey | DONE |
| 12 | Media Selector Modal (`src/components/admin/MediaSelectModal.tsx`) | Image picker modal for selecting library images into editor | M1 | survey | DONE |
| 13 | PostEditor Cursor Markdown Insertion (`src/components/admin/PostEditor.tsx`) | `textareaRef`, `insertMarkdownAtCursor`, editor toolbar with "Unggah Gambar" and "Pilih dari Pustaka", drag-and-drop upload | M1 | survey | DONE |
| 14 | PostEditor Cover Image Picker & Direct Upload | Select cover image from media library or upload directly, with 16:9 preview, remove button, and `/uploads/` support | M1 | survey | DONE |
| 15 | Automated Vitest Media Test Suite (`tests/admin-media-api.test.ts`) | Tiers 1-4 tests (valid uploads, MIME/magic byte spoofing, 5MB boundary, empty file, path traversal, deletion, auth checks, test cleanup) | M1 | survey | DONE |
| 16 | Regression & Production Build Verification | All 236 existing tests continue to pass (100%), and `npm.cmd run build` completes with exit code 0 | M1 | survey | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status | Key Outputs |
|---|------|-------|-------------|--------|-------------|
| 1 | Media Library CMS & Image Upload | All features (1–16) in Feature Inventory (Requirements R1, R2, R3, R4) | none | DONE | Storage helper `src/lib/media.ts`, route handlers `POST/GET/DELETE /api/admin/media/*`, UI components `MediaLibrary.tsx`, `MediaDeleteModal.tsx`, `MediaSelectModal.tsx`, `PostEditor.tsx` & `admin/page.tsx` integration, test suites `tests/admin-media-api.test.ts` + challenger suites (313 tests passed), clean build exit 0 |

---

## Interface Contracts

### Media Validation Utility (`src/lib/media.ts`)
- `export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"] as const;`
- `export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes`
- `export function validateImageBuffer(buffer: Buffer, mimeType: string): { valid: boolean; error?: string }`
- `export function sanitizeFilename(originalName: string): string`
- `export function getSafeFilePath(filename: string): { safePath: string; safeName: string } | null`
- `export function formatFileSize(bytes: number): string`

### POST `/api/admin/media/upload`
- **Request**: `multipart/form-data` with field `file` (`File` / `Blob`)
- **Headers**: Admin session cookie (`admin_session`)
- **Responses**:
  - `201 Created`:
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
  - `400 Bad Request`: `{ "success": false, "error": "Ukuran berkas melebihi batas 5MB" | "Tipe berkas tidak diizinkan..." | "Berkas gambar tidak boleh kosong" | "Isi berkas tidak cocok dengan format gambar yang valid" }`
  - `401 Unauthorized`: `{ "success": false, "error": "Akses ditolak: Autentikasi admin diperlukan." }`
  - `500 Internal Server Error`: `{ "success": false, "error": "Gagal menyimpan berkas" }`

### GET `/api/admin/media`
- **Request**: Query parameters none
- **Headers**: Admin session cookie (`admin_session`)
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "media": [
        {
          "name": "1731427200000-abcd-banner.png",
          "url": "/uploads/1731427200000-abcd-banner.png",
          "size": 102400,
          "type": "image/png",
          "createdAt": "2026-11-12T17:00:00.000Z"
        }
      ]
    }
    ```
  - `401 Unauthorized`: `{ "success": false, "error": "Akses ditolak: Autentikasi admin diperlukan." }`

### DELETE `/api/admin/media/[id]`
- **Request**: Dynamic parameter `id` (or query `?filename=`)
- **Next.js Signature**: `export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }): Promise<Response>`
- **Responses**:
  - `200 OK`: `{ "success": true, "message": "Berkas berhasil dihapus" }`
  - `400 Bad Request`: `{ "success": false, "error": "Nama berkas tidak valid" }`
  - `401 Unauthorized`: `{ "success": false, "error": "Akses ditolak: Autentikasi admin diperlukan." }`
  - `404 Not Found`: `{ "success": false, "error": "Berkas tidak ditemukan" }`

### Cover Image Schema Refinement (`src/lib/validations.ts`)
- In `PostAdminSchema`:
  ```typescript
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
      { message: "URL gambar tidak valid" }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  ```

---

## Code Layout
- `src/lib/media.ts`: MIME verification, buffer magic bytes inspection, SVG sanitization, 5MB boundary check, unique filename generation, path traversal guard, size formatting.
- `src/lib/validations.ts`: Refined `PostAdminSchema.coverImage` refinement allowing `/uploads/...`.
- `src/app/api/admin/media/upload/route.ts`: Multipart form-data upload route handler.
- `src/app/api/admin/media/route.ts`: Media listing route handler (newest first).
- `src/app/api/admin/media/[id]/route.ts`: Media deletion route handler with traversal guard.
- `src/app/admin/page.tsx`: Extended `activeTab` with `"media"`, tab button with `ImageIcon`, renders `MediaLibrary`.
- `src/components/admin/MediaLibrary.tsx`: Media gallery component with upload zone, search, refresh, responsive grid, copy URL/Markdown, delete trigger.
- `src/components/admin/MediaDeleteModal.tsx`: Delete confirmation modal dialog.
- `src/components/admin/MediaSelectModal.tsx`: Reusable media selector modal for PostEditor.
- `src/components/admin/PostEditor.tsx`: Textarea cursor insertion, toolbar buttons, drag-and-drop upload, cover image picker/upload, preview thumbnail.
- `.gitignore`: Updated to ignore `/public/uploads/*` except `/public/uploads/.gitkeep`.
- `tests/admin-media-api.test.ts`: Vitest test suite for upload validation, MIME spoofing, boundary sizes, path traversal defense, file deletion, auth checks, and clean workspace isolation.
