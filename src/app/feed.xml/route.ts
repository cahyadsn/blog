import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Escapes reserved XML characters to ensure standard XML 1.0 validity.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  try {
    const baseUrl = getBaseUrl();

    // 1. Fetch published posts ordered by publishedAt descending
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
      },
    });

    // 2. Compute lastBuildDate (latest published post date or current timestamp if empty)
    const lastBuildDate =
      posts.length > 0 && posts[0].publishedAt
        ? new Date(posts[0].publishedAt).toUTCString()
        : new Date().toUTCString();

    // 3. Generate item tags
    const itemsXml = posts
      .map((post) => {
        const itemUrl = `${baseUrl}/posts/${post.slug}`;
        const pubDate = post.publishedAt
          ? new Date(post.publishedAt).toUTCString()
          : new Date().toUTCString();

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${itemUrl}</link>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${itemUrl}</guid>
    </item>`;
      })
      .join("\n");

    // 4. Construct complete RSS 2.0 XML document
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Antigravity Multi-Agent Blog</title>
    <link>${baseUrl}</link>
    <description>Aplikasi blog modern dengan ekosistem multi-agent mandiri</description>
    <language>id-ID</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml ? `${itemsXml}\n` : ""}  </channel>
</rss>`;

    return new Response(xml.trim(), {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to generate RSS feed:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate RSS feed</error>`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
}
