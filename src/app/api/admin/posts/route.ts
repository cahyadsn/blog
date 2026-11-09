import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { PostAdminSchema } from "@/lib/validations";
import { calculateReadingTime } from "@/lib/markdown";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.toLowerCase() || "all";
    const search = searchParams.get("search")?.trim() || "";

    const posts = await db.post.findMany({
      where: {
        ...(status === "published" ? { published: true } : {}),
        ...(status === "draft" ? { published: false } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { slug: { contains: search } },
                { excerpt: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json({ success: true, posts });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil daftar artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = PostAdminSchema.parse(body);

    // Periksa apakah slug sudah digunakan artikel lain
    const existingPost = await db.post.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingPost) {
      return NextResponse.json(
        { success: false, error: "Slug sudah digunakan oleh artikel lain" },
        { status: 409 }
      );
    }

    const readingTime = calculateReadingTime(validatedData.content);

    const post = await db.post.create({
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

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues[0]?.message || "Validasi data artikel gagal" },
        { status: 400 }
      );
    }
    const errorMsg = err instanceof Error ? err.message : "Gagal membuat artikel baru";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
