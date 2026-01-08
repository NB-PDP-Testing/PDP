"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "./table-skeleton";
import { CardGridSkeleton, StatGridSkeleton } from "./card-skeleton";
import { FormSkeleton } from "./form-skeleton";

interface PageSkeletonProps {
  /** Page type determines layout */
  variant?: "dashboard" | "list" | "detail" | "form" | "settings";
  /** Show page header (title + actions) */
  showHeader?: boolean;
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean;
  /** Show tabs */
  showTabs?: boolean;
  /** Container class name */
  className?: string;
}

/**
 * PageSkeleton - Full page loading placeholder
 * 
 * Features:
 * - Multiple page layouts (dashboard, list, detail, form)
 * - Optional header, breadcrumbs, tabs
 * - Matches common page patterns
 */
export function PageSkeleton({
  variant = "list",
  showHeader = true,
  showBreadcrumbs = true,
  showTabs = false,
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6 p-4 sm:p-6", className)}>
      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      )}

      {/* Page Header */}
      {showHeader && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="flex gap-4 border-b pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded" />
          ))}
        </div>
      )}

      {/* Content based on variant */}
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "list" && <ListPageSkeleton />}
      {variant === "detail" && <DetailPageSkeleton />}
      {variant === "form" && <FormSkeleton showTitle={false} />}
      {variant === "settings" && <SettingsPageSkeleton />}
    </div>
  );
}

/**
 * Dashboard page skeleton with stats and charts
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <StatGridSkeleton count={4} />

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-48 w-full rounded" />
        </div>
        <div className="rounded-lg border p-4 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-48 w-full rounded" />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border p-4 space-y-4">
        <Skeleton className="h-5 w-32 rounded" />
        <TableSkeleton rows={5} columns={4} showHeader={false} />
      </div>
    </div>
  );
}

/**
 * List page skeleton with filters and table
 */
function ListPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters/Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full sm:w-64 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={5} showCheckbox showActions />
    </div>
  );
}

/**
 * Detail page skeleton with sidebar info
 */
function DetailPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Hero card */}
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <CardGridSkeleton count={3} columns={3} />
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-4">
          <Skeleton className="h-5 w-24 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-4 space-y-4">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Settings page skeleton with sections
 */
function SettingsPageSkeleton() {
  return (
    <div className="space-y-8 max-w-2xl">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <div className="rounded-lg border p-4 space-y-4">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-40 rounded" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * AdminPlayersPageSkeleton - Specific skeleton for admin players page
 */
export function AdminPlayersPageSkeleton() {
  return (
    <PageSkeleton variant="list" showTabs={false} />
  );
}

/**
 * AdminDashboardSkeleton - Specific skeleton for admin dashboard
 */
export function AdminDashboardSkeleton() {
  return (
    <PageSkeleton variant="dashboard" />
  );
}

/**
 * PlayerDetailSkeleton - Specific skeleton for player detail page
 */
export function PlayerDetailSkeleton() {
  return (
    <PageSkeleton variant="detail" showTabs />
  );
}