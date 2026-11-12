"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";

export interface LikeButtonProps {
  postId: string;
  postSlug?: string;
  slug?: string;
  initialLikes?: number;
  className?: string;
}

interface Floater {
  id: number;
  offsetX: number;
}

export function LikeButton({
  postId,
  postSlug,
  slug,
  initialLikes = 0,
  className = "",
}: LikeButtonProps) {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);

  // Ref to track accumulated clicks within debounce window
  const pendingClapsRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if initialLikes changes from server
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerNetworkSync = useCallback(async () => {
    const amountToSync = pendingClapsRef.current;
    if (amountToSync <= 0) return;

    // Reset pending counter before network call
    pendingClapsRef.current = 0;

    try {
      const targetIdentifier = slug || postSlug || postId;
      const res = await fetch(`/api/posts/${targetIdentifier}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountToSync }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === "number") {
          setLikes(data.likes);
        }
      } else if (res.status === 429) {
        console.warn("Permintaan suka dibatasi (429 Too Many Requests)");
      }
    } catch (err) {
      console.error("Gagal melakukan sinkronisasi suka:", err);
    }
  }, [postId, postSlug, slug]);

  const handleClick = () => {
    // 1. Instant Optimistic Increment
    setLikes((prev) => prev + 1);
    setIsLiked(true);

    // 2. Heartbeat scale pulse animation
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 450);

    // 3. Floating +1 indicator with jitter
    const floaterId = Date.now() + Math.random();
    const randomOffset = Math.floor(Math.random() * 24) - 12; // -12px to +12px
    setFloaters((prev) => [...prev, { id: floaterId, offsetX: randomOffset }]);

    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== floaterId));
    }, 700);

    // 4. 500ms Debounce accumulator
    pendingClapsRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      triggerNetworkSync();
    }, 500);
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Floating +1 Indicators */}
      {floaters.map((floater) => (
        <span
          key={floater.id}
          className="absolute -top-7 text-xs sm:text-sm font-black text-rose-500 pointer-events-none select-none animate-float-up"
          style={{ transform: `translateX(${floater.offsetX}px)` }}
        >
          +1
        </span>
      ))}

      {/* Interactive Like Pill Button */}
      <button
        type="button"
        onClick={handleClick}
        className={`group flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-xs ${
          isLiked
            ? "border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400"
        }`}
        aria-label="Sukai artikel ini"
        title="Klik untuk menyukai artikel ini"
      >
        <Heart
          className={`w-5 h-5 transition-transform duration-200 ${
            isPulsing ? "animate-heart-pulse" : "group-hover:scale-110"
          } ${
            isLiked
              ? "fill-rose-500 text-rose-500"
              : "text-gray-400 dark:text-gray-500 group-hover:text-rose-500 group-hover:fill-rose-500/20"
          }`}
        />
        <span className="text-sm font-bold tracking-tight">
          {likes.toLocaleString("id-ID")}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-rose-500/80">
          Suka
        </span>
      </button>
    </div>
  );
}
