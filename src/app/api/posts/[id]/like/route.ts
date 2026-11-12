import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

/**
 * GET /api/posts/[id]/like
 * Retrieves the current like count for a post by CUID or slug.
 */
export async function GET(_req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier artikel diperlukan" },
        { status: 400 }
      );
    }

    const post = await db.post.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: { id: true, slug: true, likes: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, likes: post.likes },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil data suka artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/posts/[id]/like
 * Atomically increments the like count for a post by CUID or slug.
 * Rate-limited to 10 requests per 10 seconds per client IP.
 */
export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`like:${clientIp}`, 10, 10000);

    if (!rateLimit.success) {
      const retryAfter = rateLimit.retryAfter ?? 10;
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan suka. Silakan coba lagi beberapa saat.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const { id: rawId } = await params;
    const identifier = rawId?.trim();

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier artikel diperlukan" },
        { status: 400 }
      );
    }

    // Find the target post by ID or slug
    const post = await db.post.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: { id: true, slug: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse optional batch increment amount from body (defaults to 1, max 20)
    let incrementAmount = 1;
    try {
      const body = await req.json();
      if (typeof body?.amount === "number" && body.amount > 0 && body.amount <= 20) {
        incrementAmount = Math.floor(body.amount);
      }
    } catch {
      // Body is empty or not JSON, fallback to 1
      incrementAmount = 1;
    }

    // Atomic increment
    const updatedPost = await db.post.update({
      where: { id: post.id },
      data: {
        likes: { increment: incrementAmount },
      },
      select: { likes: true },
    });

    return NextResponse.json(
      { success: true, likes: updatedPost.likes },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menambahkan suka pada artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
