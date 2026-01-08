import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { adjustForDarkMode, getContrastColor } from "@/lib/color-utils";
import { useUXFeatureFlags } from "./use-ux-feature-flags";

export type OrgTheme = {
  primary: string;
  secondary: string;
  tertiary: string;
  primaryRgb: string;
  secondaryRgb: string;
  tertiaryRgb: string;
  /** Contrast color (black or white) for primary background - WCAG compliant */
  primaryContrast: string;
  /** Contrast color (black or white) for secondary background - WCAG compliant */
  secondaryContrast: string;
  /** Contrast color (black or white) for tertiary background - WCAG compliant */
  tertiaryContrast: string;
  /** Adaptive primary color for dark mode (lightened if too dark) */
  primaryAdaptive: string;
  /** Adaptive secondary color for dark mode */
  secondaryAdaptive: string;
  /** Adaptive tertiary color for dark mode */
  tertiaryAdaptive: string;
};

const DEFAULT_COLORS = {
  primary: "#16a34a",
  secondary: "#0ea5e9",
  tertiary: "#f59e0b",
};

// Regex for parsing hex color to RGB components
const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = HEX_COLOR_REGEX.exec(hex);
  if (!result) {
    return "22, 163, 74"; // Default green
  }
  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
}

type UseOrgThemeOptions = {
  skip?: boolean;
};

/**
 * Hook to get and apply organization theme colors
 * Uses Convex reactive query for real-time updates when colors change
 *
 * Enhanced with Phase 14 features (ux_theme_contrast_colors, ux_theme_dark_variants):
 * - Auto-contrast text colors (black/white) based on background luminance
 * - Dark mode adaptive colors (lightens dark colors for visibility)
 */
export function useOrgTheme(options: UseOrgThemeOptions = {}) {
  const { skip = false } = options;
  const params = useParams();
  const orgId = params?.orgId as string | undefined;

  // Get current theme for dark mode detection
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  // Get feature flags for enhanced theming
  const { useThemeContrastColors, useThemeDarkVariants } = useUXFeatureFlags();

  // Use Convex reactive query - automatically updates when org data changes
  // Skip query if explicitly told to skip (e.g., on join pages where user isn't a member)
  const org = useQuery(
    api.models.organizations.getOrganization,
    !skip && orgId ? { organizationId: orgId } : "skip"
  );

  const loading = org === undefined;

  // Build theme object
  // Handle empty strings - if color is empty string, use default
  // This ensures positions are preserved: colors[0]=primary, colors[1]=secondary, colors[2]=tertiary
  const primaryColor = org?.colors?.[0]?.trim() || DEFAULT_COLORS.primary;
  const secondaryColor = org?.colors?.[1]?.trim() || DEFAULT_COLORS.secondary;
  const tertiaryColor = org?.colors?.[2]?.trim() || DEFAULT_COLORS.tertiary;

  // Calculate contrast colors (black or white) for each org color
  // This ensures text is always readable on org-colored backgrounds
  const primaryContrast = useThemeContrastColors
    ? getContrastColor(primaryColor)
    : "#ffffff"; // Default to white for backwards compatibility
  const secondaryContrast = useThemeContrastColors
    ? getContrastColor(secondaryColor)
    : "#ffffff";
  const tertiaryContrast = useThemeContrastColors
    ? getContrastColor(tertiaryColor)
    : "#ffffff";

  // Calculate adaptive colors for dark mode
  // Lightens dark colors so they're visible on dark backgrounds
  const primaryAdaptive =
    useThemeDarkVariants && isDarkMode
      ? adjustForDarkMode(primaryColor)
      : primaryColor;
  const secondaryAdaptive =
    useThemeDarkVariants && isDarkMode
      ? adjustForDarkMode(secondaryColor)
      : secondaryColor;
  const tertiaryAdaptive =
    useThemeDarkVariants && isDarkMode
      ? adjustForDarkMode(tertiaryColor)
      : tertiaryColor;

  const theme: OrgTheme = {
    primary: primaryColor,
    secondary: secondaryColor,
    tertiary: tertiaryColor,
    primaryRgb: hexToRgb(primaryColor),
    secondaryRgb: hexToRgb(secondaryColor),
    tertiaryRgb: hexToRgb(tertiaryColor),
    // Contrast colors for accessible text
    primaryContrast,
    secondaryContrast,
    tertiaryContrast,
    // Adaptive colors for dark mode
    primaryAdaptive,
    secondaryAdaptive,
    tertiaryAdaptive,
  };

  // Apply CSS variables to the document root
  useEffect(() => {
    // Skip applying CSS variables when skip is true (e.g., on join pages)
    if (skip || !orgId) {
      // Remove custom properties when not in org context or skipping
      document.documentElement.style.removeProperty("--org-primary");
      document.documentElement.style.removeProperty("--org-primary-rgb");
      document.documentElement.style.removeProperty("--org-primary-contrast");
      document.documentElement.style.removeProperty("--org-primary-adaptive");
      document.documentElement.style.removeProperty("--org-secondary");
      document.documentElement.style.removeProperty("--org-secondary-rgb");
      document.documentElement.style.removeProperty("--org-secondary-contrast");
      document.documentElement.style.removeProperty("--org-secondary-adaptive");
      document.documentElement.style.removeProperty("--org-tertiary");
      document.documentElement.style.removeProperty("--org-tertiary-rgb");
      document.documentElement.style.removeProperty("--org-tertiary-contrast");
      document.documentElement.style.removeProperty("--org-tertiary-adaptive");
      return;
    }

    // Base colors
    document.documentElement.style.setProperty("--org-primary", theme.primary);
    document.documentElement.style.setProperty(
      "--org-primary-rgb",
      theme.primaryRgb
    );
    document.documentElement.style.setProperty(
      "--org-secondary",
      theme.secondary
    );
    document.documentElement.style.setProperty(
      "--org-secondary-rgb",
      theme.secondaryRgb
    );
    document.documentElement.style.setProperty(
      "--org-tertiary",
      theme.tertiary
    );
    document.documentElement.style.setProperty(
      "--org-tertiary-rgb",
      theme.tertiaryRgb
    );

    // Contrast colors (black or white for text on org-colored backgrounds)
    document.documentElement.style.setProperty(
      "--org-primary-contrast",
      theme.primaryContrast
    );
    document.documentElement.style.setProperty(
      "--org-secondary-contrast",
      theme.secondaryContrast
    );
    document.documentElement.style.setProperty(
      "--org-tertiary-contrast",
      theme.tertiaryContrast
    );

    // Adaptive colors (for dark mode visibility)
    document.documentElement.style.setProperty(
      "--org-primary-adaptive",
      theme.primaryAdaptive
    );
    document.documentElement.style.setProperty(
      "--org-secondary-adaptive",
      theme.secondaryAdaptive
    );
    document.documentElement.style.setProperty(
      "--org-tertiary-adaptive",
      theme.tertiaryAdaptive
    );
  }, [
    skip,
    orgId,
    theme.primary,
    theme.secondary,
    theme.tertiary,
    theme.primaryRgb,
    theme.secondaryRgb,
    theme.tertiaryRgb,
    theme.primaryContrast,
    theme.secondaryContrast,
    theme.tertiaryContrast,
    theme.primaryAdaptive,
    theme.secondaryAdaptive,
    theme.tertiaryAdaptive,
  ]);

  return {
    theme,
    org: org
      ? {
          id: org._id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          colors: org.colors,
        }
      : null,
    loading,
    hasTheme: !!orgId && !!org?.colors?.length,
    isDarkMode,
  };
}

/**
 * Utility to get inline styles for org-themed elements
 *
 * When ux_theme_contrast_colors flag is enabled, uses auto-contrast text color.
 * Otherwise defaults to white text for backwards compatibility.
 *
 * @param type - Which org color to use (primary, secondary, tertiary)
 * @param useContrastColor - Whether to use auto-contrast color (set from feature flag)
 */
export function getOrgThemeStyles(
  type: "primary" | "secondary" | "tertiary" = "primary",
  useContrastColor = false
) {
  const varName = `--org-${type}`;
  const rgbVarName = `--org-${type}-rgb`;
  const contrastVarName = `--org-${type}-contrast`;

  return {
    backgroundColor: `var(${varName})`,
    // Use contrast color (auto black/white) when enabled, otherwise default white
    color: useContrastColor ? `var(${contrastVarName})` : "white",
    "--tw-shadow-color": `rgb(var(${rgbVarName}) / 0.5)`,
  } as React.CSSProperties;
}

/**
 * Utility to get inline styles for org-themed elements with adaptive colors
 * Uses colors that are adjusted for dark mode visibility
 *
 * @param type - Which org color to use (primary, secondary, tertiary)
 * @param useContrastColor - Whether to use auto-contrast color
 */
export function getOrgThemeStylesAdaptive(
  type: "primary" | "secondary" | "tertiary" = "primary",
  useContrastColor = false
) {
  const adaptiveVarName = `--org-${type}-adaptive`;
  const rgbVarName = `--org-${type}-rgb`;
  const contrastVarName = `--org-${type}-contrast`;

  return {
    backgroundColor: `var(${adaptiveVarName})`,
    color: useContrastColor ? `var(${contrastVarName})` : "white",
    "--tw-shadow-color": `rgb(var(${rgbVarName}) / 0.5)`,
  } as React.CSSProperties;
}

/**
 * Utility to get border color styles
 */
export function getOrgBorderStyles(
  type: "primary" | "secondary" | "tertiary" = "primary"
) {
  const varName = `--org-${type}`;

  return {
    borderColor: `var(${varName})`,
  } as React.CSSProperties;
}
