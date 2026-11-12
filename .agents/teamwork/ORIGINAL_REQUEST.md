# Original User Request

## Initial Request — 2026-11-12T16:42:46Z

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


## Follow-up — 2026-11-12T17:54:00Z

update README.md, jalankan git add. , git commit, dan git push