import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  colors?: string[];
};

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

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return "22, 163, 74"; // Default green
  }
  const r = Number.parseInt(result[1], 16);
  const g = Number.parseInt(result[2], 16);
  const b = Number.parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Hook to get and apply organization theme colors
 */
export function useOrgTheme() {
  const params = useParams();
  const orgId = params?.orgId as string | undefined;
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setOrg(null);
      setLoading(false);
      return;
    }

    const loadOrg = async () => {
      try {
        const { data } = await authClient.organization.getFullOrganization({
          query: {
            organizationId: orgId,
          },
        });
        if (data) {
          setOrg(data as Organization);
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOrg();
  }, [orgId]);

  // Build theme object
  const theme: OrgTheme = {
    primary: org?.colors?.[0] || DEFAULT_COLORS.primary,
    secondary: org?.colors?.[1] || DEFAULT_COLORS.secondary,
    tertiary: org?.colors?.[2] || DEFAULT_COLORS.tertiary,
    primaryRgb: hexToRgb(org?.colors?.[0] || DEFAULT_COLORS.primary),
    secondaryRgb: hexToRgb(org?.colors?.[1] || DEFAULT_COLORS.secondary),
    tertiaryRgb: hexToRgb(org?.colors?.[2] || DEFAULT_COLORS.tertiary),
  };

  // Apply CSS variables to the document root
  useEffect(() => {
    if (!orgId) {
      // Remove custom properties when not in org context
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
    org,
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
