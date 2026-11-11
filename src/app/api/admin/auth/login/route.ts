import { NextResponse } from "next/server";
import { validateAdminCredentials, generateSessionToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!validateAdminCredentials(username, password)) {
      return NextResponse.json(
        { success: false, error: "Username atau password salah." },
        { status: 401 }
      );
    }

    const token = await generateSessionToken(username);

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    });

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat login";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
