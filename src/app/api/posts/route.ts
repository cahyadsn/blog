import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PostCreateSchema } from "@/lib/validations";
import { calculateReadingTime } from "@/lib/markdown";

export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
      },
    });
    return NextResponse.json({ success: true, posts });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = PostCreateSchema.parse(body);
    const readingTime = calculateReadingTime(validatedData.content);

    const post = await db.post.create({
      data: {
        title: validatedData.title,
        slug: validatedData.slug,
        excerpt: validatedData.excerpt,
        content: validatedData.content,
        coverImage: validatedData.coverImage,
        readingTime,
        tags: {
          create: validatedData.tags.map((tagName) => {
            const cleanSlug = tagName.toLowerCase().replace(/[^\w-]/g, "");
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
      },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal membuat artikel";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
