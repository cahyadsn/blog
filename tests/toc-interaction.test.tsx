import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import React from "react";

// Lightweight stateful React hooks harness for testing useScrollSpy and TableOfContents
// interactions in Vitest's Node environment without external DOM/testing packages.
const hookState = {
  slots: [] as unknown[],
  effectRecords: [] as Array<{
    deps?: readonly unknown[];
    cleanup?: (() => void) | void;
  }>,
  pendingEffects: [] as Array<{
    index: number;
    effect: () => void | (() => void);
    deps?: readonly unknown[];
  }>,
  cursor: 0,
  idCounter: 0,
  onStateChange: null as (() => void) | null,
};

function depsChanged(
  prev?: readonly unknown[],
  next?: readonly unknown[]
): boolean {
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  return prev.some((v, i) => !Object.is(v, next[i]));
}

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    default: actual,
    useState: <T,>(initial: T | (() => T)) => {
      const idx = hookState.cursor++;
      if (!(idx in hookState.slots)) {
        hookState.slots[idx] =
          typeof initial === "function" ? (initial as () => T)() : initial;
      }
      const setState = (updater: T | ((prev: T) => T)) => {
        const prev = hookState.slots[idx] as T;
        const next =
          typeof updater === "function"
            ? (updater as (p: T) => T)(prev)
            : updater;
        if (!Object.is(prev, next)) {
          hookState.slots[idx] = next;
          hookState.onStateChange?.();
        }
      };
      return [hookState.slots[idx] as T, setState] as const;
    },
    useMemo: <T,>(factory: () => T, deps?: readonly unknown[]) => {
      const idx = hookState.cursor++;
      const prev = hookState.slots[idx] as
        | { value: T; deps?: readonly unknown[] }
        | undefined;
      if (!prev || depsChanged(prev.deps, deps)) {
        const value = factory();
        hookState.slots[idx] = { value, deps };
        return value;
      }
      return prev.value;
    },
    useRef: <T,>(initial: T) => {
      const idx = hookState.cursor++;
      if (!(idx in hookState.slots)) {
        hookState.slots[idx] = { current: initial };
      }
      return hookState.slots[idx] as { current: T };
    },
    useId: () => {
      const idx = hookState.cursor++;
      if (!(idx in hookState.slots)) {
        hookState.idCounter += 1;
        hookState.slots[idx] = `:toc-${hookState.idCounter}:`;
      }
      return hookState.slots[idx] as string;
    },
    useEffect: (
      effect: () => void | (() => void),
      deps?: readonly unknown[]
    ) => {
      const idx = hookState.cursor++;
      const prev = hookState.effectRecords[idx];
      if (!prev || depsChanged(prev.deps, deps)) {
        hookState.pendingEffects.push({ index: idx, effect, deps });
      }
    },
  };
});

import { useScrollSpy } from "@/hooks/useScrollSpy";
import { TableOfContents } from "@/components/blog/TableOfContents";

interface MockElement {
  id: string;
  scrollIntoView: Mock<(arg?: boolean | ScrollIntoViewOptions) => void>;
  getBoundingClientRect: () => DOMRect;
}

interface MockObserverInstance {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[];
  observe: Mock<(target: Element) => void>;
  disconnect: Mock<() => void>;
  unobserve: Mock<(target: Element) => void>;
}

function resetHooks() {
  for (const record of hookState.effectRecords) {
    if (typeof record?.cleanup === "function") {
      record.cleanup();
    }
  }
  hookState.slots = [];
  hookState.effectRecords = [];
  hookState.pendingEffects = [];
  hookState.cursor = 0;
  hookState.idCounter = 0;
  hookState.onStateChange = null;
}

function mountComponent<P>(
  Component: (props: P) => React.ReactNode,
  initialProps: P
) {
  let currentProps = initialProps;
  let tree: React.ReactNode = null;
  let rendering = false;

  const flushEffects = () => {
    while (hookState.pendingEffects.length > 0) {
      const batch = hookState.pendingEffects.splice(0);
      for (const item of batch) {
        const prev = hookState.effectRecords[item.index];
        if (typeof prev?.cleanup === "function") {
          prev.cleanup();
        }
        const cleanup = item.effect();
        hookState.effectRecords[item.index] = {
          deps: item.deps,
          cleanup,
        };
      }
    }
  };

  let dirty = false;
  hookState.onStateChange = () => {
    if (rendering) {
      dirty = true;
    } else {
      render();
    }
  };

  const render = () => {
    if (rendering) return;
    rendering = true;
    try {
      do {
        dirty = false;
        hookState.cursor = 0;
        tree = Component(currentProps);
        flushEffects();
      } while (dirty);
    } finally {
      rendering = false;
    }
  };

  render();

  return {
    getTree: () => tree,
    rerender: (nextProps: P) => {
      currentProps = nextProps;
      render();
    },
    unmount: () => {
      resetHooks();
    },
  };
}

function findElements(
  node: React.ReactNode,
  predicate: (el: React.ReactElement<Record<string, unknown>>) => boolean,
  acc: React.ReactElement<Record<string, unknown>>[] = []
): React.ReactElement<Record<string, unknown>>[] {
  if (!node || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      findElements(child, predicate, acc);
    }
    return acc;
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<Record<string, unknown>>;
    if (predicate(el)) {
      acc.push(el);
    }
    if (el.props?.children) {
      findElements(el.props.children as React.ReactNode, predicate, acc);
    }
  }
  return acc;
}

describe("TOC Interactive State & ScrollSpy IntersectionObserver Suite", () => {
  let observerInstances: MockObserverInstance[];
  let mockElements: Map<string, MockElement>;
  let replaceStateMock: Mock<(data: unknown, unused: string, url?: string | URL | null) => void>;

  beforeEach(() => {
    resetHooks();
    observerInstances = [];
    mockElements = new Map();
    replaceStateMock = vi.fn();

    const makeMockElement = (id: string, top = 0): MockElement => ({
      id,
      scrollIntoView: vi.fn(),
      getBoundingClientRect: () =>
        ({
          top,
          bottom: top + 32,
          left: 0,
          right: 600,
          width: 600,
          height: 32,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    mockElements.set("sec-1", makeMockElement("sec-1", 120));
    mockElements.set("sec-2", makeMockElement("sec-2", 420));
    mockElements.set("sec-3", makeMockElement("sec-3", 820));

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string;
      readonly thresholds: ReadonlyArray<number>;
      private record: MockObserverInstance;

      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
      ) {
        this.rootMargin = options?.rootMargin ?? "0px";
        this.thresholds = Array.isArray(options?.threshold)
          ? options.threshold
          : [options?.threshold ?? 0];

        const record: MockObserverInstance = {
          callback,
          options,
          observed: [],
          observe: vi.fn((el: Element) => {
            record.observed.push(el);
          }),
          disconnect: vi.fn(),
          unobserve: vi.fn(),
        };
        this.record = record;
        observerInstances.push(record);
      }

      observe(target: Element): void {
        this.record.observe(target);
      }
      unobserve(target: Element): void {
        this.record.unobserve(target);
      }
      disconnect(): void {
        this.record.disconnect();
      }
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    vi.stubGlobal("window", {
      history: { replaceState: replaceStateMock },
    });
    vi.stubGlobal("document", {
      getElementById: (id: string) => mockElements.get(id) ?? null,
    });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    resetHooks();
    vi.unstubAllGlobals();
  });

  it("useScrollSpy should observe headings, update activeId on intersection, and disconnect on unmount", () => {
    let latestResult: ReturnType<typeof useScrollSpy> | null = null;
    function HookHarness({ ids }: { ids: string[] }) {
      latestResult = useScrollSpy(ids);
      return null;
    }

    const mounted = mountComponent(HookHarness, {
      ids: ["sec-1", "sec-2", "sec-3"],
    });

    expect(latestResult!.activeId).toBe("sec-1");
    expect(observerInstances).toHaveLength(1);
    const observer = observerInstances[0];
    expect(observer.observed.map((el) => el.id)).toEqual([
      "sec-1",
      "sec-2",
      "sec-3",
    ]);

    // Simulate scrolling so sec-2 enters intersection band
    observer.callback(
      [
        {
          target: mockElements.get("sec-2") as unknown as Element,
          isIntersecting: true,
          boundingClientRect: { top: 90, height: 32 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver
    );
    expect(latestResult!.activeId).toBe("sec-2");

    // Simulate multiple visible headings: first in document order should win
    observer.callback(
      [
        {
          target: mockElements.get("sec-3") as unknown as Element,
          isIntersecting: true,
          boundingClientRect: { top: 200, height: 32 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver
    );
    expect(latestResult!.activeId).toBe("sec-2");

    // Simulate sec-2 scrolling out upward while sec-3 is visible
    observer.callback(
      [
        {
          target: mockElements.get("sec-2") as unknown as Element,
          isIntersecting: false,
          boundingClientRect: { top: -40, height: 32 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver
    );
    expect(latestResult!.activeId).toBe("sec-3");

    // Simulate scrolling between long sections (none intersecting, sec-1 & sec-2 above topOffset)
    mockElements.set("sec-1", {
      ...mockElements.get("sec-1")!,
      getBoundingClientRect: () => ({ top: -300, height: 32 } as DOMRect),
    });
    mockElements.set("sec-2", {
      ...mockElements.get("sec-2")!,
      getBoundingClientRect: () => ({ top: 40, height: 32 } as DOMRect),
    });
    mockElements.set("sec-3", {
      ...mockElements.get("sec-3")!,
      getBoundingClientRect: () => ({ top: 600, height: 32 } as DOMRect),
    });

    observer.callback(
      [
        {
          target: mockElements.get("sec-3") as unknown as Element,
          isIntersecting: false,
          boundingClientRect: { top: 600, height: 32 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver
    );
    expect(latestResult!.activeId).toBe("sec-2");

    mounted.unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("TableOfContents should toggle mobile collapsible state on button click", () => {
    const headings = [
      { id: "sec-1", text: "Bagian Satu", level: 2 as const },
      { id: "sec-2", text: "Subbagian Dua", level: 3 as const },
      { id: "sec-3", text: "Bagian Tiga", level: 2 as const },
    ];

    const mounted = mountComponent(TableOfContents, { headings });

    const getToggleButton = () =>
      findElements(
        mounted.getTree(),
        (el) => el.type === "button" && "aria-expanded" in el.props
      )[0];

    const getNav = () =>
      findElements(mounted.getTree(), (el) => el.type === "nav")[0];

    // Initially collapsed on mobile
    expect(getToggleButton().props["aria-expanded"]).toBe(false);
    expect(String(getNav().props.className)).toContain("hidden lg:block");

    // Expand on click
    (getToggleButton().props.onClick as () => void)();
    expect(getToggleButton().props["aria-expanded"]).toBe(true);
    expect(String(getNav().props.className)).toContain("block mt-3");

    // Collapse on second click
    (getToggleButton().props.onClick as () => void)();
    expect(getToggleButton().props["aria-expanded"]).toBe(false);
    expect(String(getNav().props.className)).toContain("hidden lg:block");

    mounted.unmount();
  });

  it("TableOfContents should update active item on ScrollSpy and scroll smoothly when link clicked", () => {
    const headings = [
      { id: "sec-1", text: "Bagian Satu", level: 2 as const },
      { id: "sec-2", text: "Subbagian Dua", level: 3 as const },
      { id: "sec-3", text: "Bagian Tiga", level: 2 as const },
    ];

    const mounted = mountComponent(TableOfContents, {
      headings,
      defaultMobileOpen: true,
    });

    const getLinks = () =>
      findElements(mounted.getTree(), (el) => el.type === "a");
    const getToggleButton = () =>
      findElements(
        mounted.getTree(),
        (el) => el.type === "button" && "aria-expanded" in el.props
      )[0];

    // First heading active by default
    expect(getLinks()[0].props["aria-current"]).toBe("location");
    expect(getLinks()[1].props["aria-current"]).toBeUndefined();

    // ScrollSpy triggers active change to sec-2
    const observer = observerInstances[0];
    observer.callback(
      [
        {
          target: mockElements.get("sec-2") as unknown as Element,
          isIntersecting: true,
          boundingClientRect: { top: 90, height: 32 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      observer as unknown as IntersectionObserver
    );

    expect(getLinks()[0].props["aria-current"]).toBeUndefined();
    expect(getLinks()[1].props["aria-current"]).toBe("location");

    // Clicking sec-3 link scrolls smoothly, sets active immediately, updates hash, and collapses mobile TOC
    const preventDefault = vi.fn();
    (getLinks()[2].props.onClick as (e: unknown) => void)({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockElements.get("sec-3")!.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(replaceStateMock).toHaveBeenCalledWith(null, "", "#sec-3");
    expect(getLinks()[2].props["aria-current"]).toBe("location");
    expect(getToggleButton().props["aria-expanded"]).toBe(false);

    mounted.unmount();
  });

  it("useScrollSpy should degrade gracefully when IntersectionObserver is unavailable or headings are empty", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    let result: ReturnType<typeof useScrollSpy> | null = null;
    function HookHarness({ ids }: { ids: string[] }) {
      result = useScrollSpy(ids);
      return null;
    }

    const mounted = mountComponent(HookHarness, { ids: ["sec-1", "sec-2"] });
    expect(result!.activeId).toBe("sec-1");

    mounted.rerender({ ids: [] });
    expect(result!.activeId).toBeNull();

    mounted.unmount();
  });
});
