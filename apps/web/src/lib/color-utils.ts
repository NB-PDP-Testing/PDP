/**
 * Color Utilities for Theme and Org Theming
 *
 * Industry-standard color calculations based on:
 * - WCAG 2.2 Contrast Requirements
 * - Material Design "On" Colors
 * - Apple Human Interface Guidelines
 *
 * @see https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 * @see https://m3.material.io/styles/color/system/how-the-system-works
 */

/**
 * Convert hex color to RGB values
 * @param hex - Hex color string (e.g., "#16a34a" or "16a34a")
 * @returns Object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Parse hex values
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

/**
 * Convert RGB to hex color string
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string with # prefix
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * Used to determine contrast ratios and choose accessible text colors
 *
 * @param hex - Hex color string
 * @returns Luminance value between 0 (black) and 1 (white)
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  // Convert RGB to sRGB
  const toSrgb = (c: number) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const rSrgb = toSrgb(r);
  const gSrgb = toSrgb(g);
  const bSrgb = toSrgb(b);

  // Calculate luminance using ITU-R BT.709 coefficients
  return 0.2126 * rSrgb + 0.7152 * gSrgb + 0.0722 * bSrgb;
}

/**
 * Calculate WCAG contrast ratio between two colors
 *
 * WCAG Requirements:
 * - AA Normal Text: 4.5:1
 * - AA Large Text: 3:1
 * - AAA Normal Text: 7:1
 * - AAA Large Text: 4.5:1
 *
 * @param foreground - Foreground/text color (hex)
 * @param background - Background color (hex)
 * @returns Contrast ratio (1:1 to 21:1)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLum = getLuminance(foreground);
  const bgLum = getLuminance(background);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get optimal contrast color (black or white) for a given background
 * Based on Material Design "On" color concept
 *
 * @param backgroundColor - Hex color of the background
 * @returns "#000000" for light backgrounds, "#ffffff" for dark backgrounds
 */
export function getContrastColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor);

  // Threshold of 0.179 corresponds to ~4.5:1 contrast ratio with white
  // This aligns with WCAG AA requirements
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

/**
 * Check if a color combination meets WCAG AA contrast requirements
 *
 * @param foreground - Text color (hex)
 * @param background - Background color (hex)
 * @param largeText - Whether this is large text (14pt bold or 18pt regular)
 * @returns True if meets AA requirements
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if a color combination meets WCAG AAA contrast requirements
 *
 * @param foreground - Text color (hex)
 * @param background - Background color (hex)
 * @param largeText - Whether this is large text (14pt bold or 18pt regular)
 * @returns True if meets AAA requirements
 */
export function meetsWCAG_AAA(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Lighten a color by a percentage
 *
 * @param hex - Hex color string
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
export function lighten(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;

  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  return rgbToHex(newR, newG, newB);
}

/**
 * Darken a color by a percentage
 *
 * @param hex - Hex color string
 * @param percent - Percentage to darken (0-100)
 * @returns Darkened hex color
 */
export function darken(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;

  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  return rgbToHex(newR, newG, newB);
}

/**
 * Adjust color for dark mode visibility
 * Lightens dark colors that would be invisible on dark backgrounds
 *
 * @param hex - Hex color string
 * @param threshold - Luminance threshold below which to lighten (default 0.2)
 * @param lightenAmount - How much to lighten dark colors (default 25%)
 * @returns Adjusted hex color
 */
export function adjustForDarkMode(
  hex: string,
  threshold = 0.2,
  lightenAmount = 25
): string {
  const luminance = getLuminance(hex);

  // If color is too dark for dark mode, lighten it
  if (luminance < threshold) {
    return lighten(hex, lightenAmount);
  }

  return hex;
}

/**
 * Generate a color palette with variants for theming
 *
 * @param baseColor - Base hex color
 * @returns Object with base, light, dark, and contrast colors
 */
export function generateColorPalette(baseColor: string) {
  return {
    base: baseColor,
    light: lighten(baseColor, 20),
    lighter: lighten(baseColor, 40),
    dark: darken(baseColor, 15),
    darker: darken(baseColor, 30),
    contrast: getContrastColor(baseColor),
    // For dark mode backgrounds
    darkModeAdaptive: adjustForDarkMode(baseColor),
  };
}

/**
 * Get WCAG compliance level for a color combination
 *
 * @param foreground - Text color (hex)
 * @param background - Background color (hex)
 * @returns "AAA" | "AA" | "Fail" with ratio
 */
export function getWCAGCompliance(
  foreground: string,
  background: string
): { level: "AAA" | "AA" | "Fail"; ratio: number; ratioText: string } {
  const ratio = getContrastRatio(foreground, background);
  const ratioText = `${ratio.toFixed(2)}:1`;

  if (ratio >= 7) {
    return { level: "AAA", ratio, ratioText };
  } else if (ratio >= 4.5) {
    return { level: "AA", ratio, ratioText };
  } else {
    return { level: "Fail", ratio, ratioText };
  }
}
