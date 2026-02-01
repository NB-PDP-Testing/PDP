"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CalendarSkeletonProps = {
  /** Container class name */
  className?: string;
};

/**
 * CalendarSkeleton - Loading placeholder for calendar month view
 *
 * Features:
 * - Month header with navigation
 * - 7×6 grid for calendar days
 * - Responsive layout
 */
export function CalendarSkeleton({ className }: CalendarSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Calendar grid - 7 columns × 6 rows */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers (Sun-Sat) */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div className="text-center" key={`header-${i}`}>
            <Skeleton className="mx-auto h-4 w-8 rounded" />
          </div>
        ))}

        {/* Calendar day cells (6 weeks × 7 days = 42 cells) */}
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            className="aspect-square rounded-md border bg-card p-2"
            key={`day-${i}`}
          >
            <Skeleton className="h-4 w-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
