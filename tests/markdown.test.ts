import { describe, it, expect } from "vitest";
import { calculateReadingTime, generateSlug, parseMarkdownToHtml } from "@/lib/markdown";

describe("Markdown & Utility Tests", () => {
  it("harus menghitung estimasi waktu membaca dengan benar", () => {
    // 200 kata = 1 menit
    const words200 = new Array(200).fill("kata").join(" ");
    expect(calculateReadingTime(words200)).toBe(1);

    // 450 kata = 3 menit
    const words450 = new Array(450).fill("kata").join(" ");
    expect(calculateReadingTime(words450)).toBe(3);

    // Konten kosong minimal 1 menit
    expect(calculateReadingTime("")).toBe(1);
  });

  it("harus menghasilkan slug URL ramah SEO", () => {
    const title = "Membangun Multi-Agent Blog dengan Next.js 15 & AI!";
    const slug = generateSlug(title);
    expect(slug).toBe("membangun-multi-agent-blog-dengan-nextjs-15-ai");
  });

  it("harus mem-parsing Markdown menjadi HTML terformat", async () => {
    const md = "### Judul H3\n\nIni adalah **teks tebal** dan *teks miring*.";
    const html = await parseMarkdownToHtml(md);
    expect(html).toContain("<h3>Judul H3</h3>");
    expect(html).toContain("<strong>teks tebal</strong>");
    expect(html).toContain("<em>teks miring</em>");
  });
});
