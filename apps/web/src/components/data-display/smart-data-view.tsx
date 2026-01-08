"use client";

import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { ResponsiveDataView, type DataColumn, type DataAction, type SwipeActionDef } from "./responsive-data-view";
import { DataTableEnhanced, type EnhancedColumn, type RowAction, type BulkAction } from "./data-table-enhanced";

/**
 * SmartDataView Props - Unified interface for both components
 */
export interface SmartDataViewProps<T> {
  /** Data to display */
  data: T[];
  /** Get unique key for each row */
  getKey: (item: T) => string;
  /** Column definitions (will be converted for each component) */
  columns: DataColumn<T>[];
  /** Row actions */
  actions?: DataAction<T>[];
  /** Bulk actions (only used when enhanced tables enabled) */
  bulkActions?: BulkAction<T>[];
  /** Left swipe actions for mobile cards (swipe left to reveal) */
  leftSwipeActions?: SwipeActionDef<T>[];
  /** Right swipe actions for mobile cards (swipe right to reveal) */
  rightSwipeActions?: SwipeActionDef<T>[];
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row keys */
  selectedKeys?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Current sort column */
  sortColumn?: string;
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Sort change handler */
  onSortChange?: (column: string, direction: "asc" | "desc") => void;
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search value */
  searchValue?: string;
  /** Search handler */
  onSearch?: (query: string) => void;
  /** Enable CSV export (enhanced only) */
  exportable?: boolean;
  /** Export filename */
  exportFilename?: string;
  /** Loading state */
  loading?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Container class name */
  className?: string;
}

/**
 * SmartDataView - Automatically selects between ResponsiveDataView and DataTableEnhanced
 * 
 * Behavior:
 * - Mobile: Always uses ResponsiveDataView (card-based)
 * - Desktop + ux_enhanced_tables=false: Uses ResponsiveDataView (table mode)
 * - Desktop + ux_enhanced_tables=true: Uses DataTableEnhanced (with extra features)
 * 
 * Extra features when enhanced (desktop only):
 * - Column visibility toggle
 * - CSV export
 * - Sticky header
 * - Enhanced bulk actions toolbar
 */
export function SmartDataView<T>({
  data,
  getKey,
  columns,
  actions,
  bulkActions,
  leftSwipeActions,
  rightSwipeActions,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  sortColumn,
  sortDirection,
  onSortChange,
  searchable = false,
  searchPlaceholder,
  searchValue,
  onSearch,
  exportable = false,
  exportFilename = "export",
  loading = false,
  emptyState,
  className,
}: SmartDataViewProps<T>) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { useEnhancedTables } = useUXFeatureFlags();

  // Use enhanced tables on desktop when flag is enabled
  const shouldUseEnhanced = isDesktop && useEnhancedTables;

  // Convert columns to enhanced format
  const enhancedColumns: EnhancedColumn<T>[] = React.useMemo(() => {
    return columns.map((col) => ({
      id: col.key,
      header: col.header,
      accessor: col.accessor,
      exportAccessor: col.exportAccessor,
      sortable: col.sortable,
      hideable: true,
      visible: col.mobileVisible !== false, // Hide on mobile = start hidden
      width: undefined,
    }));
  }, [columns]);

  // Convert actions to row actions format
  const rowActions: RowAction<T>[] | undefined = React.useMemo(() => {
    if (!actions) return undefined;
    return actions.map((action) => ({
      label: action.label,
      icon: action.icon,
      onClick: action.onClick,
      destructive: action.destructive,
      disabled: () => false,
    }));
  }, [actions]);

  // Render DataTableEnhanced for desktop with flag enabled
  if (shouldUseEnhanced) {
    return (
      <DataTableEnhanced
        data={data}
        columns={enhancedColumns}
        getRowKey={getKey}
        rowActions={rowActions}
        bulkActions={bulkActions}
        selectable={selectable}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearch={onSearch}
        exportable={exportable}
        exportFilename={exportFilename}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        onRowClick={onRowClick}
        loading={loading}
        emptyState={emptyState}
        stickyHeader
        className={className}
      />
    );
  }

  // Default: Use ResponsiveDataView
  return (
    <ResponsiveDataView
      data={data}
      getKey={getKey}
      columns={columns}
      actions={actions}
      leftSwipeActions={leftSwipeActions}
      rightSwipeActions={rightSwipeActions}
      selectable={selectable}
      selectedKeys={selectedKeys}
      onSelectionChange={onSelectionChange}
      onRowClick={onRowClick}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSortChange={onSortChange as any}
      loading={loading}
      emptyState={emptyState}
      className={className}
    />
  );
}

/**
 * Re-export types for convenience
 */
export type { DataColumn, DataAction, SwipeActionDef } from "./responsive-data-view";
export type { BulkAction } from "./data-table-enhanced";
