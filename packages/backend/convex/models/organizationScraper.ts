"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Scrape a website to extract organization metadata, logo, and colors
 *
 * Color extraction strategy:
 * 1. Look for explicit theme-color meta tag (highest priority)
 * 2. Look for CSS variables with brand-related names
 * 3. Look for colors in header/navigation elements
 * 4. Fall back to frequency analysis of all CSS colors
 *
 * Note: This cannot extract colors from logo images - that would require
 * image processing which isn't available in this environment.
 */
export const scrapeWebsite = action({
  args: {
    url: v.string(),
  },
  returns: v.object({
    logo: v.union(v.string(), v.null()),
    colors: v.array(v.string()),
    name: v.union(v.string(), v.null()),
    description: v.union(v.string(), v.null()),
    socialLinks: v.object({
      facebook: v.union(v.string(), v.null()),
      twitter: v.union(v.string(), v.null()),
      instagram: v.union(v.string(), v.null()),
      linkedin: v.union(v.string(), v.null()),
    }),
    colorSource: v.string(), // Tells user where colors came from
  }),
  handler: async (_ctx, args) => {
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

      // Extract all metadata
      const logo = extractLogo(html, baseUrl);
      const { colors, source: colorSource } = extractColors(html, externalCss);
      const name = extractOrganizationName(html);
      const description = extractDescription(html);
      const socialLinks = extractSocialLinks(html, baseUrl);

      return {
        logo,
        colors,
        name,
        description,
        socialLinks,
        colorSource,
      };
    } catch (error) {
      console.error("Error scraping website:", error);
      return {
        logo: null,
        colors: [],
        name: null,
        description: null,
        socialLinks: {
          facebook: null,
          twitter: null,
          instagram: null,
          linkedin: null,
        },
        colorSource: "none",
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
  if (ogImageMatch?.[1]) {
    return resolveUrl(ogImageMatch[1], baseUrl);
  }

  // Try alternate og:image format
  const ogImageMatch2 = html.match(
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i
  );
  if (ogImageMatch2?.[1]) {
    return resolveUrl(ogImageMatch2[1], baseUrl);
  }

  // Try twitter:image
  const twitterImageMatch = html.match(
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i
  );
  if (twitterImageMatch?.[1]) {
    return resolveUrl(twitterImageMatch[1], baseUrl);
  }

  // Try apple-touch-icon (usually high quality logo)
  const appleIconMatch = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (appleIconMatch?.[1]) {
    return resolveUrl(appleIconMatch[1], baseUrl);
  }

  // Try favicon
  const faviconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut\s+)?icon["'][^>]+href=["']([^"']+)["']/i
  );
  if (faviconMatch?.[1]) {
    return resolveUrl(faviconMatch[1], baseUrl);
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
 * Extract colors from HTML and CSS using multiple strategies
 * Returns colors and the source of where they were found
 */
function extractColors(
  html: string,
  externalCss = ""
): { colors: string[]; source: string } {
  // Strategy 1: Theme-color meta tag (highest confidence)
  const themeColor = extractThemeColorMeta(html);
  if (themeColor) {
    // If we have a theme color, look for complementary colors
    const additionalColors = extractAdditionalColors(html, externalCss, [
      themeColor,
    ]);
    return {
      colors: [themeColor, ...additionalColors].slice(0, 3),
      source: "theme-color meta tag",
    };
  }

  // Strategy 2: CSS custom properties with brand-related names
  const brandVarColors = extractBrandCssVariables(html + externalCss);
  if (brandVarColors.length > 0) {
    return {
      colors: brandVarColors.slice(0, 3),
      source: "CSS brand variables",
    };
  }

  // Strategy 3: Look for colors in header/nav elements (likely brand colors)
  const headerColors = extractHeaderColors(html);
  if (headerColors.length > 0) {
    const additionalColors = extractAdditionalColors(
      html,
      externalCss,
      headerColors
    );
    return {
      colors: [...headerColors, ...additionalColors].slice(0, 3),
      source: "header/navigation styling",
    };
  }

  // Strategy 4: Frequency analysis (least reliable but better than nothing)
  const frequencyColors = extractColorsByFrequency(html, externalCss);
  if (frequencyColors.length > 0) {
    return {
      colors: frequencyColors.slice(0, 3),
      source: "CSS frequency analysis (may need manual adjustment)",
    };
  }

  return { colors: [], source: "none found" };
}

/**
 * Extract theme-color meta tag
 */
function extractThemeColorMeta(html: string): string | null {
  // Try both attribute orders
  const match1 = html.match(
    /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i
  );
  if (match1?.[1]) {
    const color = normalizeColor(match1[1]);
    if (color && !isGrayscale(color)) {
      return color;
    }
  }

  const match2 = html.match(
    /<meta\s+content=["']([^"']+)["']\s+name=["']theme-color["']/i
  );
  if (match2?.[1]) {
    const color = normalizeColor(match2[1]);
    if (color && !isGrayscale(color)) {
      return color;
    }
  }

  return null;
}

/**
 * Common framework default colors to exclude
 * These are Bootstrap, Tailwind, and other framework defaults that aren't actual brand colors
 */
const FRAMEWORK_DEFAULT_COLORS = new Set([
  // Bootstrap semantic colors
  "#007BFF", // Bootstrap primary blue
  "#6C757D", // Bootstrap secondary gray
  "#28A745", // Bootstrap success green
  "#DC3545", // Bootstrap danger red
  "#FFC107", // Bootstrap warning yellow
  "#17A2B8", // Bootstrap info cyan
  "#F8F9FA", // Bootstrap light
  "#343A40", // Bootstrap dark
  "#6610F2", // Bootstrap indigo
  "#E83E8C", // Bootstrap pink
  "#20C997", // Bootstrap teal
  "#FD7E14", // Bootstrap orange
  // Bootstrap gray scale (very common in Bootstrap sites)
  "#212529", // Bootstrap gray-900 / body text
  "#495057", // Bootstrap gray-700
  "#6C757D", // Bootstrap gray-600
  "#ADB5BD", // Bootstrap gray-500
  "#CED4DA", // Bootstrap gray-400
  "#DEE2E6", // Bootstrap gray-300
  "#E9ECEF", // Bootstrap gray-200
  "#F8F9FA", // Bootstrap gray-100
  // Bootstrap 5 additional colors
  "#0D6EFD", // Bootstrap 5 primary
  "#198754", // Bootstrap 5 success
  "#0DCAF0", // Bootstrap 5 info
  "#FFC107", // Bootstrap 5 warning
  "#DC3545", // Bootstrap 5 danger
  // Tailwind defaults
  "#3B82F6", // Tailwind blue-500
  "#10B981", // Tailwind emerald-500
  "#EF4444", // Tailwind red-500
  "#F59E0B", // Tailwind amber-500
  "#8B5CF6", // Tailwind violet-500
  "#EC4899", // Tailwind pink-500
  // Tailwind gray scale
  "#111827", // Tailwind gray-900
  "#1F2937", // Tailwind gray-800
  "#374151", // Tailwind gray-700
  "#4B5563", // Tailwind gray-600
  "#6B7280", // Tailwind gray-500
  "#9CA3AF", // Tailwind gray-400
  "#D1D5DB", // Tailwind gray-300
  "#E5E7EB", // Tailwind gray-200
  "#F3F4F6", // Tailwind gray-100
  "#F9FAFB", // Tailwind gray-50
  // WordPress defaults
  "#0073AA", // WordPress blue
  "#23282D", // WordPress dark gray
]);

/**
 * Check if a color is a known framework default
 */
function isFrameworkDefault(color: string): boolean {
  return FRAMEWORK_DEFAULT_COLORS.has(color.toUpperCase());
}

/**
 * Extract colors from CSS variables with brand-related names
 * Excludes common framework default colors
 */
function extractBrandCssVariables(cssContent: string): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();

  // Look for variables with brand-related names
  const brandPatterns = [
    /--(?:primary|brand|main|theme|accent|club|team)(?:-color)?(?:-\d+)?\s*:\s*([^;})]+)/gi,
    /--(?:secondary|highlight|feature)(?:-color)?(?:-\d+)?\s*:\s*([^;})]+)/gi,
    /--(?:tertiary|accent-2|alt)(?:-color)?(?:-\d+)?\s*:\s*([^;})]+)/gi,
  ];

  for (const pattern of brandPatterns) {
    const matches = cssContent.matchAll(pattern);
    for (const match of matches) {
      const color = normalizeColor(match[1].trim());
      // Exclude grayscale and framework default colors
      if (
        color &&
        !isGrayscale(color) &&
        !isFrameworkDefault(color) &&
        !seen.has(color)
      ) {
        colors.push(color);
        seen.add(color);
      }
    }
  }

  return colors;
}

/**
 * Extract colors from header/navigation elements
 * These are typically brand colors
 * Excludes framework defaults
 */
function extractHeaderColors(html: string): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();

  // Look for header, nav, or banner elements with inline styles
  const headerPattern =
    /<(?:header|nav|div[^>]+class=["'][^"']*(?:header|nav|banner|top-bar)[^"']*["'])[^>]*style=["']([^"']+)["']/gi;
  const matches = html.matchAll(headerPattern);

  for (const match of matches) {
    const style = match[1];
    // Extract background-color from the style
    const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    if (bgMatch) {
      const color = normalizeColor(bgMatch[1].trim());
      // Exclude grayscale and framework default colors
      if (
        color &&
        !isGrayscale(color) &&
        !isFrameworkDefault(color) &&
        !seen.has(color)
      ) {
        colors.push(color);
        seen.add(color);
      }
    }
  }

  return colors;
}

/**
 * Extract additional complementary colors
 */
function extractAdditionalColors(
  html: string,
  externalCss: string,
  excludeColors: string[]
): string[] {
  const colorFrequency = new Map<string, number>();
  const excludeSet = new Set(excludeColors.map((c) => c.toUpperCase()));

  // Extract from all CSS
  extractColorsFromCss(html + externalCss, colorFrequency, 1);

  // Filter and sort
  return Array.from(colorFrequency.entries())
    .filter(([color]) => !excludeSet.has(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
    .slice(0, 2);
}

/**
 * Extract colors by frequency (fallback method)
 */
function extractColorsByFrequency(html: string, externalCss: string): string[] {
  const colorFrequency = new Map<string, number>();

  // Extract from style tags
  const styleTagMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  for (const match of styleTagMatches) {
    extractColorsFromCss(match[1], colorFrequency, 3);
  }

  // Extract from external CSS
  if (externalCss) {
    extractColorsFromCss(externalCss, colorFrequency, 5);
  }

  // Extract from inline styles
  const inlineStyleMatches = html.matchAll(/style=["']([^"']+)["']/gi);
  for (const match of inlineStyleMatches) {
    extractColorsFromCss(match[1], colorFrequency, 2);
  }

  // Sort by frequency and return
  return Array.from(colorFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color)
    .slice(0, 3);
}

/**
 * Extract colors from CSS content
 * Excludes grayscale colors and framework defaults
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

    // Skip complex values
    if (
      colorValue.includes("gradient") ||
      colorValue.includes("url(") ||
      colorValue.includes("var(") ||
      colorValue.includes("inherit") ||
      colorValue.includes("transparent") ||
      colorValue.includes("currentColor") ||
      colorValue.includes("initial") ||
      colorValue.includes("unset")
    ) {
      continue;
    }

    const color = normalizeColor(colorValue);
    // Exclude grayscale and framework default colors
    if (color && !isGrayscale(color) && !isFrameworkDefault(color)) {
      colorFrequency.set(color, (colorFrequency.get(color) || 0) + priority);
    }
  }
}

/**
 * Check if a color is grayscale (black, white, or gray)
 * Made less aggressive to allow off-whites and light colors that might be brand colors
 */
function isGrayscale(hexColor: string): boolean {
  if (!hexColor.startsWith("#") || hexColor.length !== 7) {
    return false;
  }

  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);

  // Check if R, G, B are very similar (true gray)
  const threshold = 12;
  const isGray =
    Math.abs(r - g) < threshold &&
    Math.abs(g - b) < threshold &&
    Math.abs(r - b) < threshold;

  // Filter out very dark colors (near black) - but keep other grays that might be intentional
  const brightness = (r + g + b) / 3;
  const isNearBlack = brightness < 25;
  const isNearWhite = brightness > 250;

  return (isGray && (isNearBlack || isNearWhite)) || isNearBlack;
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
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, Number.parseInt(rgbMatch[1], 10));
    const g = Math.min(255, Number.parseInt(rgbMatch[2], 10));
    const b = Math.min(255, Number.parseInt(rgbMatch[3], 10));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  // Try hsl/hsla
  const hslMatch = color.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i);
  if (hslMatch) {
    const h = Number.parseInt(hslMatch[1], 10);
    const s = Number.parseInt(hslMatch[2], 10) / 100;
    const l = Number.parseInt(hslMatch[3], 10) / 100;
    const rgb = hslToRgb(h, s, l);
    return `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  // Named colors (expanded set)
  const namedColors: Record<string, string> = {
    red: "#FF0000",
    green: "#008000",
    blue: "#0000FF",
    yellow: "#FFFF00",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
    lime: "#00FF00",
    teal: "#008080",
    navy: "#000080",
    maroon: "#800000",
    olive: "#808000",
    aqua: "#00FFFF",
    gold: "#FFD700",
    silver: "#C0C0C0",
    coral: "#FF7F50",
    salmon: "#FA8072",
    khaki: "#F0E68C",
    violet: "#EE82EE",
    indigo: "#4B0082",
    crimson: "#DC143C",
    turquoise: "#40E0D0",
  };

  const lowerColor = color.toLowerCase();
  if (namedColors[lowerColor]) {
    return namedColors[lowerColor];
  }

  return null;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  h /= 360;

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) {
        t += 1;
      }
      if (t > 1) {
        t -= 1;
      }
      if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
      }
      if (t < 1 / 2) {
        return q;
      }
      if (t < 2 / 3) {
        return p + (q - p) * (2 / 3 - t) * 6;
      }
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
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

/**
 * Extract organization name from HTML
 * Tries og:site_name, og:title, then page title
 */
function extractOrganizationName(html: string): string | null {
  // Try og:site_name first (most reliable for organization name)
  const siteNameMatch = html.match(
    /<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i
  );
  if (siteNameMatch?.[1]) {
    return cleanText(siteNameMatch[1]);
  }

  // Try alternate format
  const siteNameMatch2 = html.match(
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i
  );
  if (siteNameMatch2?.[1]) {
    return cleanText(siteNameMatch2[1]);
  }

  // Try og:title
  const ogTitleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (ogTitleMatch?.[1]) {
    const title = cleanText(ogTitleMatch[1]);
    return cleanOrganizationTitle(title);
  }

  // Try page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = cleanText(titleMatch[1]);
    return cleanOrganizationTitle(title);
  }

  return null;
}

/**
 * Clean organization title by removing common suffixes
 */
function cleanOrganizationTitle(title: string): string {
  // Remove common suffixes
  const suffixPatterns = [
    /\s*[-|–—]\s*(?:Home|Welcome|Official|Website|Site).*$/i,
    /\s*[-|–—]\s*(?:Official Site|Official Website)$/i,
    /\s*\|\s*(?:Home|Welcome).*$/i,
  ];

  let cleaned = title;
  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

/**
 * Extract description from HTML
 */
function extractDescription(html: string): string | null {
  // Try og:description first
  const ogDescMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  );
  if (ogDescMatch?.[1]) {
    return cleanText(ogDescMatch[1]);
  }

  // Try alternate format
  const ogDescMatch2 = html.match(
    /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i
  );
  if (ogDescMatch2?.[1]) {
    return cleanText(ogDescMatch2[1]);
  }

  // Try meta description
  const metaDescMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  if (metaDescMatch?.[1]) {
    return cleanText(metaDescMatch[1]);
  }

  // Try alternate format
  const metaDescMatch2 = html.match(
    /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i
  );
  if (metaDescMatch2?.[1]) {
    return cleanText(metaDescMatch2[1]);
  }

  return null;
}

/**
 * Extract social media links from HTML
 */
function extractSocialLinks(
  html: string,
  baseUrl: URL
): {
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
} {
  const socialLinks = {
    facebook: null as string | null,
    twitter: null as string | null,
    instagram: null as string | null,
    linkedin: null as string | null,
  };

  // Extract all href links
  const hrefMatches = html.matchAll(/href=["']([^"']+)["']/gi);

  for (const match of hrefMatches) {
    const href = match[1];
    if (!href) {
      continue;
    }

    const url = href.toLowerCase();

    if (
      url.includes("facebook.com") ||
      url.includes("fb.com") ||
      url.includes("fb.me")
    ) {
      socialLinks.facebook = resolveUrl(href, baseUrl);
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
      socialLinks.twitter = resolveUrl(href, baseUrl);
    } else if (url.includes("instagram.com")) {
      socialLinks.instagram = resolveUrl(href, baseUrl);
    } else if (url.includes("linkedin.com")) {
      socialLinks.linkedin = resolveUrl(href, baseUrl);
    }
  }

  return socialLinks;
}

/**
 * Clean and decode text content
 */
function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}
