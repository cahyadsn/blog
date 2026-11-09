# Handoff Report: Backend & Data Model Architecture Survey

**Explorer**: Explorer 2 (Backend & Data Model Architecture Explorer)  
**Date**: 2026-11-09T03:10:00Z  
**Working Directory**: `d:\c\blog\.agents\teamwork\explorer_survey_2\`  
**Target Scope**: Backend architecture, Prisma schema, SQLite database, existing API routes, comment moderation, agent CLI tools, and Admin CMS backend requirements.

---

## 1. Observation

### 1.1 Database Configuration & Prisma Schema
- **Datasource & Database File**: `prisma/schema.prisma` lines 1–4 specifies provider `sqlite` with `DATABASE_URL=env("DATABASE_URL")`. File `.env` line 1 defines `DATABASE_URL="file:./dev.db"`. The SQLite database exists at `d:\c\blog\prisma\dev.db` (size: 73,728 bytes).
- **Generator**: `prisma-client-js` using Prisma client `^6.4.1` (`package.json` line 17).
- **Models (`prisma/schema.prisma`)**:
  - **`Post`** (lines 10–28):
    ```prisma
    model Post {
      id          String    @id @default(cuid())
      title       String
      slug        String    @unique
      excerpt     String
      content     String
      coverImage  String?
      published   Boolean   @default(true)
      readingTime Int       @default(3)
      publishedAt DateTime  @default(now())
      createdAt   DateTime  @default(now())
      updatedAt   DateTime  @updatedAt

      tags        PostTag[]
      comments    Comment[]

      @@index([slug])
      @@index([publishedAt])
    }
    ```
  - **`Tag`** (lines 30–35):
    ```prisma
    model Tag {
      id    String    @id @default(cuid())
      name  String    @unique
      slug  String    @unique
      posts PostTag[]
    }
    ```
  - **`PostTag`** (lines 37–44):
    ```prisma
    model PostTag {
      postId String
      tagId  String
      post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
      tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

      @@id([postId, tagId])
    }
    ```
    *Cascade delete*: Deleting a `Post` will cascade delete all associated `PostTag` entries.
  - **`Comment`** (lines 46–62):
    ```prisma
    model Comment {
      id            String    @id @default(cuid())
      postId        String
      post          Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
      authorName    String
      authorEmail   String
      content       String
      status        String    @default("APPROVED") // APPROVED, PENDING, SPAM
      isAuthorReply Boolean   @default(false)
      parentId      String?
      parent        Comment?  @relation("ThreadReplies", fields: [parentId], references: [id], onDelete: Cascade)
      replies       Comment[] @relation("ThreadReplies")
      createdAt     DateTime  @default(now())

      @@index([postId])
      @@index([status])
    }
    ```
    *Cascade delete*: Deleting a `Post` will cascade delete its `Comment` records. Deleting a parent `Comment` will cascade delete all nested `replies`.
    *Statuses*: SQLite does not support native enums, so `status` is a `String` with default `"APPROVED"`. Valid values in code are `"APPROVED"`, `"PENDING"`, `"SPAM"`.
    *Self-relation*: `parentId` references `id` of `Comment` via relation name `"ThreadReplies"`. `isAuthorReply: true` indicates bot or admin/author replies.

### 1.2 Existing API Endpoints
- **`src/app/api/posts/route.ts`**:
  - `GET`: Returns `{ success: true, posts }`. Line 9: filters strictly by `{ where: { published: true } }`. Drafts (`published: false`) cannot be retrieved via this endpoint.
  - `POST`: Validates payload with `PostCreateSchema.parse(body)` (lines 25–26). Connects or creates `Tag` records using `connectOrCreate` on `PostTag` (lines 36–52). Sets `readingTime = calculateReadingTime(validatedData.content)`.
  - Limitations: No endpoints exist for `GET /api/posts/[id]`, `PUT /api/posts/[id]`, `PATCH /api/posts/[id]`, or `DELETE /api/posts/[id]`.
- **`src/app/api/comments/route.ts`**:
  - `POST`: Validates payload with `CommentSchema.parse(body)` (line 8). Runs spam keyword detection (lines 11–14: `casino`, `slot`, `viagra`, `crypto giveaway`, `free money`, `http://spam`). If spam, sets `status: "SPAM"` and returns status 400. Otherwise creates with `status: "APPROVED"`, `isAuthorReply: false` (line 24) and returns status 201.
  - Limitations: No `GET`, `PATCH` (status change), or `DELETE` endpoints exist.
- **Server Actions**: Currently, there are no server action files (`src/app/actions` does not exist).
- **Admin APIs**: Currently, there are no admin API route files (`src/app/api/admin` does not exist).

### 1.3 Comment Moderation & Public Visibility
- **Public Post Page (`src/app/posts/[slug]/page.tsx` lines 24–36)**:
  ```typescript
  comments: {
    where: {
      status: "APPROVED",
      parentId: null, // top-level comments
    },
    include: {
      replies: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  }
  ```
  Only comments with `status === "APPROVED"` are displayed to public readers. Any comment with status `"PENDING"` or `"SPAM"` is completely suppressed.
- **Client Comment Component (`src/components/blog/CommentSection.tsx` lines 177–181, 218–222)**:
  Renders an `Author Bot` or `Bot` badge when `isAuthorReply: true`.

### 1.4 Agent Scripts & CLI Tools
- **`scripts/daily-content.ts`** (`npm run agent:content`):
  - Reads `content/backlog.json`. Finds first item with `status === "READY"`.
  - Generates Markdown, calculates reading time, creates post with `published: true` via `prisma.post.upsert`.
  - Updates backlog status to `"PUBLISHED"`.
- **`scripts/reply-comments.ts`** (`npm run agent:comments`):
  - Queries `prisma.comment.findMany` where:
    ```typescript
    where: {
      isAuthorReply: false,
      status: "APPROVED",
      replies: {
        none: {
          isAuthorReply: true,
        },
      },
    }
    ```
  - Generates auto-reply with `isAuthorReply: true`, `status: "APPROVED"`, `parentId: comment.id`, `postId: comment.postId`.
- **Interoperability observation**:
  1. The bot agent skips comments if any reply already has `isAuthorReply: true`. Thus, if an admin replies to a reader's comment, the autonomous agent will not generate duplicate replies.
  2. The bot agent only processes `status: "APPROVED"`. Comments marked `SPAM` or left in `PENDING` are never touched by the agent.
  3. Deleting or editing posts in the Admin CMS will not break `backlog.json` or subsequent script executions.

### 1.5 Validation Schemas & Utilities
- **`src/lib/validations.ts`**:
  - `CommentSchema`: validates `postId`, `authorName` (2-60 chars), `authorEmail`, `content` (3-2000 chars, rejects `<script>` XSS), `parentId` (optional/nullable).
  - `PostCreateSchema`: validates `title` (5-200 chars), `slug` (3-120 chars, regex `/^[a-z0-9-]+$/`), `excerpt` (10-300 chars), `content` (min 50 chars), `coverImage` (optional/nullable url), `tags` (string array).
  - Note: `PostCreateSchema` does not include `published?: boolean`.
- **`src/lib/markdown.ts`**:
  - `calculateReadingTime(content: string): number`: 200 words/min, minimum 1 min.
  - `parseMarkdownToHtml(markdownContent: string): Promise<string>`: uses `marked` with `gfm: true, breaks: true`.
  - `generateSlug(title: string): string`: converts title to kebab-case alphanumeric slug.

### 1.6 Build and Test Status
- `npm.cmd test`: Ran Vitest v3.2.7. 2 test files, 9 tests total, all passed in 6.15s.
- `npm.cmd run build`: Compiled Next.js 15.1.7 successfully with static page generation and type checking.

---

## 2. Logic Chain

1. **Requirement R1 & R4**: The system requires an admin dashboard at `/admin` without authentication to manage articles and comments using existing Prisma models.
2. **Post CRUD Gap Analysis**:
   - Reading: The current `GET /api/posts` only returns published posts (`where: { published: true }`). The admin needs to view all posts, filterable by status (`all`, `published`, `draft`) and search terms.
   - Creating: While `POST /api/posts` exists, it does not accept `published: false` (to save as draft) or custom `publishedAt`.
   - Editing & Deleting: No endpoints or actions exist to fetch a single post by ID (`GET /api/admin/posts/[id]`), update an existing post (`PUT` or `PATCH`), toggle publication status (`PATCH`), or delete a post (`DELETE`).
3. **PostTag Relation Update Logic**:
   - In SQLite/Prisma, updating tags on an existing post requires clearing old `PostTag` entries for that post and re-creating new associations with `connectOrCreate` for `Tag`. This should be wrapped in a transaction:
     ```typescript
     await db.$transaction(async (tx) => {
       await tx.postTag.deleteMany({ where: { postId: id } });
       await tx.post.update({
         where: { id },
         data: {
           ...postData,
           tags: {
             create: tagNames.map((name) => ({
               tag: {
                 connectOrCreate: {
                   where: { name },
                   create: { name, slug: generateSlug(name) },
                 },
               },
             })),
           },
         },
       });
     });
     ```
4. **Slug Validation Logic**:
   - Slugs must be unique (`@unique` constraint on `Post.slug`). When editing a post, updating the slug must verify that no *other* post has that slug (`where: { slug, NOT: { id } }`).
   - If user does not provide a custom slug, `generateSlug(title)` should automatically populate it.
5. **Comment Moderation Gap Analysis**:
   - Reading: No API exists to list all comments across all statuses. Admin needs `GET /api/admin/comments?status=PENDING|APPROVED|SPAM|ALL`.
   - Moderation: No API exists to change comment status (`PATCH /api/admin/comments/[id]` with `{ status: "APPROVED" | "SPAM" }`) or delete comments (`DELETE /api/admin/comments/[id]`).
   - Author Reply: An admin reply requires creating a new comment with `postId: parentComment.postId`, `parentId: parentComment.id`, `isAuthorReply: true`, `status: "APPROVED"`, and author information (`authorName: "Admin"`, `authorEmail: "admin@blog.local"`).
6. **Cascade Safety Verification**:
   - In `prisma/schema.prisma`:
     - `PostTag` has `onDelete: Cascade` on `postId`.
     - `Comment` has `onDelete: Cascade` on `postId`.
     - `Comment.parent` has `onDelete: Cascade` on `parentId`.
   - Deleting a post safely removes all associated tags and comments without leaving orphaned records. Deleting a parent comment safely removes all its nested replies.

---

## 3. Caveats

1. **Cover Image URL Validation**: In HTML forms, empty fields submit empty strings `""`. `z.string().url()` fails on empty strings. Validation must normalize `""` to `null` or accept optional/nullable strings.
2. **Slug Collision Handling**: When an admin types a title, client-side slug auto-generation might match an existing slug in the database. The backend must return a friendly 409 Conflict error message ("Slug sudah digunakan oleh artikel lain") rather than a raw Prisma unique constraint error (`P2002`).
3. **No Auth Security Boundary**: As specified in R1 ("tanpa proteksi autentikasi/login untuk lingkungan internal blog"), `/admin` and `/api/admin/*` are open for internal development. In a production external deployment, middleware-level authentication would be required.
4. **Agent Concurrency**: If `npm run agent:comments` runs concurrently while an admin is actively moderating comments, SQLite file locking could occur if long transactions are held. All database operations should remain fast and atomic.

---

## 4. Conclusion & Concrete Recommendations

### 4.1 Recommended Route Handlers Architecture
Implement dedicated admin endpoints under `src/app/api/admin/`:

| Endpoint | Method | Purpose | Payload / Query | Response |
|---|---|---|---|---|
| `/api/admin/posts` | `GET` | List all posts for CMS | `?status=all\|published\|draft&search=...` | `{ success: true, posts: Post[] }` |
| `/api/admin/posts` | `POST` | Create post (published or draft) | `PostAdminInput` | `{ success: true, post: Post }` (201) |
| `/api/admin/posts/[id]` | `GET` | Get single post for editing | None | `{ success: true, post: PostWithTags }` |
| `/api/admin/posts/[id]` | `PUT` | Update post fields & tags | `PostAdminInput` | `{ success: true, post: Post }` |
| `/api/admin/posts/[id]` | `DELETE` | Delete post (cascading tags & comments) | None | `{ success: true, message: string }` |
| `/api/admin/posts/[id]/publish` | `PATCH` | Quick toggle publish status | `{ published: boolean }` | `{ success: true, post: Post }` |
| `/api/admin/comments` | `GET` | List comments by status | `?status=ALL\|PENDING\|APPROVED\|SPAM` | `{ success: true, comments: Comment[] }` |
| `/api/admin/comments/[id]` | `PATCH` | Update comment status | `{ status: "APPROVED"\|"SPAM"\|"PENDING" }` | `{ success: true, comment: Comment }` |
| `/api/admin/comments/[id]` | `DELETE` | Delete comment (cascading replies) | None | `{ success: true, message: string }` |
| `/api/admin/comments/[id]/reply` | `POST` | Author/admin reply to comment | `{ content: string, authorName?: string }` | `{ success: true, comment: Comment }` (201) |

### 4.2 Recommended Schema Additions in `src/lib/validations.ts`
```typescript
export const PostAdminSchema = z.object({
  title: z.string().trim().min(5, "Judul minimal 5 karakter").max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip"),
  excerpt: z.string().trim().min(10, "Ringkasan minimal 10 karakter").max(300),
  content: z.string().trim().min(20, "Konten artikel minimal 20 karakter"),
  coverImage: z
    .string()
    .trim()
    .url("URL gambar tidak valid")
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
  content: z.string().trim().min(2, "Balasan minimal 2 karakter").max(2000),
  authorName: z.string().trim().min(2).default("Admin"),
  authorEmail: z.string().trim().email().default("admin@blog.local"),
});
```

### 4.3 Recommended Prisma Query Patterns
- **Listing Posts with Comment Counts**:
  ```typescript
  const posts = await db.post.findMany({
    where: {
      ...(status === "published" ? { published: true } : {}),
      ...(status === "draft" ? { published: false } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { slug: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
    },
  });
  ```
- **Author Reply Creation**:
  ```typescript
  const parentComment = await db.comment.findUnique({ where: { id } });
  if (!parentComment) throw new Error("Comment not found");

  const reply = await db.comment.create({
    data: {
      postId: parentComment.postId,
      parentId: parentComment.id,
      authorName: validated.authorName,
      authorEmail: validated.authorEmail,
      content: validated.content,
      status: "APPROVED",
      isAuthorReply: true,
    },
  });
  ```

---

## 5. Verification Method

1. **Verify Database Integrity**:
   - Inspect models and relations in `prisma/schema.prisma`.
   - Run `npx.cmd tsx prisma/seed.ts` to ensure database seeds clean test records.
2. **Execute Test Suite**:
   ```powershell
   npm.cmd test
   ```
   *Expected result*: Vitest runs unit tests (existing 9 tests pass; any new route tests pass).
3. **Execute Production Build**:
   ```powershell
   npm.cmd run build
   ```
   *Expected result*: Next.js build passes with exit code 0, TypeScript type check passes, and all new `/admin` routes compile cleanly.
4. **Invalidation Conditions**:
   - Deleting a post fails due to foreign key constraint violation (would invalidate cascade assumption).
   - Author reply does not include `isAuthorReply: true` or correct `parentId` (would break comment threading and bot duplicate prevention).
   - Draft posts appear in public homepage or public post detail page.
