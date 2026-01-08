"use client";

import { useEffect } from "react";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

/**
 * Manages theme transition styles based on feature flag.
 * When ux_theme_smooth_transitions is enabled, adds CSS class to enable
 * smooth 200ms transitions when switching themes.
 *
 * Respects prefers-reduced-motion for accessibility.
 */
export function ThemeTransitionManager() {
  const { useThemeSmoothTransitions } = useUXFeatureFlags();

  useEffect(() => {
    if (useThemeSmoothTransitions) {
      // Add transition class to enable smooth theme changes
      document.documentElement.classList.add("theme-transitions");
    } else {
      // Remove transition class
      document.documentElement.classList.remove("theme-transitions");
    }

    return () => {
      document.documentElement.classList.remove("theme-transitions");
    };
  }, [useThemeSmoothTransitions]);

  return null;
}
