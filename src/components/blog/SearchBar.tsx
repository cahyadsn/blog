"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar({
  initialQuery = "",
  initialTag = "",
  availableTags = [],
}: {
  initialQuery?: string;
  initialTag?: string;
  availableTags?: { name: string; slug: string; count?: number }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleTagClick = (tagSlug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("tag") === tagSlug) {
      params.delete("tag");
    } else {
      params.set("tag", tagSlug);
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSearch} className="relative flex items-center w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari artikel berdasarkan judul, topik, atau kata kunci..."
          className="w-full pl-10 pr-24 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs"
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "..." : "Cari"}
          </button>
        </div>
      </form>

      {/* Tag Filtering Chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500 dark:text-gray-400 mr-1 font-medium">Filter Tag:</span>
          {availableTags.map((tag) => {
            const isActive = initialTag === tag.slug;
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => handleTagClick(tag.slug)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
