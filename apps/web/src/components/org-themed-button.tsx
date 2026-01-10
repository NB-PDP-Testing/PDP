"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { cn } from "@/lib/utils";

export interface OrgThemedButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "outline";
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Organization-themed button component
 * Automatically uses the org's CSS custom properties for colors
 * Following React 19 best practices - ref as prop instead of forwardRef
 *
 * When ux_theme_contrast_colors flag is enabled:
 * - Uses auto-contrast text colors (black/white based on background luminance)
 * - Ensures WCAG AA compliance for text readability
 */
export function OrgThemedButton({
  className,
  variant = "primary",
  size = "md",
  children,
  ref,
  ...props
}: OrgThemedButtonProps) {
  const { useThemeContrastColors } = useUXFeatureFlags();

  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const sizeStyles = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8 text-lg",
  };

  // When contrast colors enabled, don't use hardcoded text-white
  const getVariantStyles = () => {
    if (useThemeContrastColors) {
      return {
        primary: "shadow-sm hover:opacity-90 focus:ring-[var(--org-primary)]",
        secondary:
          "shadow-sm hover:opacity-90 focus:ring-[var(--org-secondary)]",
        tertiary: "shadow-sm hover:opacity-90 focus:ring-[var(--org-tertiary)]",
        outline: "border-2 bg-transparent hover:bg-opacity-10",
      };
    }
    // Legacy behavior - always white text
    return {
      primary:
        "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-primary)]",
      secondary:
        "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-secondary)]",
      tertiary:
        "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-tertiary)]",
      outline: "border-2 bg-transparent hover:bg-opacity-10",
    };
  };

  const variantStyles = getVariantStyles();

  const getStyle = (): React.CSSProperties => {
    if (variant === "outline") {
      return {
        borderColor: "var(--org-primary)",
        color: "var(--org-primary)",
      };
    }

    // Map non-outline variants to their CSS variable names
    const colorVarMap: Record<"primary" | "secondary" | "tertiary", string> = {
      primary: "--org-primary",
      secondary: "--org-secondary",
      tertiary: "--org-tertiary",
    };

    const contrastVarMap: Record<"primary" | "secondary" | "tertiary", string> =
      {
        primary: "--org-primary-contrast",
        secondary: "--org-secondary-contrast",
        tertiary: "--org-tertiary-contrast",
      };

    const colorVar =
      colorVarMap[variant as "primary" | "secondary" | "tertiary"];

    if (useThemeContrastColors) {
      // Use auto-contrast text color for WCAG compliance
      const contrastVar =
        contrastVarMap[variant as "primary" | "secondary" | "tertiary"];
      return {
        backgroundColor: `var(${colorVar})`,
        color: `var(${contrastVar})`,
      };
    }

    // Legacy behavior - white text
    return {
      backgroundColor: `var(${colorVar})`,
    };
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      ref={ref}
      style={getStyle()}
      {...props}
    >
      {children}
    </button>
  );
}
