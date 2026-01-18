"use client";

import { Clock, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PassportAvailabilityBadgesProps = {
  activeCount: number;
  hasActiveSharesToView: boolean;
  hasPendingSharesToAccept: boolean;
  onClick: (e: React.MouseEvent) => void;
  pendingCount: number;
  variant?: "compact" | "full";
};

/**
 * Display passport sharing availability badges for a player
 * Shows active shares (coach can view) and pending shares (coach needs to accept)
 *
 * Used in My Players table to indicate which players have shared passports available
 */
export function PassportAvailabilityBadges({
  activeCount,
  hasActiveSharesToView,
  hasPendingSharesToAccept,
  onClick,
  pendingCount,
  variant = "compact",
}: PassportAvailabilityBadgesProps) {
  // Don't render if no shares
  if (!(hasActiveSharesToView || hasPendingSharesToAccept)) {
    return null;
  }

  const isCompact = variant === "compact";

  return (
    <button
      className={cn(
        "inline-flex gap-1.5 border-0 bg-transparent p-0",
        isCompact ? "items-center" : "flex-col items-start"
      )}
      onClick={onClick}
      type="button"
    >
      {/* Active Shares Badge */}
      {hasActiveSharesToView && (
        <Badge
          className={cn(
            "cursor-pointer gap-1 transition-colors hover:opacity-80",
            isCompact
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
              : "bg-blue-500 text-white hover:bg-blue-600"
          )}
          variant="outline"
        >
          <Share2 className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          {isCompact ? activeCount : `${activeCount} Shared`}
        </Badge>
      )}

      {/* Pending Shares Badge */}
      {hasPendingSharesToAccept && (
        <Badge
          className={cn(
            "cursor-pointer gap-1 transition-colors hover:opacity-80",
            isCompact
              ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
              : "bg-orange-500 text-white hover:bg-orange-600"
          )}
          variant="outline"
        >
          <Clock className={cn(isCompact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          {isCompact ? pendingCount : `${pendingCount} Pending`}
        </Badge>
      )}
    </button>
  );
}
