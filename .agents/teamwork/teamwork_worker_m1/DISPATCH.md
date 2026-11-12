# Dispatch: Full Implementation Worker (Milestone 1)

You are the implementation worker agent (teamwork_worker).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_worker_m1
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

## Reference Blueprints
You MUST read and follow the blueprints prepared by the 3 Milestone 1 Explorers:
- Storage & Validation Blueprint: `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1\handoff.md`
- Admin Media APIs Blueprint: `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_2\handoff.md`
- Admin CMS UI & PostEditor Blueprint: `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_3\handoff.md`
- Security & Test Specifications: `d:\c\blog\.agents\teamwork\teamwork_spec_miner_survey_3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Files Owned Exclusively by You
1. `src/lib/media.ts` (MIME validation, magic byte verification, SVG sanitization, size check, safe unique names, path traversal guard, formatFileSize, ensureUploadDir)
2. `src/lib/validations.ts` (Harmonize `PostAdminSchema.coverImage` and `PostCreateSchema.coverImage` to accept `/uploads/...` relative paths as well as URLs, without breaking rejection of `bukan-url-valid`)
3. `src/app/api/admin/media/upload/route.ts` (POST upload with defense-in-depth auth, 5MB limit, empty check, MIME & magic bytes verification, safe naming, 201 response)
4. `src/app/api/admin/media/route.ts` (GET listing with newest first sort, graceful missing directory handling, and DELETE with ?filename= query)
5. `src/app/api/admin/media/[id]/route.ts` (DELETE by id with `await context.params`, path traversal defense, file unlinking, 200 response)
6. `src/app/admin/page.tsx` (Add "media" to activeTab, totalMedia metric, Pustaka Media tab button with ImageIcon and badge, render MediaLibrary)
7. `src/components/admin/MediaLibrary.tsx` (Gallery grid, dropzone, search, refresh, copy URL, copy Markdown snippet, delete trigger)
8. `src/components/admin/MediaDeleteModal.tsx` (Confirmation modal dialog)
9. `src/components/admin/MediaSelectModal.tsx` (Media selector dialog for PostEditor)
10. `src/components/admin/PostEditor.tsx` (textareaRef, insertMarkdownAtCursor, toolbar, drag-and-drop, cover image picker & direct upload, preview, validation update)
11. `.gitignore` (Ignore `/public/uploads/*` except `/public/uploads/.gitkeep`)
12. `public/uploads/.gitkeep` (Placeholder)
13. `tests/admin-media-api.test.ts` (Comprehensive Vitest test suite covering Tiers 1-4)

## Required Verification Commands
1. Run Vitest media tests: `npx.cmd vitest run tests/admin-media-api.test.ts`
2. Run full test suite: `npm.cmd test` (Must pass all 236 existing tests + new media tests with 0 failures)
3. Run TypeScript check: `npx.cmd tsc --noEmit`
4. Run production build: `npm.cmd run build` (Must complete with exit code 0)

Deliver a complete handoff report to `d:\c\blog\.agents\teamwork\teamwork_worker_m1\handoff.md` detailing all implemented files, diffs, and exact command outputs.
Notify the orchestrator using `send_message` when done.
