import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  slugifyHeading,
  extractHeadingsAndInjectIds,
  parseMarkdownWithToc,
} from "@/lib/toc";
import { parseMarkdownToHtml } from "@/lib/markdown";
import { TableOfContents } from "@/components/blog/TableOfContents";

describe("TOC Extraction, Slugification & SSR Rendering", () => {
  describe("slugifyHeading", () => {
    it("should convert headings to clean lowercase kebab-case slugs", () => {
      expect(slugifyHeading("Pengantar Arsitektur Multi-Agent")).toBe(
        "pengantar-arsitektur-multi-agent"
      );
      expect(slugifyHeading("Next.js 15 & React 19: Apa yang Baru?")).toBe(
        "nextjs-15-react-19-apa-yang-baru"
      );
    });

    it("should normalize diacritics and strip leading/trailing hyphens", () => {
      expect(slugifyHeading("  Café & Résumé  ")).toBe("cafe-resume");
      expect(slugifyHeading("---Judul---")).toBe("judul");
      expect(slugifyHeading("")).toBe("");
    });
  });

  describe("parseMarkdownWithToc & extractHeadingsAndInjectIds", () => {
    it("should extract only H2 and H3 headings and filter out H1, H4, H5, H6", async () => {
      const md = [
        "# Judul Utama H1",
        "",
        "Paragraf pembuka.",
        "",
        "## Bagian Pertama",
        "",
        "### Subbagian 1.1",
        "",
        "#### Detail Mendalam H4",
        "",
        "##### Level H5",
        "",
        "###### Level H6",
        "",
        "## Bagian Kedua",
        "",
        "### Subbagian 2.1",
      ].join("\n");

      const { html, headings } = await parseMarkdownWithToc(md);

      expect(headings).toEqual([
        { id: "bagian-pertama", text: "Bagian Pertama", level: 2 },
        { id: "subbagian-11", text: "Subbagian 1.1", level: 3 },
        { id: "bagian-kedua", text: "Bagian Kedua", level: 2 },
        { id: "subbagian-21", text: "Subbagian 2.1", level: 3 },
      ]);

      expect(html).toContain('<h2 id="bagian-pertama">Bagian Pertama</h2>');
      expect(html).toContain('<h3 id="subbagian-11">Subbagian 1.1</h3>');
      expect(html).toContain('<h2 id="bagian-kedua">Bagian Kedua</h2>');
      expect(html).toContain('<h3 id="subbagian-21">Subbagian 2.1</h3>');
      expect(html).toContain("<h1>Judul Utama H1</h1>");
      expect(html).toContain("<h4>Detail Mendalam H4</h4>");
    });

    it("should ignore headings inside fenced code blocks and raw <pre> blocks", async () => {
      const md = [
        "## Bagian Valid",
        "",
        "```markdown",
        "## Heading Palsu di Code Block",
        "### Subheading Palsu",
        "```",
        "",
        "<pre><h2>Raw HTML inside pre</h2></pre>",
        "",
        "### Subbagian Valid",
      ].join("\n");

      const { headings } = await parseMarkdownWithToc(md);

      expect(headings).toEqual([
        { id: "bagian-valid", text: "Bagian Valid", level: 2 },
        { id: "subbagian-valid", text: "Subbagian Valid", level: 3 },
      ]);
    });

    it("should strip inline HTML tags and decode entities in TOC text", async () => {
      const md =
        "## Menggunakan `IntersectionObserver` & **React** *Hooks*\n\n### Tips & Trik > Dasar";

      const { html, headings } = await parseMarkdownWithToc(md);

      expect(headings).toEqual([
        {
          id: "menggunakan-intersectionobserver-react-hooks",
          text: "Menggunakan IntersectionObserver & React Hooks",
          level: 2,
        },
        {
          id: "tips-trik-dasar",
          text: "Tips & Trik > Dasar",
          level: 3,
        },
      ]);

      expect(html).toContain(
        'id="menggunakan-intersectionobserver-react-hooks"'
      );
      expect(html).toContain('id="tips-trik-dasar"');
    });

    it("should deduplicate identical headings and avoid collisions", async () => {
      const md = [
        "## Ringkasan",
        "",
        "## Ringkasan 2",
        "",
        "## Ringkasan",
        "",
        "### Ringkasan",
      ].join("\n");

      const { html, headings } = await parseMarkdownWithToc(md);

      expect(headings.map((h) => h.id)).toEqual([
        "ringkasan",
        "ringkasan-2",
        "ringkasan-3",
        "ringkasan-4",
      ]);

      expect(html).toContain('<h2 id="ringkasan">Ringkasan</h2>');
      expect(html).toContain('<h2 id="ringkasan-2">Ringkasan 2</h2>');
      expect(html).toContain('<h2 id="ringkasan-3">Ringkasan</h2>');
      expect(html).toContain('<h3 id="ringkasan-4">Ringkasan</h3>');
    });

    it("should handle empty content, empty headings, and symbol-only headings gracefully", async () => {
      expect(await parseMarkdownWithToc("")).toEqual({ html: "", headings: [] });
      expect(extractHeadingsAndInjectIds("")).toEqual({
        html: "",
        headings: [],
      });

      const { html, headings } = extractHeadingsAndInjectIds(
        "<h2>   </h2><h3>???</h3><h2>Valid</h2>"
      );

      expect(headings).toEqual([
        { id: "section-1", text: "???", level: 3 },
        { id: "valid", text: "Valid", level: 2 },
      ]);
      expect(html).toContain('<h3 id="section-1">???</h3>');
      expect(html).toContain('<h2 id="valid">Valid</h2>');
    });

    it("should preserve existing id attributes while deduplicating if needed", () => {
      const { html, headings } = extractHeadingsAndInjectIds(
        '<h2 id="custom-anchor" class="title">Bagian Kustom</h2><h2 id="custom-anchor">Duplikat</h2>'
      );

      expect(headings).toEqual([
        { id: "custom-anchor", text: "Bagian Kustom", level: 2 },
        { id: "custom-anchor-2", text: "Duplikat", level: 2 },
      ]);
      expect(html).toContain('<h2 id="custom-anchor" class="title">Bagian Kustom</h2>');
      expect(html).toContain('<h2 id="custom-anchor-2">Duplikat</h2>');
    });

    it("should leave existing parseMarkdownToHtml output unchanged for backward compatibility", async () => {
      const raw = await parseMarkdownToHtml("## Ringkasan Inovasi\n\n### Judul H3");
      expect(raw).toContain("<h2>Ringkasan Inovasi</h2>");
      expect(raw).toContain("<h3>Judul H3</h3>");
    });
  });

  describe("TableOfContents SSR Markup", () => {
    it("should render nothing when headings list is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(TableOfContents, { headings: [] })
      );
      expect(html).toBe("");
    });

    it("should render H2 and H3 anchor links, hierarchy, and responsive controls", () => {
      const headings = [
        { id: "pendahuluan", text: "Pendahuluan", level: 2 as const },
        { id: "detail-teknis", text: "Detail Teknis", level: 3 as const },
        { id: "kesimpulan", text: "Kesimpulan", level: 2 as const },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TableOfContents, { headings })
      );

      expect(html).toContain("Daftar Isi");
      expect(html).toContain('href="#pendahuluan"');
      expect(html).toContain('href="#detail-teknis"');
      expect(html).toContain('href="#kesimpulan"');
      expect(html).toContain('data-heading-level="2"');
      expect(html).toContain('data-heading-level="3"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-current="location"');
      // Collapsed on mobile (hidden) while always shown on desktop (lg:block)
      expect(html).toContain("hidden lg:block");
      // H3 indented further than H2
      expect(html).toContain("pl-6");
      expect(html).toContain("pl-3");
    });

    it("should render expanded mobile drawer when defaultMobileOpen is true", () => {
      const headings = [
        { id: "bagian-1", text: "Bagian 1", level: 2 as const },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TableOfContents, {
          headings,
          defaultMobileOpen: true,
        })
      );

      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain("block mt-3");
    });
  });
});
