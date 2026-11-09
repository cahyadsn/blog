## 2026-11-09T02:59:16Z
Membangun dashboard CMS Admin untuk produksi internal blog guna mengelola draf artikel (buat artikel baru, edit, ubah status publikasi/draf, hapus) serta memoderasi komentar pembaca (approve, tandai spam, hapus, balas langsung sebagai author/admin).

Working directory: d:\c\blog
Integrity mode: development

## Requirements

### R1. Dashboard Navigasi dan Rute Admin
Sediakan rute dashboard admin (pada `/admin`) yang dapat diakses langsung tanpa proteksi autentikasi/login untuk lingkungan internal blog, dengan navigasi terpadu untuk mengelola artikel dan memoderasi komentar.

### R2. Manajemen Artikel (Post Management)
Sediakan antarmuka pengelolaan artikel yang mencakup:
- Melihat daftar seluruh artikel beserta status publikasinya (draf atau dipublikasikan).
- Membuat artikel baru dan mengedit artikel yang sudah ada dengan formulir yang menyediakan editor konten Markdown beserta live preview.
- Mengubah status publikasi artikel antara draf dan publikasi.
- Menghapus artikel yang dipilih.

### R3. Moderasi Komentar (Comment Moderation)
Sediakan antarmuka moderasi komentar yang mencakup:
- Melihat daftar komentar pembaca berdasarkan status (PENDING, APPROVED, SPAM).
- Menyetujui komentar yang berstatus PENDING (mengubah status menjadi APPROVED).
- Menandai komentar sebagai SPAM.
- Menghapus komentar.
- Mengirim balasan langsung terhadap komentar sebagai author/admin (dengan penanda `isAuthorReply: true`).

### R4. Kompatibilitas Desain dan Skema Data
Gunakan komponen antarmuka yang ada pada proyek (`src/components/ui/*`) serta skema Prisma yang telah ditentukan (`Post`, `Comment`, `Tag`, `PostTag`) yang tersimpan pada basis data SQLite lokal (`prisma/dev.db`).

## Acceptance Criteria

### Rute dan Navigasi Admin
- [ ] Rute `/admin` dapat diakses langsung dan menampilkan antarmuka manajemen blog dengan tautan atau tab navigasi ke pengelolaan artikel dan moderasi komentar.

### Manajemen Artikel
- [ ] Halaman daftar artikel menampilkan judul artikel, slug, tanggal pembuatan/pembaruan, dan status publikasi (draf / dipublikasikan).
- [ ] Formulir artikel memungkinkan pengisian judul, slug, kutipan (excerpt), konten, gambar sampul (coverImage), dan tag.
- [ ] Formulir editor artikel menyediakan live preview Markdown yang merender format Markdown secara interaktif.
- [ ] Menyimpan artikel baru berhasil menambahkan entri baru ke tabel `Post` di database.
- [ ] Memperbarui artikel yang ada berhasil menyimpan perubahan pada judul, konten, status, atau metadata terkait.
- [ ] Status publikasi artikel dapat diubah (antara `published: true` dan `published: false`).
- [ ] Artikel dapat dihapus dari database melalui aksi di dashboard admin.

### Moderasi Komentar
- [ ] Halaman moderasi komentar menampilkan daftar komentar dengan indikator status (PENDING, APPROVED, SPAM).
- [ ] Tersedia aksi untuk menyetujui komentar PENDING menjadi APPROVED.
- [ ] Tersedia aksi untuk menandai komentar sebagai SPAM.
- [ ] Tersedia aksi untuk menghapus komentar dari database.
- [ ] Admin dapat mengirim balasan ke komentar tertentu dan balasan tersebut tersimpan sebagai komentar baru dengan `isAuthorReply: true` dan relasi `parentId` yang sesuai.

### Verifikasi Sistem dan Kualitas
- [ ] Perintah `npm run build` berhasil dijalankan tanpa error TypeScript, ESLint, atau Next.js build errors.
- [ ] Tersedia pengujian otomatis dengan Vitest (`npm test`) yang memverifikasi fungsionalitas API dan/atau komponen dashboard admin dan seluruh pengujian berhasil (pass).
