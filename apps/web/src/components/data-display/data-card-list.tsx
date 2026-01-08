"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwipeableCard } from "./swipeable-card";

/**
 * Action for card items
 */
export interface CardAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  destructive?: boolean;
  disabled?: (item: T) => boolean;
}

/**
 * Swipe action configuration
 */
export interface SwipeAction<T> {
  label: string;
  icon?: React.ReactNode;
  bgColor?: string;
  textColor?: string;
  onClick: (item: T) => void;
}

interface DataCardListProps<T> {
  /** Data items to display */
  data: T[];
  /** Get unique key for each item */
  getKey: (item: T) => string;
  /** Render function for card content */
  renderCard: (item: T) => React.ReactNode;
  /** Menu actions for each card */
  actions?: CardAction<T>[];
  /** Left swipe actions (mobile) */
  leftSwipeActions?: SwipeAction<T>[];
  /** Right swipe actions (mobile) */
  rightSwipeActions?: SwipeAction<T>[];
  /** Enable selection checkboxes */
  selectable?: boolean;
  /** Selected item keys */
  selectedKeys?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Click handler for card */
  onCardClick?: (item: T) => void;
  /** Enable pull-to-refresh (mobile) */
  pullToRefresh?: boolean;
  /** Refresh handler */
  onRefresh?: () => Promise<void>;
  /** Loading state */
  loading?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Load more handler for infinite scroll */
  onLoadMore?: () => void;
  /** Whether more data is available */
  hasMore?: boolean;
  /** Loading more state */
  loadingMore?: boolean;
  /** Gap between cards */
  gap?: "sm" | "md" | "lg";
  /** Grid columns for larger screens */
  columns?: 1 | 2 | 3 | 4;
  /** Class name for container */
  className?: string;
}

/**
 * DataCardList - Mobile-optimized card list with swipe actions and virtualization
 * 
 * Features:
 * - Swipe-to-reveal actions
 * - Pull-to-refresh
 * - Infinite scroll
 * - Selection support
 * - Responsive grid layout
 */
export function DataCardList<T>({
  data,
  getKey,
  renderCard,
  actions,
  leftSwipeActions,
  rightSwipeActions,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onCardClick,
  pullToRefresh = false,
  onRefresh,
  loading = false,
  emptyState,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  gap = "md",
  columns = 1,
  className,
}: DataCardListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startYRef = React.useRef(0);
  const isPullingRef = React.useRef(false);

  // Gap classes
  const gapClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  // Column classes
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  // Handle selection
  const handleSelect = (key: string) => {
    if (!onSelectionChange) return;
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    onSelectionChange(newKeys);
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!pullToRefresh || !containerRef.current || isRefreshing) return;
    if (containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      // Apply resistance
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
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

  // Infinite scroll observer
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("grid", gapClasses[gap], columnClasses[columns], className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border bg-muted/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-muted/50" />
                <div className="h-3 w-3/4 rounded bg-muted/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        {emptyState || (
          <p className="text-muted-foreground">No items to display</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullToRefresh && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-center transition-transform"
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
              transform: `rotate(${pullDistance * 2}deg)`,
            }}
          />
        </div>
      )}

      {/* Card grid */}
      <div
        className={cn("grid", gapClasses[gap], columnClasses[columns])}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {data.map((item) => {
          const key = getKey(item);
          const isSelected = selectedKeys.has(key);
          const hasSwipeActions =
            (leftSwipeActions && leftSwipeActions.length > 0) ||
            (rightSwipeActions && rightSwipeActions.length > 0);

          const cardContent = (
            <div
              className={cn(
                "rounded-xl border bg-card p-4 transition-all duration-200",
                onCardClick && "cursor-pointer active:scale-[0.98]",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
              onClick={() => onCardClick?.(item)}
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                {selectable && (
                  <div
                    className="pt-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(key)}
                      className="h-5 w-5"
                    />
                  </div>
                )}

                {/* Card content */}
                <div className="flex-1 min-w-0">{renderCard(item)}</div>

                {/* Actions menu */}
                {actions && actions.length > 0 && (
                  <div
                    className="flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.onClick(item)}
                            disabled={action.disabled?.(item)}
                            className={cn(
                              "py-3",
                              action.destructive &&
                                "text-destructive focus:text-destructive"
                            )}
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

          // Wrap with SwipeableCard if swipe actions are defined
          if (hasSwipeActions) {
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

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple card template for common use cases
 */
export interface SimpleCardData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  avatar?: React.ReactNode;
  badge?: React.ReactNode;
  metadata?: Array<{ label: string; value: React.ReactNode }>;
}

export function SimpleCard({ data }: { data: SimpleCardData }) {
  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      {data.avatar && <div className="flex-shrink-0">{data.avatar}</div>}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{data.title}</h3>
          {data.badge}
        </div>
        {data.subtitle && (
          <p className="text-sm text-muted-foreground truncate">{data.subtitle}</p>
        )}
        {data.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}
        {data.metadata && data.metadata.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {data.metadata.map((item) => (
              <div key={item.label} className="text-xs text-muted-foreground">
                <span className="font-medium">{item.label}:</span>{" "}
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}