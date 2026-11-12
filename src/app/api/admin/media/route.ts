import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS,
  getMimeTypeFromExtension,
  getSafeFilePath,
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

export async function GET(req: Request): Promise<Response> {
  try {
    // 1. Verifikasi autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Periksa keberadaan direktori upload secara anggun (graceful)
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      // Jika direktori belum ada, kembalikan array kosong dengan status 200 (bukan error 500)
      return NextResponse.json({
        success: true,
        media: [],
      });
    }

    // 3. Baca entri berkas dalam direktori
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });

    // 4. Filter berkas: abaikan folder, berkas tersembunyi (.gitkeep, dsb), dan ekstensi tidak diizinkan
    const fileEntries = entries.filter((entry) => {
      if (!entry.isFile()) return false;
      if (entry.name.startsWith(".")) return false;
      const ext = path.extname(entry.name).toLowerCase();
      return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
    });

    // 5. Ambil metadata setiap berkas (ukuran, tanggal pembuatan/modifikasi, MIME type)
    const mediaList = await Promise.all(
      fileEntries.map(async (entry) => {
        const filePath = path.join(UPLOAD_DIR, entry.name);
        const stats = await fs.stat(filePath);
        const ext = path.extname(entry.name).toLowerCase();
        const mimeType = getMimeTypeFromExtension(ext);

        return {
          name: entry.name,
          url: `/uploads/${entry.name}`,
          size: stats.size,
          type: mimeType,
          createdAt: stats.mtime.toISOString(),
        };
      })
    );

    // 6. Urutkan berdasarkan tanggal terbaru terlebih dahulu (newest first)
    mediaList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      media: mediaList,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengambil daftar media";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal mengambil daftar media" },
      { status: 500 }
    );
  }
}

/**
 * Dukungan DELETE alternatif melalui query parameter (?filename=... atau ?id=...) sesuai spesifikasi R2
 */
export async function DELETE(req: Request): Promise<Response> {
  try {
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || searchParams.get("id");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Parameter nama berkas diperlukan" },
        { status: 400 }
      );
    }

    const safeFile = getSafeFilePath(filename);
    if (!safeFile) {
      return NextResponse.json(
        { success: false, error: "Nama berkas tidak valid" },
        { status: 400 }
      );
    }

    if (safeFile.safeName === ".gitkeep" || safeFile.safeName.startsWith(".")) {
      return NextResponse.json(
        { success: false, error: "Berkas sistem tidak boleh dihapus" },
        { status: 400 }
      );
    }

    try {
      await fs.access(safeFile.safePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "Berkas tidak ditemukan" },
        { status: 404 }
      );
    }

    await fs.unlink(safeFile.safePath);

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
