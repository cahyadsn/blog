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


## 2026-11-12T16:44:00Z

Bangun fitur Pustaka Media & Unggah Gambar (Media Library CMS) untuk kesiapan produksi aplikasi blog Next.js 15.

Working directory: d:\c\blog
Integrity mode: development

## Requirements

### R1. Penyimpanan Berkas & Validasi
- Dukungan unggah gambar lokal yang disimpan ke folder `public/uploads/` (atau direktori statis Next.js yang dapat diakses publik).
- Validasi berkas: batasi tipe MIME yang diizinkan (PNG, JPEG, WebP, GIF, SVG) dan ukuran maksimum berkas 5MB.
- Penamaan berkas unik (menggunakan timestamp/UUID/slug aman) untuk mencegah tabrakan nama file dan penanganan path traversal secara defensif.

### R2. API Backend Media Admin
- `POST /api/admin/media/upload`: Endpoint untuk menerima multipart/form-data, memvalidasi ukuran & tipe file menggunakan Zod/buffer check, menyimpan ke disk, dan mengembalikan URL publik aset beserta metadata.
- `GET /api/admin/media`: Endpoint untuk mengambil daftar berkas media yang tersedia (nama, url, ukuran, tanggal unggah).
- `DELETE /api/admin/media/[id]` (atau by filename query): Endpoint untuk menghapus berkas dari disk.
- Seluruh endpoint diproteksi autentikasi session admin yang sudah ada.

### R3. Antarmuka Manajemen Media (Admin CMS) & Integrasi Editor
- Tambahkan tab "Pustaka Media" di Dashboard Admin (`/admin`) dengan grid galeri pratinjau gambar, informasi ukuran & tanggal, tombol salin URL / salin snippet Markdown (`![alt](/uploads/...)`), dan tombol hapus.
- Integrasikan fitur unggah gambar langsung ke dalam `PostEditor.tsx`: tombol "Unggah Gambar" atau area drag-and-drop yang secara otomatis mengunggah gambar dan menyisipkan format markdown gambar langsung ke textarea editor pada posisi kursor.
- Dukungan pemilihan gambar cover artikel langsung dari pustaka media atau upload instan.

### R4. Pengujian & Verifikasi
- Buat test suite Vitest komprehensif untuk validasi upload (tipe berkas tidak valid, ukuran melebihi batas, penamaan aman, penghapusan file).
- Pastikan seluruh test yang sudah ada (236 tests) tetap lulus tanpa regresi.
- Pastikan `npm.cmd run build` lulus 100% tanpa error TypeScript maupun Next.js compiler.

## Verification Resources
- Gunakan test suite Vitest yang sudah ada di repositori (`npm test`) dan perintah build produksi (`npm.cmd run build`).

## Acceptance Criteria

### Media Storage & Validation
- [ ] Berkas gambar diunggah dan disimpan ke folder `public/uploads/` (atau direktori statis publik yang dapat diakses).
- [ ] Validasi tipe MIME hanya mengizinkan PNG, JPEG, WebP, GIF, SVG dan menolak tipe berkas lainnya dengan pesan error yang jelas.
- [ ] Validasi ukuran berkas membatasi ukuran maksimal (5MB) dan menolak berkas yang melebihi batas dengan pesan error yang jelas.
- [ ] Berkas yang disimpan memiliki penamaan unik (timestamp/UUID/slug) dan aman dari kerentanan path traversal.

### Admin Media API
- [ ] `POST /api/admin/media/upload` menerima multipart/form-data, memvalidasi ukuran & tipe file, menyimpan ke disk, dan merespons dengan URL publik serta metadata berkas.
- [ ] `GET /api/admin/media` mengembalikan daftar berkas media yang tersedia beserta metadata (nama, url, ukuran, tanggal unggah).
- [ ] `DELETE /api/admin/media/[id]` (atau by filename query) menghapus berkas media dari disk.
- [ ] Akses ke seluruh endpoint media API tanpa session admin yang valid ditolak.

### Admin CMS UI & Editor Integration
- [ ] Tab "Pustaka Media" di Dashboard Admin (`/admin`) menampilkan grid galeri pratinjau gambar, informasi ukuran & tanggal, tombol salin URL / snippet Markdown, dan tombol hapus.
- [ ] Komponen `PostEditor.tsx` menyediakan tombol "Unggah Gambar" atau area drag-and-drop yang otomatis mengunggah gambar dan menyisipkan markdown gambar pada posisi kursor editor.
- [ ] Editor artikel mendukung pemilihan gambar cover artikel dari pustaka media atau upload langsung.

### Test & Regression Verification
- [ ] Test suite Vitest baru untuk pustaka media mencakup validasi upload (tipe tidak valid, ukuran berlebih, penamaan aman, penghapusan file) dan lulus 100%.
- [ ] Seluruh 236 test yang sudah ada tetap lulus tanpa regresi (`npm test`).
- [ ] Perintah build proyek `npm.cmd run build` lulus 100% tanpa error TypeScript atau kompilasi Next.js.

## Coordination Context
- Working directory: d:\c\blog
- State folder: d:\c\blog\.agents\teamwork\orchestrator\
- ORIGINAL_REQUEST.md: d:\c\blog\.agents\teamwork\ORIGINAL_REQUEST.md


## 2026-11-12T17:54:00Z

update README.md, jalankan git add. , git commit, dan git push