import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = "Antigravity Multi-Agent Blog";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Top Header / Brand Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "9999px",
              padding: "8px 20px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🤖</span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#a5b4fc",
                textTransform: "uppercase",
              }}
            >
              Antigravity Multi-Agent System
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "16px",
              color: "#94a3b8",
            }}
          >
            <span>v0.1.0 • Autonomous Architecture</span>
          </div>
        </div>

        {/* Center Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "960px",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Antigravity Multi-Agent Blog
          </h1>
          <p
            style={{
              fontSize: "26px",
              lineHeight: 1.4,
              color: "#cbd5e1",
              margin: 0,
              fontWeight: 400,
            }}
          >
            Aplikasi blog modern dengan ekosistem multi-agent mandiri: Desain, Basis Data, Backend, Frontend, Pengujian, dan DevOps.
          </p>
        </div>

        {/* Footer badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderTop: "1px solid rgba(148, 163, 184, 0.15)",
            paddingTop: "24px",
          }}
        >
          {["Next.js 15", "React 19", "Prisma SQLite", "Tailwind CSS", "Automated Agents"].map(
            (tech) => (
              <div
                key={tech}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "15px",
                  color: "#e2e8f0",
                }}
              >
                {tech}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
