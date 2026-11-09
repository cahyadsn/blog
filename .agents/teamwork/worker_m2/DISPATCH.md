## 2026-11-09T03:21:12Z
[Message] timestamp=2026-11-09T03:21:12Z sender=0fc1b0d7-eac5-4e0d-b57f-f975cce2a71d priority=MESSAGE_PRIORITY_HIGH
You are Worker M2 (Post Management UI Worker).
Your working directory is: d:\c\blog\.agents\teamwork\worker_m2\
Read the authoritative request file: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Project architecture and interface contracts: d:\c\blog\.agents\teamwork\PROJECT.md
- Frontend survey report: d:\c\blog\.agents\teamwork\explorer_survey_1\handoff.md
- Backend survey report: d:\c\blog\.agents\teamwork\explorer_survey_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- src/components/admin/PostList.tsx
- src/components/admin/PostEditor.tsx
(Do NOT modify API routes or test files).

Mission:
Implement the Post Management UI components with full CRUD and interactive Markdown Live Preview:
1. `src/components/admin/PostEditor.tsx`:
   - "use client" component.
   - Props: initialPost (optional post object for editing), onSave (callback when saved), onCancel (callback to return to list).
   - Form fields: Title, Slug (with auto-generate button or instant sync), Excerpt, Cover Image URL, Tags, and Published toggle.
   - Interactive Markdown Live Preview:
     * Dual-pane layout on desktop (or tab toggle between Editor and Preview):
     * Left pane: Textarea for Markdown source.
     * Right pane: Live preview container styled with `prose prose-indigo dark:prose-invert max-w-none` rendering HTML parsed via `marked.parse(content)`.
     * Live preview updates interactively as the user types markdown.
   - Submits to `POST /api/admin/posts` (create) or `PUT /api/admin/posts/[id]` (update).
   - Handles errors (e.g. 409 slug conflict, validation errors) and displays user-friendly error banners.
2. `src/components/admin/PostList.tsx`:
   - "use client" component.
   - Manages state for posts list, loading, search filter, status filter (all / published / draft), and active editor mode (create / edit).
   - Fetches from `GET /api/admin/posts?status=...&search=...`.
   - Header with search input, status filter buttons/tabs, and "Buat Artikel Baru" button (`Plus` icon).
   - Table / card list displaying Title, Slug, Status badge (Dipublikasikan = success / Draf = secondary), Date, Tags, and Comments count.
   - Action buttons per item:
     * Quick toggle publish status (calls `PATCH /api/admin/posts/[id]/publish`).
     * Edit button (switches to PostEditor with that post's data).
     * Delete button with confirmation prompt (calls `DELETE /api/admin/posts/[id]` and updates state).
3. Use UI tokens from `src/components/ui/*` (`Button`, `Input`, `Textarea`, `Badge`, `Card`, `CardContent`) and icons from `lucide-react`.

Verification:
- Run `npm.cmd run build` and `npm.cmd test` to ensure zero compilation or runtime errors.
- Document implementation and verification results in `d:\c\blog\.agents\teamwork\worker_m2\handoff.md`.
- Notify orchestrator with `send_message` when complete.
