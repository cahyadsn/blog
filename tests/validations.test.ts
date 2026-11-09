import { describe, it, expect } from "vitest";
import { CommentSchema, PostCreateSchema } from "@/lib/validations";

describe("Validations & Security Tests (Unit Testing Agent)", () => {
  describe("CommentSchema", () => {
    it("harus meloloskan input komentar yang valid", () => {
      const validComment = {
        postId: "post-123",
        authorName: "Ahmad Fauzi",
        authorEmail: "ahmad@example.com",
        content: "Artikel ini sangat bermanfaat dan mudah dipahami!",
      };
      const result = CommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it("harus menolak nama yang terlalu pendek", () => {
      const invalid = {
        postId: "post-123",
        authorName: "A",
        authorEmail: "ahmad@example.com",
        content: "Komentar yang valid",
      };
      const result = CommentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("minimal 2 karakter");
      }
    });

    it("harus menolak format email yang tidak valid", () => {
      const invalid = {
        postId: "post-123",
        authorName: "Ahmad Fauzi",
        authorEmail: "bukan-email",
        content: "Komentar yang valid",
      };
      const result = CommentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("harus memblokir komentar yang mengandung tag script XSS berbahaya", () => {
      const malicious = {
        postId: "post-123",
        authorName: "Attacker",
        authorEmail: "attacker@malicious.com",
        content: "Halo <script>alert('xss attack!')</script> pembaca",
      };
      const result = CommentSchema.safeParse(malicious);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("XSS");
      }
    });
  });

  describe("PostCreateSchema", () => {
    it("harus menerima payload artikel baru yang sesuai aturan", () => {
      const validPost = {
        title: "Panduan Arsitektur Multi-Agent",
        slug: "panduan-arsitektur-multi-agent",
        excerpt: "Ringkasan artikel pengantar sistem multi-agent di Antigravity.",
        content: "Ini adalah isi konten artikel yang panjang dan memiliki lebih dari lima puluh karakter untuk lolos validasi minimum.",
        tags: ["Architecture", "AI"],
      };
      const result = PostCreateSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it("harus menolak slug yang mengandung huruf besar atau spasi", () => {
      const invalidSlug = {
        title: "Panduan Arsitektur Multi-Agent",
        slug: "Panduan Arsitektur",
        excerpt: "Ringkasan artikel pengantar sistem multi-agent di Antigravity.",
        content: "Ini adalah isi konten artikel yang panjang dan memiliki lebih dari lima puluh karakter untuk lolos validasi minimum.",
      };
      const result = PostCreateSchema.safeParse(invalidSlug);
      expect(result.success).toBe(false);
    });
  });
});
