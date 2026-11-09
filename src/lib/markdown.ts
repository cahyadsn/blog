import { marked } from "marked";

/**
 * Menghitung estimasi waktu membaca artikel dalam satuan menit.
 * Asumsi kecepatan baca rata-rata 200 kata per menit.
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / 200);
  return Math.max(1, minutes);
}

/**
 * Mengubah markdown menjadi HTML aman untuk rendering artikel blog
 */
export async function parseMarkdownToHtml(markdownContent: string): Promise<string> {
  if (!markdownContent) return "";
  
  // Konfigurasi marked dasar
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const rawHtml = await marked.parse(markdownContent);
  return rawHtml;
}

/**
 * Membuat slug URL ramah SEO dari judul teks
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
