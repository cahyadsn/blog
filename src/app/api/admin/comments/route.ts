import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status")?.toUpperCase() || "ALL";

    const validStatuses = ["PENDING", "APPROVED", "SPAM"] as const;
    const shouldFilterStatus = validStatuses.includes(statusParam as (typeof validStatuses)[number]);

    const comments = await db.comment.findMany({
      where: shouldFilterStatus ? { status: statusParam } : {},
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        parent: {
          select: {
            id: true,
            authorName: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, comments });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil daftar komentar";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
