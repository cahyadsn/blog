import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runCommentResponderAgent() {
  console.log("=== [COMMENT RESPONDER & MODERATION AGENT] Memeriksa Komentar Baru ===");

  // 1. Ambil komentar teratas yang berstatus APPROVED, bukan balasan author, dan belum memiliki balasan dari author bot
  const commentsToReview = await prisma.comment.findMany({
    where: {
      isAuthorReply: false,
      status: "APPROVED",
      replies: {
        none: {
          isAuthorReply: true,
        },
      },
    },
    include: {
      post: true,
    },
    take: 5,
  });

  if (commentsToReview.length === 0) {
    console.log("Tidak ada komentar baru yang membutuhkan tanggapan.");
    return;
  }

  console.log(`Ditemukan ${commentsToReview.length} komentar yang menunggu tanggapan.`);

  for (const comment of commentsToReview) {
    console.log(`\nMemproses komentar dari "${comment.authorName}" pada artikel: "${comment.post.title}"`);
    console.log(`Pesan: "${comment.content}"`);

    // Evaluasi kata kunci pertanyaan untuk menyusun jawaban kontekstual
    let botReplyText = "";
    const lowerContent = comment.content.toLowerCase();

    if (lowerContent.includes("bagaimana") || lowerContent.includes("cara") || lowerContent.includes("tutorial")) {
      botReplyText = `Halo ${comment.authorName}, terima kasih atas pertanyaannya! Untuk memulai implementasi, Anda dapat mengikuti langkah-langkah yang dirincikan pada artikel "${comment.post.title}", khususnya pada bagian contoh kode arsitektur modular. Pastikan dependensi telah diinstal dengan benar sebelum menjalankan tugas.`;
    } else if (lowerContent.includes("cron") || lowerContent.includes("jadwal") || lowerContent.includes("schedule")) {
      botReplyText = `Halo ${comment.authorName}! Fitur scheduler dapat dikonfigurasi melalui Antigravity Task Scheduler dengan sintaks cron standar atau menggunakan CLI command \`npm run agent:content\` yang dipicu secara otomatis setiap jam tertentu.`;
    } else {
      botReplyText = `Terima kasih atas apresiasi dan wawasan yang Anda bagikan, ${comment.authorName}! Kami terus memperbarui panduan dan arsitektur ini secara berkala agar relevan dengan perkembangan standar industri terkini.`;
    }

    // Simpan balasan otomatis ke dalam database
    const reply = await prisma.comment.create({
      data: {
        postId: comment.postId,
        parentId: comment.id,
        authorName: "Antigravity Assistant Bot",
        authorEmail: "assistant@antigravity.ai",
        content: botReplyText,
        status: "APPROVED",
        isAuthorReply: true,
      },
    });

    console.log(`[Auto-Reply Berhasil] Balasan tersimpan dengan ID: ${reply.id}`);
  }

  console.log("\n=== Semua komentar dalam antrean telah selesai diproses ===");
}

runCommentResponderAgent()
  .catch((err) => {
    console.error("Gagal menjalankan Comment Responder Agent:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
