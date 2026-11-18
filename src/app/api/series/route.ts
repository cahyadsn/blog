import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const seriesList = await db.series.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            posts: {
              where: { published: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, series: seriesList });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil daftar seri artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
