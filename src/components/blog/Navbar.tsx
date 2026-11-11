import Link from "next/link";
import { Sparkles, Terminal, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-gray-100">
              Antigravity<span className="text-indigo-600">Blog</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Multi-Agent AI
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            Beranda
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors font-semibold text-gray-800 dark:text-gray-200"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Admin</span>
          </Link>
          <a
            href="https://github.com/cahyadsn/blog"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>GitHub</span>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
