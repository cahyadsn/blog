"use client";

import { useState, useEffect } from "react";

export interface UseScrollSpyOptions {
  /**
   * IntersectionObserver rootMargin.
   * Defaults to "-80px 0px -55% 0px" to account for the sticky header
   * and prioritize headings entering the upper reading area.
   */
  rootMargin?: string;
  /**
   * IntersectionObserver threshold(s). Defaults to [0, 1].
   */
  threshold?: number | number[];
  /**
   * Offset from viewport top (in px) used when falling back to bounding rect positions.
   * Defaults to 100.
   */
  topOffset?: number;
}

export interface UseScrollSpyResult {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

/**
 * Custom IntersectionObserver-based React hook that tracks heading visibility
 * as the reader scrolls and keeps `activeId` synchronized with the active section.
 */
export function useScrollSpy(
  headingIds: string[],
  options: UseScrollSpyOptions = {}
): UseScrollSpyResult {
  const {
    rootMargin = "-80px 0px -55% 0px",
    threshold = [0, 1],
    topOffset = 100,
  } = options;

  const headingIdsKey = headingIds.join("\u0000");
  const thresholdKey = Array.isArray(threshold)
    ? threshold.join(",")
    : String(threshold);

  const [activeId, setActiveId] = useState<string | null>(
    () => headingIds[0] ?? null
  );

  useEffect(() => {
    const ids = headingIdsKey ? headingIdsKey.split("\u0000") : [];

    if (ids.length === 0) {
      setActiveId(null);
      return;
    }

    setActiveId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));

    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      return;
    }

    const visibleIds = new Set<string>();

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        const id = entry.target?.id;
        if (!id) continue;
        if (entry.isIntersecting) {
          visibleIds.add(id);
        } else {
          visibleIds.delete(id);
        }
      }

      // 1. Prefer the topmost intersecting heading in document order
      const firstVisible = ids.find((id) => visibleIds.has(id));
      if (firstVisible) {
        setActiveId(firstVisible);
        return;
      }

      // 2. If scrolling between long sections where no heading is inside the band,
      // select the last heading whose layout top has scrolled above `topOffset`.
      let hasLayoutGeometry = false;
      let lastAboveId: string | null = null;

      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el || typeof el.getBoundingClientRect !== "function") continue;
        const rect = el.getBoundingClientRect();
        if (rect.top !== 0 || rect.height !== 0 || rect.width !== 0) {
          hasLayoutGeometry = true;
        }
        if (rect.top <= topOffset) {
          lastAboveId = id;
        }
      }

      if (hasLayoutGeometry) {
        setActiveId(lastAboveId ?? ids[0]);
        return;
      }

      // 3. Fallback based on entry boundingClientRect if provided
      for (const entry of entries) {
        if (!entry.isIntersecting && entry.target?.id && entry.boundingClientRect) {
          const rootTop = entry.rootBounds?.top ?? topOffset;
          if (
            (entry.boundingClientRect.top !== 0 ||
              entry.boundingClientRect.height !== 0) &&
            entry.boundingClientRect.top < rootTop
          ) {
            setActiveId(entry.target.id);
            return;
          }
        }
      }
    };

    const parsedThreshold = thresholdKey.includes(",")
      ? thresholdKey.split(",").map(Number)
      : Number(thresholdKey);

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
      threshold: parsedThreshold,
    });

    for (const element of elements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [headingIdsKey, rootMargin, thresholdKey, topOffset]);

  const effectiveActiveId = headingIds.length === 0 ? null : activeId;

  return { activeId: effectiveActiveId, setActiveId };
}
