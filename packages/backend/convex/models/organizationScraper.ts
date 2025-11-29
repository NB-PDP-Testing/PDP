"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Scrape a website to extract logo and color information
 */
export const scrapeWebsite = action({
  args: {
    url: v.string(),
  },
  returns: v.object({
    logo: v.union(v.string(), v.null()),
    colors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Normalize URL - ensure it has a protocol
      let url = args.url.trim();
      if (!(url.startsWith("http://") || url.startsWith("https://"))) {
        url = `https://${url}`;
      }

      // Fetch the HTML
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.statusText}`);
      }

      const html = await response.text();
      const baseUrl = new URL(url);

      // Extract external CSS URLs
      const cssUrls = extractCssUrls(html, baseUrl);

      // Fetch external CSS files (limit to first 3 to avoid too many requests)
      const externalCss = await fetchExternalCss(cssUrls.slice(0, 3));

      // Extract logo
      const logo = extractLogo(html, baseUrl);

      // Extract colors from both HTML and external CSS
      const colors = extractColors(html, externalCss);

      return {
        logo,
        colors,
      };
    } catch (error) {
      console.error("Error scraping website:", error);
      return {
        logo: null,
        colors: [],
      };
    }
  },
});

/**
 * Extract logo URL from HTML
 */
function extractLogo(html: string, baseUrl: URL): string | null {
  // Try og:image first (most reliable)
  const ogImageMatch = html.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
  );
  if (ogImageMatch && ogImageMatch[1]) {
    return resolveUrl(ogImageMatch[1], baseUrl);
  }

  // Try twitter:image
  const twitterImageMatch = html.match(
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i
  );
  if (twitterImageMatch && twitterImageMatch[1]) {
    return resolveUrl(twitterImageMatch[1], baseUrl);
  }

  // Try favicon
  const faviconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (faviconMatch && faviconMatch[1]) {
    return resolveUrl(faviconMatch[1], baseUrl);
  }

  // Try apple-touch-icon
  const appleIconMatch = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (appleIconMatch && appleIconMatch[1]) {
    return resolveUrl(appleIconMatch[1], baseUrl);
  }

  // Try common logo paths
  const commonLogoPaths = [
    "/logo.png",
    "/logo.svg",
    "/images/logo.png",
    "/images/logo.svg",
    "/assets/logo.png",
    "/assets/logo.svg",
  ];

  for (const path of commonLogoPaths) {
    const testUrl = resolveUrl(path, baseUrl);
    // We can't verify if it exists without making another request,
    // but we'll return the first one as a best guess
    return testUrl;
  }

  return null;
}

/**
 * Extract CSS URLs from HTML
 */
function extractCssUrls(html: string, baseUrl: URL): string[] {
  const cssUrls: string[] = [];

  // Match <link> tags with CSS
  const linkMatches = html.matchAll(
    /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi
  );
  for (const match of linkMatches) {
    const href = match[1];
    if (href) {
      cssUrls.push(resolveUrl(href, baseUrl));
    }
  }

  // Also try href before rel
  const linkMatches2 = html.matchAll(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*>/gi
  );
  for (const match of linkMatches2) {
    const href = match[1];
    if (href) {
      cssUrls.push(resolveUrl(href, baseUrl));
    }
  }

  return [...new Set(cssUrls)]; // Remove duplicates
}

/**
 * Fetch external CSS files
 */
async function fetchExternalCss(cssUrls: string[]): Promise<string> {
  let combinedCss = "";

  for (const url of cssUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const css = await response.text();
        combinedCss += `\n${css}`;
      }
    } catch (error) {
      // Skip failed CSS files
      console.warn(`Failed to fetch CSS from ${url}:`, error);
    }
  }

  return combinedCss;
}

/**
 * Extract colors from HTML and CSS
 */
function extractColors(html: string, externalCss = ""): string[] {
  const colorFrequency = new Map<string, number>();

  // Extract theme-color meta tags (highest priority)
  const themeColorMatch = html.match(
    /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i
  );
  if (themeColorMatch?.[1]) {
    const color = normalizeColor(themeColorMatch[1]);
    if (color && !isGrayscale(color)) {
      colorFrequency.set(color, (colorFrequency.get(color) || 0) + 10);
    }
  }

  // Extract from CSS variables (high priority - common in modern sites)
  const cssVarMatches = html.matchAll(
    /--(?:primary|secondary|accent|brand|main|theme|color)[-:]?\s*:\s*([^;})]+)[;})]/gi
  );
  for (const match of cssVarMatches) {
    const color = normalizeColor(match[1].trim());
    if (color && !isGrayscale(color)) {
      colorFrequency.set(color, (colorFrequency.get(color) || 0) + 8);
    }
  }

  // Extract from style attributes and CSS blocks
  const stylePatterns = [
    /background-color\s*:\s*([^;})]+)[;})]/gi,
    /background\s*:\s*([^;})]+)[;})]/gi,
    /color\s*:\s*([^;})]+)[;})]/gi,
    /border-color\s*:\s*([^;})]+)[;})]/gi,
  ];

  for (const pattern of stylePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const colorValue = match[1].trim();
      // Skip gradients and complex values
      if (
        !(
          colorValue.includes("gradient") ||
          colorValue.includes("url(") ||
          colorValue.includes("var(")
        )
      ) {
        const color = normalizeColor(colorValue);
        if (color && !isGrayscale(color)) {
          colorFrequency.set(color, (colorFrequency.get(color) || 0) + 2);
        }
      }
    }
  }

  // Extract colors from style tags
  const styleTagMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const match of styleTagMatches) {
    const cssContent = match[1];
    extractColorsFromCss(cssContent, colorFrequency, 3);
  }

  // Extract colors from external CSS (higher priority as it's usually the main stylesheet)
  if (externalCss) {
    extractColorsFromCss(externalCss, colorFrequency, 5);
  }

  // Sort by frequency and return top 3
  const sortedColors = Array.from(colorFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .slice(0, 5); // Get top 5 to have alternatives

  // Return up to 3 distinct colors
  return sortedColors.slice(0, 3);
}

/**
 * Extract colors from CSS content
 */
function extractColorsFromCss(
  css: string,
  colorFrequency: Map<string, number>,
  priority: number
): void {
  const colorMatches = css.matchAll(
    /(?:background-color|background|color|border-color|fill|stroke)\s*:\s*([^;})]+)[;})]/gi
  );
  for (const colorMatch of colorMatches) {
    const colorValue = colorMatch[1].trim();
    if (
      !(
        colorValue.includes("gradient") ||
        colorValue.includes("url(") ||
        colorValue.includes("var(") ||
        colorValue.includes("inherit") ||
        colorValue.includes("transparent")
      )
    ) {
      const color = normalizeColor(colorValue);
      if (color && !isGrayscale(color)) {
        colorFrequency.set(color, (colorFrequency.get(color) || 0) + priority);
      }
    }
  }
}

/**
 * Check if a color is grayscale (black, white, or gray)
 */
function isGrayscale(hexColor: string): boolean {
  if (!hexColor.startsWith("#") || hexColor.length !== 7) {
    return false;
  }

  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);

  // Check if R, G, B are similar (within threshold)
  // Increased threshold from 10 to 15 to catch more grays
  const threshold = 15;
  const isGray =
    Math.abs(r - g) < threshold &&
    Math.abs(g - b) < threshold &&
    Math.abs(r - b) < threshold;

  // Also filter out very dark colors (near black) and very light colors (near white)
  const brightness = (r + g + b) / 3;
  const isTooExtreme = brightness < 30 || brightness > 240;

  return isGray || isTooExtreme;
}

/**
 * Normalize color to hex format
 */
function normalizeColor(color: string): string | null {
  // Remove whitespace
  color = color.trim();

  // If it's already a hex color, return it
  if (/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(color)) {
    // Expand 3-digit hex to 6-digit
    if (color.length === 4) {
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
    }
    return color.toUpperCase();
  }

  // Try to parse rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  // Named colors (basic set)
  const namedColors: Record<string, string> = {
    black: "#000000",
    white: "#FFFFFF",
    red: "#FF0000",
    green: "#008000",
    blue: "#0000FF",
    yellow: "#FFFF00",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    gray: "#808080",
    grey: "#808080",
  };

  const lowerColor = color.toLowerCase();
  if (namedColors[lowerColor]) {
    return namedColors[lowerColor];
  }

  return null;
}

/**
 * Resolve a relative URL to an absolute URL
 */
function resolveUrl(url: string, baseUrl: URL): string {
  try {
    // If it's already absolute, return it
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // If it starts with //, it's protocol-relative
    if (url.startsWith("//")) {
      return `${baseUrl.protocol}${url}`;
    }

    // Otherwise, resolve relative to base URL
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}
