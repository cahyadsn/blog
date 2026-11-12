/**
 * Resolves the canonical base site URL for sitemaps, RSS feeds, robots, and metadata.
 * 
 * Resolution order:
 * 1. process.env.NEXT_PUBLIC_SITE_URL
 * 2. process.env.SITE_URL
 * 3. Fallback: "http://localhost:3000"
 * 
 * Guarantees:
 * - Trims whitespace
 * - Strips any trailing slashes (e.g., "https://example.com///" -> "https://example.com")
 * - Safe fallback if environment variable is empty or blank
 */
export function getBaseUrl(): string {
  const envUrl =
    (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
    (process.env.SITE_URL && process.env.SITE_URL.trim()) ||
    "http://localhost:3000";

  return envUrl.replace(/\/+$/, "");
}

/**
 * Constructs an absolute canonical URL given a relative pathname.
 * Automatically sanitizes leading slashes to prevent double slashes.
 * 
 * Example:
 * getAbsoluteUrl("/posts/my-post") -> "http://localhost:3000/posts/my-post"
 * getAbsoluteUrl("sitemap.xml")     -> "http://localhost:3000/sitemap.xml"
 */
export function getAbsoluteUrl(path: string = ""): string {
  const base = getBaseUrl();
  if (!path) return base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
