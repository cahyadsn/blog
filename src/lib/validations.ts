import { z } from "zod";

export const CommentSchema = z.object({
  postId: z.string().min(1, "Post ID diperlukan"),
  authorName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(60, "Nama maksimal 60 karakter"),
  authorEmail: z
    .string()
    .trim()
    .email("Alamat email tidak valid")
    .max(100, "Email terlalu panjang"),
  content: z
    .string()
    .trim()
    .min(3, "Komentar minimal 3 karakter")
    .max(2000, "Komentar maksimal 2000 karakter")
    .refine((val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), {
      message: "Konten komentar mengandung tag terlarang (XSS)",
    }),
  parentId: z.string().optional().nullable(),
});

export const PostCreateSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter").max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip"),
  excerpt: z.string().trim().min(10).max(300),
  content: z.string().trim().min(50, "Konten artikel minimal 50 karakter"),
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
      { message: "URL gambar tidak valid" }
    )
    .optional()
    .nullable(),
  tags: z.array(z.string()).default([]),
});

export type CommentInput = z.infer<typeof CommentSchema>;
export type PostCreateInput = z.infer<typeof PostCreateSchema>;

export const PostAdminSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter").max(200, "Judul maksimal 200 karakter"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug minimal 3 karakter")
    .max(120, "Slug maksimal 120 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip"),
  excerpt: z.string().trim().min(10, "Ringkasan minimal 10 karakter").max(300, "Ringkasan maksimal 300 karakter"),
  content: z.string().trim().min(20, "Konten artikel minimal 20 karakter"),
  coverImage: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith("/uploads/") || /^https?:\/\//i.test(val),
      { message: "URL gambar tidak valid" }
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  published: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const CommentStatusSchema = z.object({
  status: z.enum(["APPROVED", "PENDING", "SPAM"]),
});

export const AdminReplySchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Balasan minimal 2 karakter")
    .max(2000, "Balasan maksimal 2000 karakter")
    .refine((val) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(val), {
      message: "Konten balasan mengandung tag terlarang (XSS)",
    }),
  authorName: z.string().trim().min(1).optional().default("Admin"),
  authorEmail: z.string().trim().email("Alamat email tidak valid").optional().default("admin@blog.local"),
});

export type PostAdminInput = z.infer<typeof PostAdminSchema>;
export type CommentStatusInput = z.infer<typeof CommentStatusSchema>;
export type AdminReplyInput = z.infer<typeof AdminReplySchema>;

export const SubscriberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Alamat email wajib diisi")
    .email("Format alamat email tidak valid")
    .max(100, "Alamat email terlalu panjang, maksimal 100 karakter")
    .transform((val) => val.toLowerCase()),
});

export type SubscriberInput = z.infer<typeof SubscriberSchema>;


