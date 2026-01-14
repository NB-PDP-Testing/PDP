"use client";

import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { cn } from "@/lib/utils";
import { SwipeableCard } from "./swipeable-card";

/**
 * Column definition for ResponsiveDataView
 */
export type DataColumn<T> = {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Accessor function to get cell value */
  accessor: (item: T) => React.ReactNode;
  /** Export accessor - returns plain string for CSV export (optional, defaults to accessor result) */
  exportAccessor?: (item: T) => string | number | null | undefined;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether to show on mobile card (default: first 3 columns) */
  mobileVisible?: boolean;
  /** Custom width class */
  width?: string;
  /** Whether column can be hidden */
  hideable?: boolean;
};

/**
 * Action definition for row actions
 */
export type DataAction<T> = {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Action handler */
  onClick: (item: T) => void;
  /** Whether action is destructive (red) */
  destructive?: boolean;
  /** Whether action is disabled */
  disabled?: (item: T) => boolean;
};

/**
 * Swipe action definition for mobile cards
 */
export type SwipeActionDef<T> = {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Background color class */
  bgColor?: string;
  /** Text color class */
  textColor?: string;
  /** Action handler */
  onClick: (item: T) => void;
};

/**
 * Props for ResponsiveDataView
 */
export type ResponsiveDataViewProps<T> = {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: DataColumn<T>[];
  /** Row actions */
  actions?: DataAction<T>[];
  /** Left swipe actions (revealed when swiping left on mobile) */
  leftSwipeActions?: SwipeActionDef<T>[];
  /** Right swipe actions (revealed when swiping right on mobile) */
  rightSwipeActions?: SwipeActionDef<T>[];
  /** Get unique key for each item */
  getKey: (item: T) => string;
  /** Custom mobile card renderer (optional) */
  renderMobileCard?: (item: T, actions?: DataAction<T>[]) => React.ReactNode;
  /** Whether to show selection checkboxes */
  selectable?: boolean;
  /** Selected item keys */
  selectedKeys?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Loading state */
  loading?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
  /** Sort change handler */
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
  /** Click handler for row */
  onRowClick?: (item: T) => void;
  /** Pull-to-refresh handler (mobile only, requires ux_pull_to_refresh flag) */
  onRefresh?: () => Promise<void>;
  /** Class name for container */
  className?: string;
};

/**
 * ResponsiveDataView - Shows cards on mobile, table on desktop
 *
 * Phase 2 UX improvement: Automatically switches between mobile-optimized
 * card view and desktop-optimized table view based on screen size.
 */
export function ResponsiveDataView<T>({
  data,
  columns,
  actions,
  leftSwipeActions,
  rightSwipeActions,
  getKey,
  renderMobileCard,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  loading = false,
  emptyState,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  onRefresh,
  className,
}: ResponsiveDataViewProps<T>) {
  const isMobile = useIsMobile();
  const { useMobileCards, useSwipeCards, usePullToRefresh } =
    useUXFeatureFlags();

  // Use mobile cards if: on mobile AND feature flag enabled (or custom renderer provided)
  const showMobileView = isMobile && (useMobileCards || renderMobileCard);

  // Enable swipe if: swipe actions provided AND (feature flag enabled OR always on mobile with swipe actions)
  const hasSwipeActions =
    (leftSwipeActions && leftSwipeActions.length > 0) ||
    (rightSwipeActions && rightSwipeActions.length > 0);
  const enableSwipe = hasSwipeActions; // Enable by default when swipe actions are provided

  // Pull-to-refresh state
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startYRef = React.useRef(0);
  const isPullingRef = React.useRef(false);

  // Enable pull-to-refresh if: handler provided (works in both mobile and desktop for testing)
  // Note: enabled by default when onRefresh is provided
  const enablePullToRefresh = !!onRefresh;

  // Pull-to-refresh handlers (touch events)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enablePullToRefresh || isRefreshing) {
      return;
    }
    // Check if at top of scroll (window or container)
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) {
      return;
    }
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      // Apply resistance (0.5x drag distance)
      setPullDistance(Math.min(diff * 0.5, 100));
      // Prevent default scroll when pulling
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) {
      return;
    }
    isPullingRef.current = false;

    if (pullDistance > 60 && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  // Mouse event handlers for desktop/Chrome DevTools testing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enablePullToRefresh || isRefreshing) {
      return;
    }
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startYRef.current = e.clientY;
      isPullingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPullingRef.current || isRefreshing) {
      return;
    }
    const diff = e.clientY - startYRef.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  };

  const handleMouseUp = async () => {
    if (!isPullingRef.current) {
      return;
    }
    isPullingRef.current = false;

    if (pullDistance > 60 && onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  const handleMouseLeave = () => {
    if (isPullingRef.current) {
      isPullingRef.current = false;
      setPullDistance(0);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) {
      return;
    }
    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getKey)));
    }
  };

  // Handle single selection
  const handleSelect = (key: string) => {
    if (!onSelectionChange) {
      return;
    }
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    onSelectionChange(newKeys);
  };

  // Handle sort click
  const handleSort = (columnKey: string) => {
    if (!onSortChange) {
      return;
    }
    const column = columns.find((c) => c.key === columnKey);
    if (!column?.sortable) {
      return;
    }

    if (sortColumn === columnKey) {
      onSortChange(columnKey, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(columnKey, "asc");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showMobileView ? (
          // Mobile loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              className="animate-pulse space-y-3 rounded-lg border bg-muted/50 p-4"
              key={i}
            >
              <div className="h-5 w-1/3 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
            </div>
          ))
        ) : (
          // Desktop loading skeleton
          <div className="animate-pulse rounded-lg border">
            <div className="h-12 border-b bg-muted/50" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                className="flex h-14 items-center gap-4 border-b px-4"
                key={i}
              >
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-4 w-1/4 rounded bg-muted" />
                <div className="h-4 w-1/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        {emptyState || (
          <p className="text-muted-foreground">No data to display</p>
        )}
      </div>
    );
  }

  // Mobile card view
  if (showMobileView) {
    return (
      <div
        className={cn("relative", className)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={containerRef}
      >
        {/* Pull-to-refresh indicator */}
        {enablePullToRefresh && (pullDistance > 0 || isRefreshing) && (
          <div
            className="absolute top-0 right-0 left-0 z-10 flex items-center justify-center transition-transform"
            style={{
              height: `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px`,
              transform: `translateY(${isRefreshing ? 0 : pullDistance - 50}px)`,
            }}
          >
            <RefreshCw
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isRefreshing && "animate-spin"
              )}
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${pullDistance * 2}deg)`,
              }}
            />
          </div>
        )}

        {/* Card grid */}
        <div
          className="space-y-3"
          style={{
            transform:
              pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
            transition:
              pullDistance === 0 && !isRefreshing
                ? "transform 0.2s"
                : undefined,
          }}
        >
          {data.map((item) => {
            const key = getKey(item);
            const isSelected = selectedKeys.has(key);

            // Use custom card renderer if provided
            if (renderMobileCard) {
              return (
                <div className="relative" key={key}>
                  {selectable && (
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelect(key)}
                      />
                    </div>
                  )}
                  {renderMobileCard(item, actions)}
                </div>
              );
            }

            // Default mobile card - improved design with avatar and better layout
            const mobileColumns = columns
              .filter((col) => col.mobileVisible !== false)
              .slice(0, 4);

            // First column is typically the name/primary identifier
            const primaryColumn = mobileColumns[0];
            const secondaryColumns = mobileColumns.slice(1);

            // Card content (used in both swipeable and non-swipeable)
            const cardContent = (
              <div
                className={cn(
                  "rounded-xl border bg-card p-4 transition-all duration-200",
                  !enableSwipe && "active:scale-[0.98]",
                  onRowClick &&
                    "cursor-pointer hover:bg-accent/50 hover:shadow-md",
                  isSelected && "bg-primary/5 ring-2 ring-primary"
                )}
                onClick={() => onRowClick?.(item)}
              >
                <div className="flex items-start gap-3">
                  {/* Selection checkbox */}
                  {selectable && (
                    <div
                      className="flex-shrink-0 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="h-5 w-5"
                        onCheckedChange={() => handleSelect(key)}
                      />
                    </div>
                  )}

                  {/* Avatar - generated from first column content */}
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {/* Extract initials from primary column if it's text */}
                      {(() => {
                        const content = primaryColumn?.accessor(item);
                        if (typeof content === "string") {
                          return content
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                        }
                        // If it's JSX, try to render just initials
                        return "??";
                      })()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Primary content (name) */}
                    {primaryColumn && (
                      <div className="truncate font-semibold text-base">
                        {primaryColumn.accessor(item)}
                      </div>
                    )}

                    {/* Secondary metadata */}
                    <div className="mt-1 space-y-0.5">
                      {secondaryColumns.map((col) => (
                        <div
                          className="flex items-center gap-1 text-muted-foreground text-sm"
                          key={col.key}
                        >
                          <span className="font-medium text-muted-foreground/70 text-xs">
                            {col.header}:
                          </span>
                          <span className="truncate">{col.accessor(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions menu - only show if no swipe actions or on desktop */}
                  {actions && actions.length > 0 && !enableSwipe && (
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-10 w-10 rounded-full hover:bg-accent"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {actions.map((action) => (
                            <DropdownMenuItem
                              className={cn(
                                "py-3",
                                action.destructive &&
                                  "text-destructive focus:text-destructive"
                              )}
                              disabled={action.disabled?.(item)}
                              key={action.label}
                              onClick={() => action.onClick(item)}
                            >
                              {action.icon && (
                                <span className="mr-3">{action.icon}</span>
                              )}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            );

            // Wrap with SwipeableCard if swipe actions are enabled
            if (enableSwipe) {
              return (
                <SwipeableCard
                  key={key}
                  leftActions={leftSwipeActions?.map((action) => ({
                    label: action.label,
                    icon: action.icon,
                    bgColor: action.bgColor,
                    textColor: action.textColor,
                    onClick: () => action.onClick(item),
                  }))}
                  rightActions={rightSwipeActions?.map((action) => ({
                    label: action.label,
                    icon: action.icon,
                    bgColor: action.bgColor,
                    textColor: action.textColor,
                    onClick: () => action.onClick(item),
                  }))}
                >
                  {cardContent}
                </SwipeableCard>
              );
            }

            return <div key={key}>{cardContent}</div>;
          })}
        </div>
      </div>
    );
  }

  // Desktop table view
  return (
    <div
      className={cn("relative rounded-lg border", className)}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      ref={containerRef}
    >
      {/* Pull-to-refresh indicator for desktop */}
      {enablePullToRefresh && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 right-0 left-0 z-10 flex items-center justify-center bg-background/80 transition-transform"
          style={{
            height: `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px`,
          }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${pullDistance * 2}deg)`,
            }}
          />
        </div>
      )}
      <Table
        style={{
          marginTop:
            pullDistance > 0 || isRefreshing
              ? `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px`
              : undefined,
        }}
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={data.length > 0 && selectedKeys.size === data.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                className={cn(
                  column.width,
                  column.sortable && "cursor-pointer select-none"
                )}
                key={column.key}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && (
                    <span className="ml-1">
                      {sortColumn === column.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
            {actions && actions.length > 0 && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const key = getKey(item);
            const isSelected = selectedKeys.has(key);

            return (
              <TableRow
                className={cn(
                  "group",
                  onRowClick && "cursor-pointer",
                  isSelected && "bg-primary/5"
                )}
                key={key}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(key)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell className={column.width} key={column.key}>
                    {column.accessor(item)}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            className={cn(
                              action.destructive && "text-destructive"
                            )}
                            disabled={action.disabled?.(item)}
                            key={action.label}
                            onClick={() => action.onClick(item)}
                          >
                            {action.icon && (
                              <span className="mr-2">{action.icon}</span>
                            )}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
