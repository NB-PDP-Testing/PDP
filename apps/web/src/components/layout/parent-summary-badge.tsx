"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";

interface ParentSummaryBadgeProps {
  orgId: string;
}

export function ParentSummaryBadge({ orgId }: ParentSummaryBadgeProps) {
  const unreadCount = useQuery(
    api.models.coachParentSummaries.getParentUnreadCount,
    {
      organizationId: orgId,
    }
  );

  // Don't show badge if no unread summaries
  if (!unreadCount || unreadCount === 0) {
    return null;
  }

  // Display "9+" if count exceeds 9
  const displayCount = unreadCount > 9 ? "9+" : unreadCount.toString();

  return (
    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 font-semibold text-white text-xs">
      {displayCount}
    </span>
  );
}
