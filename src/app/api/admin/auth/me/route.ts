import { NextResponse } from "next/server";
import { isAuthenticatedAdmin } from "@/lib/auth";

export async function GET() {
  const isAuth = await isAuthenticatedAdmin();
  return NextResponse.json({ authenticated: isAuth });
}
