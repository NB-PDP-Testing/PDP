"use client";

import { AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SensitivityCategory = "normal" | "injury" | "behavior";

type SensitivityBadgeProps = {
  category: SensitivityCategory;
  className?: string;
};

/**
 * Get the semantic color classes and icon for a sensitivity category badge.
 */
function getCategoryStyles(category: SensitivityCategory): {
  badgeClass: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (category) {
    case "injury":
      return {
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <AlertTriangle className="h-3 w-3" />,
        label: "Injury",
      };
    case "behavior":
      return {
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Shield className="h-3 w-3" />,
        label: "Behavior",
      };
    case "normal":
      // No badge for normal category
      return {
        badgeClass: "",
        icon: null,
        label: "",
      };
    default:
      // Fallback for unknown categories
      return {
        badgeClass: "",
        icon: null,
        label: "",
      };
  }
}

/**
 * Displays a visual indicator for summary sensitivity category.
 * - Injury: Amber/yellow warning style with AlertTriangle icon
 * - Behavior: Blue info style with Shield icon
 * - Normal: Returns null (no badge needed)
 */
export function SensitivityBadge({
  category,
  className,
}: SensitivityBadgeProps) {
  const { badgeClass, icon, label } = getCategoryStyles(category);

  // Don't render anything for normal category
  if (category === "normal") {
    return null;
  }

  return (
    <Badge className={cn(badgeClass, "gap-1", className)} variant="outline">
      {icon}
      {label}
    </Badge>
  );
}
