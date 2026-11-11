import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/blog/Navbar";
import { Footer } from "@/components/blog/Footer";

export const metadata: Metadata = {
  title: "Antigravity Multi-Agent Blog",
  description: "Aplikasi blog modern dengan ekosistem multi-agent mandiri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 w-full py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
