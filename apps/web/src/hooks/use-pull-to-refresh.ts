"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UsePullToRefreshOptions = {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance (default: 150) */
  maxPull?: number;
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean;
};

type UsePullToRefreshReturn = {
  /** Current pull distance (0 when not pulling) */
  pullDistance: number;
  /** Whether currently refreshing */
  isRefreshing: boolean;
  /** Whether actively pulling */
  isPulling: boolean;
  /** Props to spread on the scrollable container */
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
};

/**
 * usePullToRefresh - Hook for implementing pull-to-refresh gesture
 *
 * Phase 2 UX improvement: Enables native-feeling pull-to-refresh
 * on mobile lists and scrollable content.
 *
 * @example
 * ```tsx
 * const { pullDistance, isRefreshing, containerProps } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await refetchData();
 *   },
 * });
 *
 * return (
 *   <div {...containerProps}>
 *     {pullDistance > 0 && <RefreshIndicator distance={pullDistance} />}
 *     <YourContent />
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 150,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) {
        return;
      }

      // Only allow pull-to-refresh when at top of scroll
      const scrollElement = e.currentTarget as HTMLElement;
      scrollTopRef.current = scrollElement.scrollTop;

      if (scrollTopRef.current <= 0) {
        startYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !isPulling) {
        return;
      }

      const scrollElement = e.currentTarget as HTMLElement;

      // If user scrolled down, don't trigger pull-to-refresh
      if (scrollElement.scrollTop > 0) {
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only pull down, not up
      if (diff > 0) {
        // Apply resistance as user pulls further
        const resistance = 1 - Math.min(diff / (maxPull * 2), 0.5);
        const distance = Math.min(diff * resistance, maxPull);
        setPullDistance(distance);

        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    },
    [disabled, isRefreshing, isPulling, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) {
      return;
    }

    setIsPulling(false);

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Show spinner at smaller size

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Reset without refresh
      setPullDistance(0);
    }
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      setPullDistance(0);
      setIsRefreshing(false);
      setIsPulling(false);
    },
    []
  );

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
