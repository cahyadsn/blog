import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.toLowerCase() || "all";
    const search = searchParams.get("search")?.trim() || "";

    const whereClause: {
      active?: boolean;
      email?: { contains: string };
    } = {};

    if (status === "active") {
      whereClause.active = true;
    } else if (status === "inactive") {
      whereClause.active = false;
    }

    if (search) {
      whereClause.email = { contains: search };
    }

    const subscribers = await db.subscriber.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    let totalCount = subscribers.length;
    let activeCount = subscribers.filter((s) => s.active).length;

    if (typeof db.subscriber.count === "function") {
      try {
        const [dbTotal, dbActive] = await Promise.all([
          db.subscriber.count(),
          db.subscriber.count({ where: { active: true } }),
        ]);
        if (typeof dbTotal === "number") totalCount = dbTotal;
        if (typeof dbActive === "number") activeCount = dbActive;
      } catch {
        // Fallback to array length
      }
    }

    return NextResponse.json({
      success: true,
      subscribers,
      totalCount,
      activeCount,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gagal mengambil daftar pelanggan newsletter";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
