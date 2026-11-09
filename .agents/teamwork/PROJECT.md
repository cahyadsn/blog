# Project: CMS Admin Dashboard

## Architecture
The CMS Admin Dashboard is an internal blog administration interface built on Next.js 15 App Router, React 19, Tailwind CSS, Lucide icons, and Prisma ORM with SQLite (`prisma/dev.db`).

### High-Level Components
1. **Admin Navigation & Route (`/admin`)**:
   - Direct access without authentication for internal blog development (R1).
   - Unified tabbed dashboard: Post Management (`posts`) and Comment Moderation (`comments`), plus summary metric cards.
   - Global navigation link in `src/components/blog/Navbar.tsx`.
2. **Post Management Subsystem (R2)**:
   - Full CRUD API handlers under `/api/admin/posts/` and `/api/admin/posts/[id]/`.
   - Post list with search, status filters (All, Published, Draft), published toggle switch, and delete confirmation.
   - Dual-pane Post Editor form with interactive Markdown Live Preview powered by `marked` and styled via `@tailwindcss/typography` (`prose prose-indigo`).
3. **Comment Moderation Subsystem (R3)**:
   - Status management API handlers under `/api/admin/comments/` and `/api/admin/comments/[id]/`.
   - Comment list filterable by status (`ALL`, `PENDING`, `APPROVED`, `SPAM`).
   - Quick moderation actions: Approve (`APPROVED`), Mark Spam (`SPAM`), Delete.
   - Direct author/admin reply form creating threaded child comment with `isAuthorReply: true` and `parentId: comment.id`.
4. **Data & Design System Foundation (R4)**:
   - Schemas in `src/lib/validations.ts` (`PostAdminSchema`, `CommentStatusSchema`, `AdminReplySchema`).
   - Reusable UI tokens in `src/components/ui/*` (`Button`, `Input`, `Textarea`, `Card`, `Badge` with new `"danger"` variant).
   - Atomic transactions and cascade deletions on `PostTag`, `Comment`, and `ThreadReplies`.

---

## Feature Inventory
Every feature identified during survey mapped to its designated milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1-F1: Admin Route & Tabs | Direct unauthenticated `/admin` route with unified navigation tabs | M3 | survey |
| 2 | R1-F2: Navbar Admin Link | Link to `/admin` in `Navbar.tsx` with Lucide icon | M3 | survey |
| 3 | R2-F1: Post Management List | View all posts (drafts and published) with metadata and status badges | M2 | survey |
| 4 | R2-F2: Post Create & Edit Form | Form for title, slug, excerpt, content, coverImage, tags | M2 | survey |
| 5 | R2-F3: Markdown Live Preview | Real-time interactive Markdown preview editor using `marked` & typography | M2 | survey |
| 6 | R2-F4: Post Publish Toggle | Instant publish/draft toggle action (`published: boolean`) | M2 | survey |
| 7 | R2-F5: Post Deletion | Deletion of post with automatic cascade to tags and comments | M2 | survey |
| 8 | R3-F1: Comment Moderation List | Filterable list of comments by status (ALL, PENDING, APPROVED, SPAM) | M3 | survey |
| 9 | R3-F2: Comment Approve Action | Change comment status from PENDING to APPROVED | M3 | survey |
| 10 | R3-F3: Comment Mark SPAM | Change comment status to SPAM | M3 | survey |
| 11 | R3-F4: Comment Deletion | Delete comment with cascade to child replies | M3 | survey |
| 12 | R3-F5: Author Reply Action | Create reply with `isAuthorReply: true` and `parentId` | M3 | survey |
| 13 | R4-F1: Design System Extensions | Add `danger` variant to `Badge`, utilize existing UI components | M1 | survey |
| 14 | R4-F2: Core Admin API Handlers | Implement `/api/admin/posts/*` and `/api/admin/comments/*` route handlers | M1 | survey |
| 15 | QA-F1: E2E Test Suite | Four-tier test suite verifying all admin requirements and error boundaries | M-TEST | survey |
| 16 | QA-F2: Final E2E Pass & Hardening | Pass 100% of test suites, clean Next.js build, and Tier 5 coverage audit | M4 | survey |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-TEST | E2E Testing Suite | Requirements-driven test suite (Tiers 1-4) in `tests/admin-*.test.ts`, publish `TEST_READY.md` | none | DONE |
| M1 | Admin Foundation & API Core | Validation schemas in `validations.ts`, `Badge` danger variant, route handlers under `/api/admin/posts` and `/api/admin/comments` | none | DONE |
| M2 | Post Management UI & Live Preview | Post list, Post Editor with interactive live markdown preview, create/edit/toggle/delete UI | M1 | DONE |
| M3 | Comment Moderation UI & Admin Page | Comment moderation list, status actions, author reply form, `/admin` page and layout, Navbar admin link | M1, M2 | DONE |
| M4 | Final E2E Verification & Hardening | Pass 100% E2E tests, clean `npm run build`, Tier 5 adversarial verification | M-TEST, M1, M2, M3 | DONE |

---

## Interface Contracts

### 1. Admin Validation Schemas (`src/lib/validations.ts`)
- `PostAdminSchema`:
  - `title`: string (5–200 chars)
  - `slug`: string (3–120 chars, lowercase alphanumeric + hyphen)
  - `excerpt`: string (10–300 chars)
  - `content`: string (min 20 chars)
  - `coverImage`: string url or empty string or null
  - `published`: boolean (default true)
  - `tags`: string[] (array of tag names)
- `CommentStatusSchema`:
  - `status`: "APPROVED" | "PENDING" | "SPAM"
- `AdminReplySchema`:
  - `content`: string (2–2000 chars)
  - `authorName`: string (default "Admin")
  - `authorEmail`: string (default "admin@blog.local")

### 2. Admin Posts API (`/api/admin/posts`)
- `GET /api/admin/posts`:
  - Query params: `status` ("all" | "published" | "draft"), `search` (string)
  - Response: `{ success: true, posts: Post[] }`
- `POST /api/admin/posts`:
  - Body: `PostAdminSchema`
  - Response: `{ success: true, post: Post }` (status 201)
- `GET /api/admin/posts/[id]`:
  - Params: `{ id: string }`
  - Response: `{ success: true, post: PostWithTags }` (status 200) or 404
- `PUT /api/admin/posts/[id]`:
  - Params: `{ id: string }`
  - Body: `PostAdminSchema`
  - Response: `{ success: true, post: Post }` (status 200)
- `DELETE /api/admin/posts/[id]`:
  - Params: `{ id: string }`
  - Response: `{ success: true, message: string }` (status 200)
- `PATCH /api/admin/posts/[id]/publish`:
  - Params: `{ id: string }`
  - Body: `{ published: boolean }`
  - Response: `{ success: true, post: Post }` (status 200)

### 3. Admin Comments API (`/api/admin/comments`)
- `GET /api/admin/comments`:
  - Query params: `status` ("ALL" | "PENDING" | "APPROVED" | "SPAM")
  - Response: `{ success: true, comments: CommentWithPost[] }`
- `PATCH /api/admin/comments/[id]`:
  - Params: `{ id: string }`
  - Body: `CommentStatusSchema`
  - Response: `{ success: true, comment: Comment }` (status 200)
- `DELETE /api/admin/comments/[id]`:
  - Params: `{ id: string }`
  - Response: `{ success: true, message: string }` (status 200)
- `POST /api/admin/comments/[id]/reply`:
  - Params: `{ id: string }`
  - Body: `AdminReplySchema`
  - Response: `{ success: true, comment: Comment }` (status 201 with `isAuthorReply: true`, `parentId: id`)

---

## Code Layout
- `src/lib/validations.ts`: Admin schemas (`PostAdminSchema`, `CommentStatusSchema`, `AdminReplySchema`)
- `src/components/ui/badge.tsx`: Add variant `"danger"`
- `src/app/api/admin/posts/route.ts`: List & Create posts
- `src/app/api/admin/posts/[id]/route.ts`: Get, Update, Delete single post
- `src/app/api/admin/posts/[id]/publish/route.ts`: Quick publish toggle
- `src/app/api/admin/comments/route.ts`: List comments with filter
- `src/app/api/admin/comments/[id]/route.ts`: Update status, Delete comment
- `src/app/api/admin/comments/[id]/reply/route.ts`: Create author reply
- `src/components/admin/PostList.tsx`: Admin post list table/cards with filter & actions
- `src/components/admin/PostEditor.tsx`: Post create/edit form with Markdown Live Preview
- `src/components/admin/CommentList.tsx`: Comment moderation list with status tabs & actions
- `src/components/admin/CommentReplyModal.tsx`: Modal / inline form for author reply
- `src/app/admin/layout.tsx`: Admin dashboard layout with header & tab navigation
- `src/app/admin/page.tsx`: Unified dashboard entry point
- `src/components/blog/Navbar.tsx`: Navbar link to `/admin`
- `tests/admin-validations.test.ts`: Unit tests for admin Zod schemas
- `tests/admin-posts-api.test.ts`: Contract tests for Admin Posts API routes
- `tests/admin-comments-api.test.ts`: Contract tests for Admin Comments API routes
- `tests/admin-integration.test.ts`: Integration tests for SQLite DB operations & cascades
