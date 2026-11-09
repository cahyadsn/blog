import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "CMS Admin Dashboard | Antigravity Blog",
  description: "Dashboard internal untuk pengelolaan artikel dan moderasi komentar blog",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full space-y-6">
      {/* Admin Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                CMS Admin Dashboard
              </h1>
              <Badge variant="secondary" className="font-semibold text-[11px]">
                Internal Mode
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Kelola draf artikel blog dan moderasi komentar pembaca secara terpadu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span>Lihat Blog</span>
          </Link>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <div className="w-full">{children}</div>
    </div>
  );
}
