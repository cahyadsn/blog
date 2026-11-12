# Dispatch: Challenger 2 — Media Schema, SVG XSS & CMS Integration Stress Testing

You are a challenger agent (teamwork_challenger).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_challenger_m1_2
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

## Objective
Read ORIGINAL_REQUEST.md and PROJECT.md first. Empirically verify the correctness, robustness, and security of SVG vector validation, schema harmonization, and CMS integration by writing and executing an adversarial test harness (e.g. `tests/challenger-media-security.test.ts`):
1. SVG XSS injection stress tests:
   - `<svg><script>alert(1)</script></svg>` -> rejected with 400.
   - `<svg><circle onload="alert(1)" /></svg>` -> rejected with 400.
   - `<svg><image href="javascript:alert(1)" /></svg>` -> rejected with 400.
   - SVG with `onerror=` -> rejected with 400.
   - Clean valid SVGs (complex paths, nested groups, viewBox) -> accepted with 201.
2. Cover Image Schema Stress Tests (`PostAdminSchema` & `PostCreateSchema`):
   - Local uploads: `/uploads/photo.jpg`, `/uploads/1731427200000-banner.png` -> passes validation.
   - External URLs: `https://example.com/banner.png`, `http://cdn.org/img.webp` -> passes validation.
   - Empty values: `null`, `""`, `undefined` -> passes validation.
   - Invalid values: `"bukan-url-valid"`, `"ftp://secret"`, `"javascript:alert(1)"`, `"data:image/png;base64,..."` -> rejected with `"URL gambar tidak valid"`.
3. Media Listing & Missing Directory Stress Tests:
   - Behavior when `public/uploads/` is deleted or does not exist -> returns status 200 `{ success: true, media: [] }`.
   - Hidden files (`.gitkeep`, `.DS_Store`) filtered out of listing.
   - Sorting: files returned in strictly newest-first order.

Ensure all test files clean up after themselves.
Deliver your empirical results with an explicit verdict (APPROVE or REQUEST_CHANGES) to `d:\c\blog\.agents\teamwork\teamwork_challenger_m1_2\handoff.md`.
Use send_message to report your verdict to the orchestrator.


## 2026-11-12T17:31:35Z
You are a challenger agent (teamwork_challenger).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_challenger_m1_2
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

Follow all instructions in d:\c\blog\.agents\teamwork\teamwork_challenger_m1_2\DISPATCH.md.
Empirically stress-test SVG XSS script injection vectors (<script>, onload=, onerror=, javascript:), coverImage validation in PostAdminSchema and PostCreateSchema, and media listing edge cases (missing directory, newest-first ordering).
Ensure test cleanup so git working tree remains clean.
Deliver your review with an explicit verdict (APPROVE or REQUEST_CHANGES) in handoff.md and report to orchestrator via send_message.
