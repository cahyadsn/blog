import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug seri diperlukan" },
        { status: 400 }
      );
    }

    const series = await db.series.findUnique({
      where: { slug },
      include: {
        posts: {
          where: { published: true },
          orderBy: [
            { orderInSeries: "asc" },
            { publishedAt: "asc" },
          ],
          include: {
            tags: { include: { tag: true } },
          },
        },
        _count: {
          select: {
            posts: {
              where: { published: true },
            },
          },
        },
      },
    });

    if (!series) {
      return NextResponse.json(
        { success: false, error: "Seri artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, series });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil detail seri artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
