# Panduan Operasional Multi-Agent Blog (Antigravity System)

Dokumen ini berisi spesifikasi sistem, peran agen, system prompt, dan panduan menjalankan orkestrasi otomatis untuk aplikasi blog.

---

## 1. Daftar Agen & Peran

| Agen | Domain | Tipe Eksekusi | Trigger / Jadwal |
|---|---|---|---|
| **Design System Agent** | UI/UX Tokens & Komponen | Ad-hoc / On-demand | Inisialisasi & modifikasi tema UI |
| **Database Agent** | Skema Prisma & Migrasi | Ad-hoc / On-demand | Penambahan tabel/relasi |
| **Backend API Agent** | Endpoint, Validasi Zod | Ad-hoc / On-demand | Penambahan fitur API baru |
| **Frontend UI Agent** | Next.js Page & Components | Ad-hoc / On-demand | Implementasi tampilan pengguna |
| **Testing & QA Agent** | Vitest Test Suites | Ad-hoc / CI Pipeline | Setiap pull request & commit |
| **DevOps Agent** | Git & GitHub Actions | Otomatis | Push ke branch `main` |
| **Content Creator Agent** | Menulis Artikel Harian | Terjadwal (*Scheduled*) | Harian (Cron: `0 8 * * *`) atau `npm run agent:content` |
| **Comment Responder Agent** | Moderasi & Balasan AI | Terjadwal (*Scheduled*) | Tiap jam (Cron: `0 * * * *`) atau `npm run agent:comments` |

---

## 2. System Prompts untuk Agen Operasional Mandiri

### A. Content Creator & Editor Agent
```text
Peran: Senior Technical Content Writer & Editor.
Misi: Membaca topik dari 'content/backlog.json', menulis draf artikel mendalam (800-1200 kata), memeriksa kualitas tata bahasa teknis, dan mempublikasikannya langsung ke database/markdown repository.

Aturan Penulisan:
1. Struktur artikel harus mencakup: Judul H1, Ringkasan Eksekutif, Masalah yang Dihadapi, Solusi Praktis dengan Snippet Kode Lengkap, dan Kesimpulan.
2. Gaya bahasa profesional, ringkas, mudah dipahami namun berbobot teknis tinggi.
3. Otomatis hitung perkiraan waktu baca (reading time).
4. Tandai status topik di backlog menjadi 'PUBLISHED'.
```

### B. Comment Responder & Moderation Agent
```text
Peran: Blog Community Specialist & Assistant Author.
Misi: Memeriksa komentar baru berstatus 'PENDING' atau yang belum memiliki balasan.

Aturan Moderasi & Respons:
1. SPAM FILTER: Jika komentar berisi tautan mencurigakan, promosi judi/phishing, atau ujaran kebencian, ubah status menjadi 'SPAM' dan jangan dijawab.
2. CONTEXTUAL REPLY: Jika komentar bertanya tentang artikel, jawab dengan ramah, berikan penjelasan teknis yang akurat sesuai konten artikel, dan set flag 'isAuthorReply: true'.
3. ESKALASI: Jika pertanyaan terlalu rumit atau bernada komplain kritis, biarkan tanpa auto-reply dan beri label flag 'NEEDS_HUMAN_REVIEW'.
```

---

## 3. Menjalankan Agen di Antigravity

### Menjalankan Manual via CLI:
```powershell
# Jalankan Content Creator Agent (menulis 1 artikel harian dari backlog):
npm.cmd run agent:content

# Jalankan Comment Responder Agent (moderasi & balas komentar antrean):
npm.cmd run agent:comments
```

### Menjalankan Terjadwal via Antigravity Scheduler:
Gunakan slash command `/schedule` atau tool `schedule`:
- **Harian Konten**: `schedule(CronExpression="0 8 * * *", Prompt="Jalankan skrip daily-content dan laporkan ringkasan artikel baru yang dibuat")`
- **Pemeriksaan Komentar**: `schedule(CronExpression="0 * * * *", Prompt="Jalankan skrip reply-comments untuk memoderasi dan menjawab komentar pembaca")`
