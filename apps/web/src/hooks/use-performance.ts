"use client";

import * as React from "react";

/**
 * Web Vitals metrics
 */
export interface WebVitals {
  /** First Contentful Paint */
  fcp: number | null;
  /** Largest Contentful Paint */
  lcp: number | null;
  /** First Input Delay */
  fid: number | null;
  /** Cumulative Layout Shift */
  cls: number | null;
  /** Time to First Byte */
  ttfb: number | null;
  /** Interaction to Next Paint */
  inp: number | null;
}

/**
 * Hook to monitor Web Vitals
 * 
 * Uses PerformanceObserver to track Core Web Vitals in real-time
 */
export function useWebVitals(onReport?: (vitals: Partial<WebVitals>) => void): WebVitals {
  const [vitals, setVitals] = React.useState<WebVitals>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    inp: null,
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    // Get initial paint metrics
    const paintEntries = performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === "first-contentful-paint"
    );
    if (fcpEntry) {
      setVitals((prev) => ({ ...prev, fcp: fcpEntry.startTime }));
    }

    // Get TTFB
    const navigationEntries = performance.getEntriesByType("navigation");
    const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
    if (navigationEntry) {
      setVitals((prev) => ({ ...prev, ttfb: navigationEntry.responseStart }));
    }

    const observers: PerformanceObserver[] = [];

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const value = lastEntry.startTime;
          setVitals((prev) => ({ ...prev, lcp: value }));
          onReport?.({ lcp: value });
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // LCP not supported
    }

    // FID Observer
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming | undefined;
        if (firstEntry) {
          const value = firstEntry.processingStart - firstEntry.startTime;
          setVitals((prev) => ({ ...prev, fid: value }));
          onReport?.({ fid: value });
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });
      observers.push(fidObserver);
    } catch {
      // FID not supported
    }

    // CLS Observer
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShift.hadRecentInput && layoutShift.value) {
            clsValue += layoutShift.value;
            setVitals((prev) => ({ ...prev, cls: clsValue }));
            onReport?.({ cls: clsValue });
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch {
      // CLS not supported
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [onReport]);

  return vitals;
}

/**
 * Hook to measure component render performance
 */
export function useRenderPerformance(componentName: string) {
  const startTimeRef = React.useRef<number>(0);
  const renderCountRef = React.useRef<number>(0);

  React.useEffect(() => {
    renderCountRef.current += 1;
    const duration = performance.now() - startTimeRef.current;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Render] ${componentName} - Render #${renderCountRef.current} took ${duration.toFixed(2)}ms`
      );
    }
  });

  // Reset start time on each render
  startTimeRef.current = performance.now();

  return {
    renderCount: renderCountRef.current,
    markRenderStart: () => {
      startTimeRef.current = performance.now();
    },
  };
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * Hook for lazy loading components when visible
 */
export function useLazyVisible(
  options: IntersectionObserverInit = { rootMargin: "100px" }
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current || hasBeenVisible || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      options
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [hasBeenVisible, options]);

  return [ref, hasBeenVisible];
}

/**
 * Hook to defer non-critical effects
 */
export function useDeferredEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 0
) {
  React.useEffect(() => {
    const timeoutId = setTimeout(effect, delay);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to run effect during idle time
 */
export function useIdleEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  timeout: number = 2000
) {
  React.useEffect(() => {
    let cleanup: void | (() => void);

    const idleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: IdleRequestCallback) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);

    const cancelCallback =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? window.cancelIdleCallback
        : clearTimeout;

    const handle = idleCallback(
      () => {
        cleanup = effect();
      },
      { timeout }
    );

    return () => {
      cancelCallback(handle as number);
      if (typeof cleanup === "function") {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook to track long tasks
 */
export function useLongTaskMonitor(threshold: number = 50) {
  const [longTasks, setLongTasks] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.duration > threshold) {
            setLongTasks((prev) => [...prev.slice(-9), entry.duration]);
          }
        }
      });

      observer.observe({ type: "longtask", buffered: true });

      return () => observer.disconnect();
    } catch {
      // Long task observer not supported
    }
  }, [threshold]);

  return longTasks;
}