import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  UPLOAD_DIR,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  validateImageBuffer,
  generateUniqueFilename,
  ensureUploadDir,
} from "@/lib/media";
import { ADMIN_COOKIE_NAME, verifySessionToken, isAuthenticatedAdmin } from "@/lib/auth";

/**
 * Verifikasi sesi admin secara defensif (defense-in-depth).
 * Memeriksa melalui isAuthenticatedAdmin() (next/headers) dan fallback ke header Cookie request.
 */
async function verifyAdmin(req: Request): Promise<boolean> {
  try {
    const isAuth = await isAuthenticatedAdmin();
    if (isAuth) return true;
  } catch {
    // Menangani pemanggilan di luar request context Next.js (misal unit test)
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

export async function POST(req: Request): Promise<Response> {
  try {
    // 1. Pemeriksaan autentikasi sesi admin
    const isAuth = await verifyAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Autentikasi admin diperlukan." },
        { status: 401 }
      );
    }

    // 2. Parsing multipart/form-data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format request tidak valid, multipart/form-data diperlukan" },
        { status: 400 }
      );
    }

    // 3. Ekstraksi berkas dari form data
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Berkas gambar tidak ditemukan" },
        { status: 400 }
      );
    }

    // 4. Validasi berkas kosong (0 bytes)
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "Berkas gambar tidak boleh kosong" },
        { status: 400 }
      );
    }

    // 5. Validasi ukuran maksimum berkas (5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas 5MB" },
        { status: 400 }
      );
    }

    // 6. Validasi tipe MIME terhadap whitelist yang diizinkan
    const fileType = file.type;
    if (!fileType || !(ALLOWED_MIME_TYPES as readonly string[]).includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipe berkas tidak diizinkan. Hanya PNG, JPEG, WebP, GIF, dan SVG yang didukung.",
        },
        { status: 400 }
      );
    }

    // 7. Konversi file ke buffer dan validasi magic bytes / inspeksi keamanan SVG
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateImageBuffer(buffer, fileType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "Isi berkas tidak cocok dengan format gambar yang valid",
        },
        { status: 400 }
      );
    }

    // 8. Pembuatan nama berkas unik dan aman dari path traversal
    const originalName = file instanceof File && file.name ? file.name : "image.png";
    const uniqueFilename = generateUniqueFilename(originalName);

    // 9. Pastikan direktori penyimpanan tersedia secara rekursif
    await ensureUploadDir();

    // 10. Tulis berkas ke disk
    const targetPath = path.join(UPLOAD_DIR, uniqueFilename);
    await fs.writeFile(targetPath, buffer);

    // 11. Susun metadata dan kirim respon 201 Created
    const publicUrl = `/uploads/${uniqueFilename}`;
    const mediaItem = {
      name: uniqueFilename,
      url: publicUrl,
      size: file.size,
      type: fileType,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        url: publicUrl,
        media: mediaItem,
        file: mediaItem,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Gagal menyimpan berkas";
    return NextResponse.json(
      { success: false, error: errorMsg || "Gagal menyimpan berkas" },
      { status: 500 }
    );
  }
}
