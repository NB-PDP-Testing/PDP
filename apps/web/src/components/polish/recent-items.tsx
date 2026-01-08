"use client";

import { ChevronRight, Clock, X } from "lucide-react";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RecentItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  timestamp: number;
  type?: string;
}

interface RecentItemsProps {
  /** Maximum number of recent items to show */
  maxItems?: number;
  /** Storage key for persistence */
  storageKey?: string;
  /** Show clear all button */
  showClearButton?: boolean;
  /** Group items by type */
  groupByType?: boolean;
  /** Callback when items change */
  onItemsChange?: (items: RecentItem[]) => void;
  /** Container class name */
  className?: string;
}

/**
 * RecentItems - Shows recently visited pages/items
 *
 * Features:
 * - Automatically tracks navigation
 * - Persists to localStorage
 * - Groups by type (optional)
 * - Clear history option
 */
export function RecentItems({
  maxItems = 10,
  storageKey = "recent-items",
  showClearButton = true,
  groupByType = false,
  onItemsChange,
  className,
}: RecentItemsProps) {
  const [items, setItems] = React.useState<RecentItem[]>([]);
  const pathname = usePathname();

  // Load items on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recent items:", e);
      }
    }
  }, [storageKey]);

  // Remove an item
  const removeItem = (id: string) => {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    localStorage.setItem(storageKey, JSON.stringify(newItems));
    onItemsChange?.(newItems);
  };

  // Clear all items
  const clearAll = () => {
    setItems([]);
    localStorage.removeItem(storageKey);
    onItemsChange?.([]);
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Group items by type if enabled
  const groupedItems = React.useMemo(() => {
    if (!groupByType) return { all: items };

    return items.reduce(
      (acc, item) => {
        const type = item.type || "other";
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {} as Record<string, RecentItem[]>
    );
  }, [items, groupByType]);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "py-4 text-center text-muted-foreground text-sm",
          className
        )}
      >
        <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No recent items</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        {/* Header with clear button */}
        <div className="flex items-center justify-between px-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Recent
          </span>
          {showClearButton && items.length > 0 && (
            <Button
              className="h-6 px-2 text-xs"
              onClick={clearAll}
              size="sm"
              variant="ghost"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Items list */}
        {groupByType ? (
          Object.entries(groupedItems).map(([type, typeItems]) => (
            <div className="space-y-1" key={type}>
              <span className="px-2 text-muted-foreground text-xs capitalize">
                {type}
              </span>
              {typeItems.map((item) => (
                <RecentItemRow
                  formatTime={formatRelativeTime}
                  isActive={pathname === item.href}
                  item={item}
                  key={item.id}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => (
              <RecentItemRow
                formatTime={formatRelativeTime}
                isActive={pathname === item.href}
                item={item}
                key={item.id}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface RecentItemRowProps {
  item: RecentItem;
  isActive: boolean;
  formatTime: (timestamp: number) => string;
  onRemove: () => void;
}

function RecentItemRow({
  item,
  isActive,
  formatTime,
  onRemove,
}: RecentItemRowProps) {
  return (
    <div className="group relative">
      <Link
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
          "transition-colors hover:bg-accent",
          isActive && "bg-accent"
        )}
        href={item.href as LinkProps<string>["href"]}
      >
        {item.icon ? (
          <span className="flex-shrink-0 text-muted-foreground">
            {item.icon}
          </span>
        ) : (
          <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 truncate">{item.label}</span>
        <span className="text-muted-foreground text-xs">
          {formatTime(item.timestamp)}
        </span>
        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </Link>

      {/* Remove button */}
      <Button
        className={cn(
          "-translate-y-1/2 absolute top-1/2 right-8 h-5 w-5",
          "opacity-0 transition-opacity group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        size="icon"
        variant="ghost"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * Hook to track and manage recent items
 */
export function useRecentItems(storageKey = "recent-items", maxItems = 10) {
  const [items, setItems] = React.useState<RecentItem[]>([]);
  const pathname = usePathname();

  // Load items on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setItems(JSON.parse(stored));
    }
  }, [storageKey]);

  // Add an item to recent history
  const addItem = React.useCallback(
    (item: Omit<RecentItem, "timestamp">) => {
      setItems((prev) => {
        // Remove existing item with same id
        const filtered = prev.filter((i) => i.id !== item.id);

        // Add new item at the beginning
        const newItems = [
          { ...item, timestamp: Date.now() },
          ...filtered,
        ].slice(0, maxItems);

        localStorage.setItem(storageKey, JSON.stringify(newItems));
        return newItems;
      });
    },
    [storageKey, maxItems]
  );

  // Track current page automatically
  const trackCurrentPage = React.useCallback(
    (label: string, type?: string, icon?: React.ReactNode) => {
      if (!pathname) return;

      addItem({
        id: pathname,
        label,
        href: pathname,
        type,
        icon,
      });
    },
    [pathname, addItem]
  );

  // Remove an item
  const removeItem = React.useCallback(
    (id: string) => {
      setItems((prev) => {
        const newItems = prev.filter((item) => item.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(newItems));
        return newItems;
      });
    },
    [storageKey]
  );

  // Clear all items
  const clearAll = React.useCallback(() => {
    setItems([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    items,
    addItem,
    trackCurrentPage,
    removeItem,
    clearAll,
  };
}

/**
 * Component to automatically track page visits
 * Place in layout to track navigation
 */
interface PageTrackerProps {
  label: string;
  type?: string;
  icon?: React.ReactNode;
  storageKey?: string;
}

export function PageTracker({
  label,
  type,
  icon,
  storageKey = "recent-items",
}: PageTrackerProps) {
  const { trackCurrentPage } = useRecentItems(storageKey);

  React.useEffect(() => {
    trackCurrentPage(label, type, icon);
  }, [label, type, icon, trackCurrentPage]);

  return null;
}
