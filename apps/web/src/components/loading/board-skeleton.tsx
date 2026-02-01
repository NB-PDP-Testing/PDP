"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CardSkeleton } from "./card-skeleton";

type BoardSkeletonProps = {
  /** Number of columns to show */
  columns?: number;
  /** Cards per column */
  cardsPerColumn?: number;
  /** Container class name */
  className?: string;
};

/**
 * BoardSkeleton - Loading placeholder for Kanban board view
 *
 * Features:
 * - 3 columns by default (Pending, Applied, Dismissed)
 * - Each column has header + card items
 * - Responsive layout
 */
export function BoardSkeleton({
  columns = 3,
  cardsPerColumn = 3,
  className,
}: BoardSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: columns }).map((_, colIdx) => {
        return (
          <div
            className="space-y-3 rounded-lg border bg-muted/20 p-4"
            key={colIdx}
          >
            {/* Column header */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>

            {/* Column cards */}
            <div className="space-y-2">
              {Array.from({ length: cardsPerColumn }).map((_item, cardIdx) => (
                <CardSkeleton
                  key={cardIdx}
                  lines={1}
                  showActions={false}
                  showAvatar={false}
                  showBadge={true}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
