"use client";

import * as React from "react";

/**
 * Hook to detect user's reduced motion preference
 *
 * Features:
 * - Detects `prefers-reduced-motion: reduce` media query
 * - Updates in real-time if user changes preference
 * - Returns true if user prefers reduced motion
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * return (
 *   <div className={prefersReducedMotion ? "animate-none" : "animate-bounce"}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation duration based on reduced motion preference
 *
 * Returns 0 if user prefers reduced motion, otherwise returns the specified duration
 */
export function useAnimationDuration(normalDuration: number): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 0 : normalDuration;
}

/**
 * Hook to get animation class based on reduced motion preference
 *
 * Returns the animation class if user allows motion, empty string otherwise
 */
export function useAnimationClass(animationClass: string): string {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? "" : animationClass;
}

/**
 * Utility function to conditionally apply animations
 * For use outside of React components
 */
export function getReducedMotionClass(
  animationClass: string,
  fallbackClass = ""
): string {
  if (typeof window === "undefined") {
    return animationClass;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  return prefersReducedMotion ? fallbackClass : animationClass;
}
