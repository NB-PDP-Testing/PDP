"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  /** Show avatar/image placeholder */
  showAvatar?: boolean;
  /** Avatar size */
  avatarSize?: "sm" | "md" | "lg";
  /** Number of text lines */
  lines?: number;
  /** Show action buttons */
  showActions?: boolean;
  /** Show badge placeholder */
  showBadge?: boolean;
  /** Card variant */
  variant?: "default" | "horizontal" | "compact";
  /** Container class name */
  className?: string;
}

/**
 * CardSkeleton - Loading placeholder for card components
 *
 * Features:
 * - Multiple variants (default, horizontal, compact)
 * - Optional avatar/image
 * - Configurable text lines
 * - Optional action buttons
 */
export function CardSkeleton({
  showAvatar = true,
  avatarSize = "md",
  lines = 2,
  showActions = false,
  showBadge = false,
  variant = "default",
  className,
}: CardSkeletonProps) {
  const avatarSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  if (variant === "horizontal") {
    return (
      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border bg-card p-4",
          className
        )}
      >
        {showAvatar && (
          <Skeleton
            className={cn(
              "flex-shrink-0 rounded-full",
              avatarSizes[avatarSize]
            )}
          />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          {lines > 1 && <Skeleton className="h-3 w-1/2 rounded" />}
        </div>
        {showBadge && <Skeleton className="h-5 w-16 rounded-full" />}
        {showActions && (
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 rounded-md p-2", className)}>
        {showAvatar && (
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
        )}
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        {showActions && <Skeleton className="h-6 w-6 rounded" />}
      </div>
    );
  }

  // Default vertical card
  return (
    <div className={cn("space-y-4 rounded-lg border bg-card p-4", className)}>
      {/* Header with avatar */}
      <div className="flex items-start gap-3">
        {showAvatar && (
          <Skeleton
            className={cn(
              "flex-shrink-0 rounded-full",
              avatarSizes[avatarSize]
            )}
          />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
        {showBadge && <Skeleton className="h-5 w-16 rounded-full" />}
      </div>

      {/* Content lines */}
      {lines > 0 && (
        <div className="space-y-2">
          {Array.from({ length: Math.min(lines, 4) }).map((_, i) => (
            <Skeleton
              className="h-3 rounded"
              key={i}
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded" />
        </div>
      )}
    </div>
  );
}

/**
 * Grid of card skeletons for list views
 */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
  showAvatar = true,
  className,
}: {
  count?: number;
  columns?: 1 | 2 | 3 | 4;
  showAvatar?: boolean;
  className?: string;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} showAvatar={showAvatar} />
      ))}
    </div>
  );
}

/**
 * Stat card skeleton for dashboard
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 rounded-lg border bg-card p-4", className)}>
      <Skeleton className="h-4 w-1/2 rounded" />
      <Skeleton className="h-8 w-1/3 rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
    </div>
  );
}

/**
 * Grid of stat card skeletons
 */
export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
