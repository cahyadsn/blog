## 2026-11-09T03:30:57Z
You are Worker M3 (Comment Moderation UI & Integrated Admin Dashboard Worker).
Your working directory is: d:\c\blog\.agents\teamwork\worker_m3\
Read the authoritative request file: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Project architecture and interface contracts: d:\c\blog\.agents\teamwork\PROJECT.md
- Frontend survey report: d:\c\blog\.agents\teamwork\explorer_survey_1\handoff.md
- Backend survey report: d:\c\blog\.agents\teamwork\explorer_survey_2\handoff.md
- M2 Handoff: d:\c\blog\.agents\teamwork\worker_m2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- src/components/admin/CommentReplyModal.tsx
- src/components/admin/CommentList.tsx
- src/app/admin/layout.tsx
- src/app/admin/page.tsx
- src/components/blog/Navbar.tsx
(Do NOT modify API routes, Prisma schema, or test files).

Mission:
Implement the Comment Moderation UI, Admin Reply modal, integrated Admin Dashboard page & layout, and add the Admin link to the Navbar:
1. `src/components/admin/CommentReplyModal.tsx`:
   - "use client" modal component.
   - Props: comment (object being replied to), isOpen (boolean), onClose, onSuccess.
   - Shows original comment context (author, content preview, post title).
   - Form inputs: Author Name (default: "Admin"), Author Email (default: "admin@blog.local"), Content (Textarea).
   - Submits payload to `POST /api/admin/comments/[id]/reply`.
   - Handles loading state and error banners. On success, calls onSuccess() and onClose().
2. `src/components/admin/CommentList.tsx`:
   - "use client" component.
   - State: comments list, loading, error, statusFilter ("ALL", "PENDING", "APPROVED", "SPAM"), replyingComment (for modal).
   - Fetches from `GET /api/admin/comments?status=...`.
   - Filter tabs with counts: "Semua", "Menunggu Moderasi" (PENDING), "Disetujui" (APPROVED), "Spam" (SPAM).
   - List cards / table:
     * Author name, email, avatar/initials, and status badge (`warning` for PENDING, `success` for APPROVED, `danger` for SPAM).
     * Post title with link.
     * Creation date formatted nicely.
     * Comment content text.
     * Indicator if `isAuthorReply: true` (e.g., "Balasan Author").
     * Actions:
       - "Setujui" button: calls `PATCH /api/admin/comments/[id]` with `{ status: "APPROVED" }`.
       - "Tandai Spam" button: calls `PATCH /api/admin/comments/[id]` with `{ status: "SPAM" }`.
       - "Hapus" button: confirmation prompt -> calls `DELETE /api/admin/comments/[id]`.
       - "Balas sebagai Author" button: opens CommentReplyModal.
3. `src/app/admin/layout.tsx`:
   - Layout for `/admin` route.
   - Clean header with "CMS Admin Dashboard", "Internal Mode" badge, and "Lihat Blog" link back to `/`.
4. `src/app/admin/page.tsx`:
   - "use client" unified dashboard page.
   - Top summary metric cards (Total Artikel, Artikel Draf, Komentar Pending, Komentar Spam) fetching stats.
   - Unified tab switcher:
     * Tab 1: "Manajemen Artikel" -> renders `<PostList />` (from `@/components/admin/PostList`).
     * Tab 2: "Moderasi Komentar" -> renders `<CommentList />` (from `@/components/admin/CommentList`).
5. `src/components/blog/Navbar.tsx`:
   - Add link to `/admin` with icon `LayoutDashboard` or `Shield` and label "Admin" to satisfy R1 navigation.
6. Design tokens:
   - Use components from `src/components/ui/*` (`Button`, `Input`, `Textarea`, `Badge`, `Card`, `CardContent`) and `lucide-react` icons.

Verification:
- Run `npm.cmd run build` and ensure clean compilation with 0 TypeScript/Next.js build errors.
- Run `npm.cmd test` and ensure all 104+ Vitest tests pass.
- Write a detailed handoff report in `d:\c\blog\.agents\teamwork\worker_m3\handoff.md`.
- Notify orchestrator with `send_message` when done.
