## 2026-11-09T03:11:38Z
You are Worker M1 (Admin Foundation & Core API Worker).
Your working directory is: d:\c\blog\.agents\teamwork\worker_m1\
Read the authoritative request file: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Project architecture and interface contracts: d:\c\blog\.agents\teamwork\PROJECT.md
- Backend survey report: d:\c\blog\.agents\teamwork\explorer_survey_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- src/lib/validations.ts
- src/components/ui/badge.tsx
- src/app/api/admin/posts/route.ts
- src/app/api/admin/posts/[id]/route.ts
- src/app/api/admin/posts/[id]/publish/route.ts
- src/app/api/admin/comments/route.ts
- src/app/api/admin/comments/[id]/route.ts
- src/app/api/admin/comments/[id]/reply/route.ts
(Do NOT modify tests/ or components/admin/ or app/admin/ files).

Mission:
Implement the core Admin validation schemas, UI badge extension, and full suite of Admin Route Handlers:
1. Extend `src/lib/validations.ts`:
   - Add and export `PostAdminSchema` (validates title, slug with /^[a-z0-9-]+$/, excerpt, content, coverImage url/nullable/empty, published boolean, tags string array).
   - Add and export `CommentStatusSchema` (enum: "APPROVED", "PENDING", "SPAM").
   - Add and export `AdminReplySchema` (content 2-2000 chars, authorName, authorEmail).
2. Extend `src/components/ui/badge.tsx`:
   - Add variant `"danger"` with classes: `bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800`.
3. Implement `src/app/api/admin/posts/route.ts`:
   - GET: accepts `?status=all|published|draft&search=...`. Queries Prisma `db.post.findMany` with tags and comment count, returns `{ success: true, posts }`.
   - POST: parses body with `PostAdminSchema`. Calculates readingTime. Connects/creates tags via `PostTag`. Returns `{ success: true, post }` (status 201).
4. Implement `src/app/api/admin/posts/[id]/route.ts`:
   - Note Next.js 15: `{ params }: { params: Promise<{ id: string }> }` — must `await params`.
   - GET: returns `{ success: true, post }` (including tags) or 404.
   - PUT: validates with `PostAdminSchema`. Checks for slug conflicts on other posts (return 409 if exists). Updates post and syncs tags via transaction. Returns `{ success: true, post }`.
   - DELETE: deletes post by id (cascade removes tags and comments). Returns `{ success: true, message: "Artikel berhasil dihapus" }` or 404.
5. Implement `src/app/api/admin/posts/[id]/publish/route.ts`:
   - PATCH: `await params`. Parses body `{ published: boolean }`. Updates post. Returns `{ success: true, post }`.
6. Implement `src/app/api/admin/comments/route.ts`:
   - GET: accepts `?status=ALL|PENDING|APPROVED|SPAM`. Queries comments with post relation (title, slug). Returns `{ success: true, comments }`.
7. Implement `src/app/api/admin/comments/[id]/route.ts`:
   - PATCH: `await params`. Validates `{ status }` with `CommentStatusSchema`. Updates comment status. Returns `{ success: true, comment }`.
   - DELETE: `await params`. Deletes comment (cascade deletes child replies). Returns `{ success: true, message: "Komentar berhasil dihapus" }`.
8. Implement `src/app/api/admin/comments/[id]/reply/route.ts`:
   - POST: `await params`. Validates with `AdminReplySchema`. Finds parent comment (404 if not found). Creates child comment with `postId: parent.postId`, `parentId: parent.id`, `authorName: body.authorName || "Admin"`, `authorEmail: body.authorEmail || "admin@blog.local"`, `content: body.content`, `status: "APPROVED"`, `isAuthorReply: true`. Returns `{ success: true, comment }` (status 201).

Verification:
- Run `npm.cmd run build` and `npm.cmd test` to ensure zero compilation or runtime errors.
- Document changes and verification output in `d:\c\blog\.agents\teamwork\worker_m1\handoff.md`.
- Notify orchestrator with `send_message` when done.

## 2026-11-09T03:20:34Z
**Context**: Milestone M1 (Admin Foundation & Core API)
**Content**: We observed that all code and tests are complete (104/104 passing). Please finalize and write your `handoff.md` report in `d:\c\blog\.agents\teamwork\worker_m1\handoff.md` and send your completion message.
**Action**: Write handoff.md and report completion.
