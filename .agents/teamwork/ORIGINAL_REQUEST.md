# Original User Request

## Initial Request — 2026-11-12T02:09:33Z

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
