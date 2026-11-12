# Dispatch: Admin Media API Route Handlers Blueprint (Milestone 1, Agent 2)

You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

## Objective
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the Backend Media API routes:
1. `src/app/api/admin/media/upload/route.ts`:
   - `export async function POST(req: Request): Promise<Response>`
   - Session authentication check (defense-in-depth via `isAuthenticatedAdmin()`).
   - `await req.formData()` parsing, extraction of `file`.
   - File validation via `src/lib/media.ts` helper (empty file check, size check, MIME check, buffer magic bytes check).
   - Unique safe filename generation, writing to `public/uploads/` via `fs.promises.writeFile`.
   - Response status 201 with `{ success: true, url: "/uploads/...", media: { name, url, size, type, createdAt } }`.
   - Explicit Indonesian error responses for status 400, 401, 500.
2. `src/app/api/admin/media/route.ts`:
   - `export async function GET(req: Request): Promise<Response>`
   - Session check, directory listing of `public/uploads/` (handling missing directory gracefully without throwing 500).
   - Filtering non-image/hidden files, sorting newest first, returning status 200 `{ success: true, media: [...] }`.
3. `src/app/api/admin/media/[id]/route.ts`:
   - `export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }): Promise<Response>`
   - Next.js 15/16 async params handling (`await context.params`).
   - Path traversal defense (rejecting `..`, `/`, `\`), file existence check (404), unlinking file (`fs.promises.unlink`).
   - Response status 200 `{ success: true, message: "Berkas berhasil dihapus" }`.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2\handoff.md`.
Use send_message to notify the orchestrator when finished.


## 2026-11-12T17:01:18Z
You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

Follow all instructions in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2\DISPATCH.md.
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the Backend Media API routes:
1. src/app/api/admin/media/upload/route.ts: POST handler, session authentication check (isAuthenticatedAdmin()), await req.formData(), file validation via src/lib/media.ts helper, unique safe filename generation, writing to public/uploads/ via fs.promises.writeFile, 201 response with public URL and metadata, error handling for 400, 401, 500.
2. src/app/api/admin/media/route.ts: GET handler, session check, directory listing of public/uploads/ (graceful handling of missing dir), sorting newest first, 200 response with media array.
3. src/app/api/admin/media/[id]/route.ts: DELETE handler, Next.js 15/16 async params handling (await context.params), path traversal check, file existence check (404), unlinking file (fs.promises.unlink), 200 response.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2\handoff.md.
When finished, send a message to the orchestrator.
