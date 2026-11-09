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
  coverImage: z.string().url().optional().nullable(),
  tags: z.array(z.string()).default([]),
});

export type CommentInput = z.infer<typeof CommentSchema>;
export type PostCreateInput = z.infer<typeof PostCreateSchema>;
