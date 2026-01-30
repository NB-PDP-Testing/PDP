"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CenteredSkeletonProps = {
  /** Additional class name */
  className?: string;
};

/**
 * CenteredSkeleton - Minimal centered loading placeholder
 *
 * Used for auth/transition pages where a full page skeleton
 * would be excessive but a spinner should be avoided.
 *
 * Shows a pulsing skeleton circle and bar, centered on screen.
 */
export function CenteredSkeleton({ className }: CenteredSkeletonProps) {
  return (
    <div
      className={cn("flex min-h-screen items-center justify-center", className)}
    >
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    </div>
  );
}
