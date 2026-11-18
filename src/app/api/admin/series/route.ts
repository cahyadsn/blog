import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SeriesSchema } from "@/lib/validations";
import { verifyAdminRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const isAuth = await verifyAdminRequest(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const seriesList = await db.series.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { posts: true },
        },
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            orderInSeries: true,
          },
          orderBy: [
            { orderInSeries: "asc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    return NextResponse.json({ success: true, series: seriesList });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil data seri admin";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAuth = await verifyAdminRequest(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = SeriesSchema.parse(body);

    const existingSeries = await db.series.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingSeries) {
      return NextResponse.json(
        { success: false, error: "Slug sudah digunakan oleh seri lain" },
        { status: 409 }
      );
    }

    const newSeries = await db.series.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        description: validatedData.description || null,
        coverImage: validatedData.coverImage || null,
      },
      include: {
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json({ success: true, series: newSeries }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Validasi data seri gagal" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal membuat seri baru";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
