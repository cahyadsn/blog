import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial database...");

  // Hapus data lama jika ada
  await prisma.comment.deleteMany({});
  await prisma.postTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.post.deleteMany({});

  // 1. Tag
  const tagNext = await prisma.tag.create({
    data: { name: "Next.js", slug: "nextjs" },
  });
  const tagAI = await prisma.tag.create({
    data: { name: "Multi-Agent AI", slug: "multi-agent-ai" },
  });
  const tagArchitecture = await prisma.tag.create({
    data: { name: "Architecture", slug: "architecture" },
  });

  // 2. Post 1
  const post1 = await prisma.post.create({
    data: {
      title: "Membangun Aplikasi Blog Modern dengan Arsitektur Multi-Agent",
      slug: "membangun-blog-modern-multi-agent",
      excerpt:
        "Bagaimana memisahkan tanggung jawab pengembangan software ke agen-agen spesialis: Desain, Basis Data, Backend, Frontend, Pengujian, dan DevOps.",
      content: `## Pengantar Arsitektur Multi-Agent

Dalam pengembangan perangkat lunak modern, kita sering kali menghadapi tantangan kompleksitas ketika satu entitas harus menangani seluruh siklus rekayasa perangkat lunak secara bersamaan.

Dengan mengadopsi **Arsitektur Multi-Agent**, kita membagi peran besar menjadi sub-spesialisasi yang fokus dan mandiri:

1. **Design System Agent**: Menjaga integritas token desain dan konsistensi komponen UI.
2. **Database Agent**: Memastikan relasi data, efisiensi kueri, dan integritas skema database.
3. **Backend Agent**: Membangun API yang aman, sanitasi masukan, dan penanganan data.
4. **Frontend Agent**: Menyajikan antarmuka yang cepat, ramah pengguna, dan responsif.
5. **Testing Agent**: Menjamin tidak ada regresi melalui unit dan integrasi test.
6. **DevOps Agent**: Menghubungkan kode dengan repositori dan pipeline otomatisasi.

\`\`\`typescript
// Contoh integrasi subagent di Antigravity
interface AgentMessage {
  sender: string;
  role: "system" | "engineer" | "reviewer";
  payload: Record<string, unknown>;
}
\`\`\`

### Kesimpulan
Kolaborasi multi-agent bukan hanya sekadar tren, melainkan lompatan paradigma dalam otomatisasi rekayasa perangkat lunak.`,
      readingTime: 4,
      published: true,
      tags: {
        create: [
          { tagId: tagAI.id },
          { tagId: tagArchitecture.id },
        ],
      },
    },
  });

  // 3. Post 2
  const post2 = await prisma.post.create({
    data: {
      title: "Optimasi Performa Next.js 15 dengan React Server Components",
      slug: "optimasi-performa-nextjs-15-rsc",
      excerpt:
        "Eksplorasi mendalam tentang bagaimana Server Components di React 19 mengurangi beban JavaScript di sisi klien dan mempercepat Largest Contentful Paint (LCP).",
      content: `## Mengapa Server Components Mengubah Segalanya?

React Server Components (RSC) memungkinkan kita merender komponen di sisi server tanpa menyertakan dependensi berat ke dalam bundle JavaScript peramban.

### Keuntungan Utama
- **Zero Bundle Size**: Pustaka Markdown atau ORM tidak pernah dikirim ke browser pengguna.
- **Akses Langsung ke Basis Data**: Tidak perlu membuat layer API intermediate hanya untuk membaca data awal.
- **Keamanan Lebih Tinggi**: Kredensial database dan logika sensitif tetap terisolasi di sisi server.

\`\`\`tsx
// Contoh Server Component membaca data langsung dari Prisma
import { db } from "@/lib/db";

export default async function PostList() {
  const posts = await db.post.findMany();
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}
\`\`\`

Dengan pendekatan ini, skor Core Web Vitals aplikasi Anda akan meningkat secara signifikan.`,
      readingTime: 3,
      published: true,
      tags: {
        create: [
          { tagId: tagNext.id },
          { tagId: tagArchitecture.id },
        ],
      },
    },
  });

  // 4. Komentar Awal
  const comment1 = await prisma.comment.create({
    data: {
      postId: post1.id,
      authorName: "Rian Pratama",
      authorEmail: "rian@example.com",
      content: "Penjelasan yang sangat terstruktur! Apakah sistem multi-agent ini bisa diintegrasikan dengan cron schedule untuk posting artikel otomatis setiap pagi?",
      status: "APPROVED",
      isAuthorReply: false,
    },
  });

  await prisma.comment.create({
    data: {
      postId: post1.id,
      parentId: comment1.id,
      authorName: "Antigravity Bot",
      authorEmail: "bot@antigravity.ai",
      content: "Halo Rian! Betul sekali. Anda dapat memanfaatkan fitur Antigravity Task Scheduling (`/schedule` atau cron runner harian) yang memicu skrip `npm run agent:content` secara otonom setiap pukul 08:00 WIB.",
      status: "APPROVED",
      isAuthorReply: true,
    },
  });

  console.log("Seeding complete! Posts created:", post1.title, "and", post2.title);
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
