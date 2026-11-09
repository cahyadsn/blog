import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { parseMarkdownToHtml, calculateReadingTime } from "@/lib/markdown";

describe("Admin CMS Integration Suite (Real SQLite DB & Lifecycles)", () => {
  const RUN_ID = Date.now();
  const TEST_PREFIX = `test-e2e-${RUN_ID}`;

  // Helper to construct isolated slugs
  const makeSlug = (suffix: string) => `${TEST_PREFIX}-${suffix}`;

  beforeAll(async () => {
    // Ensure clean state before tests
    await db.post.deleteMany({
      where: { slug: { startsWith: "test-e2e-" } },
    });
    await db.comment.deleteMany({
      where: { authorEmail: { contains: "test-e2e" } },
    });
    await db.tag.deleteMany({
      where: { slug: { startsWith: "test-e2e-" } },
    });
  });

  afterAll(async () => {
    // Complete lifecycle cleanup
    await db.post.deleteMany({
      where: { slug: { startsWith: "test-e2e-" } },
    });
    await db.comment.deleteMany({
      where: { authorEmail: { contains: "test-e2e" } },
    });
    await db.tag.deleteMany({
      where: { slug: { startsWith: "test-e2e-" } },
    });
  });

  describe("Tier 1 & R4: Prisma & Schema Relations Foundation", () => {
    it("T1-INT-1: should persist Post entity with all fields and default values", async () => {
      const slug = makeSlug("prisma-post-foundation");
      const post = await db.post.create({
        data: {
          title: "Artikel Uji Prisma Foundation",
          slug,
          excerpt: "Ringkasan pengujian persistensi data ke SQLite dev.db.",
          content: "Konten pengujian persistensi data SQLite untuk CMS internal.",
          published: true,
          readingTime: 2,
        },
      });

      expect(post.id).toBeDefined();
      expect(post.slug).toBe(slug);
      expect(post.published).toBe(true);
      expect(post.readingTime).toBe(2);
      expect(post.createdAt).toBeInstanceOf(Date);
      expect(post.updatedAt).toBeInstanceOf(Date);

      // Verify direct retrieval
      const found = await db.post.findUnique({ where: { id: post.id } });
      expect(found).not.toBeNull();
      expect(found?.title).toBe("Artikel Uji Prisma Foundation");
    });

    it("T1-INT-2: should establish many-to-many Post and Tag relations via PostTag", async () => {
      const slug = makeSlug("post-with-tags");
      const tagName1 = `${TEST_PREFIX}-tag1`;
      const tagName2 = `${TEST_PREFIX}-tag2`;

      const post = await db.post.create({
        data: {
          title: "Artikel dengan Multi Tags",
          slug,
          excerpt: "Ringkasan pengujian relasi many-to-many PostTag.",
          content: "Konten pengujian relasi many-to-many Post dan Tag dalam SQLite.",
          tags: {
            create: [
              {
                tag: {
                  connectOrCreate: {
                    where: { name: tagName1 },
                    create: { name: tagName1, slug: tagName1 },
                  },
                },
              },
              {
                tag: {
                  connectOrCreate: {
                    where: { name: tagName2 },
                    create: { name: tagName2, slug: tagName2 },
                  },
                },
              },
            ],
          },
        },
        include: {
          tags: { include: { tag: true } },
        },
      });

      expect(post.tags).toHaveLength(2);
      const tagNames = post.tags.map((t) => t.tag.name);
      expect(tagNames).toContain(tagName1);
      expect(tagNames).toContain(tagName2);

      // Verify from Tag side
      const tagRecord = await db.tag.findUnique({
        where: { name: tagName1 },
        include: { posts: true },
      });
      expect(tagRecord).not.toBeNull();
      expect(tagRecord?.posts.some((p) => p.postId === post.id)).toBe(true);
    });

    it("T1-INT-3: should persist Comment entity with default status APPROVED and isAuthorReply false", async () => {
      const slug = makeSlug("comment-defaults");
      const post = await db.post.create({
        data: {
          title: "Artikel untuk Komentar Default",
          slug,
          excerpt: "Ringkasan pengujian entitas Comment default.",
          content: "Konten artikel untuk menguji default values tabel Comment.",
        },
      });

      const comment = await db.comment.create({
        data: {
          postId: post.id,
          authorName: "Pembaca Setia",
          authorEmail: `${TEST_PREFIX}-pembaca@test.com`,
          content: "Komentar pertama pembaca setia blog.",
        },
      });

      expect(comment.id).toBeDefined();
      expect(comment.status).toBe("APPROVED");
      expect(comment.isAuthorReply).toBe(false);
      expect(comment.parentId).toBeNull();
    });

    it("T1-INT-4: should accurately calculate and store reading time for long content", async () => {
      const slug = makeSlug("reading-time-test");
      // 500 words = 3 minutes reading time (at 200 words/min)
      const longContent = Array.from({ length: 500 }, (_, i) => `kata${i}`).join(" ");
      const computedReadingTime = calculateReadingTime(longContent);
      expect(computedReadingTime).toBe(3);

      const post = await db.post.create({
        data: {
          title: "Artikel Panjang dengan Estimasi Waktu Baca",
          slug,
          excerpt: "Ringkasan artikel panjang untuk verifikasi readingTime.",
          content: longContent,
          readingTime: computedReadingTime,
        },
      });

      expect(post.readingTime).toBe(3);
    });

    it("T1-INT-5: should differentiate published posts from draft posts in query filters", async () => {
      const pubSlug = makeSlug("query-published");
      const draftSlug = makeSlug("query-draft");

      await db.post.create({
        data: {
          title: "Artikel Terbit Publik",
          slug: pubSlug,
          excerpt: "Ringkasan artikel terbit publik.",
          content: "Konten yang dapat diakses pembaca umum.",
          published: true,
        },
      });

      await db.post.create({
        data: {
          title: "Artikel Draf Internal",
          slug: draftSlug,
          excerpt: "Ringkasan artikel draf internal.",
          content: "Konten draf yang belum boleh diakses publik.",
          published: false,
        },
      });

      const publishedPosts = await db.post.findMany({
        where: {
          slug: { in: [pubSlug, draftSlug] },
          published: true,
        },
      });
      expect(publishedPosts).toHaveLength(1);
      expect(publishedPosts[0].slug).toBe(pubSlug);

      const draftPosts = await db.post.findMany({
        where: {
          slug: { in: [pubSlug, draftSlug] },
          published: false,
        },
      });
      expect(draftPosts).toHaveLength(1);
      expect(draftPosts[0].slug).toBe(draftSlug);
    });
  });

  describe("Tier 2: DB Constraints & Boundary Conditions", () => {
    it("T2-INT-1: should enforce unique constraint on Post.slug and reject duplicate", async () => {
      const duplicateSlug = makeSlug("unique-constraint-slug");

      await db.post.create({
        data: {
          title: "Artikel Pertama dengan Slug Unik",
          slug: duplicateSlug,
          excerpt: "Ringkasan pertama dengan slug unik.",
          content: "Konten artikel pertama yang menempati slug unik.",
        },
      });

      // Attempting to create another post with identical slug must throw Prisma unique constraint violation
      await expect(
        db.post.create({
          data: {
            title: "Artikel Kedua dengan Slug Sama",
            slug: duplicateSlug,
            excerpt: "Ringkasan kedua yang mencoba menggunakan slug yang sama.",
            content: "Konten kedua yang melanggar batasan unik database.",
          },
        })
      ).rejects.toThrow();
    });

    it("T2-INT-2: should return null when querying non-existent Post ID", async () => {
      const nonExistent = await db.post.findUnique({
        where: { id: "non-existent-cuid-id" },
      });
      expect(nonExistent).toBeNull();
    });

    it("T2-INT-3: should reject Comment creation with non-existent postId foreign key", async () => {
      await expect(
        db.comment.create({
          data: {
            postId: "invalid-post-id-foreign-key",
            authorName: "Penulis Liar",
            authorEmail: `${TEST_PREFIX}-liar@test.com`,
            content: "Komentar untuk artikel yang tidak ada di database.",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("Tier 3: Cross-Feature Combinations & State Transitions", () => {
    it("T3-INT-1: should seamlessly update tags on existing post (disconnect old, connect new)", async () => {
      const slug = makeSlug("tag-transition-post");
      const initialTag = `${TEST_PREFIX}-tag-initial`;
      const replacementTag = `${TEST_PREFIX}-tag-replacement`;

      const post = await db.post.create({
        data: {
          title: "Artikel Transisi Tag",
          slug,
          excerpt: "Ringkasan artikel transisi tag.",
          content: "Konten artikel yang akan diuji penggantian tag.",
          tags: {
            create: [
              {
                tag: {
                  connectOrCreate: {
                    where: { name: initialTag },
                    create: { name: initialTag, slug: initialTag },
                  },
                },
              },
            ],
          },
        },
        include: { tags: { include: { tag: true } } },
      });

      expect(post.tags[0].tag.name).toBe(initialTag);

      // Perform transaction: delete old associations, create new ones
      await db.$transaction(async (tx) => {
        await tx.postTag.deleteMany({ where: { postId: post.id } });
        await tx.post.update({
          where: { id: post.id },
          data: {
            tags: {
              create: [
                {
                  tag: {
                    connectOrCreate: {
                      where: { name: replacementTag },
                      create: { name: replacementTag, slug: replacementTag },
                    },
                  },
                },
              ],
            },
          },
        });
      });

      // Verify updated post tags
      const updatedPost = await db.post.findUnique({
        where: { id: post.id },
        include: { tags: { include: { tag: true } } },
      });

      expect(updatedPost?.tags).toHaveLength(1);
      expect(updatedPost?.tags[0].tag.name).toBe(replacementTag);
    });

    it("T3-INT-2: should support bidirectional publish state toggling (Draft <-> Published)", async () => {
      const slug = makeSlug("toggle-state-post");
      const post = await db.post.create({
        data: {
          title: "Artikel Uji Toggle Status",
          slug,
          excerpt: "Ringkasan pengujian toggle bolak-balik draf dan publikasi.",
          content: "Konten pengujian toggle status publikasi pada database.",
          published: false,
        },
      });

      expect(post.published).toBe(false);

      // 1. Toggle to published
      const publishedPost = await db.post.update({
        where: { id: post.id },
        data: { published: true },
      });
      expect(publishedPost.published).toBe(true);

      // 2. Toggle back to draft
      const draftPost = await db.post.update({
        where: { id: post.id },
        data: { published: false },
      });
      expect(draftPost.published).toBe(false);
    });
  });

  describe("Tier 4: Real-World Application Scenarios", () => {
    // Scenario 1: Draft-to-Publication Lifecycle
    it("T4-SCENARIO-1: Draft-to-Publication Lifecycle (Create draft -> Verify hidden -> Preview markdown -> Publish -> Verify public)", async () => {
      const draftSlug = makeSlug("scenario-1-draft-lifecycle");
      const markdownDraft = `
## Ringkasan Inovasi
Artikel ini membahas solusi implementasi **CMS Admin Dashboard** internal.

### Fitur Utama
1. Markdown Live Preview interaktif
2. Moderasi komentar real-time
3. Penghitungan waktu baca otomatis
      `.trim();

      // Step 1: Create Draft Post
      const post = await db.post.create({
        data: {
          title: "Siklus Hidup Draf ke Publikasi",
          slug: draftSlug,
          excerpt: "Ringkasan siklus hidup pembuatan artikel draf hingga publikasi.",
          content: markdownDraft,
          published: false, // DRAFT
          readingTime: calculateReadingTime(markdownDraft),
        },
      });

      expect(post.published).toBe(false);

      // Step 2: Verify post is absent on public blog query
      const publicQuery = await db.post.findMany({
        where: { slug: draftSlug, published: true },
      });
      expect(publicQuery).toHaveLength(0);

      // Step 3: Admin reviews live markdown preview
      const renderedHtml = await parseMarkdownToHtml(post.content);
      expect(renderedHtml).toContain("<h2>Ringkasan Inovasi</h2>");
      expect(renderedHtml).toContain("<strong>CMS Admin Dashboard</strong>");
      expect(renderedHtml).toContain("<li>Markdown Live Preview interaktif</li>");

      // Step 4: Admin toggles status to published
      const publishedPost = await db.post.update({
        where: { id: post.id },
        data: { published: true },
      });
      expect(publishedPost.published).toBe(true);

      // Step 5: Verify post is now visible on public blog query
      const publicQueryAfter = await db.post.findMany({
        where: { slug: draftSlug, published: true },
      });
      expect(publicQueryAfter).toHaveLength(1);
      expect(publicQueryAfter[0].id).toBe(post.id);
    });

    // Scenario 2: Comment Moderation & Author Threading
    it("T4-SCENARIO-2: Comment Moderation & Author Threading (Reader submits -> Admin reviews PENDING -> Approves -> Replies as Author -> Reader sees thread)", async () => {
      const postSlug = makeSlug("scenario-2-comment-threading");
      const post = await db.post.create({
        data: {
          title: "Artikel Diskusi Komentar dan Moderasi",
          slug: postSlug,
          excerpt: "Ringkasan artikel untuk pengujian alur moderasi komentar dan balasan author.",
          content: "Silakan diskusikan topik ini di kolom komentar di bawah.",
          published: true,
        },
      });

      // Step 1: Reader submits comment (simulating PENDING state)
      const readerComment = await db.comment.create({
        data: {
          postId: post.id,
          authorName: "Ahmad Pembaca",
          authorEmail: `${TEST_PREFIX}-ahmad@reader.org`,
          content: "Apakah dashboard admin ini bisa mengekspor artikel ke format PDF?",
          status: "PENDING",
          isAuthorReply: false,
        },
      });
      expect(readerComment.status).toBe("PENDING");

      // Step 2: Public blog query must suppress PENDING comment
      const publicCommentsBefore = await db.comment.findMany({
        where: { postId: post.id, status: "APPROVED", parentId: null },
      });
      expect(publicCommentsBefore).toHaveLength(0);

      // Step 3: Admin reviews pending list, finds comment, and APPROVES it
      const approvedComment = await db.comment.update({
        where: { id: readerComment.id },
        data: { status: "APPROVED" },
      });
      expect(approvedComment.status).toBe("APPROVED");

      // Step 4: Admin posts author reply
      const authorReply = await db.comment.create({
        data: {
          postId: post.id,
          parentId: approvedComment.id,
          authorName: "Admin Blog",
          authorEmail: "admin@blog.local",
          content: "Halo Ahmad! Fitur ekspor PDF direncanakan untuk milestone berikutnya.",
          status: "APPROVED",
          isAuthorReply: true,
        },
      });
      expect(authorReply.isAuthorReply).toBe(true);
      expect(authorReply.parentId).toBe(approvedComment.id);

      // Step 5: Reader fetches public post with threaded replies
      const publicPostWithComments = await db.post.findUnique({
        where: { id: post.id },
        include: {
          comments: {
            where: { status: "APPROVED", parentId: null },
            include: {
              replies: {
                where: { status: "APPROVED" },
              },
            },
          },
        },
      });

      expect(publicPostWithComments?.comments).toHaveLength(1);
      const topComment = publicPostWithComments?.comments[0];
      expect(topComment?.authorName).toBe("Ahmad Pembaca");
      expect(topComment?.replies).toHaveLength(1);
      expect(topComment?.replies[0].isAuthorReply).toBe(true);
      expect(topComment?.replies[0].authorName).toBe("Admin Blog");
    });

    // Scenario 3: Spam Defense Workflow
    it("T4-SCENARIO-3: Spam Defense Workflow (Reader submits promotional spam -> Admin flags SPAM -> Suppressed from public & bot reply script)", async () => {
      const postSlug = makeSlug("scenario-3-spam-defense");
      const post = await db.post.create({
        data: {
          title: "Artikel Perlindungan Konten dari Spam",
          slug: postSlug,
          excerpt: "Ringkasan pengujian workflow moderasi spam komentar.",
          content: "Artikel untuk menguji penandaan komentar sebagai SPAM.",
          published: true,
        },
      });

      // Step 1: Reader submits promotional comment
      const spamComment = await db.comment.create({
        data: {
          postId: post.id,
          authorName: "Promo Bot",
          authorEmail: `${TEST_PREFIX}-bot@promotoday.xyz`,
          content: "Daftar sekarang dan dapatkan bonus 100%! Kunjungi slotgacor-promo.site",
          status: "PENDING",
        },
      });

      // Step 2: Admin marks comment as SPAM
      const flaggedComment = await db.comment.update({
        where: { id: spamComment.id },
        data: { status: "SPAM" },
      });
      expect(flaggedComment.status).toBe("SPAM");

      // Step 3: Verify suppressed from public post view
      const publicApproved = await db.comment.findMany({
        where: { postId: post.id, status: "APPROVED" },
      });
      expect(publicApproved).toHaveLength(0);

      // Step 4: Verify autonomous reply bot script (`scripts/reply-comments.ts`) ignores SPAM comments
      const botEligibleComments = await db.comment.findMany({
        where: {
          postId: post.id,
          isAuthorReply: false,
          status: "APPROVED", // Bot only queries APPROVED
          replies: {
            none: {
              isAuthorReply: true,
            },
          },
        },
      });
      expect(botEligibleComments).toHaveLength(0);
    });

    // Scenario 4: Post Deletion & Cascade Integrity
    it("T4-SCENARIO-4: Post Deletion & Cascade Integrity (Post with tags and threaded comments deleted -> All PostTag and Comment records cleanly removed)", async () => {
      const postSlug = makeSlug("scenario-4-cascade-delete");
      const cascadeTag = `${TEST_PREFIX}-tag-cascade`;

      // Step 1: Create post with tags and comments
      const post = await db.post.create({
        data: {
          title: "Artikel Uji Cascade Deletion",
          slug: postSlug,
          excerpt: "Ringkasan artikel pengujian penghapusan kaskade SQLite.",
          content: "Semua relasi PostTag dan Comment harus terhapus saat post dihapus.",
          tags: {
            create: [
              {
                tag: {
                  connectOrCreate: {
                    where: { name: cascadeTag },
                    create: { name: cascadeTag, slug: cascadeTag },
                  },
                },
              },
            ],
          },
        },
      });

      const parentComment = await db.comment.create({
        data: {
          postId: post.id,
          authorName: "Komentator 1",
          authorEmail: `${TEST_PREFIX}-k1@test.com`,
          content: "Komentar yang akan dihapus bersama post.",
          status: "APPROVED",
        },
      });

      await db.comment.create({
        data: {
          postId: post.id,
          parentId: parentComment.id,
          authorName: "Admin Balasan",
          authorEmail: "admin@blog.local",
          content: "Balasan yang juga akan terhapus bersama post.",
          status: "APPROVED",
          isAuthorReply: true,
        },
      });

      // Verify records exist prior to deletion
      const postTagsCountBefore = await db.postTag.count({ where: { postId: post.id } });
      const commentsCountBefore = await db.comment.count({ where: { postId: post.id } });
      expect(postTagsCountBefore).toBe(1);
      expect(commentsCountBefore).toBe(2);

      // Step 2: Delete Post
      await db.post.delete({
        where: { id: post.id },
      });

      // Step 3: Verify post is deleted
      const checkPost = await db.post.findUnique({ where: { id: post.id } });
      expect(checkPost).toBeNull();

      // Step 4: Verify all PostTag records for this post were cascaded
      const postTagsCountAfter = await db.postTag.count({ where: { postId: post.id } });
      expect(postTagsCountAfter).toBe(0);

      // Step 5: Verify all Comment records for this post were cascaded
      const commentsCountAfter = await db.comment.count({ where: { postId: post.id } });
      expect(commentsCountAfter).toBe(0);
    });

    // Scenario 5: Post Metadata & Tag Update Integrity
    it("T4-SCENARIO-5: Post Metadata & Tag Update Integrity (Update title, slug, excerpt, content, tags -> Verifies uniqueness check and update reflection)", async () => {
      const initialSlug = makeSlug("scenario-5-initial");
      const updatedSlug = makeSlug("scenario-5-updated");
      const tagA = `${TEST_PREFIX}-tag-a`;
      const tagB = `${TEST_PREFIX}-tag-b`;

      const post = await db.post.create({
        data: {
          title: "Judul Awal Artikel Metadata",
          slug: initialSlug,
          excerpt: "Ringkasan awal sebelum pembaruan metadata artikel.",
          content: "Konten awal artikel sebelum dilakukan penyuntingan mendalam.",
          tags: {
            create: [
              {
                tag: {
                  connectOrCreate: {
                    where: { name: tagA },
                    create: { name: tagA, slug: tagA },
                  },
                },
              },
            ],
          },
        },
      });

      // Update post metadata and switch tag from tagA to tagB
      await db.$transaction(async (tx) => {
        await tx.postTag.deleteMany({ where: { postId: post.id } });
        await tx.post.update({
          where: { id: post.id },
          data: {
            title: "Judul Baru Setelah Pembaruan Metadata",
            slug: updatedSlug,
            excerpt: "Ringkasan baru yang telah disunting secara komprehensif.",
            content: "Konten baru yang telah diperbarui dengan analisis mendalam.",
            tags: {
              create: [
                {
                  tag: {
                    connectOrCreate: {
                      where: { name: tagB },
                      create: { name: tagB, slug: tagB },
                    },
                  },
                },
              ],
            },
          },
        });
      });

      const updated = await db.post.findUnique({
        where: { id: post.id },
        include: { tags: { include: { tag: true } } },
      });

      expect(updated?.title).toBe("Judul Baru Setelah Pembaruan Metadata");
      expect(updated?.slug).toBe(updatedSlug);
      expect(updated?.tags).toHaveLength(1);
      expect(updated?.tags[0].tag.name).toBe(tagB);

      // Verify old slug is now available / freed
      const oldSlugLookup = await db.post.findUnique({ where: { slug: initialSlug } });
      expect(oldSlugLookup).toBeNull();
    });
  });
});
