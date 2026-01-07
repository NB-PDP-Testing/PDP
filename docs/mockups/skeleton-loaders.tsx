/**
 * MOCKUP: Skeleton Loading States
 *
 * Industry Standard: Skeleton loaders maintain layout during loading,
 * reducing perceived wait time and preventing layout shift.
 *
 * Research shows skeleton screens can reduce perceived loading time by up to 10%
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * PLAYER CARD SKELETON
 * Matches MobilePlayerCard layout exactly
 */
export function PlayerCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      {/* Avatar skeleton */}
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />

      {/* Content skeleton */}
      <div className="flex-1 space-y-2">
        {/* Name */}
        <Skeleton className="h-5 w-32" />
        {/* Badges */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Rating */}
        <Skeleton className="h-3 w-24" />
      </div>

      {/* Right side */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-5" />
      </div>
    </div>
  );
}

/**
 * PLAYER LIST SKELETON
 * Shows multiple card skeletons
 */
export function PlayerListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <PlayerCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * STATS CARD SKELETON
 * For dashboard metric cards
 */
export function StatsCardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Icon + Title */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      {/* Large number */}
      <Skeleton className="h-8 w-16" />
      {/* Subtitle */}
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * DASHBOARD SKELETON
 * Complete dashboard loading state
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Content area */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TABLE SKELETON
 * For data table loading states
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="flex gap-4 bg-muted/50 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton className="h-4 flex-1" key={i} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className={cn(
            "flex items-center gap-4 px-4 py-3",
            rowIndex !== rows - 1 && "border-b"
          )}
          key={rowIndex}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              className={cn(
                "h-4 flex-1",
                colIndex === 0 && "max-w-[150px]", // Name column narrower
                colIndex === columns - 1 && "max-w-[80px]" // Action column narrower
              )}
              key={colIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * PROFILE SKELETON
 * For player/user profile pages
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header with avatar */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b pb-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="space-y-2" key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * FORM SKELETON
 * For form loading states
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 p-4">
      {/* Title */}
      <Skeleton className="h-7 w-48" />

      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div className="space-y-2" key={i}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" /> {/* Touch-optimized height */}
          </div>
        ))}
      </div>

      {/* Submit button */}
      <Skeleton className="h-11 w-full md:w-32" />
    </div>
  );
}

/**
 * ANNOUNCEMENT CARD SKELETON
 */
export function AnnouncementSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/**
 * GENERIC CONTENT SKELETON
 * For unknown content layouts
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-4">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * ANIMATED SKELETON VARIANT
 * With shimmer effect for more visual feedback
 */
export function ShimmerSkeleton({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return (
    <Skeleton
      className={cn(
        "relative overflow-hidden",
        // Shimmer animation
        "after:absolute after:inset-0",
        "after:translate-x-[-100%]",
        "after:animate-[shimmer_2s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * CSS ADDITION NEEDED:
 *
 * Add to index.css:
 *
 * @keyframes shimmer {
 *   100% {
 *     transform: translateX(100%);
 *   }
 * }
 */

/**
 * USAGE EXAMPLES:
 *
 * // In a page component:
 * if (isLoading) {
 *   return <DashboardSkeleton />;
 * }
 *
 * // In a list component:
 * if (isLoading) {
 *   return <PlayerListSkeleton count={10} />;
 * }
 *
 * // In a table component:
 * if (isLoading) {
 *   return <TableSkeleton rows={10} columns={5} />;
 * }
 *
 * // For Next.js loading.tsx:
 * // apps/web/src/app/orgs/[orgId]/admin/loading.tsx
 * export default function Loading() {
 *   return <DashboardSkeleton />;
 * }
 */
