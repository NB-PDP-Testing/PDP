"use client";

import type { HTMLAttributes } from "react";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { cn } from "@/lib/utils";

export interface OrgThemedGradientProps extends HTMLAttributes<HTMLDivElement> {
  /** Which org color to use as base (default: primary) */
  variant?: "primary" | "secondary" | "tertiary";
  /** Gradient direction (default: to right) */
  direction?: "to-right" | "to-left" | "to-bottom" | "to-top";
  /** Use second color for gradient end (default: same as base, no gradient) */
  gradientTo?: "primary" | "secondary" | "tertiary";
}

/**
 * Organization-themed gradient background component
 *
 * When ux_theme_contrast_colors flag is enabled:
 * - Uses auto-contrast text colors (black/white based on background luminance)
 * - Ensures WCAG AA compliance for text readability
 *
 * Usage:
 * ```tsx
 * <OrgThemedGradient className="p-6 rounded-lg">
 *   <h1>Title</h1>
 *   <p>Content with auto-contrast text</p>
 * </OrgThemedGradient>
 * ```
 */
export function OrgThemedGradient({
  className,
  variant = "primary",
  direction = "to-right",
  gradientTo,
  children,
  style,
  ...props
}: OrgThemedGradientProps) {
  const { useThemeContrastColors } = useUXFeatureFlags();

  const directionMap = {
    "to-right": "to right",
    "to-left": "to left",
    "to-bottom": "to bottom",
    "to-top": "to top",
  };

  const colorVarMap = {
    primary: "--org-primary",
    secondary: "--org-secondary",
    tertiary: "--org-tertiary",
  };

  const contrastVarMap = {
    primary: "--org-primary-contrast",
    secondary: "--org-secondary-contrast",
    tertiary: "--org-tertiary-contrast",
  };

  const fromColor = `var(${colorVarMap[variant]})`;
  const toColor = gradientTo
    ? `var(${colorVarMap[gradientTo]})`
    : `var(${colorVarMap[variant]})`;

  const gradientStyle: React.CSSProperties = {
    background: `linear-gradient(${directionMap[direction]}, ${fromColor}, ${toColor})`,
    ...style,
  };

  // Add contrast color when feature flag enabled
  if (useThemeContrastColors) {
    gradientStyle.color = `var(${contrastVarMap[variant]})`;
  }

  // Base classes - legacy uses text-white, enhanced uses auto-contrast
  const textClasses = useThemeContrastColors ? "" : "text-white";

  return (
    <div className={cn(textClasses, className)} style={gradientStyle} {...props}>
      {children}
    </div>
  );
}

/**
 * Utility CSS classes for org-themed gradient text colors
 * Use these to style nested elements to match the gradient's contrast
 *
 * When ux_theme_contrast_colors is enabled, these provide opacity variants
 */
export function useOrgGradientTextClasses() {
  const { useThemeContrastColors } = useUXFeatureFlags();

  if (useThemeContrastColors) {
    return {
      text: "", // Color is set via CSS variable
      textMuted: "opacity-80",
      textSubtle: "opacity-60",
    };
  }

  // Legacy: hardcoded white text classes
  return {
    text: "text-white",
    textMuted: "text-white/80",
    textSubtle: "text-white/60",
  };
}
