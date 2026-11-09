import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AdminReplySchema } from "@/lib/validations";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = AdminReplySchema.parse(body);

    const parentComment = await db.comment.findUnique({
      where: { id },
    });

    if (!parentComment) {
      return NextResponse.json(
        { success: false, error: "Komentar induk tidak ditemukan" },
        { status: 404 }
      );
    }

    const reply = await db.comment.create({
      data: {
        postId: parentComment.postId,
        parentId: parentComment.id,
        authorName: validatedData.authorName || "Admin",
        authorEmail: validatedData.authorEmail || "admin@blog.local",
        content: validatedData.content,
        status: "APPROVED",
        isAuthorReply: true,
      },
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

    return NextResponse.json({ success: true, comment: reply }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Validasi balasan gagal" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal mengirim balasan admin";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
