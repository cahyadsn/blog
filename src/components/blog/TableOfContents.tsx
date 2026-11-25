"use client";

import React, { useState, useMemo, useId } from "react";
import { List, ChevronDown } from "lucide-react";
import type { TocHeading } from "@/lib/toc";
import { useScrollSpy } from "@/hooks/useScrollSpy";

export interface TableOfContentsProps {
  headings: TocHeading[];
  className?: string;
  /** Initial expanded state on mobile viewports. Defaults to false (collapsed). */
  defaultMobileOpen?: boolean;
  /** Optional IntersectionObserver rootMargin override for ScrollSpy. */
  rootMargin?: string;
}

export function TableOfContents({
  headings,
  className = "",
  defaultMobileOpen = false,
  rootMargin,
}: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultMobileOpen);
  const tocListId = useId();

  const headingIds = useMemo(
    () => (headings ? headings.map((h) => h.id) : []),
    [headings]
  );

  const { activeId, setActiveId } = useScrollSpy(
    headingIds,
    rootMargin ? { rootMargin } : undefined
  );

  if (!headings || headings.length === 0) {
    return null;
  }

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    setActiveId(id);
    setIsOpen(false);

    if (typeof document !== "undefined") {
      const target = document.getElementById(id);
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div
      aria-label="Navigasi Daftar Isi"
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/70 backdrop-blur-sm p-4 shadow-sm ${className}`}
    >
      {/* Mobile Collapsible Trigger (< lg) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={tocListId}
        className="w-full flex items-center justify-between gap-2 text-left lg:hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
          <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>Daftar Isi</span>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300">
            {headings.length}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Desktop Static Sidebar Header (>= lg) */}
      <div className="hidden lg:flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
          <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>Daftar Isi</span>
        </span>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {headings.length} bagian
        </span>
      </div>

      {/* Navigation List: collapsible on mobile, always visible on desktop */}
      <nav
        id={tocListId}
        aria-label="Daftar Isi Artikel"
        className={`${
          isOpen
            ? "block mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
            : "hidden"
        } lg:block lg:mt-0 lg:pt-0 lg:border-t-0 max-h-[60vh] lg:max-h-[calc(100vh-9rem)] overflow-y-auto pr-1`}
      >
        <ul className="space-y-1 border-l border-gray-200 dark:border-gray-800">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const isH3 = heading.level === 3;

            return (
              <li key={heading.id} data-heading-level={heading.level}>
                <a
                  href={`#${heading.id}`}
                  onClick={(e) => handleLinkClick(e, heading.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={`block -ml-px border-l-2 rounded-r-lg pr-2.5 leading-snug transition-colors duration-150 break-words ${
                    isH3 ? "pl-6 py-1 text-xs" : "pl-3 py-1.5 text-[13px]"
                  } ${
                    isActive
                      ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default TableOfContents;
