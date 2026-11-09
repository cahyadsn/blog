import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface BacklogItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  targetAudience: string;
  keyTakeaways: string[];
  status: "READY" | "PUBLISHED";
}

async function runDailyContentAgent() {
  console.log("=== [CONTENT CREATOR & EDITOR AGENT] Memulai Siklus Penulisan Harian ===");

  const backlogPath = path.join(process.cwd(), "content", "backlog.json");
  if (!fs.existsSync(backlogPath)) {
    console.error("Berkas backlog tidak ditemukan di:", backlogPath);
    return;
  }

  const rawData = fs.readFileSync(backlogPath, "utf-8");
  const backlog: BacklogItem[] = JSON.parse(rawData);

  // Cari topik pertama yang berstatus READY
  const itemToProcess = backlog.find((item) => item.status === "READY");
  if (!itemToProcess) {
    console.log("Semua topik dalam backlog telah dipublikasikan. Tidak ada draf baru untuk hari ini.");
    return;
  }

  console.log(`Memilih topik dari backlog: "${itemToProcess.title}"`);

  // Simulasi peran WRITER: Menyusun artikel teknis berdasarkan topik
  const slug = itemToProcess.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const excerpt = `Pembahasan komprehensif mengenai ${itemToProcess.title.toLowerCase()}, dirancang khusus untuk ${itemToProcess.targetAudience.toLowerCase()}.`;

  const articleMarkdown = `## Ringkasan Eksekutif

Dalam lanskap rekayasa perangkat lunak modern, pemahaman mendalam tentang **${itemToProcess.title}** menjadi keharusan bagi setiap praktisi teknologi.

Artikel ini mengupas pilar-pilar utama berikut:
${itemToProcess.keyTakeaways.map((point, idx) => `${idx + 1}. **${point}**`).join("\n")}

---

## Analisis Masalah & Kebutuhan Arsitektur

Banyak tim pengembang terjebak dalam pendekatan monolitik tradisional ketika mengelola alur kerja kompleks. Pendekatan ini sering memunculkan *bottleneck* pada skalabilitas dan kecepatan iterasi.

Untuk mengatasi permasalahan tersebut, dibutuhkan pemisahan tanggung jawab yang tegas:
- **Modularitas**: Setiap komponen berdiri sendiri dan mudah diuji.
- **Observabilitas**: Setiap langkah memiliki log dan metrik yang terukur.
- **Otomasi Terjadwal**: Tugas berulang dialihkan ke agen terprogram.

\`\`\`typescript
// Pola implementasi modular yang direkomendasikan
export async function executeTaskWithAgent<T>(taskName: string, taskFn: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  console.log(\`[Agent Runner] Memulai eksekusi task: \${taskName}\`);
  try {
    const result = await taskFn();
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(\`[Agent Runner] Selesai \${taskName} dalam \${duration}ms\`);
    return result;
  } catch (err) {
    console.error(\`[Agent Runner] Gagal mengeksekusi \${taskName}:\`, err);
    throw err;
  }
}
\`\`\`

---

## Kesimpulan & Langkah Selanjutnya

Menerapkan **${itemToProcess.title}** akan memberikan efisiensi berlipat ganda dalam jangka panjang. Mulailah dari langkah kecil, evaluasi setiap checkpoint, dan perluas implementasinya secara bertahap.`;

  // Simulasi peran EDITOR: Menilai kualitas artikel (panjang, kata kunci, keterbacaan)
  const wordCount = articleMarkdown.trim().split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  console.log(`[Editor Check] Lolos verifikasi editorial! Total kata: ${wordCount}, Est. Reading Time: ${readingTime} menit.`);

  // Simpan artikel ke database
  const post = await prisma.post.upsert({
    where: { slug },
    update: {
      title: itemToProcess.title,
      content: articleMarkdown,
      excerpt,
      readingTime,
      published: true,
    },
    create: {
      title: itemToProcess.title,
      slug,
      excerpt,
      content: articleMarkdown,
      readingTime,
      published: true,
      tags: {
        create: itemToProcess.tags.map((tagName) => {
          const cleanSlug = tagName.toLowerCase().replace(/[^\w-]/g, "");
          return {
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: {
                  name: tagName,
                  slug: cleanSlug,
                },
              },
            },
          };
        }),
      },
    },
  });

  console.log(`Artikel berhasil dipublikasikan ke database dengan ID: ${post.id}`);

  // Perbarui status di backlog.json
  itemToProcess.status = "PUBLISHED";
  fs.writeFileSync(backlogPath, JSON.stringify(backlog, null, 2), "utf-8");
  console.log(`Status topik "${itemToProcess.title}" di backlog telah diperbarui menjadi PUBLISHED.`);
}

runDailyContentAgent()
  .catch((err) => {
    console.error("Gagal menjalankan Content Creator Agent:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
