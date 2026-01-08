"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  /** Number of rows to show */
  rows?: number;
  /** Number of columns to show */
  columns?: number;
  /** Whether to show a header row */
  showHeader?: boolean;
  /** Whether to show checkboxes column */
  showCheckbox?: boolean;
  /** Whether to show action buttons column */
  showActions?: boolean;
  /** Custom column widths (percentages) */
  columnWidths?: number[];
  /** Container class name */
  className?: string;
}

/**
 * TableSkeleton - Loading placeholder for data tables
 * 
 * Features:
 * - Configurable rows and columns
 * - Optional header row
 * - Optional checkbox column
 * - Optional actions column
 * - Staggered animation
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showCheckbox = false,
  showActions = false,
  columnWidths,
  className,
}: TableSkeletonProps) {
  // Calculate default column widths if not provided
  const defaultWidths = React.useMemo(() => {
    if (columnWidths) return columnWidths;
    // First column wider (name), rest equal
    const baseWidth = 100 / columns;
    return Array(columns)
      .fill(0)
      .map((_, i) => (i === 0 ? baseWidth * 1.5 : baseWidth * 0.875));
  }, [columns, columnWidths]);

  return (
    <div className={cn("w-full overflow-hidden rounded-md border", className)}>
      <div className="w-full">
        {/* Header row */}
        {showHeader && (
          <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
            {showCheckbox && (
              <Skeleton className="h-4 w-4 rounded" />
            )}
            {defaultWidths.map((width, i) => (
              <Skeleton
                key={`header-${i}`}
                className="h-4 rounded"
                style={{ width: `${width}%` }}
              />
            ))}
            {showActions && (
              <Skeleton className="h-4 w-16 rounded" />
            )}
          </div>
        )}

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={cn(
              "flex items-center gap-4 px-4 py-3",
              rowIndex < rows - 1 && "border-b"
            )}
            style={{
              animationDelay: `${rowIndex * 50}ms`,
            }}
          >
            {showCheckbox && (
              <Skeleton className="h-4 w-4 rounded" />
            )}
            {defaultWidths.map((width, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className={cn(
                  "h-4 rounded",
                  colIndex === 0 && "h-5" // First column taller (name)
                )}
                style={{ width: `${width}%` }}
              />
            ))}
            {showActions && (
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact table skeleton for inline loading
 */
export function TableRowSkeleton({
  columns = 4,
  showCheckbox = false,
  className,
}: {
  columns?: number;
  showCheckbox?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-3", className)}>
      {showCheckbox && <Skeleton className="h-4 w-4 rounded" />}
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1 rounded"
          style={{ maxWidth: i === 0 ? "200px" : "120px" }}
        />
      ))}
    </div>
  );
}