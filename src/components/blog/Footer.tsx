import React from "react";
import { Sparkles } from "lucide-react";
import { NewsletterForm } from "@/components/blog/NewsletterForm";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
      {/* Newsletter Subscription Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-gray-900 dark:via-gray-900/90 dark:to-indigo-950/40 border border-indigo-100 dark:border-gray-800 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-6 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buletin Mingguan</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                Dapatkan Update Artikel & Tren AI Terkini
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Bergabunglah dengan para developer dan engineer. Kami mengirimkan ringkasan artikel teknis, tips arsitektur sistem, dan wawasan langsung ke kotak masuk Anda. Tanpa spam.
              </p>
            </div>
            <div className="md:col-span-6">
              <NewsletterForm variant="footer" />
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Antigravity Multi-Agent Blog. Diproduksi secara mandiri dengan Next.js, Prisma & Agen AI.</p>
          <div className="flex gap-4">
            <span>Design System Agent</span>
            <span>•</span>
            <span>Content Creator Agent</span>
            <span>•</span>
            <span>Comment Responder Agent</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
