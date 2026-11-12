# Dispatch: Storage & Media Validation Blueprint (Milestone 1, Agent 1)

You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

## Objective
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the media storage layer and validation helper:
1. `src/lib/media.ts`:
   - Exact implementation of `validateImageBuffer`: buffer magic byte matching (PNG, JPEG, WebP, GIF), XML SVG inspection (blocking `<script>`, `javascript:`, `onload=`, `onerror=`).
   - Exact implementation of `validateUploadFile`: MIME whitelist check (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`), size boundary check (<= 5MB, empty file rejection).
   - Exact implementation of `getSafeFilePath` and `sanitizeFilename`: stripping path traversal (`path.basename`, null byte removal, regex slugification, directory boundary containment inside `public/uploads/`).
   - Directory initializer ensuring `public/uploads/` exists recursively.
   - Size formatter `formatFileSize(bytes)`.
2. `src/lib/validations.ts`:
   - Refinement of `PostAdminSchema.coverImage` to allow `/uploads/...` paths while continuing to reject invalid non-URL strings like `"bukan-url-valid"`.
3. `.gitignore`:
   - Ignore `/public/uploads/*` while preserving `/public/uploads/.gitkeep`.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in `d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1\handoff.md`.
Use send_message to notify the orchestrator when finished.


## 2026-11-12T17:01:12Z
You are a read-only exploration agent (teamwork_explorer).
Working directory: d:\c\blog
State folder: d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1
Authoritative request: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan: d:\c\blog\PROJECT.md

Follow all instructions in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1\DISPATCH.md.
Read ORIGINAL_REQUEST.md and PROJECT.md first. Formulate an exact, production-ready blueprint for the media storage layer and validation helper:
1. src/lib/media.ts:
   - validateImageBuffer: buffer magic byte matching (PNG, JPEG, WebP, GIF), XML SVG inspection (blocking <script>, javascript:, onload=, onerror=).
   - validateUploadFile: MIME whitelist check (image/png, image/jpeg, image/webp, image/gif, image/svg+xml), size boundary check (<= 5MB, empty file rejection).
   - getSafeFilePath & sanitizeFilename: stripping path traversal (path.basename, null byte removal, regex slugification, directory boundary containment inside public/uploads/).
   - Directory initializer ensuring public/uploads/ exists recursively.
   - Size formatter formatFileSize(bytes).
2. src/lib/validations.ts: Refinement of PostAdminSchema.coverImage to allow /uploads/... paths while continuing to reject invalid non-URL strings like "bukan-url-valid".
3. .gitignore: Ignore /public/uploads/* while preserving /public/uploads/.gitkeep.

DO NOT write or modify code directly. Deliver your blueprint and code snippets in d:\c\blog\.agents\teamwork\teamwork_explorer_m1_1\handoff.md.
When finished, send a message to the orchestrator.
