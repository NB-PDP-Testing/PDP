"use client";

import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation href (omit for current page) */
  href?: string;
}

interface PageContainerProps {
  /** Page title */
  title: string;
  /** Optional page description */
  description?: string;
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[];
  /** Actions to display in header (buttons, etc.) */
  actions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
  /** Whether to use full width (no max-width constraint) */
  fullWidth?: boolean;
}

/**
 * Consistent page container with title, description, breadcrumbs, and actions
 * 
 * Provides:
 * - Consistent page header pattern
 * - Breadcrumb navigation for wayfinding
 * - Action buttons aligned to right
 * - Responsive padding and spacing
 */
export function PageContainer({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  fullWidth = false,
}: PageContainerProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Page Header */}
      <div className="mb-6 space-y-2">
        {/* Breadcrumbs - hidden on mobile for cleaner look */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href as Route}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        )}

        {/* Title and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className={cn(!fullWidth && "max-w-7xl")}>{children}</div>
    </div>
  );
}

/**
 * Section within a page with optional title
 */
export function PageSection({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-medium tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}