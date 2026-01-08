/**
 * Performance Components
 * 
 * Phase 13 UX improvements: Performance optimization
 * 
 * Components:
 * - LazyComponent: Render children only when visible
 * - LazyImage: Load images only when visible
 * - DeferredRender: Defer rendering to prevent blocking
 * - IdleRender: Render during browser idle time
 * 
 * Hooks (from @/hooks/use-performance):
 * - useWebVitals: Monitor Core Web Vitals
 * - useRenderPerformance: Track component render times
 * - useIntersectionObserver: Intersection observer hook
 * - useLazyVisible: Lazy loading hook
 * - useDeferredEffect: Defer non-critical effects
 * - useIdleEffect: Run effects during idle time
 * - useLongTaskMonitor: Track long tasks
 * 
 * Utilities (from @/lib/performance):
 * - lazyLoad: Lazy load components with Next.js dynamic
 * - lazyLoadClientOnly: Client-only lazy loading
 * - preloadComponent: Preload components before needed
 * - ResourcePreloader: Image, page, preconnect utilities
 * - PerformanceMonitor: Marks, measures, Web Vitals
 * - debounce, throttle: Rate limiting utilities
 * - requestIdleCallback: Idle callback with fallback
 */

// Components
export {
  LazyComponent,
  LazyImage,
  DeferredRender,
  IdleRender,
  type LazyComponentProps,
  type LazyImageProps,
  type DeferredRenderProps,
  type IdleRenderProps,
} from "./lazy-component";

// Re-export hooks
export {
  useWebVitals,
  useRenderPerformance,
  useIntersectionObserver,
  useLazyVisible,
  useDeferredEffect,
  useIdleEffect,
  useLongTaskMonitor,
  type WebVitals,
} from "@/hooks/use-performance";

// Re-export utilities
export {
  lazyLoad,
  lazyLoadClientOnly,
  preloadComponent,
  preloadComponents,
  ResourcePreloader,
  PerformanceMonitor,
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
  deferToIdle,
  type LazyLoadConfig,
} from "@/lib/performance";