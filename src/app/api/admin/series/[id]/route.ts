import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SeriesSchema } from "@/lib/validations";
import { verifyAdminRequest } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await verifyAdminRequest(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = SeriesSchema.parse(body);

    const existingSeries = await db.series.findUnique({
      where: { id },
    });

    if (!existingSeries) {
      return NextResponse.json(
        { success: false, error: "Seri artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    const conflictingSeries = await db.series.findFirst({
      where: {
        slug: validatedData.slug,
        NOT: { id },
      },
    });

    if (conflictingSeries) {
      return NextResponse.json(
        { success: false, error: "Slug sudah digunakan oleh seri lain" },
        { status: 409 }
      );
    }

    const updatedSeries = await db.series.update({
      where: { id },
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

    return NextResponse.json({ success: true, series: updatedSeries });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Validasi data seri gagal" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal memperbarui seri";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await verifyAdminRequest(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingSeries = await db.series.findUnique({
      where: { id },
    });

    if (!existingSeries) {
      return NextResponse.json(
        { success: false, error: "Seri artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    // Putuskan relasi artikel & hapus seri dalam transaksi (Safe Deletion)
    await db.$transaction([
      db.post.updateMany({
        where: { seriesId: id },
        data: {
          seriesId: null,
          orderInSeries: null,
        },
      }),
      db.series.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Seri artikel berhasil dihapus dan artikel telah dipisahkan",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus seri";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
