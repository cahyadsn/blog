# Blueprint Implementasi Lengkap: Requirement R2 (Newsletter Subscription Form and Management)

> **Dokumen Handoff Tim Antigravity**  
> **Status:** Siap Eksekusi (Ready for Worker Implementation)  
> **Target Scope:** Requirement R2 (Formulir Langganan Newsletter, API Handler, Validasi Zod, Halaman Admin, & Automated Tests)  
> **Lingkungan:** Next.js 15+ (App Router), React 19, TypeScript strict mode, Prisma 6.4.1 (SQLite `dev.db`), Tailwind CSS v3/v4, Vitest v5.1.0  

---

## 1. Observation

Berdasarkan inspeksi mendalam terhadap seluruh struktur berkas terkait di `d:\c\blog`:

1. **`prisma/schema.prisma` (baris 1-62)**:
   - Saat ini mendefinisikan model `Post`, `Tag`, `PostTag`, dan `Comment`.
   - Model `Subscriber` belum ada di skema Prisma.
   - Perintah migrasi SQLite yang digunakan proyek didefinisikan di `package.json` baris 10-11:
     ```json
     "db:push": "prisma db push",
     "db:generate": "prisma generate"
     ```

2. **`src/lib/validations.ts` (baris 1-84)**:
   - Berisi `CommentSchema`, `PostCreateSchema`, `PostAdminSchema`, `CommentStatusSchema`, `AdminReplySchema`.
   - Menggunakan Zod (`import { z } from "zod"`).
   - Belum memiliki `SubscriberSchema` dan tipe inferensinya `SubscriberInput`.
   - Pola validasi email yang sudah teruji di `CommentSchema`:
     ```ts
     authorEmail: z.string().trim().email("Alamat email tidak valid").max(100, "Email terlalu panjang")
     ```

3. **`src/app/api/newsletter/subscribe/route.ts`**:
   - Berkas belum ada.
   - Harus menangani `POST` request dengan payload JSON `{ email: string }`.
   - Sesuai `PROJECT.md` baris 66-76, deduplikasi bersifat idempoten: email yang sudah terdaftar mengembalikan status HTTP 200 `{ success: true, message: "Email Anda sudah terdaftar dalam newsletter kami.", alreadySubscribed: true }` tanpa melempar HTTP 409/500 dan tanpa membuat baris ganda di database.
   - Subscriber tidak aktif (`active: false`) yang mendaftar kembali harus diaktifkan kembali (`active: true`) dengan status HTTP 200.
   - Email baru harus dibuat dengan `active: true` dengan status HTTP 201.

4. **`src/app/api/admin/subscribers/route.ts` dan `src/app/api/admin/subscribers/[id]/route.ts`**:
   - Berkas belum ada.
   - Diproteksi secara terpusat oleh `src/middleware.ts` baris 39:
     ```ts
     export const config = {
       matcher: ["/admin/:path*", "/api/admin/:path*"],
     };
     ```
   - Harus mengembalikan `{ success: true, subscribers, totalCount, activeCount }` dengan dukungan filter status (`active`, `inactive`, `all`) dan pencarian (`search`).
   - Endpoint `PATCH` dan `DELETE` pada `[id]/route.ts` diperlukan untuk toggle status keaktifan dan penghapusan pelanggan dari dashboard admin.

5. **`src/components/blog/NewsletterForm.tsx`**:
   - Berkas belum ada.
   - Harus berupa Client Component (`"use client"`), responsif pada mobile dan desktop, memiliki status loading (`Loader2 animate-spin`), validasi format inline, serta alert interaktif berbahasa Indonesia (sukses, sudah terdaftar, aktif kembali, dan galat).

6. **`src/components/blog/Footer.tsx` (baris 1-16)**:
   - Komponen footer saat ini hanya memiliki teks hak cipta sederhana dan label multi-agent.
   - Belum mengintegrasikan formulir langganan newsletter.

7. **`src/app/admin/page.tsx` (baris 1-278)**:
   - Menampilkan 4 kartu ringkasan metrik: `totalPosts`, `draftPosts`, `pendingComments`, `spamComments`.
   - Memiliki tab switcher antara "Manajemen Artikel" (`activeTab === "posts"`) dan "Moderasi Komentar" (`activeTab === "comments"`).
   - Memerlukan penambahan kartu metrik ke-5 "Pelanggan Newsletter" (`totalSubscribers` & `activeSubscribers`) serta tab ke-3 "Pelanggan Newsletter" yang merender daftar subscriber tanpa merusak metrik artikel dan komentar yang sudah ada.

8. **Pola Pengujian Vitest di `tests/`**:
   - `vitest.config.ts` dikonfigurasi dengan `environment: "node"` dan alias `@/` mengarah ke `./src`.
   - Menggunakan mock terisolasi `vi.mock("@/lib/db", () => ({ db: { ... } }))` untuk memverifikasi kontrak API route handlers secara deterministik.
   - Belum ada berkas pengujian `tests/newsletter.test.ts` dan `tests/admin-subscribers.test.ts`.

---

## 2. Logic Chain

1. **Integritas Skema & Database**:
   - Penambahan model `Subscriber` di `prisma/schema.prisma` dengan field `id` (CUID), `email` (string, unik), `active` (boolean, default true), dan `createdAt` (datetime, default now) menjamin integritas relasional di tingkat database SQLite.
   - Eksekusi `npm.cmd run db:push && npm.cmd run db:generate` mengaplikasikan DDL ke `prisma/dev.db` dan menggenerasi client Prisma bertipe aman (`db.subscriber`).

2. **Sanitasi & Validasi Input**:
   - Input dari pengguna berpotensi mengandung spasi tak sengaja atau variasi huruf besar/kecil (misal `"  User.Test@Domain.COM  "`).
   - `SubscriberSchema` di `src/lib/validations.ts` menerapkan `.trim()`, `.email()`, `.max(100)`, dan normalisasi lowercase. Ini menjamin data email selalu seragam dan mencegah anomali duplikasi semantik.

3. **Idempotensi & Keamanan API Subscription**:
   - Jika pengguna mendaftarkan email yang sama lebih dari satu kali, melempar HTTP 409 atau 500 akan membingungkan pengguna dan memicu error log server yang tidak perlu.
   - Dengan memeriksa `db.subscriber.findUnique({ where: { email } })`:
     - Jika sudah terdaftar dan `active: true` → Kembalikan HTTP 200 `{ success: true, message: "Email Anda sudah terdaftar dalam newsletter kami.", alreadySubscribed: true }`.
     - Jika sebelumnya dinonaktifkan (`active: false`) → Lakukan re-aktivasi melalui `db.subscriber.update({ where: { id }, data: { active: true } })` dan kembalikan HTTP 200.
     - Jika belum ada → Buat record baru `db.subscriber.create` dan kembalikan HTTP 201.
   - Penanganan error kode `P2002` (Prisma Unique Constraint Violation) dalam blok `catch` bertindak sebagai safety net terhadap race conditions jika ada dua request serentak.

4. **Proteksi & Modularitas Admin API**:
   - Seluruh rute `/api/admin/*` sudah dicegat oleh `middleware.ts`.
   - Endpoint `GET /api/admin/subscribers` melakukan agregasi paralel `Promise.all([db.subscriber.findMany(), db.subscriber.count(), db.subscriber.count({ where: { active: true } })])` untuk efisiensi kueri database.
   - Rute terpisah `src/app/api/admin/subscribers/[id]/route.ts` menangani `PATCH` (toggle aktif/nonaktif) dan `DELETE` (hapus pelanggan).

5. **Pengalaman Pengguna (UX) Frontend & Desain Responsif**:
   - `NewsletterForm.tsx` dirancang dengan dukungan mode terang/gelap, indikator loading interaktif, dan penanganan feedback ramah pengguna.
   - Penempatan di `Footer.tsx` memberikan visibilitas global di setiap halaman blog tanpa mengganggu alur membaca artikel utama.
   - Pada halaman `/admin`, pemisahan komponen ke `src/components/admin/SubscriberList.tsx` menjaga `src/app/admin/page.tsx` tetap rapi dan terisolasi dari kompleksitas tabel data pelanggan.

---

## 3. Blueprint Kode Produksi Lengkap

### 3.1. Skema Prisma: `prisma/schema.prisma`

Tambahkan model `Subscriber` di bagian akhir `prisma/schema.prisma`:

```prisma
model Subscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  @@index([createdAt])
}
```

*Catatan: Pastikan field `likes Int @default(0)` pada model `Post` juga disertakan sesuai PROJECT.md:*
```prisma
model Post {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  excerpt     String
  content     String
  coverImage  String?
  published   Boolean   @default(true)
  readingTime Int       @default(3)
  likes       Int       @default(0)
  publishedAt DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tags        PostTag[]
  comments    Comment[]

  @@index([slug])
  @@index([publishedAt])
}
```

---

### 3.2. Skema Validasi: `src/lib/validations.ts`

Tambahkan `SubscriberSchema` dan tipe `SubscriberInput` pada `src/lib/validations.ts`:

```typescript
export const SubscriberSchema = z.object({
  email: z
    .string({
      required_error: "Alamat email wajib diisi",
      invalid_type_error: "Alamat email harus berupa teks",
    })
    .trim()
    .min(1, "Alamat email wajib diisi")
    .email("Format alamat email tidak valid")
    .max(100, "Alamat email maksimal 100 karakter")
    .transform((val) => val.toLowerCase()),
});

export type SubscriberInput = z.infer<typeof SubscriberSchema>;
```

---

### 3.3. API Endpoint Langganan Publik: `src/app/api/newsletter/subscribe/route.ts`

Buat berkas baru di `src/app/api/newsletter/subscribe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SubscriberSchema } from "@/lib/validations";

export async function POST(req: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload request harus berupa format JSON yang valid" },
        { status: 400 }
      );
    }

    const parseResult = SubscriberSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Format email tidak valid";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const email = parseResult.data.email.toLowerCase().trim();

    // Periksa apakah email sudah ada dalam daftar subscriber
    const existingSubscriber = await db.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      // Jika sudah terdaftar dan aktif -> Idempotent response 200
      if (existingSubscriber.active) {
        return NextResponse.json(
          {
            success: true,
            message: "Email Anda sudah terdaftar dalam newsletter kami.",
            alreadySubscribed: true,
            subscriber: existingSubscriber,
          },
          { status: 200 }
        );
      }

      // Jika sebelumnya dinonaktifkan -> Aktifkan kembali langganan
      const reactivatedSubscriber = await db.subscriber.update({
        where: { id: existingSubscriber.id },
        data: { active: true },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Langganan newsletter Anda telah diaktifkan kembali!",
          reactivated: true,
          subscriber: reactivatedSubscriber,
        },
        { status: 200 }
      );
    }

    // Buat pelanggan baru
    const newSubscriber = await db.subscriber.create({
      data: {
        email,
        active: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Terima kasih telah berlangganan newsletter kami!",
        subscriber: newSubscriber,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    // Tangani race condition Prisma unique constraint violation (kode P2002)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: true,
          message: "Email Anda sudah terdaftar dalam newsletter kami.",
          alreadySubscribed: true,
        },
        { status: 200 }
      );
    }

    const errorMsg =
      err instanceof Error ? err.message : "Terjadi kesalahan pada server saat memproses langganan";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
```

---

### 3.4. API Endpoint Admin Subscribers: `src/app/api/admin/subscribers/route.ts`

Buat berkas baru di `src/app/api/admin/subscribers/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.toLowerCase() || "all";
    const search = searchParams.get("search")?.trim() || "";

    const whereClause: {
      active?: boolean;
      email?: { contains: string };
    } = {};

    if (status === "active") {
      whereClause.active = true;
    } else if (status === "inactive") {
      whereClause.active = false;
    }

    if (search) {
      whereClause.email = { contains: search };
    }

    const [subscribers, totalCount, activeCount] = await Promise.all([
      db.subscriber.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
      db.subscriber.count(),
      db.subscriber.count({ where: { active: true } }),
    ]);

    return NextResponse.json({
      success: true,
      subscribers,
      totalCount,
      activeCount,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal mengambil daftar pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
```

---

### 3.5. API Endpoint Admin Per-Subscriber: `src/app/api/admin/subscribers/[id]/route.ts`

Buat berkas baru di `src/app/api/admin/subscribers/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    let body: { active?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid" },
        { status: 400 }
      );
    }

    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Status aktif (active) harus bernilai boolean" },
        { status: 400 }
      );
    }

    const existing = await db.subscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan newsletter tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await db.subscriber.update({
      where: { id },
      data: { active: body.active },
    });

    return NextResponse.json({
      success: true,
      message: `Status pelanggan berhasil diubah menjadi ${body.active ? "Aktif" : "Nonaktif"}`,
      subscriber: updated,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal memperbarui status pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    const existing = await db.subscriber.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Pelanggan newsletter tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Pelanggan newsletter berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal menghapus pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
```

---

### 3.6. Komponen Frontend: `src/components/blog/NewsletterForm.tsx`

Buat berkas baru di `src/components/blog/NewsletterForm.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";

export type NewsletterFormVariant = "footer" | "card" | "inline";

export interface NewsletterFormProps {
  variant?: NewsletterFormVariant;
  className?: string;
  onSuccess?: (email: string) => void;
}

export function NewsletterForm({
  variant = "footer",
  className = "",
  onSuccess,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatus("error");
      setFeedbackMessage("Silakan masukkan alamat email Anda.");
      return;
    }

    setStatus("loading");
    setFeedbackMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (data.alreadySubscribed) {
        setStatus("duplicate");
        setFeedbackMessage(data.message || "Email Anda sudah terdaftar dalam newsletter kami.");
      } else if (res.ok && data.success) {
        setStatus("success");
        setFeedbackMessage(data.message || "Terima kasih telah berlangganan newsletter kami!");
        setEmail("");
        if (onSuccess) onSuccess(cleanEmail);
      } else {
        setStatus("error");
        setFeedbackMessage(data.error || "Gagal mendaftar newsletter. Silakan periksa kembali email Anda.");
      }
    } catch {
      setStatus("error");
      setFeedbackMessage("Terjadi kendala jaringan. Silakan coba beberapa saat lagi.");
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              disabled={status === "loading"}
              placeholder="nama@email.com"
              aria-label="Alamat Email Newsletter"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer shadow-sm shrink-0"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftar...</span>
              </>
            ) : (
              <span>Langganan</span>
            )}
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {status === "success" && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}

        {status === "duplicate" && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-in fade-in duration-200"
          >
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}
```

---

### 3.7. Integrasi Footer Global: `src/components/blog/Footer.tsx`

Perbarui `src/components/blog/Footer.tsx` untuk menyertakan formulir newsletter di atas baris hak cipta:

```tsx
import React from "react";
import { Sparkles } from "lucide-react";
import { NewsletterForm } from "@/components/blog/NewsletterForm";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
      {/* Newsletter Subscription Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-gray-900 dark:via-gray-900/90 dark:to-indigo-950/40 border border-indigo-100 dark:border-gray-800 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buletin Mingguan</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                Dapatkan Update Artikel & Tren AI Terkini
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Bergabunglah dengan para developer dan engineer. Kami mengirimkan ringkasan artikel teknis, tips arsitektur sistem, dan wawasan langsung ke kotak masuk Anda. Tanpa spam.
              </p>
            </div>
            <div className="md:col-span-6">
              <NewsletterForm variant="footer" />
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Antigravity Multi-Agent Blog. Diproduksi secara mandiri dengan Next.js, Prisma & Agen AI.</p>
          <div className="flex gap-4">
            <span>Design System Agent</span>
            <span>•</span>
            <span>Content Creator Agent</span>
            <span>•</span>
            <span>Comment Responder Agent</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### 3.8. Komponen Pengelola Subscriber Admin: `src/components/admin/SubscriberList.tsx`

Buat berkas baru di `src/components/admin/SubscriberList.tsx`:

```tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Check,
  X,
  Mail,
  Calendar,
} from "lucide-react";

export interface SubscriberItem {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface SubscriberListProps {
  onCountsUpdate?: (counts: { total: number; active: number }) => void;
}

export function SubscriberList({ onCountsUpdate }: SubscriberListProps) {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar pelanggan");
      }

      const list: SubscriberItem[] = Array.isArray(data.subscribers) ? data.subscribers : [];
      setSubscribers(list);

      if (onCountsUpdate) {
        onCountsUpdate({
          total: data.totalCount ?? list.length,
          active: data.activeCount ?? list.filter((s) => s.active).length,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, onCountsUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscribers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSubscribers]);

  const handleToggleActive = async (subscriber: SubscriberItem) => {
    setActionLoadingId(subscriber.id);
    try {
      const nextActive = !subscriber.active;
      const res = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status pelanggan");
      }

      setSubscribers((prev) =>
        prev.map((s) => (s.id === subscriber.id ? { ...s, active: nextActive } : s))
      );
      setSuccessNotification(
        `Pelanggan ${subscriber.email} kini berstatus ${nextActive ? "Aktif" : "Nonaktif"}.`
      );
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memperbarui status.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!window.confirm(`Yakin ingin menghapus ${email} dari daftar pelanggan?`)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/subscribers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menghapus pelanggan");
      }

      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      setSuccessNotification(`Pelanggan ${email} berhasil dihapus.`);
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menghapus data.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification banners */}
      {successNotification && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Control Bar: Filter, Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari email pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 text-xs">
            {(["all", "active", "inactive"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all capitalize cursor-pointer ${
                  statusFilter === tab
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab === "all" ? "Semua" : tab === "active" ? "Aktif" : "Nonaktif"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSubscribers}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Subscriber List Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading && subscribers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs">Memuat daftar pelanggan newsletter...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Belum ada pelanggan newsletter
              </p>
              <p className="text-xs text-gray-500">
                Pelanggan baru yang mendaftar melalui formulir web akan muncul di sini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="col-span-6">Alamat Email</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Terdaftar Sejak</div>
                <div className="col-span-2 text-right">Aksi</div>
              </div>

              {subscribers.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-3 sm:gap-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/40 transition-colors"
                >
                  <div className="col-span-6 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">
                      {item.email}
                    </span>
                  </div>

                  <div className="col-span-2">
                    {item.active ? (
                      <Badge variant="success" className="text-[10px] py-0.5 px-2">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] py-0.5 px-2">
                        Nonaktif
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-2 text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      disabled={actionLoadingId === item.id}
                      title={item.active ? "Nonaktifkan pelanggan" : "Aktifkan pelanggan"}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {item.active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscriber(item.id, item.email)}
                      disabled={actionLoadingId === item.id}
                      title="Hapus pelanggan"
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 3.9. Integrasi Dashboard Admin: `src/app/admin/page.tsx`

Perbarui `src/app/admin/page.tsx` untuk:
1. Memperluas interface `AdminMetrics`:
   ```ts
   interface AdminMetrics {
     totalPosts: number;
     publishedPosts: number;
     draftPosts: number;
     totalComments: number;
     pendingComments: number;
     approvedComments: number;
     spamComments: number;
     totalSubscribers: number;
     activeSubscribers: number;
   }
   ```
2. Memperluas state tab:
   ```ts
   const [activeTab, setActiveTab] = useState<"posts" | "comments" | "subscribers">("posts");
   ```
3. Mengambil `/api/admin/subscribers` secara serentak dalam `fetchMetrics`:
   ```ts
   const [postsRes, commentsRes, subscribersRes] = await Promise.all([
     fetch("/api/admin/posts?status=all"),
     fetch("/api/admin/comments?status=ALL"),
     fetch("/api/admin/subscribers"),
   ]);
   ```
4. Menambahkan kartu metrik ke-5 "Pelanggan Newsletter" pada grid ringkasan:
   ```tsx
   {/* Card 5: Pelanggan Newsletter */}
   <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
     <CardContent className="p-5 flex items-center justify-between">
       <div>
         <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
           Pelanggan Newsletter
         </p>
         <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
           {isLoadingMetrics ? "..." : metrics.totalSubscribers}
         </div>
         <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
           {metrics.activeSubscribers} pelanggan aktif
         </p>
       </div>
       <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
         <Users className="w-6 h-6" />
       </div>
     </CardContent>
   </Card>
   ```
5. Menambahkan tab tombol ketiga pada switcher:
   ```tsx
   <button
     type="button"
     onClick={() => setActiveTab("subscribers")}
     className={`flex items-center gap-2.5 pb-3 px-2 text-sm font-bold border-b-2 transition-all cursor-pointer ${
       activeTab === "subscribers"
         ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
         : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
     }`}
   >
     <Users className="w-4 h-4" />
     <span>Pelanggan Newsletter</span>
     <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
       {metrics.totalSubscribers}
     </Badge>
   </button>
   ```
6. Merender `<SubscriberList />` ketika `activeTab === "subscribers"`.

---

### 3.10. Vitest Test Suites

#### A. `tests/newsletter.test.ts`
Uji validasi Zod dan rute publik `/api/newsletter/subscribe`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as subscribeNewsletter } from "@/app/api/newsletter/subscribe/route";
import { SubscriberSchema } from "@/lib/validations";
import { db } from "@/lib/db";

// Mock database module untuk isolasi unit test
vi.mock("@/lib/db", () => {
  return {
    db: {
      subscriber: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe("Newsletter Subscription Suite (R2: Public Subscription)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SubscriberSchema (Zod Validation)", () => {
    it("T1-VAL-1: should pass for valid email addresses and normalize to lowercase", () => {
      const input = { email: "  Dev.Engineer@Example.COM  " };
      const parsed = SubscriberSchema.safeParse(input);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe("dev.engineer@example.com");
      }
    });

    it("T2-VAL-2: should reject empty string or whitespace-only email", () => {
      const parsed = SubscriberSchema.safeParse({ email: "   " });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Alamat email wajib diisi");
      }
    });

    it("T2-VAL-3: should reject malformed email format", () => {
      const parsed = SubscriberSchema.safeParse({ email: "bukan-alamat-email" });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Format alamat email tidak valid");
      }
    });

    it("T2-VAL-4: should reject email exceeding 100 characters", () => {
      const longEmail = `${"a".repeat(95)}@test.com`;
      const parsed = SubscriberSchema.safeParse({ email: longEmail });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Alamat email maksimal 100 karakter");
      }
    });
  });

  describe("POST /api/newsletter/subscribe (Route Handler)", () => {
    it("T1-SUB-1: should create new subscriber with 201 status and active=true", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.subscriber.create).mockResolvedValueOnce({
        id: "sub-1",
        email: "reader@domain.com",
        active: true,
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "READER@DOMAIN.COM" }),
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Terima kasih telah berlangganan newsletter kami!");
      expect(db.subscriber.findUnique).toHaveBeenCalledWith({
        where: { email: "reader@domain.com" },
      });
      expect(db.subscriber.create).toHaveBeenCalledWith({
        data: { email: "reader@domain.com", active: true },
      });
    });

    it("T1-SUB-2: should return 200 with alreadySubscribed: true when email is already active", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-existing",
        email: "active.user@domain.com",
        active: true,
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "active.user@domain.com" }),
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.alreadySubscribed).toBe(true);
      expect(json.message).toBe("Email Anda sudah terdaftar dalam newsletter kami.");
      expect(db.subscriber.create).not.toHaveBeenCalled();
    });

    it("T1-SUB-3: should reactivate previously inactive subscriber with 200 status", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-inactive",
        email: "inactive.user@domain.com",
        active: false,
        createdAt: new Date(),
      } as any);
      vi.mocked(db.subscriber.update).mockResolvedValueOnce({
        id: "sub-inactive",
        email: "inactive.user@domain.com",
        active: true,
        createdAt: new Date(),
      } as any);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "inactive.user@domain.com" }),
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.reactivated).toBe(true);
      expect(json.message).toContain("diaktifkan kembali");
      expect(db.subscriber.update).toHaveBeenCalledWith({
        where: { id: "sub-inactive" },
        data: { active: true },
      });
    });

    it("T2-ERR-1: should return 400 when email format is invalid", async () => {
      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bukan-email" }),
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Format alamat email tidak valid");
    });

    it("T2-ERR-2: should return 400 when body payload is not valid JSON", async () => {
      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-string{",
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Payload request harus berupa format JSON yang valid");
    });

    it("T3-RACE-1: should handle race-condition unique violation (P2002) idempotently", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);
      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      vi.mocked(db.subscriber.create).mockRejectedValueOnce(p2002Error);

      const req = new Request("http://localhost:3000/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "concurrent@domain.com" }),
      });

      const res = await subscribeNewsletter(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.alreadySubscribed).toBe(true);
      expect(json.message).toBe("Email Anda sudah terdaftar dalam newsletter kami.");
    });
  });
});
```

#### B. `tests/admin-subscribers.test.ts`
Uji rute admin `/api/admin/subscribers` dan `/api/admin/subscribers/[id]`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getSubscribers } from "@/app/api/admin/subscribers/route";
import {
  PATCH as updateSubscriber,
  DELETE as deleteSubscriber,
} from "@/app/api/admin/subscribers/[id]/route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => {
  return {
    db: {
      subscriber: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe("Admin Subscribers API Suite (R2: Admin Management)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/subscribers", () => {
    it("T1-ADM-1: should return subscriber list and counts with status 200", async () => {
      const mockList = [
        { id: "sub-1", email: "alice@example.com", active: true, createdAt: new Date() },
        { id: "sub-2", email: "bob@example.com", active: false, createdAt: new Date() },
      ];
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce(mockList as any);
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(2 as any); // totalCount
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(1 as any); // activeCount

      const req = new Request("http://localhost:3000/api/admin/subscribers");
      const res = await getSubscribers(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.subscribers).toHaveLength(2);
      expect(json.totalCount).toBe(2);
      expect(json.activeCount).toBe(1);
    });

    it("T1-ADM-2: should filter by status=active", async () => {
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(0 as any);
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(0 as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers?status=active");
      await getSubscribers(req);

      expect(db.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        })
      );
    });

    it("T1-ADM-3: should filter by search term in email", async () => {
      vi.mocked(db.subscriber.findMany).mockResolvedValueOnce([]);
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(0 as any);
      vi.mocked(db.subscriber.count).mockResolvedValueOnce(0 as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers?search=google");
      await getSubscribers(req);

      expect(db.subscriber.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: "google" },
          }),
        })
      );
    });
  });

  describe("PATCH /api/admin/subscribers/[id]", () => {
    it("T1-ADM-4: should toggle subscriber active status", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
        active: true,
      } as any);
      vi.mocked(db.subscriber.update).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
        active: false,
      } as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.subscriber.active).toBe(false);
    });

    it("T2-ADM-5: should return 404 when subscriber to update does not exist", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/not-found", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });

      const res = await updateSubscriber(req, { params: Promise.resolve({ id: "not-found" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe("DELETE /api/admin/subscribers/[id]", () => {
    it("T1-ADM-6: should delete subscriber successfully", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce({
        id: "sub-1",
        email: "alice@example.com",
      } as any);
      vi.mocked(db.subscriber.delete).mockResolvedValueOnce({ id: "sub-1" } as any);

      const req = new Request("http://localhost:3000/api/admin/subscribers/sub-1", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "sub-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.subscriber.delete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
    });

    it("T2-ADM-7: should return 404 when subscriber to delete is not found", async () => {
      vi.mocked(db.subscriber.findUnique).mockResolvedValueOnce(null);

      const req = new Request("http://localhost:3000/api/admin/subscribers/ghost", {
        method: "DELETE",
      });

      const res = await deleteSubscriber(req, { params: Promise.resolve({ id: "ghost" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });
});
```

---

## 4. Caveats

1. **Dependensi Antar Modul**:
   - Model `Post.likes` tidak mengganggu model `Subscriber`, namun eksekusi `prisma db push` akan memperbarui skema SQLite secara bersamaan. Pastikan skema `Post` dan `Subscriber` disinkronkan dalam satu langkah migrasi.
2. **Next.js 15+ Async Params**:
   - Pada rute dinamis Next.js 15+ (`src/app/api/admin/subscribers/[id]/route.ts`), parameter rute harus di-`await` (`const { id } = await params;`). Pola ini telah diterapkan pada blueprint.
3. **Penyimpanan Rate Limit vs Newsletter**:
   - Newsletter subscription saat ini menerapkan validasi input dan pengecekan idempotensi database. Pembatasan frekuensi (rate limiting) dapat ditambahkan menggunakan modul `src/lib/rate-limit.ts` bila diperlukan pencegahan spam bot massal di masa mendatang.

---

## 5. Conclusion

Seluruh kebutuhan Requirement R2 (Formulir Langganan Newsletter dan Pengelolaan di Dashboard Admin) telah dipetakan secara tuntas, presisi, dan siap diimplementasikan oleh Worker. Blueprint ini mencakup:
- Model database `Subscriber` dengan indeks optimal pada SQLite.
- Skema validasi Zod dengan sanitasi trimming dan normalisasi huruf kecil.
- Endpoint publik `/api/newsletter/subscribe` dengan penanganan idempotensi tanpa error 409/500 dan pemulihan status tidak aktif.
- Endpoint admin `/api/admin/subscribers` dan rute dinamis per-id untuk pemantauan dan pengelolaan.
- Komponen frontend responsif `NewsletterForm.tsx` terintegrasi pada `Footer.tsx`.
- Modul dashboard admin `SubscriberList.tsx` dan integrasi kartu metrik pada `/admin`.
- Suite uji otomatis komprehensif `tests/newsletter.test.ts` dan `tests/admin-subscribers.test.ts` dengan mock database terisolasi.

---

## 6. Verification Method

Worker dapat memverifikasi implementasi ini secara independen melalui langkah-langkah berikut:

1. **Migrasi Database**:
   ```powershell
   npm.cmd run db:push
   npm.cmd run db:generate
   ```
   *Kondisi validasi:* Tabel `Subscriber` terbentuk di `prisma/dev.db` dan tipe `@prisma/client` mencakup `db.subscriber`.

2. **Eksekusi Test Suite**:
   ```powershell
   npx.cmd vitest run tests/newsletter.test.ts tests/admin-subscribers.test.ts
   ```
   *Kondisi validasi:* Seluruh test case (validasi email, langganan baru, duplikasi idempoten, re-aktivasi, filter admin, toggle, dan delete) lulus dengan exit code 0.

3. **Verifikasi Keseluruhan Test Suite Proyek**:
   ```powershell
   npm.cmd run test
   ```
   *Kondisi validasi:* Semua unit & integration test yang sudah ada tetap lulus 100% tanpa regresi.

4. **Verifikasi Build Produksi Next.js**:
   ```powershell
   npm.cmd run build
   ```
   *Kondisi validasi:* Proses build Next.js 15 berhasil tuntas dengan status exit code 0 dan nihil kesalahan tipe data TypeScript atau ESLint.
