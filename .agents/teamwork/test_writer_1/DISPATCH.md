## 2026-11-09T03:11:15Z
You are the E2E Test Writer for the CMS Admin Dashboard.
Your working directory is: d:\c\blog\.agents\teamwork\test_writer_1\
Read the authoritative request file: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- Project architecture and interface contracts: d:\c\blog\.agents\teamwork\PROJECT.md
- Test infrastructure specification: d:\c\blog\.agents\teamwork\TEST_INFRA.md
- Quality engineering survey report: d:\c\blog\.agents\teamwork\explorer_survey_3\handoff.md
- Backend survey report: d:\c\blog\.agents\teamwork\explorer_survey_2\handoff.md

Your exclusive write ownership:
- You ONLY write test files inside tests/:
  * tests/admin-validations.test.ts
  * tests/admin-posts-api.test.ts
  * tests/admin-comments-api.test.ts
  * tests/admin-integration.test.ts
- Do NOT modify any existing source code in src/ or existing test files (tests/markdown.test.ts, tests/validations.test.ts).

Mission:
Write comprehensive, requirement-driven opaque-box tests covering Tiers 1-4:
- Tier 1: Feature Coverage (>=5 test cases per feature for R1, R2, R3, R4)
- Tier 2: Boundary & Corner Cases (empty inputs, special characters, max lengths, non-existent 404 IDs, XSS, invalid slugs)
- Tier 3: Cross-Feature Combinations (pairwise interactions)
- Tier 4: Real-World Scenarios (draft-to-publish lifecycle, comment moderation & author reply threading, spam suppression, post deletion cascade)

Technical Details:
- Tests run via Vitest (environment: node).
- Route Handlers from src/app/api/admin/... can be imported and executed directly with new Request("http://localhost:3000/...", { method, headers, body }).
- Dynamic route params in Next.js 15 are Promises: pass { params: Promise.resolve({ id: "..." }) }.
- Integration tests in tests/admin-integration.test.ts should test real SQLite DB (@/lib/db) with unique test identifiers (e.g. slug starting with "test-e2e-") and clean up in afterAll().
- Once all tests are written, create TEST_READY.md at d:\c\blog\.agents\teamwork\TEST_READY.md detailing test counts per tier.
- Maintain progress.md with "Last visited: [timestamp]".
- Write a structured handoff.md in your working directory and notify the orchestrator with send_message when complete.
