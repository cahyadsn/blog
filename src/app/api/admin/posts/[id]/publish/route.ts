import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const PublishToggleSchema = z.object({
  published: z.boolean({
    error: (issue) =>
      issue.input === undefined
        ? "Status publikasi diperlukan"
        : "Status publikasi harus bernilai boolean",
  }),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { published } = PublishToggleSchema.parse(body);

    const existingPost = await db.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    const updatedPost = await db.post.update({
      where: { id },
      data: { published },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Payload publikasi tidak valid" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal mengubah status publikasi";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
