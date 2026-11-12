import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  if (!post || !post.published) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)",
            color: "#ffffff",
            fontFamily: "sans-serif",
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "20px",
              color: "#a5b4fc",
              marginBottom: "20px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Antigravity Multi-Agent Blog
          </div>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#f87171",
              margin: "0 0 16px 0",
            }}
          >
            Artikel Tidak Ditemukan
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              maxWidth: "600px",
              margin: 0,
            }}
          >
            Artikel yang Anda cari tidak tersedia atau belum dipublikasikan.
          </p>
        </div>
      ),
      { ...size }
    );
  }

  // Format date
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate dynamic font size for title
  const titleFontSize = post.title.length > 70 ? 38 : post.title.length > 40 ? 46 : 54;

  const primaryTag = post.tags[0]?.tag.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: "linear-gradient(135deg, #090d16 0%, #131b2e 50%, #1e1b4b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "50px 60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left Column: Post Content & Metadata */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            height: "100%",
          }}
        >
          {/* Header row: Branding & Primary Tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 700,
                color: "#a5b4fc",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <span>🤖</span>
              <span>Antigravity Blog</span>
            </div>

            {primaryTag ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "9999px",
                  padding: "6px 14px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#e2e8f0",
                }}
              >
                #{primaryTag}
              </div>
            ) : null}
          </div>

          {/* Title and Excerpt */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <h1
              style={{
                fontSize: `${titleFontSize}px`,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {post.title}
            </h1>

            {post.excerpt ? (
              <p
                style={{
                  fontSize: "20px",
                  lineHeight: 1.4,
                  color: "#94a3b8",
                  margin: 0,
                  maxWidth: post.coverImage ? "680px" : "960px",
                }}
              >
                {post.excerpt.length > 140
                  ? post.excerpt.slice(0, 137) + "..."
                  : post.excerpt}
              </p>
            ) : null}
          </div>

          {/* Footer Metadata */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              fontSize: "15px",
              color: "#94a3b8",
              borderTop: "1px solid rgba(148, 163, 184, 0.15)",
              paddingTop: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
              <span>✍️</span>
              <span style={{ fontWeight: 600 }}>Antigravity Editorial</span>
            </div>
            <span>•</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📅</span>
              <span>{formattedDate}</span>
            </div>
            <span>•</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⏱</span>
              <span>{post.readingTime} menit baca</span>
            </div>
          </div>
        </div>

        {/* Right Column: Cover Image (if available) */}
        {post.coverImage ? (
          <div
            style={{
              display: "flex",
              width: "340px",
              height: "100%",
              marginLeft: "40px",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
    }
  );
}
