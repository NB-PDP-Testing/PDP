import type { OrgTheme } from "@/hooks/use-org-theme";
import { getContrastColor, getContrastRatio } from "./color-utils";

/**
 * Calculate adaptive logo box styles for optimal visibility
 *
 * Strategy:
 * 1. Try to use org secondary or tertiary color for brand cohesion (if they provide good contrast)
 * 2. Fallback to smart halo effect with high-contrast color (black or white)
 *
 * Ensures WCAG AA compliance (4.5:1 contrast ratio minimum)
 *
 * @param theme - Organization theme object containing primary, secondary, and tertiary colors
 * @returns React CSSProperties object with background, border, backdropFilter, and boxShadow
 */
export function getAdaptiveLogoBoxStyles(theme: OrgTheme): React.CSSProperties {
  try {
    // STRATEGY 1: Try to use org secondary or tertiary color for brand cohesion
    const candidates = [
      { color: theme.secondary, type: "secondary" },
      { color: theme.tertiary, type: "tertiary" },
    ];

    // Filter to colors with WCAG AA contrast (4.5:1) against header
    const goodContrast = candidates.filter(
      (c) => getContrastRatio(c.color, theme.primary) >= 4.5
    );

    // If we have an org color with good contrast, use it with gradient
    if (goodContrast.length > 0) {
      const { color } = goodContrast[0];
      return {
        background: `linear-gradient(135deg, ${color}e6, ${color}cc)`,
        border: `2px solid ${color}`,
        backdropFilter: "blur(4px)",
        boxShadow: `0 2px 8px ${color}40, 0 0 12px ${color}20`,
      };
    }

    // STRATEGY 2: Fallback to smart halo effect with high-contrast color
    const haloColor = getContrastColor(theme.primary);
    const haloRgba =
      haloColor === "#ffffff"
        ? "rgba(255, 255, 255, 0.95)"
        : "rgba(0, 0, 0, 0.85)";

    return {
      background: haloRgba,
      border: `2px solid ${haloColor}`,
      backdropFilter: "blur(4px)",
      boxShadow: `
      0 0 16px ${haloRgba},
      0 0 8px ${haloRgba},
      0 2px 8px rgba(0,0,0,0.2)
    `,
    };
  } catch (error) {
    console.error("Adaptive logo styling failed:", error);
    // Safe fallback to current semi-transparent white box
    return {
      background: "rgba(255, 255, 255, 0.9)",
      border: "2px solid rgba(255, 255, 255, 1)",
      backdropFilter: "blur(4px)",
    };
  }
}
