import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PostAdminSchema } from "@/lib/validations";
import { calculateReadingTime } from "@/lib/markdown";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await db.post.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, post });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = PostAdminSchema.parse(body);

    // Pastikan artikel yang hendak diperbarui ada
    const existingPost = await db.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    // Periksa konflik slug dengan artikel lain
    const conflictingPost = await db.post.findFirst({
      where: {
        slug: validatedData.slug,
        NOT: { id },
      },
    });

    if (conflictingPost) {
      return NextResponse.json(
        { success: false, error: "Slug sudah digunakan oleh artikel lain" },
        { status: 409 }
      );
    }

    const readingTime = calculateReadingTime(validatedData.content);

    // Sinkronisasi tag dan perbarui artikel dalam transaksi
    const updatedPost = await db.$transaction(async (tx) => {
      // Hapus relasi tag lama
      await tx.postTag.deleteMany({
        where: { postId: id },
      });

      // Perbarui post dan pasang relasi tag baru
      return tx.post.update({
        where: { id },
        data: {
          title: validatedData.title,
          slug: validatedData.slug,
          excerpt: validatedData.excerpt,
          content: validatedData.content,
          coverImage: validatedData.coverImage || null,
          published: validatedData.published,
          readingTime,
          tags: {
            create: validatedData.tags.map((tagName) => {
              const cleanSlug = tagName.toLowerCase().replace(/[^\w-]/g, "") || tagName.toLowerCase();
              return {
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: {
                      name: tagName,
                      slug: cleanSlug,
                    },
                  },
                },
              };
            }),
          },
        },
        include: {
          tags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
      });
    });

    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Validasi data artikel gagal" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal memperbarui artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingPost = await db.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.post.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
