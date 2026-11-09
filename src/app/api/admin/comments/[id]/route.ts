import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { CommentStatusSchema } from "@/lib/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = CommentStatusSchema.parse(body);

    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    const updatedComment = await db.comment.update({
      where: { id },
      data: { status },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Status komentar tidak valid" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal memperbarui status komentar";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: "Komentar tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.comment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus komentar";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
