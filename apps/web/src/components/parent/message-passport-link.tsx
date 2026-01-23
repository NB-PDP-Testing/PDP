"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessagePassportLinkProps {
  summaryId: Id<"coachParentSummaries">;
  className?: string;
}

/**
 * Link component to navigate from summary to player passport
 * Shows "View in Passport" with arrow icon
 * Queries backend to determine correct passport section based on insight category
 */
export function MessagePassportLink({
  summaryId,
  className,
}: MessagePassportLinkProps) {
  const router = useRouter();

  // Query to get passport link data
  const linkData = useQuery(
    api.models.coachParentSummaries.getPassportLinkForSummary,
    { summaryId }
  );

  const handleClick = () => {
    if (linkData?.url) {
      router.push(linkData.url as Route);
    }
  };

  // Show loading state while query resolves
  if (linkData === undefined) {
    return (
      <Button
        className={cn("gap-1", className)}
        disabled
        size="sm"
        variant="link"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  // Disable if no link data
  if (!linkData) {
    return null;
  }

  return (
    <Button
      className={cn("gap-1", className)}
      onClick={handleClick}
      size="sm"
      variant="link"
    >
      View in Passport
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
