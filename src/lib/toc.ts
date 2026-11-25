import { parseMarkdownToHtml } from "@/lib/markdown";

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ParsedMarkdownWithToc {
  html: string;
  headings: TocHeading[];
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  nbsp: " ",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|#39|nbsp);/g,
    (full, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower in HTML_ENTITY_MAP) {
        return HTML_ENTITY_MAP[lower];
      }
      if (lower.startsWith("#x")) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isNaN(code) ? full : String.fromCodePoint(code);
      }
      if (lower.startsWith("#")) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isNaN(code) ? full : String.fromCodePoint(code);
      }
      return full;
    }
  );
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Generates a URL- and anchor-friendly slug from heading text.
 */
export function slugifyHeading(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts only H2 and H3 headings from rendered HTML, ensures each has a unique
 * `id` attribute for anchor links & ScrollSpy, and returns the updated HTML + headings.
 * Ignores any heading-like markup inside `<pre>...</pre>` code blocks.
 */
export function extractHeadingsAndInjectIds(
  html: string
): ParsedMarkdownWithToc {
  if (!html) {
    return { html: "", headings: [] };
  }

  // Protect <pre>...</pre> blocks so raw HTML inside code blocks is never treated as headings
  const preBlocks: string[] = [];
  const placeholderPrefix = "\u0000PRE_BLOCK_";
  const htmlWithoutPre = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const idx = preBlocks.length;
    preBlocks.push(match);
    return `${placeholderPrefix}${idx}\u0000`;
  });

  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const updatedHtmlWithoutPre = htmlWithoutPre.replace(
    /<(h[23])(\b[^>]*)>([\s\S]*?)<\/\1>/gi,
    (fullMatch, rawTag: string, rawAttrs: string, innerHtml: string) => {
      const level: 2 | 3 = rawTag.toLowerCase() === "h2" ? 2 : 3;
      const plainText = decodeHtmlEntities(stripHtmlTags(innerHtml))
        .replace(/\s+/g, " ")
        .trim();

      if (!plainText) {
        return fullMatch;
      }

      const existingIdMatch = rawAttrs.match(
        /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
      );
      const existingId = (
        existingIdMatch?.[1] ||
        existingIdMatch?.[2] ||
        existingIdMatch?.[3] ||
        ""
      ).trim();

      let baseId = existingId || slugifyHeading(plainText);
      if (!baseId) {
        baseId = `section-${headings.length + 1}`;
      }

      let uniqueId = baseId;
      let suffix = 2;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(uniqueId);

      headings.push({
        id: uniqueId,
        text: plainText,
        level,
      });

      const escapedId = escapeHtmlAttr(uniqueId);
      let nextAttrs = rawAttrs;
      if (existingIdMatch) {
        nextAttrs = rawAttrs.replace(
          /\bid\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
          `id="${escapedId}"`
        );
      } else {
        nextAttrs = ` id="${escapedId}"${rawAttrs}`;
      }

      return `<${rawTag.toLowerCase()}${nextAttrs}>${innerHtml}</${rawTag.toLowerCase()}>`;
    }
  );

  // Restore <pre>...</pre> blocks
  const finalHtml = updatedHtmlWithoutPre.replace(
    /\u0000PRE_BLOCK_(\d+)\u0000/g,
    (_, indexStr: string) => preBlocks[Number.parseInt(indexStr, 10)] ?? ""
  );

  return {
    html: finalHtml,
    headings,
  };
}

/**
 * Parses Markdown into HTML and extracts H2/H3 Table of Contents metadata
 * with matching injected heading IDs.
 */
export async function parseMarkdownWithToc(
  markdownContent: string
): Promise<ParsedMarkdownWithToc> {
  if (!markdownContent) {
    return { html: "", headings: [] };
  }

  const rawHtml = await parseMarkdownToHtml(markdownContent);
  return extractHeadingsAndInjectIds(rawHtml);
}
