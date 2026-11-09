export function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 py-12">
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
    </footer>
  );
}
