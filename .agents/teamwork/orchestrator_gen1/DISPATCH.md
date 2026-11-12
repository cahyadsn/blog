## 2026-11-12T02:10:10Z

Build interaction and community features (an interactive like/clap counter and an email newsletter subscription system) for production use in the Next.js 15 blog application.

Working directory: d:\c\blog
Integrity mode: development

## Requirements

### R1. Interactive Like / Clap Counter
- Add an interactive Like / Clap button on the post detail page (`/posts/[slug]`) with visual feedback animation and debounce/rate-limiting to prevent rapid spam clicking.
- Add a `likes` (or `claps`) column with default value 0 to the `Post` model in `prisma/schema.prisma` and execute the migration on the SQLite database (`prisma/dev.db`).
- Implement an API endpoint (`POST /api/posts/[id]/like` or `/api/posts/[slug]/like`) to retrieve and increment the like counter.
- Display total like counts on post cards on the home page (`/`) and on the post reading page (`/posts/[slug]`).

### R2. Newsletter Subscription Form and Management
- Implement a responsive and elegant newsletter subscription form component on the footer or bottom section of article pages.
- Add a new `Subscriber` model to `prisma/schema.prisma` (fields: `id`, unique `email`, active status, and `createdAt`) and execute the database migration.
- Implement an API endpoint `POST /api/newsletter/subscribe` with email format validation using Zod, duplicate email prevention, and clear success/error feedback responses.
- Display the subscriber list or a summary metric of subscribers on the Admin Dashboard (`/admin`).

### R3. Automated Testing and Build Verification
- Write automated Vitest test suites covering like counter increments, spam/debounce handling, newsletter email validation, and subscriber duplication prevention.
- Verify that all existing Vitest tests and new test suites pass with zero regressions.
- Verify that the Next.js production build (`npm run build`) completes successfully without any compilation, type, or lint errors.

## Acceptance Criteria

### Like / Clap Counter
- [ ] Post detail page (`/posts/[slug]`) contains a clickable Like/Clap button that increments the like count and triggers visual animation feedback.
- [ ] Debounce or rate-limiting is implemented to prevent rapid spam clicks from inflating the counter abnormally.
- [ ] The `Post` model in Prisma schema includes a like counter column with default value 0, persisted in `prisma/dev.db`.
- [ ] The like API endpoint increments the like count in the database and returns the updated count.
- [ ] Total like count displays consistently on post cards on the home page (`/`) and on the post detail page (`/posts/[slug]`).

### Newsletter Subscription & Admin Dashboard
- [ ] Newsletter subscription form validates email format using Zod before submission.
- [ ] Duplicate email submissions return an informative feedback message without causing server errors or duplicate records.
- [ ] Valid subscriptions are persisted in the `Subscriber` model with active status.
- [ ] The Admin Dashboard (`/admin`) displays a subscriber list or summary metrics of subscribers.

### Automated Testing & Build
- [ ] Vitest test suites for like counter, spam prevention, email validation, and duplicate prevention all pass.
- [ ] All pre-existing test suites continue to pass.
- [ ] `npm run build` completes successfully with zero errors.

## Verification Resources
- Use the repository's standard Vitest test setup (`npm test` / `npx vitest`) and Next.js production build command (`npm run build`).

## Environment & State Context
- Working directory: d:\c\blog
- Teamwork state folder: .agents/teamwork/orchestrator/
- Authoritative request record: .agents/teamwork/ORIGINAL_REQUEST.md


## 2026-11-12T03:24:03Z
Resume work at d:\c\blog. State folder: d:\c\blog\.agents\teamwork\orchestrator_gen1 (keep copied DISPATCH.md/prior entries; read/update copied state/scope/partition/ledger/registry/skill_* files there; create BRIEFING.md from d:\c\blog\.agents\teamwork\orchestrator/BRIEFING.md's 🔒 sections — updating State folder + d:\c\blog\.agents\teamwork\orchestrator Scope document paths to d:\c\blog\.agents\teamwork\orchestrator_gen1 — + progress.md, not fresh). Read d:\c\blog\.agents\teamwork\orchestrator (read-only: handoff.md/BRIEFING.md/BRIEFING_ARCHIVE.md/progress.md) + d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md (ORIGINAL_REQUEST.md). Your parent is 54964ac0-9447-4c94-8933-b66f31619feb (send_message escalation/reporting).

## Immediate Next Steps for Successor (Gen 1)
Remediation worker `worker_m1_rem` has fixed the Zod 4 syntax error in `src/lib/validations.ts` and test mock typing in `tests/challenger-likes-stress.test.ts`. `npx.cmd tsc --noEmit` and `npm.cmd run build` have been verified with exit code 0!
You must now execute the post-remediation verification gate:
1. Dispatch verification subagents:
   - 2 Reviewers independently (`teamwork_reviewer`): `reviewer_m1_ver_1` and `reviewer_m1_ver_2`
   - 2 Challengers independently (`teamwork_challenger`): `challenger_m1_ver_1` and `challenger_m1_ver_2`
   - 1 Forensic Auditor (`teamwork_auditor`): `auditor_m1_ver_1`
2. Evaluate verdicts in `GATE_STATUS.md`.
3. If all pass and Auditor reports CLEAN, mark Milestone 1 complete in `PROJECT.md` and deliver the final human report to parent `54964ac0-9447-4c94-8933-b66f31619feb`.
