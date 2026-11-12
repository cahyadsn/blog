## 2026-11-11T03:05:06Z
Working Directory: d:\c\blog\.agents\teamwork\spec_miner_survey_3
Original Request Path: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

Your Mission:
1. Read d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md.
2. Investigate authoritative requirements and Next.js 15 App Router specifications for:
   - Dynamic XML Sitemap: Next.js app/sitemap.ts (or route.ts returning XML) vs requirements (mapping homepage and published: true posts, sorting, base site URL fallback NEXT_PUBLIC_SITE_URL or SITE_URL falling back to http://localhost:3000, valid XML header Content-Type application/xml or text/xml).
   - Robots: app/robots.ts (or route.ts) vs requirements (rules, referencing absolute sitemap URL).
   - Dynamic RSS 2.0 Feed: app/feed.xml/route.ts returning valid RSS 2.0 XML, Content-Type, channel metadata, published posts sorted by publication date descending, item fields (<title>, <link>, <description>, <pubDate>, <guid>).
   - Dynamic Open Graph and Twitter Card Metadata: homepage metadata in app/layout.tsx or app/page.tsx, dynamic generateMetadata in app/posts/[slug]/page.tsx with og:title, og:description, og:url, og:image, twitter:card, twitter:title, twitter:description, twitter:image.
   - Dynamic Social Preview Card Image: app/posts/[slug]/opengraph-image.tsx using Next.js ImageResponse (and homepage app/opengraph-image.tsx if appropriate), supporting post coverImage when available and fallback branding.
3. Identify potential pitfalls (e.g. Next.js 15 async params in generateMetadata, Next.js sitemap/robots export conventions, ImageResponse font/edge runtime considerations, XML escaping).
4. Do NOT modify any code or files outside your working directory.
5. Write your comprehensive report to d:\c\blog\.agents\teamwork\spec_miner_survey_3\analysis.md and d:\c\blog\.agents\teamwork\spec_miner_survey_3\handoff.md.
6. Send a brief message back to orchestrator when finished with the paths to your report.


## 2026-11-12T02:12:15Z
You are a Spec Miner agent investigating the testing infrastructure, build setup, and formal specifications for R1, R2, and R3 in the Next.js 15 blog application.

## Authoritative User Request
Read the authoritative user request at:
d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

## Your State Folder
Write your heartbeat/progress to:
d:\c\blog\.agents\teamwork\spec_miner_survey_3\progress.md
Write your final survey report and handoff to:
d:\c\blog\.agents\teamwork\spec_miner_survey_3\handoff.md

## Scope & Instructions
1. Read d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md.
2. Investigate the codebase at d:\c\blog:
   - Vitest test setup: Check `vitest.config.ts`, `package.json`, and all existing test files in `tests/` (e.g. `tests/seo.test.ts`, etc.). Note environment (`node`), path aliases, mocking strategies, and helper utilities.
   - Next.js build setup: Check `next.config.ts`, `package.json` scripts, TypeScript `tsconfig.json`, Next.js version (Next.js 15/16 with async params contract in route handlers and page components).
   - Formulate precise test specifications for:
     a) Like / Clap counter:
        - Increment API (`POST /api/posts/[id]/like` or `[slug]/like`): increments counter by 1, returns updated count, handles non-existent post (404), rejects invalid IDs.
        - Debounce and rate-limiting: rapid sequential requests from same IP / client within short window are limited or debounced gracefully.
     b) Newsletter subscription:
        - Validation: rejects invalid email formats, missing email, oversized input using Zod.
        - Duplication prevention: when submitting an already registered email, returns 200 with clear message indicating already subscribed, without throwing server error or creating duplicate rows.
        - Happy path: new valid email successfully stored in `Subscriber` model with `active: true`.
     c) Admin dashboard metrics:
        - Admin page queries or displays subscriber stats / list without breaking existing admin metrics.
     d) Zero regressions:
        - All existing tests pass without regressions.
        - Next.js production build (`npm run build`) passes cleanly.
3. Formulate concrete specifications, test assertions, boundary cases, and edge cases.
4. Write your comprehensive spec and testing report to `d:\c\blog\.agents\teamwork\spec_miner_survey_3\handoff.md`.
5. Send a message to the orchestrator when completed.
