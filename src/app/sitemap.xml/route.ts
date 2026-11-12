import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Escapes characters that are reserved in XML.
 */
function escapeXml(unsafe: string): string {
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

    // Query all published posts from Prisma SQLite
    const posts = await db.post.findMany({
      where: { published: true },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Homepage lastmod derives from the most recently updated post, or current time
    const homepageLastMod =
      posts.length > 0 && posts[0].updatedAt
        ? new Date(posts[0].updatedAt).toISOString()
        : new Date().toISOString();

    const postUrlsXml = posts
      .map((post) => {
        const postUrl = `${baseUrl}/posts/${post.slug}`;
        const lastMod = new Date(post.updatedAt).toISOString();
        return `  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(baseUrl)}</loc>
    <lastmod>${homepageLastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${postUrlsXml ? postUrlsXml + "\n" : ""}</urlset>`.trim();

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[Sitemap Route Handler Error]:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      {
        status: 500,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
}
