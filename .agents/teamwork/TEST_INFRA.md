# E2E Test Infra: CMS Admin Dashboard

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.
- Framework: Vitest in Node.js environment (`npm test`), testing Next.js 15 App Router endpoints and integration flows directly.

## Feature Inventory & Test Mapping
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Combinations) |
|---|---------|----------------------|:-----------------:|:-----------------:|:---------------------:|
| 1 | R1: Admin Route & Navigation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | R2: Post List & Drafts | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | R2: Post Create & Edit | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | R2: Markdown Live Preview | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | R2: Post Publish Toggle | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | R2: Post Deletion | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | R3: Comment Moderation List | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 8 | R3: Comment Approve | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 9 | R3: Comment Mark SPAM | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 10 | R3: Comment Deletion | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 11 | R3: Author Direct Reply | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 12 | R4: Prisma & Schema Relations | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: `npm test` (`vitest run`)
- Test Files:
  - `tests/admin-validations.test.ts`
  - `tests/admin-posts-api.test.ts`
  - `tests/admin-comments-api.test.ts`
  - `tests/admin-integration.test.ts`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Draft-to-Publication Lifecycle: Create draft post, verify absent on public blog, preview markdown, toggle published, verify visible on public blog | R2-F1, R2-F2, R2-F3, R2-F4, R4 | High |
| 2 | Comment Moderation & Author Threading: Reader submits comment, admin reviews in PENDING, approves, replies with `isAuthorReply: true`, reader sees thread on post page | R3-F1, R3-F2, R3-F5, R4 | High |
| 3 | Spam Defense Workflow: Reader submits promotional/spam comment, admin flags as SPAM, verifies suppressed from public blog and excluded from bot reply script | R3-F1, R3-F3, R4 | Medium |
| 4 | Post Deletion & Cascade Integrity: Post with tags and comments deleted, verify all PostTag and Comment records clean up without orphaned database rows | R2-F5, R4 | High |
| 5 | Post Metadata & Tag Update: Edit existing post title, slug, tags, excerpt, verify uniqueness check and update reflection | R2-F1, R2-F2, R4 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
