import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SubscriberSchema } from "@/lib/validations";

export async function POST(req: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload request harus berupa format JSON yang valid" },
        { status: 400 }
      );
    }

    const parseResult = SubscriberSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Format email tidak valid";
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const email = parseResult.data.email.toLowerCase().trim();

    // Check if email already exists in subscribers table
    const existingSubscriber = await db.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      // If already active -> Idempotent 200 response
      if (existingSubscriber.active) {
        return NextResponse.json(
          {
            success: true,
            message: "Email Anda sudah terdaftar dalam newsletter kami.",
            alreadySubscribed: true,
            subscriber: existingSubscriber,
          },
          { status: 200 }
        );
      }

      // If previously inactive -> Reactivate subscription
      const reactivatedSubscriber = await db.subscriber.update({
        where: { email },
        data: { active: true },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Langganan newsletter Anda telah diaktifkan kembali!",
          reactivated: true,
          subscriber: reactivatedSubscriber,
        },
        { status: 200 }
      );
    }

    // Create new subscriber
    const newSubscriber = await db.subscriber.create({
      data: {
        email,
        active: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Terima kasih telah berlangganan newsletter kami!",
        subscriber: newSubscriber,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    // Handle Prisma unique constraint race conditions (code P2002)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: true,
          message: "Email Anda sudah terdaftar dalam newsletter kami.",
          alreadySubscribed: true,
        },
        { status: 200 }
      );
    }

    const errorMsg =
      err instanceof Error ? err.message : "Terjadi kesalahan pada server saat memproses langganan";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
