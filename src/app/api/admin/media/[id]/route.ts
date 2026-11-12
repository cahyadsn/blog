import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  getSafeFilePath,
  getMimeTypeFromExtension,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, verifySessionToken, isAuthenticatedAdmin } from "@/lib/auth";

async function verifyAdmin(req: Request): Promise<boolean> {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (isAuth) return true;
  } catch {
    // Menangani pemanggilan di luar request context
  }

  try {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        return await verifySessionToken(decodeURIComponent(match[1]));
      }
    }
  } catch {
    // Abaikan error parsing cookie
  }

  return false;
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // 1. Verifikasi autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Next.js 15/16 async params handling
    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter ID berkas tidak valid" },
        { status: 400 }
      );
    }

    const rawFilename = decodeURIComponent(id);

    // 3. Pertahanan Path Traversal & Validasi Keamanan Nama Berkas
    const safeFile = getSafeFilePath(rawFilename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    // Larang penghapusan berkas sistem seperti .gitkeep
    if (safeFile.safeName === ".gitkeep" || safeFile.safeName.startsWith(".")) {
      return NextResponse.json(
        { success: false, error: "Berkas sistem tidak boleh dihapus" },
        { status: 400 }
      );
    }

    // 4. Pemeriksaan keberadaan berkas (File existence check)
    try {
      await fs.access(safeFile.safePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }

    // 5. Hapus berkas dari disk
    await fs.unlink(safeFile.safePath);

    // 6. Respon sukses 200 OK
    return NextResponse.json({
      success: true,
      message: "Berkas berhasil dihapus",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menghapus berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal menghapus berkas" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const rawFilename = decodeURIComponent(id);

    const safeFile = getSafeFilePath(rawFilename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    try {
      const stats = await fs.stat(safeFile.safePath);
      const ext = path.extname(safeFile.safeName).toLowerCase();
      const mimeType = getMimeTypeFromExtension(ext);

      return NextResponse.json({
        success: true,
        media: {
          name: safeFile.safeName,
          url: `/uploads/${safeFile.safeName}`,
          size: stats.size,
          type: mimeType,
          createdAt: stats.mtime.toISOString(),
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil data berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal mengambil data berkas" },
      { status: 500 }
    );
  }
}
