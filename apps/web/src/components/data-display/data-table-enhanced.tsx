"use client";

import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Columns,
  Download,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Enhanced column definition with visibility and width controls
 */
export type EnhancedColumn<T> = {
  /** Unique column ID */
  id: string;
  /** Header label */
  header: string;
  /** Cell content accessor */
  accessor: (item: T) => React.ReactNode;
  /** Export accessor - returns plain string for CSV export (optional, defaults to accessor result) */
  exportAccessor?: (item: T) => string | number | null | undefined;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether column can be hidden */
  hideable?: boolean;
  /** Initial visibility (default: true) */
  visible?: boolean;
  /** Column width (e.g., "w-[200px]", "min-w-[150px]") */
  width?: string;
  /** Enable inline editing for this column */
  editable?: boolean;
  /** Cell editor component */
  editor?: (
    value: unknown,
    onChange: (value: unknown) => void
  ) => React.ReactNode;
};

/**
 * Bulk action definition
 */
export type BulkAction<T> = {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Handler receives selected items */
  onClick: (selectedItems: T[]) => void;
  /** Whether action is destructive */
  destructive?: boolean;
  /** Whether action is disabled */
  disabled?: boolean;
};

/**
 * Row action definition
 */
export type RowAction<T> = {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Action handler */
  onClick: (item: T) => void;
  /** Whether action is destructive */
  destructive?: boolean;
  /** Whether action is disabled for this item */
  disabled?: (item: T) => boolean;
};

type DataTableEnhancedProps<T> = {
  /** Data to display */
  data: T[];
  /** Column definitions */
  columns: EnhancedColumn<T>[];
  /** Get unique key for each row */
  getRowKey: (item: T) => string;
  /** Row actions (shown on hover) */
  rowActions?: RowAction<T>[];
  /** Bulk actions for selected rows */
  bulkActions?: BulkAction<T>[];
  /** Enable row selection */
  selectable?: boolean;
  /** Controlled selected keys (external state) */
  selectedKeys?: Set<string>;
  /** Selection change handler (external control) */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search filter function */
  onSearch?: (query: string) => void;
  /** External search value */
  searchValue?: string;
  /** Enable CSV export */
  exportable?: boolean;
  /** Export filename */
  exportFilename?: string;
  /** Current sort column */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: "asc" | "desc";
  /** Sort change handler */
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Row double-click handler (for inline edit) */
  onRowDoubleClick?: (item: T) => void;
  /** Loading state */
  loading?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Container class name */
  className?: string;
};

/**
 * DataTableEnhanced - Desktop-optimized data table with power features
 *
 * Features:
 * - Column visibility toggle
 * - Bulk selection and actions
 * - Row hover actions
 * - Sortable columns
 * - Search/filter
 * - CSV export
 * - Sticky header option
 * - Inline editing (planned)
 */
export function DataTableEnhanced<T>({
  data,
  columns,
  getRowKey,
  rowActions,
  bulkActions,
  selectable = false,
  selectedKeys: controlledSelectedKeys,
  onSelectionChange,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue = "",
  exportable = false,
  exportFilename = "export",
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  onRowDoubleClick,
  loading = false,
  emptyState,
  stickyHeader = false,
  className,
}: DataTableEnhancedProps<T>) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    () =>
      new Set(
        columns.filter((col) => col.visible !== false).map((col) => col.id)
      )
  );

  // Selection state - use controlled if provided, otherwise internal
  const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<
    Set<string>
  >(new Set());

  // Use controlled selection if provided, otherwise use internal state
  const isControlled = controlledSelectedKeys !== undefined;
  const selectedKeys = isControlled
    ? controlledSelectedKeys
    : internalSelectedKeys;
  const setSelectedKeys = isControlled
    ? (keys: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        const newKeys = typeof keys === "function" ? keys(selectedKeys) : keys;
        onSelectionChange?.(newKeys);
      }
    : setInternalSelectedKeys;

  // Local search state (if no external control)
  const [localSearch, setLocalSearch] = React.useState("");
  const searchQuery = searchValue || localSearch;

  // Get visible columns in order
  const displayColumns = columns.filter((col) => visibleColumns.has(col.id));

  // Get selected items
  const selectedItems = React.useMemo(
    () => data.filter((item) => selectedKeys.has(getRowKey(item))),
    [data, selectedKeys, getRowKey]
  );

  // Handle column visibility toggle
  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        // Don't allow hiding all columns
        if (next.size > 1) {
          next.delete(columnId);
        }
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedKeys.size === data.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(data.map(getRowKey)));
    }
  };

  // Handle single selection
  const handleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Handle sort
  const handleSort = (columnId: string) => {
    if (!onSortChange) {
      return;
    }
    const column = columns.find((c) => c.id === columnId);
    if (!column?.sortable) {
      return;
    }

    if (sortColumn === columnId) {
      onSortChange(columnId, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(columnId, "asc");
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query);
    } else {
      setLocalSearch(query);
    }
  };

  // Handle CSV export - exports selected rows if any are selected, otherwise all rows
  const handleExport = () => {
    // Determine which data to export: selected items if any, otherwise all data
    const dataToExport = selectedKeys.size > 0 ? selectedItems : data;

    // Export ALL columns (not just visible) for complete data
    const headers = columns.map((col) => col.header);
    const rows = dataToExport.map((item) =>
      columns.map((col) => {
        // Use exportAccessor if available, otherwise try accessor
        if (col.exportAccessor) {
          const value = col.exportAccessor(item);
          return value != null ? String(value) : "";
        }

        const value = col.accessor(item);
        // Convert React nodes to string
        if (typeof value === "string" || typeof value === "number") {
          return String(value);
        }
        return "";
      })
    );

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}${selectedKeys.size > 0 ? `-selected-${selectedKeys.size}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <div className="animate-pulse">
          <div className="h-12 border-b bg-muted/30" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="flex h-14 items-center gap-4 border-b px-4" key={i}>
              {displayColumns.map((col) => (
                <div className="h-4 flex-1 rounded bg-muted/50" key={col.id} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left side: Search and selection info */}
        <div className="flex items-center gap-4">
          {searchable && (
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-[250px] pl-9"
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                value={searchQuery}
              />
              {searchQuery && (
                <Button
                  className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
                  onClick={() => handleSearch("")}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Selection info and bulk actions */}
          {selectable && selectedKeys.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {selectedKeys.size} selected
              </span>
              <Button onClick={clearSelection} size="sm" variant="ghost">
                Clear
              </Button>
              {bulkActions?.map((action) => (
                <Button
                  disabled={action.disabled}
                  key={action.label}
                  onClick={() => action.onClick(selectedItems)}
                  size="sm"
                  variant={action.destructive ? "destructive" : "outline"}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Column visibility and export */}
        <div className="flex items-center gap-2">
          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Columns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((col) => col.hideable !== false)
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.has(column.id)}
                    key={column.id}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export button */}
          {exportable && (
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader
            className={stickyHeader ? "sticky top-0 z-10 bg-background" : ""}
          >
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
              {displayColumns.map((column) => (
                <TableHead
                  className={cn(
                    column.width,
                    column.sortable &&
                      "cursor-pointer select-none hover:bg-muted/50"
                  )}
                  key={column.id}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && (
                      <span className="ml-1">
                        {sortColumn === column.id ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-32 text-center"
                  colSpan={
                    displayColumns.length +
                    (selectable ? 1 : 0) +
                    (rowActions ? 1 : 0)
                  }
                >
                  {emptyState || (
                    <span className="text-muted-foreground">
                      No results found
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const key = getRowKey(item);
                const isSelected = selectedKeys.has(key);

                return (
                  <TableRow
                    className={cn(
                      "group transition-colors",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-primary/5"
                    )}
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    onDoubleClick={() => onRowDoubleClick?.(item)}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelect(key)}
                        />
                      </TableCell>
                    )}
                    {displayColumns.map((column) => (
                      <TableCell className={column.width} key={column.id}>
                        {column.accessor(item)}
                      </TableCell>
                    ))}
                    {rowActions && rowActions.length > 0 && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {rowActions.slice(0, 2).map((action) => (
                            <Button
                              className="h-8 w-8"
                              disabled={action.disabled?.(item)}
                              key={action.label}
                              onClick={() => action.onClick(item)}
                              size="icon"
                              title={action.label}
                              variant="ghost"
                            >
                              {action.icon}
                            </Button>
                          ))}
                          {rowActions.length > 2 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="h-8 w-8"
                                  size="icon"
                                  variant="ghost"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {rowActions.slice(2).map((action) => (
                                  <DropdownMenuItem
                                    className={cn(
                                      action.destructive && "text-destructive"
                                    )}
                                    disabled={action.disabled?.(item)}
                                    key={action.label}
                                    onClick={() => action.onClick(item)}
                                  >
                                    {action.icon && (
                                      <span className="mr-2">
                                        {action.icon}
                                      </span>
                                    )}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
