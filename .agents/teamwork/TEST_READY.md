# TEST_READY: CMS Admin Dashboard E2E Test Suite

## Executive Summary
The requirements-driven test suite for the CMS Admin Dashboard has been created. The test suite covers all four requirements (R1, R2, R3, R4) across all four testing tiers:
- **Tier 1: Feature Coverage** (≥5 tests per requirement/feature)
- **Tier 2: Boundary & Corner Cases** (minimum/maximum lengths, invalid patterns, XSS script tags, 404 missing records, 409 unique slug conflicts)
- **Tier 3: Cross-Feature Combinations** (draft vs published combinations, tag transitions, parent-child thread relationships)
- **Tier 4: Real-World Scenarios** (Draft-to-publication lifecycle, comment moderation & author reply threading, spam suppression defense, cascade deletion integrity, metadata & tag updates)

---

## Test Inventory & Tier Distribution

| Test Suite File | Focus / Scope | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Total Tests |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `tests/admin-validations.test.ts` | Zod schemas: `PostAdminSchema`, `CommentStatusSchema`, `AdminReplySchema` | 14 | 16 | 3 | — | **33** |
| `tests/admin-posts-api.test.ts` | Route handlers: `/api/admin/posts`, `/[id]`, `/[id]/publish` (GET, POST, PUT, PATCH, DELETE) | 11 | 14 | 1 | — | **26** |
| `tests/admin-comments-api.test.ts` | Route handlers: `/api/admin/comments`, `/[id]`, `/[id]/reply` (GET, PATCH, DELETE, POST) | 11 | 10 | 1 | — | **22** |
| `tests/admin-integration.test.ts` | Real SQLite DB (`@/lib/db`) operations, Prisma schema relations, cascades, and E2E lifecycles | 5 | 3 | 2 | 5 | **15** |
| **Subtotal (New Admin Tests)** | | **41** | **43** | **7** | **5** | **96** |
| `tests/markdown.test.ts` | *(Pre-existing)* Markdown parser, reading time, slug generator | 3 | — | — | — | **3** |
| `tests/validations.test.ts` | *(Pre-existing)* Public comment and post create schemas | 4 | 2 | — | — | **6** |
| **Grand Total** | | **48** | **45** | **7** | **5** | **105** |

---

## Detailed Breakdown by Requirement

### R1. Admin Dashboard Route & Navigation
- Access directly without authentication requirements.
- Unified response structures and HTTP status codes verified across all admin endpoints (200, 201, 400, 404, 409, 500).

### R2. Post Management Subsystem
- **Feature Coverage (Tier 1)**:
  - List all posts (`GET /api/admin/posts`)
  - Filter by status (`published`, `draft`) and search keyword across `title`, `slug`, `excerpt`
  - Create published or draft post with tags (`POST /api/admin/posts`)
  - Retrieve single post with tags and comment count (`GET /api/admin/posts/[id]`)
  - Update post metadata, content, and tags (`PUT /api/admin/posts/[id]`)
  - Quick toggle publication status (`PATCH /api/admin/posts/[id]/publish`)
  - Delete post (`DELETE /api/admin/posts/[id]`)
- **Boundaries (Tier 2)**:
  - Title: 5–200 chars boundary
  - Slug: 3–120 chars boundary, lowercase alphanumeric + hyphen validation
  - Excerpt: 10–300 chars boundary
  - Content: min 20 chars boundary
  - CoverImage: null, empty string, optional URL format handling
  - 404 on missing post IDs; 409 on duplicate slug collision; 400 on non-boolean publish toggle.
- **Cross-Feature (Tier 3)**:
  - Updating post while keeping its own slug (no self-conflict)
  - Tag transitions (disconnect old tags, attach new tags atomically)

### R3. Comment Moderation Subsystem
- **Feature Coverage (Tier 1)**:
  - List comments with status filters (`ALL`, `PENDING`, `APPROVED`, `SPAM`)
  - Approve pending comment (`PATCH /api/admin/comments/[id]` with `{ status: "APPROVED" }`)
  - Mark comment as spam (`PATCH /api/admin/comments/[id]` with `{ status: "SPAM" }`)
  - Reset comment to pending (`PATCH /api/admin/comments/[id]` with `{ status: "PENDING" }`)
  - Delete comment (`DELETE /api/admin/comments/[id]`)
  - Send direct author reply (`POST /api/admin/comments/[id]/reply`) with `isAuthorReply: true`, `parentId: parent.id`, and `status: "APPROVED"`
  - Default author info (`authorName: "Admin"`, `authorEmail: "admin@blog.local"`) and custom overrides
- **Boundaries (Tier 2)**:
  - Status enum enforcement (`APPROVED`, `PENDING`, `SPAM`); lowercase and arbitrary strings rejected with 400
  - Content length: 2–2000 chars boundary
  - XSS injection rejection in author reply content
  - 404 on missing comment ID or parent comment ID
- **Cross-Feature (Tier 3)**:
  - Thread integrity: child reply automatically inherits parent comment's `postId` and sets `parentId`

### R4. Data Model Compatibility & SQLite Integrity
- **Real-World Scenarios (Tier 4 in `tests/admin-integration.test.ts`)**:
  1. **Draft-to-Publication Lifecycle**: Create draft post -> Verify suppressed in public queries -> Render live markdown preview via `parseMarkdownToHtml` -> Toggle to published -> Verify visible in public reader queries.
  2. **Comment Moderation & Author Threading**: Reader submits comment (PENDING) -> Suppressed on public blog -> Admin reviews and approves (APPROVED) -> Admin posts author reply (`isAuthorReply: true`) -> Reader views threaded comment on public post page.
  3. **Spam Defense Workflow**: Spammer submits promotional comment -> Admin marks SPAM -> Suppressed from public queries -> Excluded from autonomous bot reply script (`scripts/reply-comments.ts`).
  4. **Post Deletion & Cascade Integrity**: Post created with associated `PostTag` rows and threaded `Comment` records -> Post deleted -> Verifies Post, PostTag, and Comment records are cleanly cascade-deleted without orphan rows.
  5. **Post Metadata & Tag Update Integrity**: Post updated with new title, slug, excerpt, content, and updated tag set -> Verifies atomicity, tag replacement, and slug availability.

---

## Verification Execution
To run the full test suite:
```powershell
npm test
```
Or run individual test suites:
```powershell
npx.cmd vitest run tests/admin-validations.test.ts
npx.cmd vitest run tests/admin-posts-api.test.ts
npx.cmd vitest run tests/admin-comments-api.test.ts
npx.cmd vitest run tests/admin-integration.test.ts
```
