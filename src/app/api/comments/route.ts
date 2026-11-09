import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CommentSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = CommentSchema.parse(body);

    // Heuristik sederhana pendeteksi spam dasar
    const spamKeywords = ["casino", "slot", "viagra", "crypto giveaway", "free money", "http://spam"];
    const isSpam = spamKeywords.some((keyword) =>
      validatedData.content.toLowerCase().includes(keyword)
    );

    const comment = await db.comment.create({
      data: {
        postId: validatedData.postId,
        authorName: validatedData.authorName,
        authorEmail: validatedData.authorEmail,
        content: validatedData.content,
        parentId: validatedData.parentId || null,
        status: isSpam ? "SPAM" : "APPROVED",
        isAuthorReply: false,
      },
    });

    if (isSpam) {
      return NextResponse.json(
        { success: false, error: "Komentar terdeteksi sebagai spam dan diblokir." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal memproses komentar";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
