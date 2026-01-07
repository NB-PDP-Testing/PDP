"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Column definition for ResponsiveDataView
 */
export interface DataColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Accessor function to get cell value */
  accessor: (item: T) => React.ReactNode;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether to show on mobile card (default: first 3 columns) */
  mobileVisible?: boolean;
  /** Custom width class */
  width?: string;
  /** Whether column can be hidden */
  hideable?: boolean;
}

/**
 * Action definition for row actions
 */
export interface DataAction<T> {
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
}

/**
 * Props for ResponsiveDataView
 */
export interface ResponsiveDataViewProps<T> {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: DataColumn<T>[];
  /** Row actions */
  actions?: DataAction<T>[];
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
  /** Class name for container */
  className?: string;
}

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
  className,
}: ResponsiveDataViewProps<T>) {
  const isMobile = useIsMobile();
  const { useMobileCards } = useUXFeatureFlags();
  
  // Use mobile cards if: on mobile AND feature flag enabled (or custom renderer provided)
  const showMobileView = isMobile && (useMobileCards || renderMobileCard);

  // Handle select all
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getKey)));
    }
  };

  // Handle single selection
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

  // Handle sort click
  const handleSort = (columnKey: string) => {
    if (!onSortChange) return;
    const column = columns.find((c) => c.key === columnKey);
    if (!column?.sortable) return;

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
              key={i}
              className="animate-pulse rounded-lg border bg-muted/50 p-4 space-y-3"
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
              <div key={i} className="flex h-14 items-center gap-4 border-b px-4">
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
      <div className={cn("space-y-3", className)}>
        {data.map((item) => {
          const key = getKey(item);
          const isSelected = selectedKeys.has(key);

          // Use custom card renderer if provided
          if (renderMobileCard) {
            return (
              <div key={key} className="relative">
                {selectable && (
                  <div className="absolute left-3 top-3 z-10">
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

          // Default mobile card
          const mobileColumns = columns.filter(
            (col) => col.mobileVisible !== false
          ).slice(0, 4);

          return (
            <div
              key={key}
              className={cn(
                "rounded-lg border bg-card p-4 transition-colors",
                onRowClick && "cursor-pointer hover:bg-accent/50",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {selectable && (
                    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelect(key)}
                      />
                    </div>
                  )}
                  {mobileColumns.map((col, idx) => (
                    <div key={col.key}>
                      {idx === 0 ? (
                        <div className="font-medium">{col.accessor(item)}</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">{col.header}:</span>{" "}
                          {col.accessor(item)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {actions && actions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action) => (
                        <DropdownMenuItem
                          key={action.label}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                          disabled={action.disabled?.(item)}
                          className={cn(
                            action.destructive && "text-destructive"
                          )}
                        >
                          {action.icon && (
                            <span className="mr-2">{action.icon}</span>
                          )}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    data.length > 0 && selectedKeys.size === data.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.width,
                  column.sortable && "cursor-pointer select-none"
                )}
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
            {actions && actions.length > 0 && (
              <TableHead className="w-12" />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const key = getKey(item);
            const isSelected = selectedKeys.has(key);

            return (
              <TableRow
                key={key}
                className={cn(
                  "group",
                  onRowClick && "cursor-pointer",
                  isSelected && "bg-primary/5"
                )}
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
                  <TableCell key={column.key} className={column.width}>
                    {column.accessor(item)}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.onClick(item)}
                            disabled={action.disabled?.(item)}
                            className={cn(
                              action.destructive && "text-destructive"
                            )}
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
