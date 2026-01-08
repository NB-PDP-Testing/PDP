"use client";

import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 260;
const COLLAPSED_WIDTH = 60;

interface ResizableSidebarProps {
  /** Sidebar content */
  children: React.ReactNode;
  /** Default width in pixels */
  defaultWidth?: number;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Whether sidebar starts collapsed */
  defaultCollapsed?: boolean;
  /** Storage key for persisting width */
  storageKey?: string;
  /** Side of the screen */
  side?: "left" | "right";
  /** Callback when width changes */
  onWidthChange?: (width: number) => void;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Container class name */
  className?: string;
}

/**
 * ResizableSidebar - Desktop sidebar with drag-to-resize and collapse
 *
 * Features:
 * - Drag handle to resize width
 * - Collapse/expand button
 * - Persists width to localStorage
 * - Keyboard accessible (arrows to resize when focused)
 * - Double-click handle to reset to default
 */
export function ResizableSidebar({
  children,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  defaultCollapsed = false,
  storageKey = "sidebar-width",
  side = "left",
  onWidthChange,
  onCollapsedChange,
  className,
}: ResizableSidebarProps) {
  const [width, setWidth] = React.useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Load persisted width on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.width) setWidth(parsed.width);
      if (parsed.collapsed !== undefined) setIsCollapsed(parsed.collapsed);
    }
  }, [storageKey]);

  // Persist width changes
  const persistState = React.useCallback(
    (newWidth: number, collapsed: boolean) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ width: newWidth, collapsed })
      );
    },
    [storageKey]
  );

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === "left" ? e.clientX - startX : startX - e.clientX;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidth + delta)
      );
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      persistState(width, isCollapsed);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle keyboard resize
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 10;
    let newWidth = width;

    if (e.key === "ArrowLeft") {
      newWidth = side === "left" ? width - step : width + step;
    } else if (e.key === "ArrowRight") {
      newWidth = side === "left" ? width + step : width - step;
    }

    newWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
    persistState(newWidth, isCollapsed);
  };

  // Double-click to reset
  const handleDoubleClick = () => {
    setWidth(defaultWidth);
    onWidthChange?.(defaultWidth);
    persistState(defaultWidth, isCollapsed);
  };

  // Toggle collapse
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
    persistState(width, newCollapsed);
  };

  const currentWidth = isCollapsed ? COLLAPSED_WIDTH : width;

  return (
    <aside
      className={cn(
        "relative flex-shrink-0 border-r bg-card transition-[width] duration-200",
        side === "right" && "order-last border-r-0 border-l",
        isResizing && "transition-none",
        className
      )}
      ref={sidebarRef}
      style={{ width: currentWidth }}
    >
      {/* Content */}
      <div
        className={cn(
          "h-full overflow-hidden",
          isCollapsed && "pointer-events-none opacity-0"
        )}
      >
        {children}
      </div>

      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            className="h-10 w-10"
            onClick={toggleCollapsed}
            size="icon"
            variant="ghost"
          >
            {side === "left" ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          aria-valuemax={maxWidth}
          aria-valuemin={minWidth}
          aria-valuenow={width}
          className={cn(
            "group absolute top-0 bottom-0 w-1 cursor-col-resize",
            "hover:bg-primary/20 active:bg-primary/30",
            "transition-colors",
            side === "left" ? "-right-0.5" : "-left-0.5"
          )}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          role="separator"
          tabIndex={0}
        >
          {/* Visual grip indicator */}
          <div
            className={cn(
              "-translate-y-1/2 absolute top-1/2 flex items-center justify-center",
              "h-8 w-4 rounded bg-muted/50 opacity-0 group-hover:opacity-100",
              "transition-opacity",
              side === "left" ? "-right-1.5" : "-left-1.5"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Collapse button */}
      {!isCollapsed && (
        <Button
          className={cn(
            "absolute top-4 h-6 w-6 rounded-full border bg-background shadow-sm",
            side === "left" ? "-right-3" : "-left-3"
          )}
          onClick={toggleCollapsed}
          size="icon"
          variant="ghost"
        >
          {side === "left" ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      )}
    </aside>
  );
}

/**
 * Hook to get sidebar state
 */
export function useSidebarState(storageKey = "sidebar-width") {
  const [state, setState] = React.useState<{
    width: number;
    collapsed: boolean;
  }>({ width: DEFAULT_WIDTH, collapsed: false });

  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setState(JSON.parse(stored));
    }
  }, [storageKey]);

  return state;
}
