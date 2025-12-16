import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export type OrgTheme = {
  primary: string;
  secondary: string;
  tertiary: string;
  primaryRgb: string;
  secondaryRgb: string;
  tertiaryRgb: string;
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
 */
export function useOrgTheme(options: UseOrgThemeOptions = {}) {
  const { skip = false } = options;
  const params = useParams();
  const orgId = params?.orgId as string | undefined;

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

  const theme: OrgTheme = {
    primary: primaryColor,
    secondary: secondaryColor,
    tertiary: tertiaryColor,
    primaryRgb: hexToRgb(primaryColor),
    secondaryRgb: hexToRgb(secondaryColor),
    tertiaryRgb: hexToRgb(tertiaryColor),
  };

  // Apply CSS variables to the document root
  useEffect(() => {
    // Skip applying CSS variables when skip is true (e.g., on join pages)
    if (skip || !orgId) {
      // Remove custom properties when not in org context or skipping
      document.documentElement.style.removeProperty("--org-primary");
      document.documentElement.style.removeProperty("--org-primary-rgb");
      document.documentElement.style.removeProperty("--org-secondary");
      document.documentElement.style.removeProperty("--org-secondary-rgb");
      document.documentElement.style.removeProperty("--org-tertiary");
      document.documentElement.style.removeProperty("--org-tertiary-rgb");
      return;
    }

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
  }, [
    skip,
    orgId,
    theme.primary,
    theme.secondary,
    theme.tertiary,
    theme.primaryRgb,
    theme.secondaryRgb,
    theme.tertiaryRgb,
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
  };
}

/**
 * Utility to get inline styles for org-themed elements
 */
export function getOrgThemeStyles(
  type: "primary" | "secondary" | "tertiary" = "primary"
) {
  const varName = `--org-${type}`;
  const rgbVarName = `--org-${type}-rgb`;

  return {
    backgroundColor: `var(${varName})`,
    color: "white",
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
