## 2026-11-11T03:03:46Z

Build SEO and content distribution features for the Next.js 15 blog application, including dynamic XML sitemap, RSS 2.0 feed, robots configuration, dynamic Open Graph and Twitter Card metadata with social card image generation, and comprehensive Vitest automated tests.

Working directory: d:\c\blog
Integrity mode: development

## Requirements

### R1. Dynamic XML Sitemap and Robots Configuration
The application must dynamically generate a valid XML sitemap mapping the homepage and all published posts (`published: true`) queried from the Prisma database (`prisma/dev.db`). URLs must be resolved using the base site URL from environment variable `NEXT_PUBLIC_SITE_URL` or `SITE_URL`, falling back to `http://localhost:3000`. The application must also provide a `robots.txt` configuration defining search engine crawler rules and referencing the sitemap URL.

### R2. Dynamic RSS 2.0 Feed
The application must provide a dynamic RSS 2.0 feed at `/feed.xml` that lists published posts sorted by publication date descending. Each feed item must include standard RSS 2.0 channel and item elements (title, link, description or excerpt, publication date, and guid).

### R3. Dynamic Open Graph and Twitter Card Metadata & Images
The application must generate complete Open Graph and Twitter Card metadata for public pages, including dynamic metadata for individual post pages (`/posts/[slug]`) and the homepage. In addition, the application must implement dynamic social preview card image generation via Next.js `opengraph-image.tsx` using `ImageResponse`, supporting post `coverImage` when available.

### R4. Automated Testing and Build Verification
The application must provide automated Vitest test suites verifying the correctness, XML structure, HTTP status, and headers of the sitemap and RSS feed endpoints, as well as crawler rules in robots configuration. All existing and new Vitest tests must pass, and the Next.js production build (`npm run build`) must succeed with zero errors.


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
