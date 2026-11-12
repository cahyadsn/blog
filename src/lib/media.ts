import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import crypto from "crypto";

/**
 * Daftar MIME type gambar yang diizinkan untuk diunggah.
 */
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Ekstensi berkas gambar yang diizinkan.
 */
export const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

/**
 * Batas ukuran berkas maksimum: 5MB (5 * 1024 * 1024 bytes = 5,242,880 bytes).
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

/**
 * Lokasi penyimpanan lokal berkas media di folder public/uploads.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Memastikan direktori public/uploads sudah ada.
 * Dibuat secara rekursif jika belum tersedia (Async).
 */
export async function ensureUploadDir(): Promise<string> {
  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

/**
 * Memastikan direktori public/uploads sudah ada (Sync).
 */
export function ensureUploadDirSync(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

/**
 * Format ukuran berkas ke representasi yang mudah dibaca (B, KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  if (i === 0) return `${bytes} B`;
  const size = bytes / Math.pow(1024, i);
  const formatted = size % 1 === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[i]}`;
}

/**
 * Mendapatkan tipe MIME berdasarkan ekstensi berkas.
 */
export function getMimeTypeFromExtension(ext: string): string {
  const normalized = ext.toLowerCase().trim();
  switch (normalized) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

/**
 * Validasi awal terhadap metadata berkas unggahan (ukuran & MIME type).
 */
export function validateUploadFile(file: { size: number; type: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "Berkas gambar tidak ditemukan" };
  }

  if (file.size === 0) {
    return { valid: false, error: "Berkas gambar tidak boleh kosong" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Ukuran berkas melebihi batas 5MB" };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: `Tipe berkas ${file.type || "tidak diketahui"} tidak diizinkan. Hanya format PNG, JPEG, WebP, GIF, dan SVG yang didukung.`,
    };
  }

  return { valid: true };
}

/**
 * Validasi buffer gambar berdasarkan magic bytes biner dan inspeksi konten XML SVG.
 */
export function validateImageBuffer(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Berkas gambar tidak boleh kosong" };
  }

  // 1. PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    if (!isPng) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format PNG (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 2. JPEG Magic Bytes: FF D8 FF
  if (mimeType === "image/jpeg") {
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    if (!isJpeg) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format JPEG (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 3. GIF Magic Bytes: 47 49 46 38 ("GIF8")
  if (mimeType === "image/gif") {
    const isGif =
      buffer.length >= 4 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38;

    if (!isGif) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format GIF (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 4. WebP: RIFF Container dengan sub-header WEBP
  // Offset 0-3: 'RIFF' (0x52 0x49 0x46 0x46)
  // Offset 8-11: 'WEBP' (0x57 0x45 0x42 0x50)
  if (mimeType === "image/webp") {
    const isWebP =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isWebP) {
      return {
        valid: false,
        error: "Isi berkas tidak cocok dengan format WebP (magic bytes tidak valid)",
      };
    }
    return { valid: true };
  }

  // 5. SVG: Inspeksi teks XML, memastikan keberadaan tag <svg dan memblokir XSS vectors
  if (mimeType === "image/svg+xml") {
    const text = buffer.toString("utf-8");

    if (!/<svg\b/i.test(text)) {
      return {
        valid: false,
        error: "Isi berkas tidak valid sebagai format SVG (elemen <svg> tidak ditemukan)",
      };
    }

    // Blokir skrip dan event handler terlarang (XSS prevention)
    if (/<\s*script\b/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung tag <script> terlarang (XSS)",
      };
    }

    if (/javascript\s*:/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung URI javascript: terlarang (XSS)",
      };
    }

    if (/onload\s*=/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung atribut event onload= terlarang (XSS)",
      };
    }

    if (/onerror\s*=/i.test(text)) {
      return {
        valid: false,
        error: "Berkas SVG ditolak: mengandung atribut event onerror= terlarang (XSS)",
      };
    }

    return { valid: true };
  }

  return {
    valid: false,
    error: "Tipe MIME tidak didukung untuk validasi gambar",
  };
}

/**
 * Membersihkan nama berkas dari karakter berbahaya, null bytes, dan path traversal.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== "string") {
    return "media";
  }

  // Hapus null byte dan spasi berlebih
  const clean = originalName.replace(/\0/g, "").trim();

  // Ambil hanya nama berkas tanpa direktori
  const base = path.basename(clean);

  // Pisahkan ekstensi dan nama dasar
  const ext = path.extname(base).toLowerCase();
  const nameWithoutExt = path.basename(base, ext);

  // Ubah nama menjadi slug aman (hanya a-z, 0-9, -, _)
  const slug = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Bersihkan ekstensi dari karakter ilegal
  const cleanExt = ext.replace(/[^a-z0-9.]/g, "").toLowerCase();

  const safeSlug = slug || "media";
  return `${safeSlug}${cleanExt}`;
}

/**
 * Menghasilkan nama berkas unik untuk mencegah tabrakan nama berkas di disk:
 * Format: {timestamp}-{randomHex}-{sanitizedName}.{ext}
 */
export function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString("hex");

  return `${timestamp}-${randomHex}-${base}${ext}`;
}

/**
 * Validasi dan resolusi path berkas secara defensif terhadap path traversal.
 * Memastikan berkas strictly berada di dalam direktori UPLOAD_DIR.
 * Mengembalikan null jika ada indikasi manipulasi direktori traversal.
 */
export function getSafeFilePath(
  filename: string
): { safePath: string; safeName: string } | null {
  if (!filename || typeof filename !== "string") {
    return null;
  }

  // 1. Tolak jika mengandung null bytes
  if (filename.includes("\0")) {
    return null;
  }

  // 2. Decode URL jika ada karakter encoded traversal
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    return null;
  }

  // 3. Tolak jika terdapat token traversal direktori eksplisit
  if (
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    return null;
  }

  // 4. Ambil basename murni
  const safeName = path.basename(decoded);
  if (!safeName || safeName === "." || safeName === "..") {
    return null;
  }

  // 5. Resolusi path absolut dan periksa pembatasan direktori (containment check)
  const resolvedPath = path.resolve(UPLOAD_DIR, safeName);
  const normalizedUploadDir = path.resolve(UPLOAD_DIR);
  const relative = path.relative(normalizedUploadDir, resolvedPath);

  // Jika hasil relative keluar dari direktori atau absolut, tolak
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    return null;
  }

  // Pastikan path dirname persis sama dengan normalizedUploadDir
  if (path.dirname(resolvedPath) !== normalizedUploadDir) {
    return null;
  }

  return {
    safePath: resolvedPath,
    safeName,
  };
}

/**
 * Menghasilkan URL publik untuk berkas media (selalu berformat forward slash).
 */
export function getPublicMediaUrl(filename: string): string {
  return `/uploads/${filename}`;
}
