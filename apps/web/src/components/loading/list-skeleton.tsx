"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  /** Number of items to show */
  items?: number;
  /** Show icon/avatar on left */
  showIcon?: boolean;
  /** Show chevron/action on right */
  showChevron?: boolean;
  /** Show secondary text line */
  showSecondary?: boolean;
  /** Variant style */
  variant?: "default" | "separated" | "bordered";
  /** Container class name */
  className?: string;
}

/**
 * ListSkeleton - Loading placeholder for list items
 * 
 * Features:
 * - Configurable item count
 * - Optional icon/avatar
 * - Optional secondary text
 * - Multiple variants
 */
export function ListSkeleton({
  items = 5,
  showIcon = true,
  showChevron = false,
  showSecondary = true,
  variant = "default",
  className,
}: ListSkeletonProps) {
  const itemClass = {
    default: "",
    separated: "border-b last:border-b-0",
    bordered: "border rounded-md mb-2 last:mb-0",
  };

  return (
    <div className={cn("space-y-0", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 py-3 px-2",
            itemClass[variant]
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {showIcon && (
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4 rounded" />
            {showSecondary && (
              <Skeleton className="h-3 w-1/2 rounded" />
            )}
          </div>
          {showChevron && (
            <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Simple list with just text lines
 */
export function TextListSkeleton({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          style={{ width: `${85 - i * 5}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Navigation/menu list skeleton
 */
export function NavListSkeleton({
  items = 6,
  showIcons = true,
  className,
}: {
  items?: number;
  showIcons?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 rounded-md"
        >
          {showIcons && <Skeleton className="h-4 w-4 rounded" />}
          <Skeleton
            className="h-4 rounded flex-1"
            style={{ maxWidth: `${120 + Math.random() * 60}px` }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Timeline/activity list skeleton
 */
export function TimelineSkeletion({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-3 w-3 rounded-full" />
            {i < items - 1 && (
              <Skeleton className="w-0.5 flex-1 mt-1" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 pb-4 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}