# Empirical Challenger Handoff Report — Media Security, Schema Parity & Edge Cases (Milestone 1)

**Challenger Agent**: `teamwork_challenger_m1_2`  
**Target Milestone**: Milestone 1 (Media Library CMS & Image Upload)  
**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  

---

## 1. Observation

Direct empirical observations obtained from executing the adversarial test harness (`tests/challenger-media-security.test.ts`) against the implementation files (`src/lib/media.ts`, `src/lib/validations.ts`, `src/app/api/admin/media/upload/route.ts`, `src/app/api/admin/media/route.ts`):

### 1.1 Test Execution & Vitest Output
- **Command**: `npx.cmd vitest run tests/challenger-media-security.test.ts`
- **Output**:
  ```text
  RUN v5.1.0 D:/c/blog

  ✓ tests/challenger-media-security.test.ts (15 tests) 612ms

  Test Files  1 passed (1)
       Tests  15 passed (15)
    Start at  00:36:22
    Duration  6.37s
  ```
- **Regression Test Command**: `npx.cmd vitest run`
- **Regression Output**:
  ```text
  Test Files  17 passed (17)
       Tests  313 passed (313)
    Start at  00:37:19
    Duration  54.78s
  ```

---

### 1.2 SVG XSS Script Injection Stress Tests (`src/lib/media.ts:217-257`)
1. **`<svg><script>alert(1)</script></svg>`**:
   - HTTP Status: `400 Bad Request`
   - Response Payload: `{"success":false,"error":"Berkas SVG ditolak: mengandung tag <script> terlarang (XSS)"}`
   - `validateImageBuffer` return: `{ valid: false, error: "Berkas SVG ditolak: mengandung tag <script> terlarang (XSS)" }`
2. **`<svg><circle onload="alert(1)" /></svg>`**:
   - HTTP Status: `400 Bad Request`
   - Response Payload: `{"success":false,"error":"Berkas SVG ditolak: mengandung atribut event onload= terlarang (XSS)"}`
   - `validateImageBuffer` return: `{ valid: false, error: "Berkas SVG ditolak: mengandung atribut event onload= terlarang (XSS)" }`
3. **`<svg><image href="javascript:alert(1)" /></svg>`**:
   - HTTP Status: `400 Bad Request`
   - Response Payload: `{"success":false,"error":"Berkas SVG ditolak: mengandung URI javascript: terlarang (XSS)"}`
   - `validateImageBuffer` return: `{ valid: false, error: "Berkas SVG ditolak: mengandung URI javascript: terlarang (XSS)" }`
4. **SVG with `onerror=` (`<svg><image onerror="alert(1)" /></svg>`)**:
   - HTTP Status: `400 Bad Request`
   - Response Payload: `{"success":false,"error":"Berkas SVG ditolak: mengandung atribut event onerror= terlarang (XSS)"}`
5. **Whitespace & Obfuscated Handlers (`<svg><rect onload   =   "alert(1)" /></svg>`)**:
   - HTTP Status: `400 Bad Request`
   - Response Payload: `{"success":false,"error":"Berkas SVG ditolak: mengandung atribut event onload= terlarang (XSS)"}`
6. **Case Variations (`<SCRIPT>alert(1)</SCRIPT>`, `href="JAVASCRIPT:alert(1)"`)**:
   - Both variants rejected with HTTP Status: `400 Bad Request`
7. **Clean Valid Complex SVG (`<defs>`, `<linearGradient>`, `<g>`, `<path>`, `<text>`, `viewBox`)**:
   - HTTP Status: `201 Created`
   - Response Payload: `{"success":true,"url":"/uploads/...-clean-vector.svg","media":{"type":"image/svg+xml",...}}`
   - Successfully written to disk and verified via stat before automatic cleanup.

---

### 1.3 Cover Image Schema Stress Tests (`PostAdminSchema` & `PostCreateSchema` in `src/lib/validations.ts:36-44, 61-70`)
1. **Local uploads (`/uploads/photo.jpg`, `/uploads/1731427200000-banner.png`, `/uploads/2026/banner-sample.webp`)**:
   - `PostCreateSchema.safeParse(...)`: `success === true`, `data.coverImage` matches input path.
   - `PostAdminSchema.safeParse(...)`: `success === true`, `data.coverImage` matches input path.
2. **External URLs (`https://example.com/banner.png`, `http://cdn.org/img.webp`, `HTTPS://SECURE.CDN.COM/IMG/BANNER.JPEG`, `http://localhost:3000/assets/hero.jpg`)**:
   - `PostCreateSchema.safeParse(...)`: `success === true`.
   - `PostAdminSchema.safeParse(...)`: `success === true`.
3. **Empty values (`null`, `""`, `undefined`, `"   "`)**:
   - `PostCreateSchema.safeParse(...)`: `success === true`.
   - `PostAdminSchema.safeParse(...)`: `success === true`.
4. **Invalid values (`"bukan-url-valid"`, `"ftp://secret-server.com/image.png"`, `"javascript:alert(1)"`, `"data:image/png;base64,..."`, `"file:///etc/passwd"`, `"//cdn.example.com/banner.png"`, `"/images/outside-uploads.jpg"`)**:
   - Both `PostCreateSchema.safeParse(...)` and `PostAdminSchema.safeParse(...)` returned `success === false`.
   - Error field: `error.flatten().fieldErrors.coverImage[0] === "URL gambar tidak valid"`.

---

### 1.4 Media Listing & Missing Directory Edge Cases (`src/app/api/admin/media/route.ts:46-95`)
1. **Behavior when `public/uploads/` is deleted or does not exist**:
   - Renamed `public/uploads` away temporarily. `fsSync.existsSync(UPLOAD_DIR)` confirmed false.
   - `GET /api/admin/media` returned HTTP `200 OK`.
   - Response Payload: `{"success":true,"media":[]}` (graceful empty array, no 500 error).
   - Original directory restored immediately in `finally` block.
2. **Hidden files filtering**:
   - Injected dummy `.DS_Store` and `.hidden_photo.png` into `public/uploads/`.
   - `GET /api/admin/media` returned HTTP `200 OK`.
   - Result: `media.map(m => m.name)` contained none of `.gitkeep`, `.DS_Store`, or `.hidden_photo.png`.
   - All files starting with `.` were strictly excluded (`src/app/api/admin/media/route.ts:63`).
3. **Subdirectories and Non-Image Files**:
   - Created `temp_subfolder_dir/`, `readme.txt`, and `setup.exe` in `public/uploads/`.
   - `GET /api/admin/media` returned HTTP `200 OK`.
   - Result: none of `temp_subfolder_dir`, `readme.txt`, or `setup.exe` appeared in `data.media`.
   - Only files with extensions in `ALLOWED_EXTENSIONS` (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`) are returned.
4. **Newest-First Sorting**:
   - Created 3 files with distinct modification times: older (`now - 1000s`), newer (`now - 500s`), newest (`now`).
   - `GET /api/admin/media` returned HTTP `200 OK`.
   - Order verified: `newestIdx < newerIdx < olderIdx`.
   - Full list validated: `createdAt[i] >= createdAt[i+1]` across all items.

---

### 1.5 TypeScript Compilation & Production Build
- **TypeScript Check**:
  - Command: `npx.cmd tsc --noEmit`
  - Output: Exit code 0, 0 errors.
- **Production Next.js Build**:
  - Command: `npm.cmd run build`
  - Output: Exit code 0, compiled in 35.9s, TypeScript in 15.9s, 17/17 routes successfully generated.

---

## 2. Logic Chain

1. **Premise 1: SVG XSS Prevention**:
   - *Observation 1.2*: Every SVG payload containing `<script>`, `onload=`, `onerror=`, `javascript:` (including case-insensitive and whitespace permutations) was intercepted by `validateImageBuffer()` in `src/lib/media.ts:227-255` and rejected with HTTP 400.
   - Concurrently, clean valid SVGs with standard SVG namespaces, groups, and viewBoxes were accepted with HTTP 201 Created and persisted properly.
   - *Conclusion*: SVG upload validation is robust against stored XSS vectors.

2. **Premise 2: Schema Harmonization Parity**:
   - *Observation 1.3*: Both `PostAdminSchema` and `PostCreateSchema` implement the identical refinement predicate:
     `(val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val)`
     with the exact error message `"URL gambar tidak valid"`.
   - Local uploaded paths (`/uploads/...`), external HTTPS/HTTP links, and empty/nullable values (`null`, `""`, `undefined`, `"   "`) pass without exception in both schemas.
   - Arbitrary strings, protocol exploits (`javascript:`, `ftp:`, `data:`), and non-`/uploads/` paths are rejected cleanly.
   - *Conclusion*: Full schema harmonization and validation parity between Admin CMS and Post Creation schemas is verified.

3. **Premise 3: Media Listing Resilience**:
   - *Observation 1.4*: When the upload directory does not exist on disk, `fs.access(UPLOAD_DIR)` triggers the catch block in `src/app/api/admin/media/route.ts:47-55`, returning `{ success: true, media: [] }` with HTTP 200 rather than crashing or throwing an unhandled 500.
   - Hidden files (`.gitkeep`, `.DS_Store`), non-file directories, and non-whitelisted extensions are excluded by filtering predicates.
   - Media items are sorted strictly by modification timestamp in descending order (`createdAt` newest-first).
   - *Conclusion*: The media listing endpoint is resilient, clean, and satisfies all contract requirements.

4. **Premise 4: Test Cleanup & Tree Hygiene**:
   - *Observation 1.1 & Test Suite*: All temporary files and test fixtures in `tests/challenger-media-security.test.ts` are tracked and removed in `finally` and `afterAll` blocks.
   - *Conclusion*: The working tree remains clean with zero leftover upload artifacts.

---

## 3. Caveats

- **Regex-based XML Inspection**: The SVG sanitization utilizes regular expression pattern matching. While it successfully blocks all standard script tags, inline event attributes (`onload=`, `onerror=`), and `javascript:` URIs, it does not perform a full DOM AST sanitization (such as DOMPurify). For typical blog article vector illustrations this is secure and lightweight; if future requirements permit arbitrary third-party interactive SVGs with animations, a dedicated XML DOM sanitizer may be considered.
- **Concurrent Next.js Builds**: When multiple agents execute `next build` concurrently, the Next.js Turbopack compiler enforces a single-process lock and will fail secondary runs with `"Another next build process is already running"`. Sequential execution confirms the build succeeds cleanly with exit code 0.

---

## 4. Conclusion

**Verdict: APPROVE**

All three challenge dimensions specified in `DISPATCH.md` have been empirically validated and verified:
1. **SVG XSS vectors**: Rejected with HTTP 400; clean valid SVGs accepted with HTTP 201.
2. **Cover image schema validation**: Local paths (`/uploads/...`), external URLs, and empty values pass; invalid strings rejected with `"URL gambar tidak valid"`.
3. **Media listing edge cases**: Missing upload directory returns status 200 with empty array; hidden files filtered; newest-first sorting confirmed.
4. **Build & Regression**: 100% pass across 313 Vitest tests (17 test files) and `npm run build` exits 0.

---

## 5. Verification Method

To independently reproduce the empirical findings:

```powershell
# 1. Run the challenger security test harness (15 tests)
npx.cmd vitest run tests/challenger-media-security.test.ts

# 2. Run the full test suite (313 tests across 17 test files)
npx.cmd vitest run

# 3. Verify TypeScript compilation
npx.cmd tsc --noEmit

# 4. Verify Next.js production build
npm.cmd run build
```

---

## 6. Challenge Summary & Stress Test Results

**Overall risk assessment**: **LOW**

### Challenge 1 (SVG XSS Vectors): LOW
- **Assumption challenged**: SVG upload parser might allow embedded malicious scripts or event handlers.
- **Attack scenario**: Uploading SVGs with `<script>`, `<circle onload=...>`, `<image href="javascript:..."/>`, `<image onerror=...>`, obfuscated spacing, and case variations.
- **Blast radius**: Stored XSS leading to session hijacking or admin account takeover if rendered unsanitized in the browser.
- **Mitigation**: Implemented regex guard in `src/lib/media.ts:227-255` blocking script tags, javascript URIs, and event handlers.
- **Empirical result**: Pass. All malicious vectors rejected with 400.

### Challenge 2 (Cover Image Schema Parity): LOW
- **Assumption challenged**: `PostCreateSchema` and `PostAdminSchema` might diverge in their acceptance of local `/uploads/` paths or allow arbitrary URL schemes.
- **Attack scenario**: Submitting `/uploads/...`, `https://...`, `javascript:...`, `ftp:...`, `data:...`, `""`, `null`, `undefined` to both schemas.
- **Blast radius**: Broken image links or stored URI vulnerabilities in post cover images.
- **Mitigation**: Refined `coverImage` in both schemas to accept only `/uploads/` or `http://`/`https://` while allowing empty values.
- **Empirical result**: Pass. Identical validation behavior verified across all inputs.

### Challenge 3 (Missing Directory & Media Listing): LOW
- **Assumption challenged**: `GET /api/admin/media` could throw an unhandled 500 or return dirty listings containing system/hidden files.
- **Attack scenario**: Invoking endpoint with deleted `public/uploads`, hidden files (`.gitkeep`, `.DS_Store`), and unsorted files.
- **Blast radius**: Admin dashboard crash or display of system metadata.
- **Mitigation**: Graceful directory check returning `{ success: true, media: [] }`, dotfile filter, and mtime comparator.
- **Empirical result**: Pass. Graceful 200 response, clean filtering, and strict newest-first sorting verified.

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| `<svg><script>alert(1)</script></svg>` | 400 Bad Request | 400 Bad Request (`tag <script> terlarang`) | PASS |
| `<svg><circle onload="alert(1)" /></svg>` | 400 Bad Request | 400 Bad Request (`onload= terlarang`) | PASS |
| `<svg><image href="javascript:alert(1)" /></svg>` | 400 Bad Request | 400 Bad Request (`URI javascript: terlarang`) | PASS |
| SVG with `onerror=` | 400 Bad Request | 400 Bad Request (`onerror= terlarang`) | PASS |
| Obfuscated spacing (`onload   =   "alert(1)"`) | 400 Bad Request | 400 Bad Request | PASS |
| Uppercase XSS (`<SCRIPT>`, `JAVASCRIPT:`) | 400 Bad Request | 400 Bad Request | PASS |
| Clean complex SVG | 201 Created | 201 Created | PASS |
| Cover image `/uploads/photo.jpg` | Valid in both schemas | Valid in both schemas | PASS |
| Cover image `https://example.com/banner.png` | Valid in both schemas | Valid in both schemas | PASS |
| Cover image `null`, `""`, `undefined` | Valid in both schemas | Valid in both schemas | PASS |
| Cover image `"bukan-url-valid"` | Rejected with "URL gambar tidak valid" | Rejected with "URL gambar tidak valid" | PASS |
| Cover image `"javascript:alert(1)"` | Rejected with "URL gambar tidak valid" | Rejected with "URL gambar tidak valid" | PASS |
| Missing `public/uploads` directory | 200 `{ success: true, media: [] }` | 200 `{ success: true, media: [] }` | PASS |
| Hidden files (`.gitkeep`, `.DS_Store`) | Filtered out of media list | Filtered out | PASS |
| Newest-first sorting | Strict descending order by mtime | Strict descending order verified | PASS |

## Unchallenged Areas

- **Exotic XML External Entity (XXE) vectors in SVG**: The server only inspects the raw buffer string with regex and does not parse XML with an external DTD-resolving parser; XXE is inherently non-exploitable in this architecture.
