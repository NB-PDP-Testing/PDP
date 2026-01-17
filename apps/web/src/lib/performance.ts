/**
 * Performance Utilities
 *
 * Phase 13 UX improvements: Performance optimization
 *
 * Features:
 * - Lazy loading utilities
 * - Image optimization helpers
 * - Resource preloading
 * - Performance monitoring
 */

import type { DynamicOptionsLoadingProps } from "next/dynamic";
import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";

/**
 * Configuration for lazy loading
 */
export type LazyLoadConfig = {
  /** Show loading skeleton while component loads */
  loading?: (props: DynamicOptionsLoadingProps) => ReactNode;
  /** Enable server-side rendering */
  ssr?: boolean;
};

/**
 * Lazy load a component with optional loading state
 *
 * Usage:
 * ```tsx
 * const HeavyChart = lazyLoad(() => import("@/components/charts/heavy-chart"));
 * ```
 */
export function lazyLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  config: LazyLoadConfig = {}
) {
  return dynamic(importFn, {
    loading: config.loading,
    ssr: config.ssr ?? true,
  });
}

/**
 * Lazy load a component with no SSR (client-only)
 *
 * Useful for components that use browser-only APIs
 */
export function lazyLoadClientOnly<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  config: Omit<LazyLoadConfig, "ssr"> = {}
) {
  return lazyLoad(importFn, { ...config, ssr: false });
}

/**
 * Preload a component before it's needed
 *
 * Usage:
 * ```tsx
 * // Preload on hover
 * <button
 *   onMouseEnter={() => preloadComponent(() => import("./HeavyModal"))}
 *   onClick={() => setShowModal(true)}
 * >
 *   Open Modal
 * </button>
 * ```
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<unknown> }>
) {
  // Just calling the import function starts the download
  importFn();
}

/**
 * Preload multiple components
 */
export function preloadComponents(
  importFns: Array<() => Promise<{ default: ComponentType<unknown> }>>
) {
  importFns.forEach(preloadComponent);
}

/**
 * Resource preloading utilities
 */
export const ResourcePreloader = {
  /**
   * Preload an image
   */
  image(src: string): Promise<undefined> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(undefined);
      img.onerror = reject;
      img.src = src;
    });
  },

  /**
   * Preload multiple images
   */
  images(srcs: string[]): Promise<void[]> {
    return Promise.all(srcs.map(this.image));
  },

  /**
   * Prefetch a page (Next.js router handles this, but manual override)
   */
  page(href: string): void {
    if (typeof window === "undefined") {
      return;
    }

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
  },

  /**
   * Preconnect to a domain for faster subsequent requests
   */
  preconnect(href: string): void {
    if (typeof window === "undefined") {
      return;
    }

    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    document.head.appendChild(link);
  },

  /**
   * DNS prefetch for a domain
   */
  dnsPrefetch(href: string): void {
    if (typeof window === "undefined") {
      return;
    }

    const link = document.createElement("link");
    link.rel = "dns-prefetch";
    link.href = href;
    document.head.appendChild(link);
  },
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Mark a point in time for measurement
   */
  mark(name: string): void {
    if (typeof performance === "undefined") {
      return;
    }
    performance.mark(name);
  },

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof performance === "undefined") {
      return null;
    }

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name, "measure");
      return entries.length > 0 ? entries[0].duration : null;
    } catch {
      return null;
    }
  },

  /**
   * Get Web Vitals metrics
   */
  getWebVitals(): {
    fcp: number | null;
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    ttfb: number | null;
  } {
    if (typeof performance === "undefined") {
      return { fcp: null, lcp: null, fid: null, cls: null, ttfb: null };
    }

    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint"
    );

    const navigationEntries = performance.getEntriesByType("navigation");
    const navigationEntry = navigationEntries[0] as
      | PerformanceNavigationTiming
      | undefined;

    return {
      fcp: fcpEntry?.startTime ?? null,
      lcp: null, // Requires PerformanceObserver
      fid: null, // Requires PerformanceObserver
      cls: null, // Requires PerformanceObserver
      ttfb: navigationEntry?.responseStart ?? null,
    };
  },

  /**
   * Log component render time
   */
  logRenderTime(componentName: string, startTime: number): void {
    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Performance] ${componentName} rendered in ${duration.toFixed(2)}ms`
      );
    }
  },
};

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback for Safari
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(handle: number): void {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Defer non-critical work to idle time
 */
export function deferToIdle<T>(work: () => T, timeout = 2000): Promise<T> {
  return new Promise((resolve) => {
    requestIdleCallback(
      () => {
        resolve(work());
      },
      { timeout }
    );
  });
}
