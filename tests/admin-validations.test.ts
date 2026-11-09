import { describe, it, expect } from "vitest";
import {
  PostAdminSchema,
  CommentStatusSchema,
  AdminReplySchema,
} from "@/lib/validations";

describe("Admin Validations Suite", () => {
  describe("PostAdminSchema (R2: Post Management)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-P1: should accept a fully populated valid post payload", () => {
      const validPayload = {
        title: "Panduan Arsitektur Next.js 15 dan Prisma",
        slug: "panduan-arsitektur-nextjs-15-prisma",
        excerpt: "Panduan mendalam tentang integrasi Next.js 15 App Router dengan Prisma ORM.",
        content: "## Pendahuluan\n\nNext.js 15 membawa banyak fitur baru yang sangat menarik untuk dieksplorasi dalam pengembangan aplikasi skala besar.",
        coverImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
        published: true,
        tags: ["nextjs", "prisma", "typescript"],
      };

      const result = PostAdminSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validPayload.title);
        expect(result.data.slug).toBe(validPayload.slug);
        expect(result.data.published).toBe(true);
        expect(result.data.tags).toEqual(["nextjs", "prisma", "typescript"]);
      }
    });

    it("T1-P2: should apply default values when published and tags are omitted", () => {
      const payload = {
        title: "Membangun Web Modern dengan Tailwind",
        slug: "membangun-web-modern-tailwind",
        excerpt: "Eksplorasi mendalam pembuatan komponen UI modern.",
        content: "Tailwind CSS memungkinkan styling cepat dan konsisten dengan utility classes.",
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.published).toBe(true);
        expect(result.data.tags).toEqual([]);
      }
    });

    it("T1-P3: should accept draft post with published: false", () => {
      const draftPayload = {
        title: "Draf Artikel Baru yang Belum Siap Terbit",
        slug: "draf-artikel-baru-belum-siap",
        excerpt: "Draf artikel yang disimpan untuk ditinjau lebih lanjut oleh editor.",
        content: "Konten draf yang masih memerlukan peninjauan dan tambahan referensi.",
        published: false,
        tags: ["draft", "wip"],
      };

      const result = PostAdminSchema.safeParse(draftPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.published).toBe(false);
      }
    });

    it("T1-P4: should trim whitespace from string fields automatically", () => {
      const payloadWithSpaces = {
        title: "   Judul dengan Spasi Ekstra   ",
        slug: "judul-dengan-spasi-ekstra",
        excerpt: "   Ringkasan dengan whitespace di awal dan akhir kalimat.   ",
        content: "   Konten artikel dengan leading dan trailing whitespace yang valid.   ",
        coverImage: "   https://example.com/cover.png   ",
      };

      const result = PostAdminSchema.safeParse(payloadWithSpaces);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Judul dengan Spasi Ekstra");
        expect(result.data.excerpt).toBe("Ringkasan dengan whitespace di awal dan akhir kalimat.");
        expect(result.data.content).toBe("Konten artikel dengan leading dan trailing whitespace yang valid.");
        expect(result.data.coverImage).toBe("https://example.com/cover.png");
      }
    });

    it("T1-P5: should accept minimum allowable field lengths", () => {
      const minPayload = {
        title: "12345", // Exactly 5 chars
        slug: "abc", // Exactly 3 chars
        excerpt: "1234567890", // Exactly 10 chars
        content: "12345678901234567890", // Exactly 20 chars
      };

      const result = PostAdminSchema.safeParse(minPayload);
      expect(result.success).toBe(true);
    });

    it("T1-P6: should accept maximum allowable field lengths", () => {
      const maxPayload = {
        title: "A".repeat(200), // Exactly 200 chars
        slug: "a".repeat(120), // Exactly 120 chars
        excerpt: "B".repeat(300), // Exactly 300 chars
        content: "C".repeat(5000), // Long content > 20 chars
        tags: ["tag-1", "tag-2"],
      };

      const result = PostAdminSchema.safeParse(maxPayload);
      expect(result.success).toBe(true);
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-P1: should reject title shorter than 5 characters", () => {
      const payload = {
        title: "Test", // 4 chars
        slug: "valid-slug",
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("title"))).toBe(true);
      }
    });

    it("T2-P2: should reject title exceeding 200 characters", () => {
      const payload = {
        title: "A".repeat(201),
        slug: "valid-slug",
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("title"))).toBe(true);
      }
    });

    it("T2-P3: should reject slug with uppercase characters", () => {
      const payload = {
        title: "Judul Valid Artikel",
        slug: "Invalid-Uppercase-Slug",
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("slug"))).toBe(true);
      }
    });

    it("T2-P4: should reject slug with spaces or illegal symbols", () => {
      const invalidSlugs = [
        "slug with spaces",
        "slug_with_underscores",
        "slug.with.dots",
        "slug@symbol!",
        "slug#anchor",
      ];

      for (const slug of invalidSlugs) {
        const result = PostAdminSchema.safeParse({
          title: "Judul Valid Artikel",
          slug,
          excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
          content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
        });
        expect(result.success, `Slug "${slug}" should have been rejected`).toBe(false);
      }
    });

    it("T2-P5: should reject slug shorter than 3 characters or longer than 120 characters", () => {
      const shortResult = PostAdminSchema.safeParse({
        title: "Judul Valid Artikel",
        slug: "ab", // 2 chars
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      });
      expect(shortResult.success).toBe(false);

      const longResult = PostAdminSchema.safeParse({
        title: "Judul Valid Artikel",
        slug: "a".repeat(121), // 121 chars
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      });
      expect(longResult.success).toBe(false);
    });

    it("T2-P6: should reject excerpt shorter than 10 characters or longer than 300 characters", () => {
      const shortExcerpt = PostAdminSchema.safeParse({
        title: "Judul Valid Artikel",
        slug: "valid-slug",
        excerpt: "Pendek", // 6 chars
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      });
      expect(shortExcerpt.success).toBe(false);

      const longExcerpt = PostAdminSchema.safeParse({
        title: "Judul Valid Artikel",
        slug: "valid-slug",
        excerpt: "A".repeat(301), // 301 chars
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      });
      expect(longExcerpt.success).toBe(false);
    });

    it("T2-P7: should reject content shorter than 20 characters", () => {
      const payload = {
        title: "Judul Valid Artikel",
        slug: "valid-slug",
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Terlalu pendek", // 14 chars
      };

      const result = PostAdminSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("content"))).toBe(true);
      }
    });

    it("T2-P8: should properly handle coverImage variations (null, empty string, invalid URL)", () => {
      const base = {
        title: "Judul Valid Artikel",
        slug: "valid-slug",
        excerpt: "Ringkasan valid dengan panjang lebih dari 10 karakter.",
        content: "Konten artikel valid dengan panjang lebih dari 20 karakter.",
      };

      // null should pass
      expect(PostAdminSchema.safeParse({ ...base, coverImage: null }).success).toBe(true);

      // empty string should pass
      expect(PostAdminSchema.safeParse({ ...base, coverImage: "" }).success).toBe(true);

      // undefined should pass
      expect(PostAdminSchema.safeParse({ ...base, coverImage: undefined }).success).toBe(true);

      // invalid URL string should fail
      const invalidUrl = PostAdminSchema.safeParse({ ...base, coverImage: "bukan-url-valid" });
      expect(invalidUrl.success).toBe(false);
    });

    // --- Tier 3: Cross-Feature Combinations ---
    it("T3-P1: should handle combination of draft post with empty tags and null coverImage", () => {
      const result = PostAdminSchema.safeParse({
        title: "Draf Khusus Tanpa Cover Dan Tags",
        slug: "draf-khusus-tanpa-cover-tags",
        excerpt: "Ringkasan untuk draf artikel khusus tanpa metadata tambahan.",
        content: "Konten artikel draf yang memverifikasi kombinasi nilai opsional dan nullable.",
        coverImage: null,
        published: false,
        tags: [],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.published).toBe(false);
        expect(result.data.coverImage).toBe(null);
        expect(result.data.tags).toHaveLength(0);
      }
    });

    it("T3-P2: should handle combination of published post with high tag count and complex Markdown content", () => {
      const markdownContent = `
# Judul Besar Markdown
Berikut adalah poin-poin utama:
- Poin 1: **Tebal** dan *Miring*
- Poin 2: \`code inline\`
\`\`\`typescript
const greeting: string = "Hello World";
console.log(greeting);
\`\`\`
> Kutipan penting untuk admin dashboard.
      `.trim();

      const tags = Array.from({ length: 15 }, (_, i) => `kategori-tag-${i + 1}`);

      const result = PostAdminSchema.safeParse({
        title: "Artikel Kompleks dengan Konten Markdown Panjang",
        slug: "artikel-kompleks-konten-markdown-panjang",
        excerpt: "Ringkasan artikel kompleks yang berisi banyak tag dan format Markdown beragam.",
        content: markdownContent,
        coverImage: "https://example.com/assets/banner.webp",
        published: true,
        tags,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toHaveLength(15);
        expect(result.data.content).toContain("const greeting: string");
      }
    });
  });

  describe("CommentStatusSchema (R3: Comment Moderation)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-C1: should accept valid status APPROVED", () => {
      const result = CommentStatusSchema.safeParse({ status: "APPROVED" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe("APPROVED");
    });

    it("T1-C2: should accept valid status PENDING", () => {
      const result = CommentStatusSchema.safeParse({ status: "PENDING" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe("PENDING");
    });

    it("T1-C3: should accept valid status SPAM", () => {
      const result = CommentStatusSchema.safeParse({ status: "SPAM" });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe("SPAM");
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-C1: should reject lowercase status strings", () => {
      expect(CommentStatusSchema.safeParse({ status: "approved" }).success).toBe(false);
      expect(CommentStatusSchema.safeParse({ status: "pending" }).success).toBe(false);
      expect(CommentStatusSchema.safeParse({ status: "spam" }).success).toBe(false);
    });

    it("T2-C2: should reject unknown or unauthorized status values", () => {
      const invalidStatuses = ["REJECTED", "DELETED", "FLAGGED", "ARCHIVED", ""];
      for (const status of invalidStatuses) {
        expect(CommentStatusSchema.safeParse({ status }).success).toBe(false);
      }
    });

    it("T2-C3: should reject missing or non-string status values", () => {
      expect(CommentStatusSchema.safeParse({}).success).toBe(false);
      expect(CommentStatusSchema.safeParse({ status: 123 }).success).toBe(false);
      expect(CommentStatusSchema.safeParse({ status: null }).success).toBe(false);
    });
  });

  describe("AdminReplySchema (R3: Comment Moderation & Author Reply)", () => {
    // --- Tier 1: Feature Coverage ---
    it("T1-R1: should accept full author reply payload with explicit author name and email", () => {
      const payload = {
        content: "Terima kasih atas masukannya, kami akan memperbarui bagian ini secepatnya.",
        authorName: "Satria Cahya",
        authorEmail: "cahya@blog.internal",
      };

      const result = AdminReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(payload.content);
        expect(result.data.authorName).toBe("Satria Cahya");
        expect(result.data.authorEmail).toBe("cahya@blog.internal");
      }
    });

    it("T1-R2: should apply default authorName ('Admin') and authorEmail ('admin@blog.local')", () => {
      const payload = {
        content: "Balasan singkat dari admin.",
      };

      const result = AdminReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.authorName).toBe("Admin");
        expect(result.data.authorEmail).toBe("admin@blog.local");
      }
    });

    it("T1-R3: should accept minimum content length (2 characters)", () => {
      const payload = { content: "Ok" };
      const result = AdminReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("T1-R4: should accept maximum content length (2000 characters)", () => {
      const payload = { content: "A".repeat(2000) };
      const result = AdminReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("T1-R5: should trim whitespace from content and authorName", () => {
      const payload = {
        content: "   Ini adalah teks balasan admin.   ",
        authorName: "   Admin Utama   ",
      };

      const result = AdminReplySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Ini adalah teks balasan admin.");
        expect(result.data.authorName).toBe("Admin Utama");
      }
    });

    // --- Tier 2: Boundary & Corner Cases ---
    it("T2-R1: should reject content shorter than 2 characters or empty string", () => {
      expect(AdminReplySchema.safeParse({ content: "A" }).success).toBe(false);
      expect(AdminReplySchema.safeParse({ content: "" }).success).toBe(false);
      expect(AdminReplySchema.safeParse({ content: "   " }).success).toBe(false);
    });

    it("T2-R2: should reject content exceeding 2000 characters", () => {
      expect(AdminReplySchema.safeParse({ content: "A".repeat(2001) }).success).toBe(false);
    });

    it("T2-R3: should reject invalid author email format", () => {
      const invalidEmails = ["bukan-email", "admin@", "@domain.com", "admin@domain..com"];
      for (const authorEmail of invalidEmails) {
        const result = AdminReplySchema.safeParse({
          content: "Balasan valid",
          authorEmail,
        });
        expect(result.success, `Email "${authorEmail}" should be invalid`).toBe(false);
      }
    });

    it("T2-R4: should reject empty authorName or whitespace-only authorName", () => {
      const emptyResult = AdminReplySchema.safeParse({
        content: "Balasan valid",
        authorName: "",
      });
      expect(emptyResult.success).toBe(false);

      const whitespaceResult = AdminReplySchema.safeParse({
        content: "Balasan valid",
        authorName: "   ",
      });
      expect(whitespaceResult.success).toBe(false);
    });

    it("T2-R5: should reject author reply containing XSS script tags", () => {
      const xssPayload = {
        content: 'Terima kasih atas infonya! <script>alert("XSS")</script>',
        authorName: "Admin",
      };
      const result = AdminReplySchema.safeParse(xssPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("content"))).toBe(true);
      }
    });

    // --- Tier 3: Combinations ---
    it("T3-R1: should accept multiline formatted markdown and unicode characters in reply content", () => {
      const multilineContent = `
Halo! Terima kasih pertanyaannya 👍.
Berikut solusi snippet kodenya:
\`\`\`bash
npm run agent:comments
\`\`\`
Semoga membantu! 🙏
      `.trim();

      const result = AdminReplySchema.safeParse({
        content: multilineContent,
        authorName: "Senior Admin 👨‍💻",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toContain("npm run agent:comments");
        expect(result.data.authorName).toContain("Senior Admin");
      }
    });
  });
});
